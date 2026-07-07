/**
 * MistakeStore - 悪手レコードの永続化(v1: localStorage)
 *
 * 保存形式は schemaVersion 付き封筒型 { schemaVersion, records }
 * (docs/architecture.md「スキーマ進化と容量」)。
 * データ量増加後は同一 IF のまま IndexedDB 実装に差し替える。
 */

const STORAGE_KEY = 'shogi-training/mistakes';
const SCHEMA_VERSION = 1;
const REQUIRED_FIELDS = ['gameId', 'ply', 'severity', 'tags'];

function generateId() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return `m-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export class MistakeStore {
    /**
     * @param {{ getItem: Function, setItem: Function }} storage - localStorage 互換
     */
    constructor(storage = globalThis.localStorage) {
        if (!storage || typeof storage.getItem !== 'function') {
            throw new TypeError('storage with getItem/setItem is required');
        }
        this._storage = storage;
    }

    /**
     * 悪手レコードを保存する(入力は変異させない)
     * @param {Object} record - MistakeRecord(id/createdAt はここで付与)
     * @returns {Object} 保存されたレコード
     */
    save(record) {
        for (const field of REQUIRED_FIELDS) {
            if (record[field] === undefined) {
                throw new TypeError(`MistakeRecord requires field: ${field}`);
            }
        }

        const saved = {
            ...record,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };

        const envelope = this._load();
        this._storage.setItem(STORAGE_KEY, JSON.stringify({
            ...envelope,
            records: [...envelope.records, saved],
        }));
        return saved;
    }

    /**
     * 悪手レコードを取得する
     * @param {{ gameId?: string }} [filters]
     * @returns {Object[]}
     */
    findAll(filters = {}) {
        const { records } = this._load();
        if (filters.gameId !== undefined) {
            return records.filter(r => r.gameId === filters.gameId);
        }
        return records;
    }

    /** @private 封筒を読み込む。壊れていれば空で復帰 */
    _load() {
        try {
            const raw = this._storage.getItem(STORAGE_KEY);
            if (!raw) return { schemaVersion: SCHEMA_VERSION, records: [] };
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed.records)) {
                throw new TypeError('invalid envelope');
            }
            return parsed;
        } catch (error) {
            console.warn('MistakeStore: corrupted data, starting fresh:', error);
            return { schemaVersion: SCHEMA_VERSION, records: [] };
        }
    }
}
