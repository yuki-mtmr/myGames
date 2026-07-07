import { describe, it, expect, vi } from 'vitest';
import { analyzeGame } from './GameAnalyzer.js';

/**
 * モックエンジン: sfen → {move, score, pv} の対応表で応答する。
 * score は USI 規約どおり「その局面の手番側から見た評価値」。
 */
function createMockEngine(table) {
    return {
        getBestMove: vi.fn(async (sfen) => {
            if (!(sfen in table)) throw new Error(`unexpected sfen: ${sfen}`);
            const entry = table[sfen];
            if (entry instanceof Error) throw entry;
            return entry;
        }),
    };
}

// 2手のミニ対局: sfens は「初期局面 + 各手後」の3局面
// pos0: 先手番(player) / pos1: 後手番(cpu) / pos2: 先手番
const SFENS = ['pos0', 'pos1', 'pos2'];
const MOVE_TEXTS = ['７六歩', '３四歩'];

describe('analyzeGame', () => {
    it('全局面を解析し、先手視点の評価値列を返す', async () => {
        const engine = createMockEngine({
            pos0: { move: '7g7f', score: 50, pv: [] },   // 先手番: +50 (先手視点 +50)
            pos1: { move: '3c3d', score: -40, pv: [] },  // 後手番: -40 (先手視点 +40)
            pos2: { move: '2g2f', score: 60, pv: [] },   // 先手番: +60 (先手視点 +60)
        });

        const result = await analyzeGame({ sfens: SFENS, moveTexts: MOVE_TEXTS }, { engine });

        expect(result.evals).toHaveLength(3);
        expect(result.evals.map(e => e.scoreCp)).toEqual([50, 40, 60]);
        expect(result.evals[0].winrate).toBeCloseTo(0.52, 1);
    });

    it('勝率下落が閾値を超えた手を悪手として抽出する', async () => {
        // 先手の1手目: 着手前 +0 (勝率50%) → 着手後の後手番局面 +300
        // = 先手視点 -300 (勝率約38%) → 下落12% = mistake
        const engine = createMockEngine({
            pos0: { move: '7g7f', score: 0, pv: [] },
            pos1: { move: '3c3d', score: 300, pv: [] },
            pos2: { move: '2g2f', score: -280, pv: [] },
        });

        const result = await analyzeGame({ sfens: SFENS, moveTexts: MOVE_TEXTS }, { engine });

        const first = result.judgments[0];
        expect(first.ply).toBe(1);
        expect(first.mover).toBe('player');
        expect(first.severity).toBe('mistake');
        expect(first.moveText).toBe('７六歩');
        expect(first.bestMove).toBe('7g7f');
        expect(first.sfenBefore).toBe('pos0');

        // mistakes は severity 付きのみ
        expect(result.mistakes.every(m => m.severity !== null)).toBe(true);
        expect(result.mistakes.some(m => m.ply === 1)).toBe(true);
    });

    it('偶数手(後手=cpu)の mover は cpu になる', async () => {
        const engine = createMockEngine({
            pos0: { move: '7g7f', score: 0, pv: [] },
            pos1: { move: '3c3d', score: 0, pv: [] },
            pos2: { move: '2g2f', score: 0, pv: [] },
        });
        const result = await analyzeGame({ sfens: SFENS, moveTexts: MOVE_TEXTS }, { engine });
        expect(result.judgments[1].mover).toBe('cpu');
    });

    it('進捗コールバックが局面数ぶん呼ばれる', async () => {
        const engine = createMockEngine({
            pos0: { move: 'a', score: 0, pv: [] },
            pos1: { move: 'b', score: 0, pv: [] },
            pos2: { move: 'c', score: 0, pv: [] },
        });
        const onProgress = vi.fn();
        await analyzeGame({ sfens: SFENS, moveTexts: MOVE_TEXTS }, { engine, onProgress });
        expect(onProgress).toHaveBeenCalledTimes(3);
        expect(onProgress).toHaveBeenLastCalledWith({ done: 3, total: 3 });
    });

    it('一部局面の解析が失敗しても全体は落ちず、その手の判定をスキップする', async () => {
        const engine = createMockEngine({
            pos0: { move: '7g7f', score: 0, pv: [] },
            pos1: new Error('engine crash'),
            pos2: { move: '2g2f', score: 0, pv: [] },
        });
        const result = await analyzeGame({ sfens: SFENS, moveTexts: MOVE_TEXTS }, { engine });

        expect(result.evals[1].scoreCp).toBeNull();
        // pos1 の評価が無いので 1手目・2手目とも判定不能
        expect(result.judgments[0].severity).toBeNull();
        expect(result.judgments[0].skipped).toBe(true);
    });

    it('sfens と moveTexts の長さが不整合なら例外を投げる', async () => {
        const engine = createMockEngine({});
        await expect(analyzeGame({ sfens: ['a', 'b'], moveTexts: ['x', 'y'] }, { engine }))
            .rejects.toThrow();
    });
});
