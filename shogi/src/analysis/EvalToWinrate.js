/**
 * EvalToWinrate - 評価値(centipawn)→勝率変換の純粋関数
 *
 * 勝率 = 1 / (1 + exp(-eval / ponanzaC))
 * 出典: Ponanza 定数(docs/design-principles.md 原則2)
 */

import { trainingConfig } from '../config/trainingConfig.js';

/**
 * 評価値を勝率(0-1)に変換する
 * @param {number} evalCp - 手番側視点の評価値(centipawn)
 * @param {{ ponanzaC?: number }} [options]
 * @returns {number} 勝率(0-1)
 */
export function evalToWinrate(evalCp, options = {}) {
    if (typeof evalCp !== 'number' || !Number.isFinite(evalCp)) {
        throw new TypeError(`evalCp must be a finite number, got: ${evalCp}`);
    }
    const ponanzaC = options.ponanzaC ?? trainingConfig.winrate.ponanzaC;
    return 1 / (1 + Math.exp(-evalCp / ponanzaC));
}

/**
 * 詰みスコア(worker が擬似 cp 化した ±30000 近傍)かを判定する
 * @param {number} evalCp
 * @returns {boolean}
 */
export function isMateScore(evalCp) {
    return Math.abs(evalCp) >= trainingConfig.winrate.mateScoreThreshold;
}
