/**
 * MistakeTagger - 悪手のタグ推定
 *
 * 手元のデータから決定論的に計算できるタグのみ扱う:
 * - phase: 手数ベースの簡易ヒューリスティック
 * - pieceType: 棋譜テキストから駒種を抽出
 * - patterns: material_loss(駒割差分) / missed_capture(最善手が駒取り)
 * 王の安全度などエンジン読み筋が必要なタグは MultiPV 対応後(v4以降)。
 */

import { trainingConfig } from '../config/trainingConfig.js';
import { materialBalance } from './MaterialEvaluator.js';
import { SfenConverter } from '../ai/SfenConverter.js';
import { MoveConverter } from '../ai/MoveConverter.js';

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

// 2文字の成駒名を先に探す(「成香」を「香」と誤認しないため)
const PIECE_TOKENS = [
    '成香', '成桂', '成銀',
    '歩', '香', '桂', '銀', '金', '角', '飛', '玉', '王', 'と', '馬', '竜', '龍',
];

/**
 * 棋譜テキスト(例: '３三 角成', '５五歩打')から駒種を抽出する
 * @param {string | null} moveText
 * @returns {string | null}
 */
export function extractPieceType(moveText) {
    if (typeof moveText !== 'string') return null;
    // 「角成」の「成」は成る動作なので、末尾の成/打を除いてから探す
    const body = moveText.replace(/[成打]$/, '');
    for (const token of PIECE_TOKENS) {
        if (body.includes(token)) return token;
    }
    return null;
}

/**
 * パターンタグを検出する
 * @param {{ ply: number, sfens: string[], bestMove: string | null }} input -
 *   ply は 1 始まり。sfens は初期局面+各手後の局面列
 * @param {{ materialLossThreshold?: number }} [config]
 * @returns {string[]}
 */
export function detectPatterns({ ply, sfens, bestMove }, config = {}) {
    const threshold = config.materialLossThreshold
        ?? trainingConfig.tags.materialLossThreshold;
    const patterns = [];

    // 駒損: 着手前 → 相手の応手後 の駒割差分(先手=player の悪手のみ想定)
    const sfenBefore = sfens[ply - 1];
    const sfenAfterReply = sfens[ply + 1];
    if (sfenBefore && sfenAfterReply) {
        try {
            const diff = materialBalance(sfenAfterReply) - materialBalance(sfenBefore);
            if (diff <= -threshold) patterns.push('material_loss');
        } catch (error) {
            console.warn('material_loss detection failed:', error);
        }
    }

    // 取れる駒の見落とし: 最善手の移動先に相手駒がいた(打ちは対象外)
    if (sfenBefore && typeof bestMove === 'string' && !bestMove.includes('*')) {
        try {
            const destination = MoveConverter.usiToCoordinate(bestMove.slice(2, 4));
            const { board } = SfenConverter.sfenToBoard(sfenBefore);
            const target = destination && board[destination.row]?.[destination.col];
            if (target && target.owner === 'cpu') patterns.push('missed_capture');
        } catch (error) {
            console.warn('missed_capture detection failed:', error);
        }
    }

    return patterns;
}

/**
 * 悪手1件ぶんのタグ一式を組み立てる
 * @param {{ ply: number, moveText: string, sfens: string[], bestMove: string|null }} input
 * @param {Object} [config]
 * @returns {{ phase: string, pieceType: string|null, patterns: string[] }}
 */
export function buildTags({ ply, moveText, sfens, bestMove }, config = {}) {
    return {
        phase: tagPhase(ply, config),
        pieceType: extractPieceType(moveText),
        patterns: detectPatterns({ ply, sfens, bestMove }, config),
    };
}
