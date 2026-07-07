import { describe, it, expect } from 'vitest';
import { syncDrillItems } from './DrillSync.js';

const MISTAKES = [
    { id: 'm1', ply: 30, sfenBefore: 's1', moveText: '５八金', bestMove: '7g7f',
      winrateBefore: 0.6, tags: { phase: 'middlegame', patterns: ['material_loss'] } },
    { id: 'm2', ply: 40, sfenBefore: 's2', moveText: '４八銀', bestMove: '2g2f',
      winrateBefore: 0.55, tags: { phase: 'middlegame', patterns: ['material_loss'] } },
];
const HABIT = { tagKey: 'middlegame/material_loss', mistakeIds: ['m1', 'm2'] };

describe('syncDrillItems', () => {
    it('癖に属する悪手からドリル問題を生成する', () => {
        const created = syncDrillItems(HABIT, MISTAKES, []);
        expect(created).toHaveLength(2);
        expect(created[0]).toMatchObject({
            mistakeId: 'm1',
            habitTagKey: 'middlegame/material_loss',
            sfenBefore: 's1',
            bestMove: '7g7f',
            winrateBefore: 0.6,
            fsrs: null,
        });
        expect(created[0].id).toBeTruthy();
    });

    it('既存のドリル問題(同じ mistakeId)は重複生成しない', () => {
        const existing = [{ id: 'd1', mistakeId: 'm1', habitTagKey: HABIT.tagKey }];
        const created = syncDrillItems(HABIT, MISTAKES, existing);
        expect(created).toHaveLength(1);
        expect(created[0].mistakeId).toBe('m2');
    });

    it('mistakeIds に無い悪手は対象外', () => {
        const habit = { ...HABIT, mistakeIds: ['m1'] };
        expect(syncDrillItems(habit, MISTAKES, [])).toHaveLength(1);
    });
});
