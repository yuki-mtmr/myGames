import { describe, it, expect, vi } from 'vitest';
import { ReplaySession } from './ReplaySession.js';

const MISTAKE = {
    sfenBefore: 'pos-before',
    bestMove: '7g7f',
    winrateBefore: 0.62,
    moveText: '５八金',
};

function createEngine(scoreAfterAnswer) {
    return {
        getBestMove: vi.fn(async () => ({ move: '3c3d', score: scoreAfterAnswer, pv: [] })),
    };
}

describe('ReplaySession', () => {
    it('正解手を指すと correct で終了する', async () => {
        // 応答局面(相手番)の score -300 → 着手者視点 +300 ≒ 勝率62%
        const session = new ReplaySession(MISTAKE, { engine: createEngine(-300) });

        const outcome = await session.submitAnswer({ sfenAfter: 'pos-a', gameOver: false });

        expect(outcome.result).toBe('correct');
        expect(outcome.finished).toBe(true);
        expect(outcome.answerWinrate).toBeCloseTo(0.622, 2);
    });

    it('不正解1回目は再挑戦でき、正解手は開示しない', async () => {
        const session = new ReplaySession(MISTAKE, { engine: createEngine(300) }); // 着手者視点 -300

        const outcome = await session.submitAnswer({ sfenAfter: 'pos-a', gameOver: false });

        expect(outcome.result).toBe('wrong');
        expect(outcome.finished).toBe(false);
        expect(outcome.revealBestMove).toBe(false);
        expect(outcome.attemptsLeft).toBe(1);
    });

    it('maxAttempts 回失敗すると終了し最善手を開示する(エラー修正学習)', async () => {
        const session = new ReplaySession(MISTAKE, { engine: createEngine(300) });

        await session.submitAnswer({ sfenAfter: 'pos-a', gameOver: false });
        const outcome = await session.submitAnswer({ sfenAfter: 'pos-b', gameOver: false });

        expect(outcome.finished).toBe(true);
        expect(outcome.revealBestMove).toBe(true);
        expect(outcome.bestMove).toBe('7g7f');
    });

    it('再演の着手で詰ませた場合はエンジン評価なしで correct', async () => {
        const engine = createEngine(0);
        const session = new ReplaySession(MISTAKE, { engine });

        const outcome = await session.submitAnswer({ sfenAfter: 'pos-a', gameOver: true });

        expect(outcome.result).toBe('correct');
        expect(engine.getBestMove).not.toHaveBeenCalled();
    });

    it('エンジン失敗時は判定不能として finished せずエラーを返す', async () => {
        const engine = { getBestMove: vi.fn(async () => { throw new Error('crash'); }) };
        const session = new ReplaySession(MISTAKE, { engine });

        const outcome = await session.submitAnswer({ sfenAfter: 'pos-a', gameOver: false });

        expect(outcome.result).toBe('error');
        expect(outcome.finished).toBe(false);
        expect(outcome.attemptsLeft).toBe(2); // 失敗は試行回数を消費しない
    });

    it('終了後の submitAnswer は例外を投げる', async () => {
        const session = new ReplaySession(MISTAKE, { engine: createEngine(-300) });
        await session.submitAnswer({ sfenAfter: 'pos-a', gameOver: false });

        await expect(session.submitAnswer({ sfenAfter: 'pos-b', gameOver: false }))
            .rejects.toThrow();
    });
});
