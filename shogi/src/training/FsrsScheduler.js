/**
 * FsrsScheduler - 間隔反復スケジューラ(FSRS簡易版、純粋関数)
 *
 * FSRS の3変数(難易度/安定度/想起確率)の設計を、2値評価(正解/不正解)向けに
 * 簡略化したもの。パラメータは trainingConfig.fsrs(設定化・出典コメント参照)。
 */

import { trainingConfig } from '../config/trainingConfig.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * 解答結果を反映した新しい FSRS 状態を返す(入力は変異させない)
 * @param {Object|null} state - 現在の状態(未学習なら null)
 * @param {{ correct: boolean, now: string|Date }} review
 * @param {Object} [params] - trainingConfig.fsrs の上書き
 * @returns {{ difficulty: number, stability: number, due: string,
 *             reps: number, lapses: number, lastReviewedAt: string }}
 */
export function reviewItem(state, { correct, now }, params = {}) {
    const p = { ...trainingConfig.fsrs, ...params };
    const nowMs = new Date(now).getTime();
    if (!Number.isFinite(nowMs)) {
        throw new TypeError(`invalid now: ${now}`);
    }

    let difficulty, stability, reps, lapses;

    if (!state) {
        difficulty = p.difficultyInit + (correct ? -p.difficultyStepDown : p.difficultyStepUp);
        stability = correct ? p.initialStabilityCorrect : p.initialStabilityWrong;
        reps = 1;
        lapses = correct ? 0 : 1;
    } else if (correct) {
        difficulty = state.difficulty - p.difficultyStepDown;
        // 易しい問題ほど間隔が速く伸びる
        const growth = 1 + (p.growthBase - 1) *
            (p.difficultyMax - state.difficulty + 1) / p.difficultyMax;
        stability = state.stability * growth;
        reps = state.reps + 1;
        lapses = state.lapses;
    } else {
        difficulty = state.difficulty + p.difficultyStepUp;
        stability = Math.max(p.initialStabilityWrong, state.stability * p.lapseFactor);
        reps = state.reps + 1;
        lapses = state.lapses + 1;
    }

    difficulty = clamp(difficulty, p.difficultyMin, p.difficultyMax);
    stability = Math.min(stability, p.maxIntervalDays);

    return {
        difficulty,
        stability,
        due: new Date(nowMs + stability * DAY_MS).toISOString(),
        reps,
        lapses,
        lastReviewedAt: new Date(nowMs).toISOString(),
    };
}

/**
 * 出題期日が来ているか(未学習は常に true)
 * @param {Object|null|undefined} state
 * @param {string|Date} now
 * @returns {boolean}
 */
export function isDue(state, now) {
    if (!state?.due) return true;
    return new Date(state.due).getTime() <= new Date(now).getTime();
}
