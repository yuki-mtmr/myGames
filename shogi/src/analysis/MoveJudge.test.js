import { describe, it, expect } from 'vitest';
import { judgeMove, SEVERITY } from './MoveJudge.js';

describe('judgeMove', () => {
    it('勝率下落が閾値未満なら severity は null', () => {
        const result = judgeMove({ winrateBefore: 0.50, winrateAfter: 0.48 });
        expect(result.severity).toBeNull();
        expect(result.drop).toBeCloseTo(0.02, 10);
    });

    it('下落5%以上は疑問手(inaccuracy)', () => {
        expect(judgeMove({ winrateBefore: 0.50, winrateAfter: 0.45 }).severity)
            .toBe(SEVERITY.INACCURACY);
    });

    it('下落10%以上は悪手(mistake)', () => {
        expect(judgeMove({ winrateBefore: 0.60, winrateAfter: 0.50 }).severity)
            .toBe(SEVERITY.MISTAKE);
    });

    it('下落20%以上は大悪手(blunder)', () => {
        expect(judgeMove({ winrateBefore: 0.70, winrateAfter: 0.45 }).severity)
            .toBe(SEVERITY.BLUNDER);
    });

    it('勝率が上がった手は severity null で drop は負値', () => {
        const result = judgeMove({ winrateBefore: 0.40, winrateAfter: 0.55 });
        expect(result.severity).toBeNull();
        expect(result.drop).toBeLessThan(0);
    });

    it('閾値を上書きできる', () => {
        const thresholds = { inaccuracy: 0.01, mistake: 0.02, blunder: 0.03 };
        expect(judgeMove({ winrateBefore: 0.50, winrateAfter: 0.46 }, thresholds).severity)
            .toBe(SEVERITY.BLUNDER);
    });

    it('勝率が範囲外(0-1)や非数なら例外を投げる', () => {
        expect(() => judgeMove({ winrateBefore: 1.5, winrateAfter: 0.5 })).toThrow();
        expect(() => judgeMove({ winrateBefore: NaN, winrateAfter: 0.5 })).toThrow();
    });
});
