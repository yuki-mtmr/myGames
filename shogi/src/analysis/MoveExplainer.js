/**
 * MoveExplainer - 悪手の1行説明生成
 *
 * v1 は「最善手 vs 実戦手の勝率差」のみで説明する
 * (PV を使った咎め手の文章化は v2。docs/architecture.md 参照)。
 */

const FULLWIDTH_DIGITS = ['０', '１', '２', '３', '４', '５', '６', '７', '８', '９'];
const KANJI_RANKS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const DROP_PIECE_NAMES = {
    P: '歩', L: '香', N: '桂', S: '銀', G: '金', B: '角', R: '飛',
};

/**
 * USI 座標(例 '7g')を「７七」形式に変換する。不正なら null。
 * @param {string} usiCoord
 * @returns {string | null}
 */
function formatSquare(usiCoord) {
    const file = Number.parseInt(usiCoord[0], 10);
    const rankIndex = usiCoord.charCodeAt(1) - 'a'.charCodeAt(0);
    if (!(file >= 1 && file <= 9) || rankIndex < 0 || rankIndex > 8) {
        return null;
    }
    return FULLWIDTH_DIGITS[file] + KANJI_RANKS[rankIndex];
}

/**
 * USI 指し手を日本語表示に変換する
 * - 移動: '7g7f' → '７七→７六'、成り '8h2b+' → '８八→２二成'
 * - 打ち: 'P*5e' → '５五歩打'
 * @param {string | null} usi
 * @returns {string | null} 変換不能なら null
 */
export function formatUsiMove(usi) {
    if (typeof usi !== 'string') return null;

    const dropMatch = usi.match(/^([PLNSGBR])\*([1-9][a-i])$/);
    if (dropMatch) {
        const square = formatSquare(dropMatch[2]);
        return square ? `${square}${DROP_PIECE_NAMES[dropMatch[1]]}打` : null;
    }

    const moveMatch = usi.match(/^([1-9][a-i])([1-9][a-i])(\+?)$/);
    if (moveMatch) {
        const from = formatSquare(moveMatch[1]);
        const to = formatSquare(moveMatch[2]);
        if (!from || !to) return null;
        return `${from}→${to}${moveMatch[3] ? '成' : ''}`;
    }

    return null;
}

/**
 * 悪手の1行説明を生成する
 * @param {{ moveText: string, bestMoveUsi: string | null,
 *           winrateBefore: number, winrateAfter: number }} mistake
 * @returns {string}
 */
export function explainMistake({ moveText, bestMoveUsi, winrateBefore, winrateAfter }) {
    const before = Math.round(winrateBefore * 100);
    const after = Math.round(winrateAfter * 100);
    const diff = before - after;
    const bestMoveText = formatUsiMove(bestMoveUsi);

    if (bestMoveText) {
        return `最善手 ${bestMoveText} なら勝率${before}%。実戦の ${moveText} で勝率${after}%(${diff}ポイント下落)`;
    }
    return `実戦の ${moveText} で勝率${before}%→${after}%(${diff}ポイント下落)`;
}
