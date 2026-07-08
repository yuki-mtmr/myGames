// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sfenToSavedState } from './ReplayMode.js';

// 先手が歩2枚、後手が角1枚を持っている局面
const SFEN_WITH_HANDS =
    'lnsgkgsnl/1r7/p1ppppppp/1p7/9/2P6/PP1PPPPPP/7R1/LNSGKGSNL b 2Pb 1';

describe('sfenToSavedState', () => {
    it('持ち駒は game.js/DOMRenderer が期待する文字列配列になる(バグ再現)', () => {
        const state = sfenToSavedState(SFEN_WITH_HANDS);
        // オブジェクト({type:...})のままだと駒台に [object Object] が表示される
        expect(state.playerCaptured).toEqual(['歩', '歩']);
        expect(state.cpuCaptured).toEqual(['角']);
    });

    it('盤面・手番・履歴の初期形を持つ', () => {
        const state = sfenToSavedState(SFEN_WITH_HANDS);
        expect(state.currentPlayer).toBe('player');
        expect(state.board).toHaveLength(9);
        expect(state.sfenHistory).toEqual([SFEN_WITH_HANDS]);
        expect(state.gameOver).toBe(false);
    });
});
