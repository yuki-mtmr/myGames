import { describe, it, expect } from 'vitest';
import { SfenConverter } from './SfenConverter.js';

const INITIAL = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';

describe('boardToSfen の持ち駒シリアライズ', () => {
    it('game.js 形式(文字列配列)の持ち駒が SFEN に出力される(バグ再現)', () => {
        const { board } = SfenConverter.sfenToBoard(INITIAL);
        const sfen = SfenConverter.boardToSfen(board, ['歩'], ['角'], 'player');
        const hand = sfen.split(' ')[2];
        expect(hand).toBe('Pb');
    });

    it('複数枚は枚数付きで出力される', () => {
        const { board } = SfenConverter.sfenToBoard(INITIAL);
        const sfen = SfenConverter.boardToSfen(board, ['歩', '歩', '銀'], [], 'player');
        expect(sfen.split(' ')[2]).toBe('S2P');
    });

    it('オブジェクト形式({type})の持ち駒も引き続き扱える', () => {
        const { board } = SfenConverter.sfenToBoard(INITIAL);
        const sfen = SfenConverter.boardToSfen(board, [{ type: '歩' }], [], 'player');
        expect(sfen.split(' ')[2]).toBe('P');
    });

    it('成駒の持ち駒は基底の駒として出力される(と=歩)', () => {
        const { board } = SfenConverter.sfenToBoard(INITIAL);
        const sfen = SfenConverter.boardToSfen(board, ['と'], [], 'player');
        expect(sfen.split(' ')[2]).toBe('P');
    });

    it('往復変換が成立する(hand付きSFEN → board → SFEN)', () => {
        const withHands = 'lnsgkgsnl/1r7/p1ppppbpp/1p7/9/2P6/PP1PPPPPP/7R1/LNSGKGSNL b Pb 1';
        const { board, playerCaptured, cpuCaptured, currentPlayer } =
            SfenConverter.sfenToBoard(withHands);
        const roundTrip = SfenConverter.boardToSfen(
            board, playerCaptured, cpuCaptured, currentPlayer
        );
        expect(roundTrip.split(' ')[2]).toBe('Pb');
    });
});
