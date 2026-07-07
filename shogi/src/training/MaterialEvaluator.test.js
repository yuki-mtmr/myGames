import { describe, it, expect } from 'vitest';
import { materialBalance } from './MaterialEvaluator.js';

const INITIAL = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
// player の角が盤上から消え、cpu の持ち駒に入った局面(角をタダ取りされた)
const BISHOP_LOST = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/7R1/LNSGKGSNL b b 1';
// 逆: cpu の角を player がタダ取り
const BISHOP_WON = 'lnsgkgsnl/1r7/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b B 1';

describe('materialBalance', () => {
    it('初期局面は互角(0)', () => {
        expect(materialBalance(INITIAL)).toBe(0);
    });

    it('角をタダ取りされると -16(盤上-8 + 相手持ち駒+8)', () => {
        expect(materialBalance(BISHOP_LOST)).toBe(-16);
    });

    it('角をタダ取りすると +16', () => {
        expect(materialBalance(BISHOP_WON)).toBe(16);
    });

    it('成駒は基底の駒として数える(と金=歩)', () => {
        // player の歩1枚が と金(+P) になっただけの局面 → 互角のまま
        const withTokin = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/+PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
        expect(materialBalance(withTokin)).toBe(0);
    });

    it('不正なSFENは例外を投げる', () => {
        expect(() => materialBalance('broken')).toThrow();
    });
});
