/**
 * ReplayJudge - 再演モードの解答判定(純粋関数)
 *
 * 最善手との勝率差で判定する。閾値は trainingConfig.replay(設定化)。
 */

import { trainingConfig } from '../config/trainingConfig.js';

export const REPLAY_RESULT = Object.freeze({
    CORRECT: 'correct',
    CLOSE: 'close',
    WRONG: 'wrong',
});

function assertWinrate(name, value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
        throw new RangeError(`${name} must be within [0, 1], got: ${value}`);
    }
}

/**
 * 再演の解答を判定する
 * @param {{ bestWinrate: number, answerWinrate: number }} winrates - 着手者視点(0-1)
 * @param {{ correctTolerance?: number, closeTolerance?: number }} [config]
 * @returns {string} REPLAY_RESULT のいずれか
 */
export function judgeReplayAnswer({ bestWinrate, answerWinrate }, config = {}) {
    assertWinrate('bestWinrate', bestWinrate);
    assertWinrate('answerWinrate', answerWinrate);

    const correctTolerance = config.correctTolerance ?? trainingConfig.replay.correctTolerance;
    const closeTolerance = config.closeTolerance ?? trainingConfig.replay.closeTolerance;

    const EPSILON = 1e-9;
    const gap = bestWinrate - answerWinrate;

    if (gap <= correctTolerance + EPSILON) return REPLAY_RESULT.CORRECT;
    if (gap <= closeTolerance + EPSILON) return REPLAY_RESULT.CLOSE;
    return REPLAY_RESULT.WRONG;
}
