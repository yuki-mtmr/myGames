/**
 * envelope - schemaVersion 付き封筒型 localStorage 読み書きの共通処理
 * (docs/architecture.md「スキーマ進化と容量」)
 */

export const SCHEMA_VERSION = 1;

/**
 * 封筒を読み込む。壊れていれば空で復帰する
 * @param {{ getItem: Function }} storage
 * @param {string} key
 * @returns {{ schemaVersion: number, records: Object[] }}
 */
export function loadEnvelope(storage, key) {
    try {
        const raw = storage.getItem(key);
        if (!raw) return { schemaVersion: SCHEMA_VERSION, records: [] };
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.records)) {
            throw new TypeError('invalid envelope');
        }
        return parsed;
    } catch (error) {
        console.warn(`envelope: corrupted data at ${key}, starting fresh:`, error);
        return { schemaVersion: SCHEMA_VERSION, records: [] };
    }
}

/**
 * 封筒を保存する
 * @param {{ setItem: Function }} storage
 * @param {string} key
 * @param {{ schemaVersion: number }} envelope - records 以外のメタを引き継ぐ
 * @param {Object[]} records
 */
export function saveEnvelope(storage, key, envelope, records) {
    storage.setItem(key, JSON.stringify({ ...envelope, records }));
}
