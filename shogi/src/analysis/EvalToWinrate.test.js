import { describe, it, expect } from 'vitest';
import { evalToWinrate, isMateScore } from './EvalToWinrate.js';

describe('evalToWinrate', () => {
    it('評価値0は勝率0.5になる', () => {
        expect(evalToWinrate(0)).toBeCloseTo(0.5, 10);
    });

    it('評価値+600(Ponanza定数1個分)は約73.1%になる', () => {
        // 1 / (1 + exp(-1)) = 0.73105...
        expect(evalToWinrate(600)).toBeCloseTo(0.7310585786, 6);
    });

    it('正負対称である', () => {
        expect(evalToWinrate(300) + evalToWinrate(-300)).toBeCloseTo(1.0, 10);
    });

    it('詰みスコア(±30000近傍)は勝率がほぼ0/1に飽和する', () => {
        expect(evalToWinrate(29990)).toBeGreaterThan(0.999);
        expect(evalToWinrate(-29990)).toBeLessThan(0.001);
    });

    it('ponanzaC を変更できる', () => {
        expect(evalToWinrate(300, { ponanzaC: 300 })).toBeCloseTo(
            evalToWinrate(600, { ponanzaC: 600 }), 10
        );
    });

    it('数値以外・非有限値は例外を投げる', () => {
        expect(() => evalToWinrate(NaN)).toThrow();
        expect(() => evalToWinrate('100')).toThrow();
        expect(() => evalToWinrate(Infinity)).toThrow();
    });
});

describe('isMateScore', () => {
    it('詰み域のスコアを判定する', () => {
        expect(isMateScore(29995)).toBe(true);
        expect(isMateScore(-29995)).toBe(true);
        expect(isMateScore(5000)).toBe(false);
    });
});
