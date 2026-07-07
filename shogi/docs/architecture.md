# アーキテクチャ(将棋訓練場)

## 全体像

```
┌─ UI 層(4画面) ──────────────────────────────────────┐
│ play / review / dashboard / drill  (src/ui/)          │
└──────┬───────────────────────────────────────────────┘
┌──────┴─ ドメイン層 ───────────────────────────────────┐
│ analysis/  評価値→勝率変換・悪手判定・対局解析・説明生成   │
│ training/  タグ付け・癖認定・FSRS・出題選択              │
│ game.js    ルール(既存 ShogiGame。段階的に分割)          │
└──────┬───────────────────────────────┬───────────────┘
┌──────┴─ エンジン層 ─────────┐ ┌──────┴─ 永続化層 ──────┐
│ src/ai/ (既存)              │ │ src/storage/           │
│ YaneuraOuEngine(WASM/Worker)│ │ Repository 抽象         │
│ + analyzePosition() を追加   │ │ v1: localStorage       │
│ BuiltinEngine(フォールバック) │ │ v2: IndexedDB          │
└────────────────────────────┘ └────────────────────────┘
        設定: src/config/trainingConfig.js(全閾値を集約)
```

方針: **既存資産(game.js のルール実装・src/ai/ のエンジン統合・2D レンダラー)は
温存し、訓練機能は新規モジュールとして疎結合に追加**する。game.js(2262 行)の
分割は訓練機能が触る箇所(終局処理・着手記録)に限定して段階的に行う。

## モジュール構成

```
src/
├── config/
│   └── trainingConfig.js     # 全閾値・パラメータ(出典コメント付き)
├── analysis/
│   ├── EvalToWinrate.js      # 純粋関数: cp/mate → 勝率 [TDD]
│   ├── MoveJudge.js          # 純粋関数: 勝率差 → 判定 [TDD]
│   ├── GameAnalyzer.js       # 棋譜全手の解析オーケストレーション [TDD(engine mock)]
│   └── MoveExplainer.js      # 「なぜ悪手か」1行説明の生成 [TDD]
├── training/
│   ├── MistakeTagger.js      # 悪手のタグ推定(フェーズ/駒種/パターン) [TDD]
│   ├── HabitDetector.js      # タグ集計 → 癖認定 [TDD]
│   ├── FsrsScheduler.js      # 間隔反復(FSRS 簡易版) [TDD]
│   └── DrillSelector.js      # 今日の出題選択(85% ルール) [TDD]
├── storage/
│   ├── TrainingRepository.js       # 抽象 IF: findAll/findById/save/delete
│   └── LocalStorageRepository.js   # v1 実装(v2 で IndexedDB に差替え)
├── ai/    (既存。YaneuraOuEngine に解析用 API を追加)
├── renderers/ (既存)
└── ui/    (画面別モジュール。v1 は感想戦パネルのみ)
```

## エンジン統合(USI)

- エンジンは既存の `@mizarjp/yaneuraou.k-p`(Worker + WASM)を継続使用。
  COOP/COEP は既存の vite.config.js / coi-serviceworker 対応を維持。
- **局面データの取得方針(v1)**: 棋譜からの事後復元はしない(moveHistory は
  表示テキストのみで USI を持たないため復元不能)。代わりに対局中、
  `recordPosition()`(全着手経路で手番切替後に呼ばれる)で `getSfen()` を
  `sfenHistory` 配列にライブ記録する。「待った」(undo)時は同期して巻き戻す。
  GameAnalyzer は **SFEN 列と表示用 moveText 列だけ**で解析できる設計とし、
  指し手の USI 変換を不要にする(game.js への侵襲を最小化)。
- **v1 の解析 API**: 既存 `getBestMove(sfen, {time})` をそのまま解析に使う
  (1 局面 1 回、返り値の move が最善手、score が手番側視点評価値)。
  MultiPV による candidates[] 取得と scoreCp/scoreMate の構造化は v2 で
  worker に解析専用パスを追加して対応(既存パスは非破壊)。
- 解析時間: 既定 `movetimeMs: 800`(WASM はシングルコアで低速のため。
  trainingConfig で調整可)。1 局 100 手なら約 80 秒 → 解析中は
  プログレスバーを出し、逐次結果を追記表示する。
- BuiltinEngine(Minimax)フォールバック時は**悪手判定を無効化**する
  (Minimax の評価値は Ponanza 定数の cp スケールと非整合のため、
  精度警告だけでなく判定自体を出さない)。

## 悪手判定の定義

```
勝率(eval) = 1 / (1 + exp(-eval / PONANZA_C))        PONANZA_C = 600
mate 局面は 勝率 1.0 / 0.0 に飽和

drop の計算(視点の正規化が最重要):
  USI の score は「その局面の手番側視点」。着手前局面 pos[i] の手番=着手者、
  着手後局面 pos[i+1] の手番=相手。よって
    winrateBefore = 勝率(score_i)          … そのまま着手者視点
    winrateAfter  = 勝率(-score_{i+1})     … 符号反転して着手者視点に揃える
    drop = winrateBefore - winrateAfter
  正規化は GameAnalyzer に一元化し、二重反転をテストで防ぐ。
  UI 表示用の評価値列は別途「先手視点」に正規化する(偶数局面=先手番はそのまま、
  奇数局面=後手番は符号反転)。

判定(初期値):
  drop ≥ 0.05 → 疑問手(?!)   drop ≥ 0.10 → 悪手(?)   drop ≥ 0.20 → 大悪手(??)

mate の扱い(v1 の制約):
  現行 worker は mate を擬似 cp(±30000∓n)に潰して返す。勝率は 0/1 に飽和するため
  「詰み逃し」(勝率1→0.6)は大悪手として検出される一方、mate 圏内の距離変化は
  drop≈0 で判定対象外(意図した挙動として許容)。「+詰N」表記と scoreCp/scoreMate の
  構造化は v2 で worker に解析専用パスを新設して対応する(getBestMove は非破壊)。
```

- 根拠: lichess Advice の winning-chances 閾値(0.1/0.2/0.3、勝率換算
  5%/10%/15%)を将棋に写像。大悪手のみ 15%→20% に引き上げ
  (将棋は評価値の振れが大きく誤検知を抑えるため。運用データで再調整前提)。
- 全て `trainingConfig.judgeThresholds` に置き、設定画面から変更可能。

## データモデル(永続化)

```js
// 対局(既存セーブとは別系統。訓練データとして蓄積)
GameRecord {
  id, playedAt,
  sfens: [sfen...], moveTexts: [text...],   // 対局中にライブ記録した局面列
  result,   // enum: 'checkmate'|'resign'|'repetition'|'perpetual_check'|'stalemate'
  analysis: { engine, movetimeMs, evals: [{ply, scoreCp, winrate}] } | null
}

// 悪手(感想戦で自動保存)
MistakeRecord {
  id, gameId, ply,
  sfenBefore,                    // 出題局面(ドリル再利用の核)
  movePlayed, bestMove, pv,      // USI 形式
  winrateBefore, winrateAfter, drop,
  severity: 'inaccuracy' | 'mistake' | 'blunder',
  tags: {
    phase: 'opening' | 'middlegame' | 'endgame',
    pieceType,                   // 動かした駒種
    patterns: ['material_loss' | 'king_safety' | 'missed_tactic' | ...]
  },
  createdAt
}

// 癖(HabitDetector が MistakeRecord 集計から自動認定)
Habit {
  id, tagKey,                    // 例: 'endgame/king_safety'
  label,                         // 表示名(タグ辞書から生成)
  occurrences, windowGames,      // 例: 7回 / 直近20局
  status: 'active' | 'improving' | 'resolved',
  detectedAt, lastSeenAt
}

// ドリル問題(癖認定時に MistakeRecord から自動変換)
DrillItem {
  id, habitId, mistakeId,
  sfen, acceptableMoves: [usi...],   // 最善手+評価差が閾値内の手
  fsrs: { difficulty, stability, due, reps, lapses },
  history: [{answeredAt, correct, elapsedMs}]
}
```

- **癖 → ドリル自動変換フロー**(本アプリの差別化点):
  `MistakeRecord 保存 → HabitDetector が tagKey 別に直近 N 局を集計 →
  閾値(初期値: 3 回/20 局)超過で Habit 生成 → 属する MistakeRecord を
  DrillItem に変換して FSRS キューへ投入`。
  以後の同タグ悪手も自動でそのキューに合流する。
- Repository パターンで抽象化し、v1 は localStorage(キー
  `shogi-training/{games|mistakes|habits|drills}`)、データ量増加後に
  IndexedDB 実装へ差し替える。既存の対局セーブ(`shogiGameSave`)には触れない。
- **スキーマ進化と容量**(architect レビュー反映):
  - 各キーの保存形式は `{ schemaVersion: 1, records: [...] }` の封筒型とし、
    版上げ時はマイグレーション関数で変換する。
  - ID は `crypto.randomUUID()`。localStorage にトランザクションは無いため
    `MistakeRecord.gameId` は**弱参照**扱い(存在チェック必須)。UI の
    「局面へジャンプ」は MistakeRecord が内包する sfenBefore で自己完結させる。
  - GameRecord.analysis(evals 全手分)は直近 N 局のみ保持して剪定する。
    MistakeRecord は自己完結なので剪定の影響を受けない。

## trainingConfig(初期値と出典)

```js
export const trainingConfig = {
  winrate: { ponanzaC: 600 },              // Ponanza 定数
  judgeThresholds: { inaccuracy: 0.05, mistake: 0.10, blunder: 0.20 }, // lichess Advice 写像
  analysis: { movetimeMs: 800, multiPv: 2 },
  habit: { minOccurrences: 3, windowGames: 20 },   // 独自初期値(要運用調整)
  drill: { targetAccuracy: 0.85,           // Wilson et al. 2019 (85% rule)
           sessionSize: 7 },               // 10-15分/日(spacing effect)
  fsrs: { /* FSRS 簡易版パラメータ */ },
  notifications: { liveBlunderAlert: true }, // 要件2: 初期 ON、設定で OFF
}
```

## テスト戦略

- `[TDD]` 印のモジュールは全て純粋関数中心に設計し vitest でユニットテスト
  (RED→GREEN→REFACTOR)。エンジン依存の `GameAnalyzer` はエンジンを
  IF でモック注入。
- UI(レンダリング・レイアウト)は TDD opt-out(視覚検証で代替)。
- 既存 game.test.js は温存。訓練機能は game.js の内部に触れないため回帰リスク小。

## Phase 3(最小縦切り)のスコープ

1. `trainingConfig` / `EvalToWinrate` / `MoveJudge` / `MoveExplainer`(TDD)
2. `YaneuraOuEngine.analyzePosition()` + `GameAnalyzer`(TDD、engine mock)
3. 終局 → 「解析する」→ 悪手一覧(判定マーク+1 行説明)表示(UI、opt-out)
4. `MistakeRecord` の保存(タグは phase のみの最小実装)

v2 以降: 再演モード → タグ拡充+癖認定 → FSRS ドリル → ダッシュボード。
