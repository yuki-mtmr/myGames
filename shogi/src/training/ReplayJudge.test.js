import { describe, it, expect } from 'vitest';
import { judgeReplayAnswer, REPLAY_RESULT } from './ReplayJudge.js';

describe('judgeReplayAnswer', () => {
    it('最善手との勝率差が correctTolerance 以内なら正解', () => {
        expect(judgeReplayAnswer({ bestWinrate: 0.62, answerWinrate: 0.61 }))
            .toBe(REPLAY_RESULT.CORRECT);
        expect(judgeReplayAnswer({ bestWinrate: 0.62, answerWinrate: 0.62 }))
            .toBe(REPLAY_RESULT.CORRECT);
    });

    it('最善手より良い手(勝率が上)も正解', () => {
        expect(judgeReplayAnswer({ bestWinrate: 0.62, answerWinrate: 0.70 }))
            .toBe(REPLAY_RESULT.CORRECT);
    });

    it('correctTolerance 超〜closeTolerance 以内は「惜しい」', () => {
        expect(judgeReplayAnswer({ bestWinrate: 0.62, answerWinrate: 0.58 }))
            .toBe(REPLAY_RESULT.CLOSE);
    });

    it('closeTolerance 超は不正解', () => {
        expect(judgeReplayAnswer({ bestWinrate: 0.62, answerWinrate: 0.50 }))
            .toBe(REPLAY_RESULT.WRONG);
    });

    it('閾値を上書きできる', () => {
        const config = { correctTolerance: 0.10, closeTolerance: 0.20 };
        expect(judgeReplayAnswer({ bestWinrate: 0.62, answerWinrate: 0.54 }, config))
            .toBe(REPLAY_RESULT.CORRECT);
    });

    it('勝率が範囲外・非数なら例外を投げる', () => {
        expect(() => judgeReplayAnswer({ bestWinrate: NaN, answerWinrate: 0.5 })).toThrow();
        expect(() => judgeReplayAnswer({ bestWinrate: 0.5, answerWinrate: 1.2 })).toThrow();
    });
});
