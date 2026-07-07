import { describe, it, expect, beforeEach } from 'vitest';
import { DrillStore } from './DrillStore.js';

function createMemoryStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
    };
}

describe('DrillStore', () => {
    let store;

    beforeEach(() => {
        store = new DrillStore(createMemoryStorage());
    });

    it('ドリル問題を保存して一覧取得できる', () => {
        store.save({ id: 'd1', mistakeId: 'm1', habitTagKey: 'k1', sfenBefore: 's', fsrs: null });
        expect(store.findAll()).toHaveLength(1);
    });

    it('同じ id の保存は上書き(FSRS状態の更新)', () => {
        store.save({ id: 'd1', mistakeId: 'm1', habitTagKey: 'k1', sfenBefore: 's', fsrs: null });
        store.save({ id: 'd1', mistakeId: 'm1', habitTagKey: 'k1', sfenBefore: 's',
                     fsrs: { stability: 3 } });
        expect(store.findAll()).toHaveLength(1);
        expect(store.findAll()[0].fsrs.stability).toBe(3);
    });

    it('habitTagKey で絞り込める', () => {
        store.save({ id: 'd1', mistakeId: 'm1', habitTagKey: 'k1', sfenBefore: 's', fsrs: null });
        store.save({ id: 'd2', mistakeId: 'm2', habitTagKey: 'k2', sfenBefore: 's', fsrs: null });
        expect(store.findAll({ habitTagKey: 'k2' })).toHaveLength(1);
    });

    it('必須フィールド欠落は例外を投げる', () => {
        expect(() => store.save({ id: 'd1' })).toThrow();
    });
});
