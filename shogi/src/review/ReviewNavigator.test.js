import { describe, it, expect } from 'vitest';
import {
    createReviewState, goNext, goPrev, goFirst, goLast, goTo, currentPosition,
} from './ReviewNavigator.js';

const SFENS = ['pos0', 'pos1', 'pos2', 'pos3'];
const MOVES = ['７六歩', '８四歩', '３三角成'];

describe('ReviewNavigator', () => {
    it('初期状態は最終局面を指す', () => {
        const state = createReviewState({ sfens: SFENS, moveTexts: MOVES });
        expect(state.index).toBe(3);
        const pos = currentPosition(state);
        expect(pos.sfen).toBe('pos3');
        expect(pos.ply).toBe(3);
        expect(pos.moveText).toBe('３三角成');
    });

    it('goPrev / goNext で局面を移動できる(イミュータブル)', () => {
        const state = createReviewState({ sfens: SFENS, moveTexts: MOVES });
        const prev = goPrev(state);
        expect(prev.index).toBe(2);
        expect(state.index).toBe(3); // 元の state は不変
        expect(goNext(prev).index).toBe(3);
    });

    it('端でクランプされる(先頭より前・末尾より先に行かない)', () => {
        const state = createReviewState({ sfens: SFENS, moveTexts: MOVES });
        expect(goNext(state).index).toBe(3);
        expect(goPrev(goFirst(state)).index).toBe(0);
    });

    it('goFirst / goLast / goTo でジャンプできる', () => {
        const state = createReviewState({ sfens: SFENS, moveTexts: MOVES });
        expect(goFirst(state).index).toBe(0);
        expect(goLast(goFirst(state)).index).toBe(3);
        expect(goTo(state, 2).index).toBe(2);
        expect(goTo(state, 99).index).toBe(3);  // クランプ
        expect(goTo(state, -5).index).toBe(0);
    });

    it('初期局面(index 0)では moveText は null', () => {
        const state = goFirst(createReviewState({ sfens: SFENS, moveTexts: MOVES }));
        const pos = currentPosition(state);
        expect(pos.ply).toBe(0);
        expect(pos.moveText).toBeNull();
    });

    it('sfens と moveTexts の長さが不整合なら例外', () => {
        expect(() => createReviewState({ sfens: ['a'], moveTexts: ['x'] })).toThrow();
    });
});
