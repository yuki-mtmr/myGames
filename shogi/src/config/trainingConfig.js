/**
 * trainingConfig - 訓練機能の全閾値・パラメータ集約
 *
 * ハードコード禁止(docs/design-principles.md 原則10)。
 * 各初期値の出典は docs/design-principles.md / docs/architecture.md を参照。
 */

export const trainingConfig = {
    // 評価値→勝率変換: 勝率 = 1 / (1 + exp(-eval / ponanzaC))
    // 出典: Ponanza 定数(通称)。lfics81.techblog.jp, tadaoyamaoka.hatenablog.com
    winrate: {
        ponanzaC: 600,
        // worker が mate を ±(30000 - n) の擬似 cp に変換して返すため、
        // この値以上は詰みスコアとみなす
        mateScoreThreshold: 29000,
    },

    // 悪手判定: 着手者視点の勝率下落幅(0-1)
    // 出典: lichess Advice の winning-chances 閾値(勝率換算 5%/10%/15%)を写像。
    // blunder のみ将棋の評価値の振れを考慮して 20% に引き上げ(運用調整前提)
    judgeThresholds: {
        inaccuracy: 0.05,
        mistake: 0.10,
        blunder: 0.20,
    },

    // 解析: WASM やねうら王はシングルコアで低速のため短めが既定
    analysis: {
        movetimeMs: 800,
    },

    // 局面フェーズ推定(手数ベースの簡易ヒューリスティック初期値)
    phase: {
        openingMaxPly: 30,
        endgameMinPly: 90,
    },

    // 癖認定: 同型タグの悪手が直近 windowGames 局で minOccurrences 回以上
    habit: {
        minOccurrences: 3,
        windowGames: 20,
    },

    // ドリル: 目標正答率 85%(Wilson et al. 2019, Nature Communications)
    // セッション 7 問 ≒ 10-15分(spacing effect: 短時間日次が長時間週1に優る)
    drill: {
        targetAccuracy: 0.85,
        sessionSize: 7,
    },

    // 再演モード: 最善手との勝率差で正解/惜しい/不正解を判定(独自初期値)。
    // 2回失敗で最善手を開示(エラー修正学習: 誤答直後の正解提示。PMC9345471)
    replay: {
        correctTolerance: 0.02,
        closeTolerance: 0.06,
        maxAttempts: 2,
        movetimeMs: 800,
    },

    // 通知: 対局中の悪手即時通知(要件2: 初期 ON、設定で OFF 可)
    notifications: {
        liveBlunderAlert: true,
    },
};
