/**
 * RatingEstimator - 対局解析からの推定棋力(純粋関数)
 *
 * 1手あたりの平均勝率損失(下がった分のみ、上がった手は損失0)を
 * 閾値表(trainingConfig.rating.tiers)に写像して級位/段位の目安を返す。
 * あくまで1局からの推定であり、確定的な棋力判定ではない。
 */

import { trainingConfig } from '../config/trainingConfig.js';

/**
 * @param {Array<{ mover: string, drop: number|null, skipped?: boolean }>} judgments -
 *   GameAnalyzer の判定列
 * @param {'player'|'cpu'} mover - 推定対象
 * @param {{ minMoves?: number, tiers?: Array }} [config]
 * @returns {{ label: string|null, avgDrop: number|null, sampleSize: number }}
 *   手数不足のときは label/avgDrop が null
 */
export function estimateRating(judgments, mover, config = {}) {
    const minMoves = config.minMoves ?? trainingConfig.rating.minMoves;
    const tiers = config.tiers ?? trainingConfig.rating.tiers;

    const drops = judgments
        .filter(j => j.mover === mover && !j.skipped && typeof j.drop === 'number')
        .map(j => Math.max(0, j.drop));

    if (drops.length < minMoves) {
        return { label: null, avgDrop: null, sampleSize: drops.length };
    }

    const avgDrop = drops.reduce((sum, d) => sum + d, 0) / drops.length;
    const tier = tiers.find(t => avgDrop <= t.maxAvgDrop) ?? tiers[tiers.length - 1];

    return { label: tier.label, avgDrop, sampleSize: drops.length };
}
