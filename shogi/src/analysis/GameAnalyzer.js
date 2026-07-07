/**
 * GameAnalyzer - 対局全体の解析オーケストレーション
 *
 * 入力は対局中にライブ記録した SFEN 列(初期局面 + 各手後)と表示用 moveText 列。
 * USI score の視点正規化はこのモジュールに一元化する(docs/architecture.md):
 * - 局面 i の手番 = i が偶数なら先手(player)、奇数なら後手(cpu)
 * - 着手者視点: winrateBefore = 勝率(score_i)、winrateAfter = 勝率(-score_{i+1})
 * - UI 用の evals は先手視点(後手番局面の score は符号反転)
 */

import { evalToWinrate } from './EvalToWinrate.js';
import { judgeMove } from './MoveJudge.js';

function assertInputs(sfens, moveTexts) {
    if (!Array.isArray(sfens) || !Array.isArray(moveTexts)) {
        throw new TypeError('sfens and moveTexts must be arrays');
    }
    if (sfens.length !== moveTexts.length + 1) {
        throw new RangeError(
            `sfens must contain initial position + one per move: ` +
            `sfens=${sfens.length}, moveTexts=${moveTexts.length}`
        );
    }
}

/**
 * 全局面をエンジンで評価する(失敗した局面は score=null で継続)
 * @returns {Promise<Array<{ move: string|null, score: number|null }>>}
 */
async function evaluatePositions(sfens, engine, movetimeMs, onProgress) {
    const results = [];
    for (const [index, sfen] of sfens.entries()) {
        try {
            const { move, score } = await engine.getBestMove(sfen, { time: movetimeMs });
            results.push({ move: move ?? null, score: score ?? null });
        } catch (error) {
            console.warn(`Position analysis failed at ply ${index}:`, error);
            results.push({ move: null, score: null });
        }
        onProgress?.({ done: index + 1, total: sfens.length });
    }
    return results;
}

/**
 * 対局を解析し、先手視点の評価値列と指し手判定を返す
 * @param {{ sfens: string[], moveTexts: string[] }} record - 対局データ
 * @param {{ engine: { getBestMove: Function }, config?: Object,
 *           onProgress?: Function }} deps
 * @returns {Promise<{ evals: Array, judgments: Array, mistakes: Array }>}
 */
export async function analyzeGame({ sfens, moveTexts }, { engine, config = {}, onProgress } = {}) {
    assertInputs(sfens, moveTexts);
    if (!engine || typeof engine.getBestMove !== 'function') {
        throw new TypeError('engine with getBestMove(sfen, options) is required');
    }

    const movetimeMs = config.movetimeMs ?? 800;
    const raw = await evaluatePositions(sfens, engine, movetimeMs, onProgress);

    // UI 表示用: 先手視点の評価値列(偶数局面=先手番はそのまま、奇数は反転)
    const evals = raw.map((r, i) => {
        const scoreCp = r.score === null ? null : (i % 2 === 0 ? r.score : -r.score);
        return {
            ply: i,
            scoreCp,
            winrate: scoreCp === null ? null : evalToWinrate(scoreCp, config.winrate),
        };
    });

    // 指し手判定: ply i+1 の手(sfens[i] → sfens[i+1])を着手者視点で評価
    const judgments = moveTexts.map((moveText, i) => {
        const base = {
            ply: i + 1,
            moveText,
            mover: i % 2 === 0 ? 'player' : 'cpu',
            sfenBefore: sfens[i],
            bestMove: raw[i].move,
        };

        if (raw[i].score === null || raw[i + 1].score === null) {
            return {
                ...base, skipped: true, severity: null,
                drop: null, winrateBefore: null, winrateAfter: null,
            };
        }

        const winrateBefore = evalToWinrate(raw[i].score, config.winrate);
        const winrateAfter = evalToWinrate(-raw[i + 1].score, config.winrate);
        const { drop, severity } = judgeMove(
            { winrateBefore, winrateAfter },
            config.judgeThresholds
        );

        return { ...base, skipped: false, severity, drop, winrateBefore, winrateAfter };
    });

    return {
        evals,
        judgments,
        mistakes: judgments.filter(j => j.severity !== null),
    };
}
