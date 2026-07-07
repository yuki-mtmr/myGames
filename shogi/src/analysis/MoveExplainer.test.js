import { describe, it, expect } from 'vitest';
import { formatUsiMove, explainMistake } from './MoveExplainer.js';

describe('formatUsiMove', () => {
    it('通常の移動 7g7f を「７七→７六」に変換する', () => {
        expect(formatUsiMove('7g7f')).toBe('７七→７六');
    });

    it('成りの移動 8h2b+ を「８八→２二成」に変換する', () => {
        expect(formatUsiMove('8h2b+')).toBe('８八→２二成');
    });

    it('駒打ち P*5e を「５五歩打」に変換する', () => {
        expect(formatUsiMove('P*5e')).toBe('５五歩打');
    });

    it('各駒種の打ちを変換する', () => {
        expect(formatUsiMove('R*2h')).toBe('２八飛打');
        expect(formatUsiMove('G*4i')).toBe('４九金打');
    });

    it('不正なUSI文字列は null を返す', () => {
        expect(formatUsiMove('')).toBeNull();
        expect(formatUsiMove('xyz')).toBeNull();
        expect(formatUsiMove(null)).toBeNull();
    });
});

describe('explainMistake', () => {
    const input = {
        moveText: '５八金',
        bestMoveUsi: '7g7f',
        winrateBefore: 0.62,
        winrateAfter: 0.48,
    };

    it('最善手・実戦手・勝率変化を含む1行説明を生成する', () => {
        const text = explainMistake(input);
        expect(text).toContain('７七→７六');
        expect(text).toContain('５八金');
        expect(text).toContain('62%');
        expect(text).toContain('48%');
    });

    it('最善手が不明(null)でも勝率変化のみで説明を生成する', () => {
        const text = explainMistake({ ...input, bestMoveUsi: null });
        expect(text).toContain('５八金');
        expect(text).toContain('48%');
    });
});
