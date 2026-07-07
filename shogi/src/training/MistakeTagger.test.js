import { describe, it, expect } from 'vitest';
import { tagPhase } from './MistakeTagger.js';

describe('tagPhase', () => {
    it('序盤: 30手目以内は opening', () => {
        expect(tagPhase(1)).toBe('opening');
        expect(tagPhase(30)).toBe('opening');
    });

    it('中盤: 31〜89手目は middlegame', () => {
        expect(tagPhase(31)).toBe('middlegame');
        expect(tagPhase(89)).toBe('middlegame');
    });

    it('終盤: 90手目以降は endgame', () => {
        expect(tagPhase(90)).toBe('endgame');
        expect(tagPhase(140)).toBe('endgame');
    });

    it('閾値を設定で上書きできる', () => {
        const config = { openingMaxPly: 10, endgameMinPly: 20 };
        expect(tagPhase(11, config)).toBe('middlegame');
        expect(tagPhase(20, config)).toBe('endgame');
    });

    it('不正な手数は例外を投げる', () => {
        expect(() => tagPhase(0)).toThrow();
        expect(() => tagPhase(-1)).toThrow();
    });
});
