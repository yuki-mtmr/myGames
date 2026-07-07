/**
 * MaterialEvaluator - SFEN から駒割(先手視点)を計算する純粋関数
 *
 * 単位: 歩=1 とした駒価値。捕獲は「盤上から消える + 相手の持ち駒に入る」の
 * 両方に効くため、タダ取りの差分は駒価値の2倍で現れる(角のタダ損 = -16)。
 * 王は勝敗そのものなので数えない。
 */

import { SfenConverter } from '../ai/SfenConverter.js';

const PIECE_VALUES = {
    '歩': 1, '香': 3, '桂': 4, '銀': 5, '金': 6, '角': 8, '飛': 10,
};

/** 成駒(!と 等)は基底の駒価値で数える */
const PROMOTED_TO_BASE = {
    '!と': '歩', '!杏': '香', '!圭': '桂', '!全': '銀', '!馬': '角', '!竜': '飛',
};

function pieceValue(type) {
    const base = PROMOTED_TO_BASE[type] ?? type;
    return PIECE_VALUES[base] ?? 0; // 王・玉は 0
}

/**
 * 先手(player)視点の駒割を返す
 * @param {string} sfen
 * @returns {number} player の駒価値合計 - cpu の駒価値合計
 */
export function materialBalance(sfen) {
    const { board, playerCaptured, cpuCaptured } = SfenConverter.sfenToBoard(sfen);

    let balance = 0;
    for (const row of board) {
        for (const piece of row) {
            if (!piece) continue;
            const value = pieceValue(piece.type);
            balance += piece.owner === 'player' ? value : -value;
        }
    }
    // 持ち駒は {type,...} オブジェクト形式(SfenConverter)と文字列形式の両方を許容
    for (const piece of playerCaptured) balance += pieceValue(piece?.type ?? piece);
    for (const piece of cpuCaptured) balance -= pieceValue(piece?.type ?? piece);

    return balance;
}
