/**
 * GameStore - 対局サマリの永続化(v1: localStorage)
 *
 * 癖認定の「直近N局」ウィンドウと悪手率推移の算出に使う。
 * 全手の評価値列は持たない(容量剪定方針は docs/architecture.md)。
 */

import { loadEnvelope, saveEnvelope } from './envelope.js';

const STORAGE_KEY = 'shogi-training/games';
const REQUIRED_FIELDS = ['gameId', 'playedAt', 'totalPlies', 'mistakeCounts'];

export class GameStore {
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
     * 対局サマリを保存する(同一 gameId は上書き)
     * @param {{ gameId: string, playedAt: string, totalPlies: number,
     *           mistakeCounts: Object }} record
     * @returns {Object} 保存されたレコード
     */
    save(record) {
        for (const field of REQUIRED_FIELDS) {
            if (record[field] === undefined) {
                throw new TypeError(`GameRecord requires field: ${field}`);
            }
        }
        const saved = { ...record };
        const envelope = loadEnvelope(this._storage, STORAGE_KEY);
        const others = envelope.records.filter(r => r.gameId !== record.gameId);
        saveEnvelope(this._storage, STORAGE_KEY, envelope, [...others, saved]);
        return saved;
    }

    /** @returns {Object[]} 全対局サマリ */
    findAll() {
        return loadEnvelope(this._storage, STORAGE_KEY).records;
    }

    /**
     * 直近 n 局の gameId を新しい順に返す
     * @param {number} n
     * @returns {string[]}
     */
    recentGameIds(n) {
        return this.findAll()
            .slice()
            .sort((a, b) => String(b.playedAt).localeCompare(String(a.playedAt)))
            .slice(0, n)
            .map(r => r.gameId);
    }
}
