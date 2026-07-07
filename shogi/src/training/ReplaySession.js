/**
 * ReplaySession - 再演モード1問ぶんの状態機械
 *
 * 悪手局面(MistakeRecord)を出題し、ユーザーの代替手をエンジン評価で判定する。
 * maxAttempts 回失敗で最善手を開示する(エラー修正学習)。
 * 盤面操作・描画は持たない(UI 層が sfenAfter/gameOver を渡す)。
 */

import { evalToWinrate } from '../analysis/EvalToWinrate.js';
import { judgeReplayAnswer, REPLAY_RESULT } from './ReplayJudge.js';
import { trainingConfig } from '../config/trainingConfig.js';

export class ReplaySession {
    /**
     * @param {{ sfenBefore: string, bestMove: string|null, winrateBefore: number,
     *           moveText: string }} mistake - 出題元の MistakeRecord
     * @param {{ engine: { getBestMove: Function }, config?: Object }} deps
     */
    constructor(mistake, { engine, config = {} }) {
        if (!engine || typeof engine.getBestMove !== 'function') {
            throw new TypeError('engine with getBestMove(sfen, options) is required');
        }
        this._mistake = mistake;
        this._engine = engine;
        this._config = { ...trainingConfig.replay, ...config };
        this._attemptsUsed = 0;
        this._finished = false;
    }

    get finished() {
        return this._finished;
    }

    /**
     * ユーザーの代替手を判定する
     * @param {{ sfenAfter: string, gameOver: boolean }} answer -
     *   着手後局面のSFENと、その着手で終局(詰み等)したか
     * @returns {Promise<Object>} outcome
     */
    async submitAnswer({ sfenAfter, gameOver }) {
        if (this._finished) {
            throw new Error('ReplaySession is already finished');
        }

        // 出題局面は自分の手番なので、詰ませた=勝ち=文句なしの正解
        if (gameOver) {
            return this._conclude(REPLAY_RESULT.CORRECT, null);
        }

        let answerWinrate;
        try {
            // 着手後は相手番: score を符号反転して着手者視点の勝率にする
            const { score } = await this._engine.getBestMove(sfenAfter, {
                time: this._config.movetimeMs,
            });
            answerWinrate = evalToWinrate(-score);
        } catch (error) {
            console.warn('Replay answer evaluation failed:', error);
            return {
                result: 'error',
                finished: false,
                revealBestMove: false,
                attemptsLeft: this._config.maxAttempts - this._attemptsUsed,
                answerWinrate: null,
            };
        }

        const result = judgeReplayAnswer(
            { bestWinrate: this._mistake.winrateBefore, answerWinrate },
            this._config
        );

        if (result === REPLAY_RESULT.CORRECT) {
            return this._conclude(result, answerWinrate);
        }

        this._attemptsUsed += 1;
        if (this._attemptsUsed >= this._config.maxAttempts) {
            return this._conclude(result, answerWinrate);
        }

        return {
            result,
            finished: false,
            revealBestMove: false,
            attemptsLeft: this._config.maxAttempts - this._attemptsUsed,
            answerWinrate,
        };
    }

    /** @private 終了 outcome を生成する */
    _conclude(result, answerWinrate) {
        this._finished = true;
        const failed = result !== REPLAY_RESULT.CORRECT;
        return {
            result,
            finished: true,
            revealBestMove: failed,
            bestMove: failed ? this._mistake.bestMove : null,
            attemptsLeft: 0,
            answerWinrate,
        };
    }
}
