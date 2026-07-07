import { describe, it, expect } from 'vitest';
import { detectHabits, habitLabel } from './HabitDetector.js';

function mistake(gameId, phase, patterns) {
    return { gameId, severity: 'mistake', tags: { phase, patterns } };
}

describe('detectHabits', () => {
    const recentGameIds = ['g1', 'g2', 'g3'];

    it('同型タグの悪手が閾値以上なら癖として認定する', () => {
        const mistakes = [
            mistake('g1', 'middlegame', ['material_loss']),
            mistake('g2', 'middlegame', ['material_loss']),
            mistake('g3', 'middlegame', ['material_loss']),
            mistake('g1', 'opening', ['missed_capture']),
        ];
        const habits = detectHabits(mistakes, { recentGameIds, minOccurrences: 3 });

        expect(habits).toHaveLength(1);
        expect(habits[0].tagKey).toBe('middlegame/material_loss');
        expect(habits[0].occurrences).toBe(3);
        expect(habits[0].label).toContain('中盤');
    });

    it('直近対局(recentGameIds)外の悪手は集計しない', () => {
        const mistakes = [
            mistake('old1', 'middlegame', ['material_loss']),
            mistake('old2', 'middlegame', ['material_loss']),
            mistake('g1', 'middlegame', ['material_loss']),
        ];
        expect(detectHabits(mistakes, { recentGameIds, minOccurrences: 3 }))
            .toHaveLength(0);
    });

    it('パターン無しの悪手は other として集計する', () => {
        const mistakes = [
            mistake('g1', 'endgame', []),
            mistake('g2', 'endgame', []),
            mistake('g3', 'endgame', undefined),
        ];
        const habits = detectHabits(mistakes, { recentGameIds, minOccurrences: 3 });
        expect(habits[0].tagKey).toBe('endgame/other');
    });

    it('発生回数の多い順に並ぶ', () => {
        const mistakes = [
            mistake('g1', 'opening', ['missed_capture']),
            mistake('g2', 'opening', ['missed_capture']),
            mistake('g3', 'opening', ['missed_capture']),
            mistake('g1', 'middlegame', ['material_loss']),
            mistake('g1', 'middlegame', ['material_loss']),
            mistake('g2', 'middlegame', ['material_loss']),
            mistake('g3', 'middlegame', ['material_loss']),
        ];
        const habits = detectHabits(mistakes, { recentGameIds, minOccurrences: 3 });
        expect(habits[0].tagKey).toBe('middlegame/material_loss');
        expect(habits[1].tagKey).toBe('opening/missed_capture');
    });
});

describe('habitLabel', () => {
    it('tagKey を日本語ラベルに変換する', () => {
        expect(habitLabel('middlegame/material_loss')).toBe('中盤の駒損');
        expect(habitLabel('endgame/missed_capture')).toBe('終盤の取れる駒の見落とし');
        expect(habitLabel('opening/other')).toBe('序盤のその他の悪手');
    });
});
