/**
 * DrillStore - 矯正ドリル問題の永続化(v1: localStorage)
 */

import { loadEnvelope, saveEnvelope } from './envelope.js';

const STORAGE_KEY = 'shogi-training/drills';
const REQUIRED_FIELDS = ['id', 'mistakeId', 'habitTagKey', 'sfenBefore'];

export class DrillStore {
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
     * ドリル問題を保存する(同一 id は上書き = FSRS状態の更新)
     * @param {Object} item - DrillItem
     * @returns {Object}
     */
    save(item) {
        for (const field of REQUIRED_FIELDS) {
            if (item[field] === undefined) {
                throw new TypeError(`DrillItem requires field: ${field}`);
            }
        }
        const saved = { ...item };
        const envelope = loadEnvelope(this._storage, STORAGE_KEY);
        const others = envelope.records.filter(r => r.id !== item.id);
        saveEnvelope(this._storage, STORAGE_KEY, envelope, [...others, saved]);
        return saved;
    }

    /**
     * @param {{ habitTagKey?: string }} [filters]
     * @returns {Object[]}
     */
    findAll(filters = {}) {
        const { records } = loadEnvelope(this._storage, STORAGE_KEY);
        if (filters.habitTagKey !== undefined) {
            return records.filter(r => r.habitTagKey === filters.habitTagKey);
        }
        return records;
    }
}
