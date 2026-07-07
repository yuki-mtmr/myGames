import { describe, it, expect, beforeEach } from 'vitest';
import { GameStore } from './GameStore.js';

function createMemoryStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
    };
}

describe('GameStore', () => {
    let store;

    beforeEach(() => {
        store = new GameStore(createMemoryStorage());
    });

    it('対局サマリを保存して一覧取得できる', () => {
        store.save({ gameId: 'g1', playedAt: '2026-07-01T00:00:00Z', totalPlies: 100,
                     mistakeCounts: { inaccuracy: 1, mistake: 2, blunder: 0 } });
        const all = store.findAll();
        expect(all).toHaveLength(1);
        expect(all[0].totalPlies).toBe(100);
    });

    it('recentGameIds は新しい順に最大 n 件の gameId を返す', () => {
        store.save({ gameId: 'g1', playedAt: '2026-07-01T00:00:00Z', totalPlies: 10, mistakeCounts: {} });
        store.save({ gameId: 'g3', playedAt: '2026-07-03T00:00:00Z', totalPlies: 10, mistakeCounts: {} });
        store.save({ gameId: 'g2', playedAt: '2026-07-02T00:00:00Z', totalPlies: 10, mistakeCounts: {} });

        expect(store.recentGameIds(2)).toEqual(['g3', 'g2']);
        expect(store.recentGameIds(10)).toEqual(['g3', 'g2', 'g1']);
    });

    it('同じ gameId の保存は上書きになる(重複しない)', () => {
        store.save({ gameId: 'g1', playedAt: '2026-07-01T00:00:00Z', totalPlies: 10, mistakeCounts: {} });
        store.save({ gameId: 'g1', playedAt: '2026-07-01T00:00:00Z', totalPlies: 12, mistakeCounts: {} });
        expect(store.findAll()).toHaveLength(1);
        expect(store.findAll()[0].totalPlies).toBe(12);
    });

    it('必須フィールド欠落は例外を投げる', () => {
        expect(() => store.save({ totalPlies: 10 })).toThrow();
    });

    it('壊れた保存データでも findAll は空配列で復帰する', () => {
        const storage = createMemoryStorage();
        storage.setItem('shogi-training/games', 'not-json');
        expect(new GameStore(storage).findAll()).toEqual([]);
    });
});
