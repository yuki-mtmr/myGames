/**
 * ReviewNavigator - 検討モードの局面ナビゲーション(純粋関数)
 *
 * 対局中に記録した SFEN 列(初期局面+各手後)の上を移動する読み取り専用の
 * カーソル。盤面描画・対局状態には一切触れない。
 */

function clampIndex(index, max) {
    return Math.min(max, Math.max(0, index));
}

/**
 * @param {{ sfens: string[], moveTexts: string[] }} record
 * @returns {{ sfens: string[], moveTexts: string[], index: number }}
 */
export function createReviewState({ sfens, moveTexts }) {
    if (!Array.isArray(sfens) || !Array.isArray(moveTexts) ||
        sfens.length !== moveTexts.length + 1) {
        throw new RangeError(
            `sfens must contain initial position + one per move: ` +
            `sfens=${sfens?.length}, moveTexts=${moveTexts?.length}`
        );
    }
    return { sfens, moveTexts, index: sfens.length - 1 };
}

export function goNext(state) {
    return { ...state, index: clampIndex(state.index + 1, state.sfens.length - 1) };
}

export function goPrev(state) {
    return { ...state, index: clampIndex(state.index - 1, state.sfens.length - 1) };
}

export function goFirst(state) {
    return { ...state, index: 0 };
}

export function goLast(state) {
    return { ...state, index: state.sfens.length - 1 };
}

export function goTo(state, index) {
    return { ...state, index: clampIndex(index, state.sfens.length - 1) };
}

/**
 * 現在の局面情報を返す
 * @returns {{ sfen: string, ply: number, moveText: string | null }}
 */
export function currentPosition(state) {
    return {
        sfen: state.sfens[state.index],
        ply: state.index,
        moveText: state.index === 0 ? null : state.moveTexts[state.index - 1],
    };
}
