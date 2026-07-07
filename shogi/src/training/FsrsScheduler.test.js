import { describe, it, expect } from 'vitest';
import { reviewItem, isDue } from './FsrsScheduler.js';

const NOW = '2026-07-08T00:00:00.000Z';
const dayMs = 24 * 60 * 60 * 1000;

describe('reviewItem', () => {
    it('初回正解: 安定度=初期値(3日)で期日が約3日後になる', () => {
        const state = reviewItem(null, { correct: true, now: NOW });
        expect(state.stability).toBe(3);
        expect(state.reps).toBe(1);
        expect(state.lapses).toBe(0);
        const expected = new Date(NOW).getTime() + 3 * dayMs;
        expect(new Date(state.due).getTime()).toBe(expected);
    });

    it('初回不正解: 安定度は短く(0.5日)、lapses が付く', () => {
        const state = reviewItem(null, { correct: false, now: NOW });
        expect(state.stability).toBe(0.5);
        expect(state.lapses).toBe(1);
    });

    it('復習正解で間隔が伸びる(安定度が増加する)', () => {
        const first = reviewItem(null, { correct: true, now: NOW });
        const second = reviewItem(first, { correct: true, now: first.due });
        expect(second.stability).toBeGreaterThan(first.stability);
        expect(second.reps).toBe(2);
    });

    it('復習不正解で安定度が縮み、難易度が上がる', () => {
        const first = reviewItem(null, { correct: true, now: NOW });
        const failed = reviewItem(first, { correct: false, now: first.due });
        expect(failed.stability).toBeLessThan(first.stability);
        expect(failed.lapses).toBe(1);
        expect(failed.difficulty).toBeGreaterThan(first.difficulty);
    });

    it('難易度は上下限にクランプされる', () => {
        let state = reviewItem(null, { correct: false, now: NOW });
        for (let i = 0; i < 20; i++) {
            state = reviewItem(state, { correct: false, now: NOW });
        }
        expect(state.difficulty).toBeLessThanOrEqual(10);

        let easy = reviewItem(null, { correct: true, now: NOW });
        for (let i = 0; i < 20; i++) {
            easy = reviewItem(easy, { correct: true, now: NOW });
        }
        expect(easy.difficulty).toBeGreaterThanOrEqual(1);
    });

    it('入力 state を変異させない(イミュータブル)', () => {
        const first = reviewItem(null, { correct: true, now: NOW });
        const snapshot = { ...first };
        reviewItem(first, { correct: false, now: NOW });
        expect(first).toEqual(snapshot);
    });

    it('パラメータを上書きできる', () => {
        const state = reviewItem(null, { correct: true, now: NOW },
            { initialStabilityCorrect: 10 });
        expect(state.stability).toBe(10);
    });
});

describe('isDue', () => {
    it('未学習(state無し)は常に出題対象', () => {
        expect(isDue(null, NOW)).toBe(true);
        expect(isDue(undefined, NOW)).toBe(true);
    });

    it('期日を過ぎていれば true、未来なら false', () => {
        const past = { due: '2026-07-07T00:00:00.000Z' };
        const future = { due: '2026-07-09T00:00:00.000Z' };
        expect(isDue(past, NOW)).toBe(true);
        expect(isDue(future, NOW)).toBe(false);
    });
});
