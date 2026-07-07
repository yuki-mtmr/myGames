import { describe, it, expect } from 'vitest';
import { selectDrillItems } from './DrillSelector.js';

const NOW = '2026-07-08T00:00:00.000Z';

function item(id, fsrs) {
    return { id, fsrs };
}

describe('selectDrillItems', () => {
    it('期日到来分を古い順に選び、次に未学習を混ぜる', () => {
        const items = [
            item('new1', null),
            item('due-late', { due: '2026-07-07T12:00:00Z' }),
            item('due-early', { due: '2026-07-05T00:00:00Z' }),
            item('future', { due: '2026-07-20T00:00:00Z' }),
        ];
        const selected = selectDrillItems(items, { now: NOW, sessionSize: 3 });
        expect(selected.map(i => i.id)).toEqual(['due-early', 'due-late', 'new1']);
    });

    it('sessionSize で打ち切る', () => {
        const items = [
            item('a', { due: '2026-07-01T00:00:00Z' }),
            item('b', { due: '2026-07-02T00:00:00Z' }),
            item('c', null),
        ];
        expect(selectDrillItems(items, { now: NOW, sessionSize: 2 })).toHaveLength(2);
    });

    it('期日未来の問題は選ばない', () => {
        const items = [item('future', { due: '2099-01-01T00:00:00Z' })];
        expect(selectDrillItems(items, { now: NOW, sessionSize: 5 })).toHaveLength(0);
    });
});
