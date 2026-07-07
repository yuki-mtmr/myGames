import { describe, it, expect, beforeEach } from 'vitest';
import { MistakeStore } from './MistakeStore.js';

/** localStorage 互換のインメモリモック */
function createMemoryStorage() {
    const map = new Map();
    return {
        getItem: (k) => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: (k) => map.delete(k),
    };
}

describe('MistakeStore', () => {
    let store;

    beforeEach(() => {
        store = new MistakeStore(createMemoryStorage());
    });

    it('悪手レコードを保存して一覧取得できる', () => {
        const record = store.save({
            gameId: 'g1', ply: 32, sfenBefore: 'sfen...',
            moveText: '５八金', bestMove: '7g7f',
            winrateBefore: 0.62, winrateAfter: 0.48, drop: 0.14,
            severity: 'mistake', tags: { phase: 'middlegame' },
        });

        expect(record.id).toBeTruthy();
        expect(record.createdAt).toBeTruthy();

        const all = store.findAll();
        expect(all).toHaveLength(1);
        expect(all[0].moveText).toBe('５八金');
    });

    it('保存は元オブジェクトを変異させない(イミュータブル)', () => {
        const input = { gameId: 'g1', ply: 1, severity: 'blunder', tags: {} };
        store.save(input);
        expect(input.id).toBeUndefined();
    });

    it('gameId で絞り込める', () => {
        store.save({ gameId: 'g1', ply: 1, severity: 'mistake', tags: {} });
        store.save({ gameId: 'g2', ply: 5, severity: 'blunder', tags: {} });
        expect(store.findAll({ gameId: 'g2' })).toHaveLength(1);
    });

    it('保存形式は schemaVersion 付きの封筒型である', () => {
        const storage = createMemoryStorage();
        const s = new MistakeStore(storage);
        s.save({ gameId: 'g1', ply: 1, severity: 'mistake', tags: {} });

        const raw = JSON.parse(storage.getItem('shogi-training/mistakes'));
        expect(raw.schemaVersion).toBe(1);
        expect(Array.isArray(raw.records)).toBe(true);
    });

    it('壊れた保存データがあっても findAll は空配列で復帰する', () => {
        const storage = createMemoryStorage();
        storage.setItem('shogi-training/mistakes', '{broken json');
        const s = new MistakeStore(storage);
        expect(s.findAll()).toEqual([]);
    });

    it('必須フィールド欠落は例外を投げる', () => {
        expect(() => store.save({ ply: 1 })).toThrow();
    });
});
