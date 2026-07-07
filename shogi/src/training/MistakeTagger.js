/**
 * MistakeTagger - 悪手のタグ推定
 *
 * v1 は局面フェーズ(手数ベースの簡易ヒューリスティック)のみ。
 * 駒種・パターンタグ(駒損/王の安全度/手筋見落とし)は v3 で拡充する。
 */

import { trainingConfig } from '../config/trainingConfig.js';

/**
 * 手数から局面フェーズを推定する
 * @param {number} ply - 手数(1始まり)
 * @param {{ openingMaxPly?: number, endgameMinPly?: number }} [config]
 * @returns {'opening' | 'middlegame' | 'endgame'}
 */
export function tagPhase(ply, config = {}) {
    if (!Number.isInteger(ply) || ply < 1) {
        throw new RangeError(`ply must be a positive integer, got: ${ply}`);
    }
    const openingMaxPly = config.openingMaxPly ?? trainingConfig.phase.openingMaxPly;
    const endgameMinPly = config.endgameMinPly ?? trainingConfig.phase.endgameMinPly;

    if (ply <= openingMaxPly) return 'opening';
    if (ply >= endgameMinPly) return 'endgame';
    return 'middlegame';
}
