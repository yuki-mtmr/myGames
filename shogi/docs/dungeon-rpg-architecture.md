# ダンジョン将棋RPG 全体アーキテクチャ

本書は既存の将棋訓練アプリ(Vite + Vanilla JS)を「ダンジョン将棋RPG」へ全面改装するための全体設計書である。
文書間の優先順位: 横断定義(イベント名/型/スキーマ/主要数値)は [docs/dungeon-rpg-decisions.md](dungeon-rpg-decisions.md)(統一決定記録)が正準。データの完全形は [docs/dungeon-rpg-data-spec.md](dungeon-rpg-data-spec.md) が正準。本書はそれらに準拠した詳細設計であり、食い違う場合は decisions.md → data-spec.md → 本書 の順に優先する。

対象読者: 実装着手者。本書のシグネチャ・スキーマ・数値・ファイルパスをそのままコードへ落とし込める具体性を保つ。

---

## 1. 世界観とゲームループ概要

- プレイヤーは巨大ダンジョンを1階から登る。棋力がそのまま「強さ」であり、上の階ほど対局相手(AI)が強い。
- 対局中は盤面と並んで「戦闘ウィンドウ」(Canvas 2D)が表示され、自軍/相手軍のドット絵風スプライトが戦う様子を見せる。
- 評価値(勝率換算)の変動をダメージに換算し、ダメージ量に応じたモーションが発生する。
- 囲い(矢倉/美濃/穴熊/カニ囲い/銀冠)はJSONデータとして定義され、構築を検出すると戦闘ウィンドウの城グラフィックが変化する。
- 評価変動の原因(囲い破壊/攻め強化/駒得駒損/その他)を演出色で視覚的に区別する。
- 敗北時はローグライク的なペナルティなしで同じ階から再挑戦する(到達階層はlocalStorageにセーブ)。
- 既存の訓練機能(感想戦/再演/ドリル/ダッシュボード)は「町」の施設として再配置され、実装は無改修のまま流用する。

### ゲームループ(状態遷移の要旨)

```
title → town → dungeonMap → battle → (gameEnded) → town
                    ↑___________________________|
```

- `town`: 拠点。ダンジョン入口 + 施設ドア(軍師の間/修練の書庫)を持つ。
- `dungeonMap`: 到達階層の可視化・階層選択。
- `battle`: 対局本体 + 戦闘ウィンドウ。勝敗に関わらず終局後は `town` に戻る。
- 施設(感想戦/ダッシュボード)は `town` 上のオーバーレイパネルとして開閉する(独立シーンにしない)。

---

## 2. 全体アーキテクチャ

### 2.1 レイヤ図

```
┌────────────────────────────────────────────────────────────────┐
│ src/rpg/            シーン/FSM/施設オーケストレーション            │
│   SceneManager.js, BattleDirector.js, scenes/*,                 │
│   FacilityRegistry.js, TownScene.js                              │
└───────────────┬───────────────────────────────────────────────┘
                 │ enter()時に生成、exit()時に破棄
    ┌────────────┴─────────────┐
    ▼                           ▼
┌──────────────────────┐  ┌──────────────────────────────────────┐
│ 既存対局レイヤ(温存)    │  │ src/dungeon/  純粋ドメインロジック [TDD] │
│ game.js: ShogiGame    │─▶│  CastleDetector.js, castleDefinitions │
│ src/ai/*, renderers/* │  │  .json, DamageModel.js,               │
│ src/ui/*, storage/*   │  │  CauseClassifier.js,                  │
│ src/analysis/*        │  │  DungeonProgression.js, DungeonRating │
└──────────────────────┘  └───────────────┬───────────────────────┘
                                            │ 発行/購読
                                            ▼
                            ┌──────────────────────────────────────┐
                            │ src/battle/  Canvas描画・演出            │
                            │  BattleEventBus.js, ActorAnimationFSM │
                            │  .js, SpriteAtlas.js, BattleStage.js  │
                            │  BattleRenderer.js, battleTheme.js    │
                            └──────────────────────────────────────┘
```

依存の向き(厳守): `game.js → BattleEventBus ← src/rpg/*, src/dungeon/*, src/battle/*`。
`game.js` は `BattleEventBus` 型(`emit`メソッドを持つ任意オブジェクト、ダックタイピング)を知るのみで、`src/rpg/`・`src/dungeon/`・`src/battle/` の具象クラスを一切importしない。

### 2.2 新規ディレクトリ構成(正準)

既存の `src/analysis/` `src/training/` `src/storage/` `src/config/` の flat な慣習に合わせ、ネストしたサブディレクトリ(`src/rpg/events/` 等)は作らない。

| ディレクトリ | 役割 | 主なファイル |
|---|---|---|
| `src/dungeon/` | ダンジョン純粋ドメインロジック [TDD] | `CastleDetector.js`, `castleDefinitions.json`, `DamageModel.js`, `CauseClassifier.js`, `DungeonProgression.js`, `DungeonRating.js` |
| `src/battle/` | Canvas描画・演出 | `BattleEventBus.js`, `ActorAnimationFSM.js`, `SpriteAtlas.js`, `BattleStage.js`, `BattleRenderer.js`, `battleTheme.js`, `sprites/placeholder-atlas.json` |
| `src/rpg/` | シーン/FSM/施設オーケストレーション | `SceneManager.js`, `BattleDirector.js`, `scenes/*`, `FacilityRegistry.js`, `TownScene.js` |
| `src/storage/` | 永続化(既存慣習と同居) | `DungeonProgressStore.js`, `DungeonBattleStore.js`(既存 `envelope.js` 流用) |
| `src/config/` | 設定集約 | `dungeonConfig.js`, `battleConfig.js`(既存 `trainingConfig.js` と同居) |

**確定事項**:
- `BattleEventBus` は1クラスのみ、`src/battle/BattleEventBus.js` に置く。
- Storeは `src/storage/` に置く(既存 GameStore/MistakeStore/DrillStore と同居、`./envelope.js` を import)。progress/battles の2ストア構成。
- `dungeonConfig.js` は `src/config/` に置く。

既存の `game.js`, `src/ai/`, `src/renderers/`, `src/ui/`, `src/analysis/`, `src/training/`, `src/review/` は無改修(`game.js` へのイベント発行フック追加のみ許容、詳細は§4)。

### 2.3 シーン状態遷移(SceneManager FSM)

状態: `title` / `town` / `dungeonMap` / `battle`。hash: `#title` / `#town` / `#dungeon` / `#battle/floor/:n`。

```js
// src/rpg/SceneManager.js
/**
 * @typedef {Object} Scene
 * @property {(ctx: SceneContext) => Promise<void>|void} enter
 * @property {() => Promise<void>|void} exit
 */
export class SceneManager {
  constructor(opts /* { container: HTMLElement } */) {}
  register(name, scene) {}
  async transition(name, params = {}) {}
  start() {} // hashchangeリスナー登録 + 初期シーン解決
}
```

- 施設(感想戦/ダッシュボード/ドリル/再演)は独立シーンにしない。`town` シーン上のオーバーレイパネルとして既存 `AnalysisPanel`/`DashboardPanel`/`DrillMode`/`ReplayMode` を無改修で流用する(§6)。
- `town` → `dungeonMap` → 階層選択 → `battle`。
- `battle` → `town` の遷移は `SceneManager` が `gameEnded` イベントを購読して明示的に行う(旧`ReviewPanel`の MutationObserver自動遷移は廃止するが、populate ロジック自体は流用)。
- `#game-setup` の手動エンジン/強さ選択UIはRPGメインフローでは使わない(floorが自動決定、§5)。

`transition()` は前シーンの `exit()` → 新シーンの `enter()` の順で `await` 実行。`exit()` 内で当該シーンが生成した `BattleEventBus` の購読解除・`ShogiGame`/`renderer` の `dispose()` を行う。

### 2.4 `BattleScene.enter()` の要点(疑似コード)

```js
// src/rpg/scenes/BattleScene.js
async enter({ params }) {
  const floor = getFloorConfig(params.floorId);              // src/config/dungeonConfig.js
  const bus = new BattleEventBus();                          // src/battle/BattleEventBus.js
  this.bus = bus;
  aiEngineManager.setPreferredEngine(ENGINE_TYPES.YANEURAOU);
  await aiEngineManager.initialize();

  this.game = new ShogiGame('medium');                       // 既存コンストラクタ、difficulty固定
  this.game.setBattleEventBus(bus);                          // 新規注入(既存setRendererと同パターン)
  this.renderer = new DOMRenderer(/* 既存と同じ */);
  this.game.setRenderer(this.renderer);

  this.director = new BattleDirector({ bus, game: this.game, floor }); // src/rpg/BattleDirector.js
  this.stage = new BattleStage({ eventBus: bus });            // src/battle/BattleStage.js
  this.canvasRenderer = new BattleRenderer(
    document.getElementById('battle-canvas'), atlas, this.stage
  );

  bus.emit('gameStarted', {
    floorId: floor.floor, engineType: 'yaneuraou', sfenInitial: this.game.getSfen(),
  });
}
exit() {
  this.canvasRenderer?.stop();
  this.renderer?.dispose();
  // bus購読は明示的にunsubscribe(BattleDirector/BattleStageのdetach()を呼ぶ)
}
```

---

## 3. BattleEventBus イベントカタログ(正準)

1対局につき1バスインスタンス。`SceneManager` が `BattleScene.enter()` 時に生成し、`exit()` で破棄する。
全イベント名は **camelCase過去形**に統一(2ティア構成)。

```js
// src/battle/BattleEventBus.js
export class BattleEventBus {
  on(eventName, handler) {}   // -> unsubscribe関数
  off(eventName, handler) {}
  emit(eventName, payload) {} // 同期。ハンドラ例外はconsole.errorして後続継続
}
```

### Tier A — game.js が発行(生イベント)

| イベント名 | 発行元 | payload |
|---|---|---|
| `gameStarted` | BattleScene(ShogiGame生成直後、game.js側では発行しない) | `{ floorId:number, engineType:'yaneuraou'\|'builtin', sfenInitial:string }` |
| `movePlayed` | game.js(4フック末尾) | `{ mover:'player'\|'cpu', ply:number, moveNumber:number, moveText:string, isDrop:boolean, from:{row,col}\|null, to:{row,col}, piece:string, promoted:boolean, captured:string\|null, sfenAfter:string }` |
| `gameEnded` | game.js(`endGame`/`endGameDraw` 先頭) | `{ winner:'player'\|'cpu'\|'draw', reason:string, finalPly:number }` |

### Tier B — BattleDirector(`src/rpg/BattleDirector.js`)が発行(演出/派生イベント)

| イベント名 | payload |
|---|---|
| `hpUpdated` | `{ ply:number, winratePlayer:number(0-1), hpPlayer:number, hpCpu:number, maxHp:number }` |
| `attackStarted` | `{ attacker:'player'\|'cpu', power:number }` |
| `damageTaken` | `{ target:'player'\|'cpu', amount:number, cause:CauseTag, tier:DamageTier, isLethal:boolean }` |
| `castleBuilt` | `{ side:'player'\|'cpu', castleId:string, castleName:string, completion:number }` |
| `castleBroken` | `{ side:'player'\|'cpu', castleId:string, completionDrop:number }` |

**確定事項**:
- **game.js は eval を計算・発行しない**。評価は BattleDirector が engine から取得し `hpUpdated` として発行する(§4.3)。game.js の `getPlayerEvaluation()` tanh曲線とダメージモデルの `evalToWinrate` 曲線の二重管理を避けるため。
- `emit` は同期。ハンドラ例外は握りつぶさず `console.error` して後続継続。
- game.js には `setBattleEventBus(bus)` を追加(既存 `setRenderer` と同パターン)。未設定時は `?.` で全emitスキップ、既存動作を完全維持する。

### 3.1 game.js への統合(既存コードへの最小侵襲フック)

```js
// コンストラクタに追加
this.battleEventBus = null;

/** @param {{ emit: (name: string, payload: object) => void }} bus */
setBattleEventBus(bus) {
  this.battleEventBus = bus;
}
```

フック挿入箇所(既存4メソッドの重複構造はそのまま、各メソッドの `updateUI()` 呼び出し直後に1行追加):
`completeMove`(game.js:1153) / `makeMove`(:1248) / `placeCapturedPiece`(:995) / `executeCpuDrop`(:1520)。

```js
// ... 既存処理 ...
// updateUI() 直後
this._emitBattleMoveEvents({ mover, ply, moveNumber, moveText, isDrop, from, to, piece, promoted, captured });
```
(eval の取得・計算は game.js では行わない。BattleDirector が `movePlayed` 購読後に engine から centipawn を取得し、§3 冒頭の方針通り `evalToWinrate` で `hpUpdated` を発行する。)

```js
/** @private battleEventBus未設定時は何もしない */
_emitBattleMoveEvents(ctx) {
  if (!this.battleEventBus) return;
  const ply = this.sfenHistory.length - 1;
  this.battleEventBus.emit('movePlayed', {
    mover: ctx.mover, ply, moveNumber: ctx.moveNumber, moveText: ctx.moveText,
    isDrop: ctx.isDrop, from: ctx.from, to: ctx.to, piece: ctx.piece,
    promoted: ctx.promoted, captured: ctx.captured,
    sfenAfter: this.sfenHistory[this.sfenHistory.length - 1],
  });
}
```

`endGame`(game.js:2036) / `endGameDraw`(:789) は `this.gameOver = true;` 直後に追加:
```js
this.battleEventBus?.emit('gameEnded', {
  winner, reason, finalPly: this.sfenHistory.length - 1,
});
```
(`endGameDraw` は `winner: 'draw'` 固定)

**回帰テスト必須**: `battleEventBus` 未設定時は既存動作(訓練モード単体・再演モード)と完全に同一であることを保証するテストを1本追加する。`replayMode` 分岐(game.js:2040-2043)より**前**に `gameEnded` emit を置く。

---

## 4. ダメージモデル・原因分類

配置: `src/dungeon/DamageModel.js`, `src/dungeon/CauseClassifier.js`。すべて純粋関数、DOM/Canvas/AIEngine非依存、vitestでユニットテスト可能。

前提: 全入力 `scoreCp` は**先手(player)視点**に正規化済みcentipawn(`GameAnalyzer.js` の視点正規化規約を踏襲: 相手手番局面の生scoreは符号反転)。勝率変換は既存 `evalToWinrate(cp)`(`src/analysis/EvalToWinrate.js`, `ponanzaC=600`)をそのまま使う。詰み判定は既存 `isMateScore(cp)`(閾値29000)をそのまま使う。駒得駒損は既存 `materialBalance(sfen)`(`src/training/MaterialEvaluator.js`)をそのまま使う。

### 4.1 評価取得(BattleDirectorの責務)

- engine呼び出しは1手1回に抑える: CPU手は着手選択の`getBestMove`スコアを再利用、player手のみ `getBestMove(sfenAfter, {time: dungeonConfig.engine.evalMovetimeMs})` を追加発行。前ply結果を `scoreBeforeCp` としてキャッシュ。
- `dungeonConfig.engine = { evalMovetimeMs: 300 }`。
- BuiltinEngineフォールバック時は「劣化モード」として扱いダンジョン側は関知しない(easy/mediumはscore常時0、`tier:'graze'`に落ちるだけで例外にはならない=既知の制約として許容)。

### 4.2 HP定義(ゼロサム)

```
winratePlayer = evalToWinrate(scoreCp_player視点)          // 0-1
maxHp(floor)  = clamp(100 + max(0,floor-1)*4, 100, 300)    // computeMaxHp(floor)、1階=100
HP_player     = round(winratePlayer * maxHp)
HP_cpu        = maxHp - HP_player
```

```js
// src/config/dungeonConfig.js
export const dungeonConfig = {
  hp: { base: 100, perFloor: 4, max: 300 },
  // ...
};

/** @param {number} floor 1以上の整数 @returns {number} */
export function computeMaxHp(floor, config = dungeonConfig.hp) {
  return Math.min(config.max, config.base + Math.max(0, floor - 1) * config.perFloor);
}
```

HPバー表示(`hpUpdated` 駆動): playerバー幅 = `winratePlayer*100%`、cpuバー幅 = `(1-winratePlayer)*100%`。

### 4.3 ダメージ量

```
deltaPlayer   = winrateAfterPlayer - winrateBeforePlayer   // 符号付き、先手視点
damagePoints  = |deltaPlayer| * 100                          // 0-100(勝率pt)
damageHp      = round(damagePoints/100 * maxHp)              // 階層スケール後の表示ダメージ
```

- `damageTaken.amount = damageHp`。
- **受け手(target)は mover 無関係、delta の符号のみで決定**: `deltaPlayer<0 → target='player'`、`>0 → target='cpu'`、`=0 → target=null`(演出スキップ)。attacker = target の逆側。1 swing で `attackStarted{attacker}` + `damageTaken{target}` が対で発火。

### 4.4 ダメージ階級(DamageTier)

```js
// dungeonConfig.damage は trainingConfig.judgeThresholds を再利用(二重定義しない)
damage: {
  graze: 0.02, light: 0.05,
  medium: trainingConfig.judgeThresholds.mistake,  // 0.10
  heavy: trainingConfig.judgeThresholds.blunder,   // 0.20
  critical: 0.40,
}

/** @param {number} p 0-1(|deltaPlayer|) */
function resolveTier(p, config = dungeonConfig.damage) {
  if (p < config.graze) return 'graze';
  if (p < config.light) return 'light';
  if (p < config.medium) return 'medium';
  if (p < config.heavy) return 'heavy';
  if (p < config.critical) return 'critical';
  return 'fatal';
}

const TIER_MOTION = {
  graze: 'idle', light: 'jab', medium: 'strike',
  heavy: 'heavyStrike', critical: 'criticalHit', fatal: 'ultimate',
};
```

| tier | damagePoints範囲 | motion |
|---|---|---|
| graze | [0,2) | idle |
| light | [2,5) | jab |
| medium | [5,10) | strike |
| heavy | [10,20) | heavyStrike |
| critical | [20,40) | criticalHit |
| fatal | [40,100] | ultimate |
| fatal(詰み特例) | レンジ無視 | finishingBlow |

詰み検出時(`isMateScore(scoreAfterCp)`)は数値deltaを無視し `tier='fatal'`, `motion='finishingBlow'`, `isLethal=true`、target=詰まされた側に強制上書き。`isLethal` 時は呼び出し側がtarget HPを直接0に設定する。

### 4.5 computeDamageEvent シグネチャ

```js
// src/dungeon/DamageModel.js
/**
 * @typedef {'player'|'cpu'} Side
 * @typedef {'none'|'graze'|'light'|'medium'|'heavy'|'critical'|'fatal'} DamageTier
 * @typedef {Object} DamageEvent
 * @property {Side|null} target
 * @property {Side|null} attacker
 * @property {number|null} winrateBeforePlayer
 * @property {number|null} winrateAfterPlayer
 * @property {number|null} deltaPlayer
 * @property {number} damagePoints
 * @property {DamageTier} tier
 * @property {string} motion
 * @property {boolean} isMate
 * @property {boolean} isLethal
 *
 * @param {{ scoreBeforeCp: number|null, scoreAfterCp: number|null }} input 先手視点centipawn
 * @param {typeof dungeonConfig.damage} [config]
 * @returns {DamageEvent}
 */
export function computeDamageEvent({ scoreBeforeCp, scoreAfterCp }, config = dungeonConfig.damage) {}

/**
 * @param {DamageEvent} event @param {number} maxHp
 * @returns {number} isLethal時はmaxHp全量(Math.max(0,currentHp-maxHp)で結果的に0)
 */
export function resolveDamageHp(event, maxHp) {}
```

### 4.6 原因分類の決定木(CauseClassifier)

CauseTagは **kebab-case 4値**に統一。

```
CauseTag = 'castle-break' | 'attack-boost' | 'material' | 'other'
```

判定順序(固定、優先度順):

```
lossSide = deltaPlayer < 0 ? 'player' : deltaPlayer > 0 ? 'cpu' : null
gainSide = lossSideの逆側

if lossSide === null または |deltaPlayer|*100 < minSwing(=2pt):
    → 'other' (reason='swing_too_small')

1. beforeBest = detectCastle(boardBefore, lossSide).best
   if beforeBest && beforeBest.completion >= その囲いのminCompletionForCastle:
       afterMatch = evaluateCastle(boardAfter, lossSide, defOf(beforeBest.castleId))
       completionDrop = beforeBest.completion - afterMatch.completion
       if completionDrop >= dungeonConfig.castle.demolishDropThreshold(=0.15):
           → 'castle-break' (最優先、以降スキップ)

2. materialDeltaLossSide = lossSide==='player'
       ? materialBalance(sfenAfter)-materialBalance(sfenBefore)
       : -(materialBalance(sfenAfter)-materialBalance(sfenBefore))
   if materialDeltaLossSide <= -trainingConfig.tags.materialLossThreshold(=8):
       → 'material'

3. attackBoostDelta = kingPressure(boardAfter,gainSide,kingAfter,radius=2)
                     - kingPressure(boardBefore,gainSide,kingBefore,radius=2)
   if attackBoostDelta >= 1:
       → 'attack-boost'

4. → 'other'
```

優先順位の根拠: 囲い破壊は視覚的に最も明確でRPG演出映えし発生頻度が低いため最優先。駒得駒損は `materialBalance` が最も客観的なため2番目。攻めの強化は新規ヒューリスティック(`kingPressure`、玉周辺のチェビシェフ距離radius以内の敵駒数)で誤検出リスクが相対的に高いため3番目。残りは `'other'`。

```js
// src/dungeon/CauseClassifier.js
/**
 * @typedef {Object} CauseResult
 * @property {CauseTag} tag
 * @property {Side|null} lossSide
 * @property {number} materialDeltaLossSide
 * @property {{castleId:string,label:string,completionBefore:number,completionAfter:number}|null} castleBreak
 * @property {number} attackBoostDelta
 *
 * @param {{ sfenBefore: string, sfenAfter: string, deltaPlayer: number }} input
 * @returns {CauseResult}
 */
export function classifyCause({ sfenBefore, sfenAfter, deltaPlayer }) {}
```

```js
// dungeonConfig.cause / dungeonConfig.castle
cause: {
  minSwing: 0.02,
  attackBoostThreshold: 1,
  kingPressureRadius: 2,
},
castle: {
  demolishDropThreshold: 0.15,
},
```

---

## 5. CastleDetector

正準API(`src/dungeon/CastleDetector.js`):

```js
findKing(board, owner) -> {row,col}|null
evaluateCastle(board, owner, def) -> CastleMatch|null
detectCastle(board, owner, definitions?) -> { best: CastleMatch|null, all: CastleMatch[] }
diffCastleState(before, after) -> { demolished:boolean, castleId:string|null, completionDrop:number }

// @typedef {Object} CastleMatch
// @property {string} castleId
// @property {string} label
// @property {number} completion    // 0-1、加重
// @property {Array} slotDetail
```

- 用語は `completion`(加重)・`castleId` に統一。
- 定義データは `src/dungeon/castleDefinitions.json`(JSON、king相対 `{dr,dc,type,weight}`、player視点1系統、cpuは180度符号反転)。
- v1対応5囲い: `yagura`(矢倉) / `mino`(美濃) / `anaguma`(穴熊) / `kani`(カニ囲い) / `ginkanmuri`(銀冠)。kani/銀冠は誤検出緩衝用。
- 成駒は厳密不一致(`'!'` prefix は別種として扱う)。玉は `'王'||'玉'` 等価。
- `minCompletionForCastle` は各囲いJSON定義に埋め込む(グローバル閾値は持たない)。

`castleId` は §7 のスプライト命名 `formationId` と一致させる。未知formationIdは `castle.default.*` にフォールバックする。`castleBuilt`/`castleBroken` イベントの `castleId` をそのまま `castle.<castleId>.build/idle/break` にマップする。

---

## 6. AI強さ制御

- `setStrength()` 4段階enumは使わない。`aiEngineManager.setPreferredEngine(ENGINE_TYPES.YANEURAOU)` + 各CPU手で `getBestMove(sfen, getEngineOptionsForFloor(floor))` に `{time, depth}` を直接渡す。
- 階層定義は `src/config/dungeonConfig.js` の静的配列 `DUNGEON_FLOORS`(20件) + `getFloorConfig(floor)` / `getEngineOptionsForFloor(floor)`。

```js
// src/config/dungeonConfig.js
export const MAX_FLOOR = 20;
export const BOSS_FLOORS = [5, 10, 15, 20];

/**
 * @typedef {Object} FloorConfig
 * @property {number} floor
 * @property {string} zoneName
 * @property {boolean} isBoss
 * @property {string|null} bossName
 * @property {string|null} bossKamaeFlavor
 * @property {{time:number, depth:number}} engineOptions
 * @property {string} enemySpriteId  // "{zoneKey}_{boss|mob}_NN" 例 'z1_mob_01'
 */
export const DUNGEON_FLOORS = [ /* 20件、floor:1..20 */ ];

export function getFloorConfig(floor) {}
export function getEngineOptionsForFloor(floor) {}
```

- 全20階、ボス階5/10/15/20。depth上限20固定、16-20階はtimeのみ伸長(floor20: time=18000, depth=20)。
- `new ShogiGame(difficulty)` の difficulty引数はダンジョンでは固定値 `'medium'` を渡す(外部エンジン使用時は無影響、BuiltinEngineフォールバック時のみ影響)。

---

## 7. 戦闘ウィンドウ描画設計

配置: `src/battle/`。ロジック(`BattleStage`)と描画(`BattleRenderer`)を分離し、`BattleStage` はCanvas/`Image`/`document` に一切触れないためvitestでユニットテスト可能。

### 7.1 分離境界

```
[BattleDirector] --emit--> [BattleEventBus] --on--> [BattleStage(ロジック)] --読取専用--> [BattleRenderer(描画)]
```

`BattleRenderer` は `BattleStage.getSnapshot()` を読むだけ。`BattleStage` 内部のパーティクル配列は性能要件から可変配列を用いてよい(公開APIは読み取り専用の浅いコピーに限定)。

### 7.2 ActorAnimationFSM

対象アクター4体固定: `player-fighter` / `cpu-fighter` / `player-castle` / `cpu-castle`。

```js
// src/battle/ActorAnimationFSM.js
/** @typedef {'idle'|'attack'|'damaged'|'castle-build'|'castle-break'} AnimState */
export class ActorAnimationFSM {
  constructor(opts /* { initial?: AnimState } */) {}
  get state() {}       // AnimState
  get frameIndex() {}  // number
  get payload() {}      // Object|undefined
  request(state, payload) {} // -> 'applied'|'queued'|'dropped'
  update(dtMs) {}
  get isBusy() {}
}
```

優先度: `castle-break`=3(常に即時割込み、同アクターのキュー全消去) > `damaged`=2 > `attack`=`castle-build`=1(同格→キュー) > `idle`=0(割込み不可)。

遷移規則:
1. `priority(new) > priority(current)` → 即時適用(現在クリップ中断、frame0から開始)。`castle-break` は自アクターのキューを全消去してから適用。
2. `priority(new) <= priority(current)` かつ `current !== 'idle'` → キューに追加(FIFO、最大長 `battleConfig.animQueueMaxLength`既定4)。同一stateが既にキューにあれば最新payloadで上書き(新規追加しない)。満杯時は最も優先度が低い既存要素を1件破棄。
3. ワンショット(`loop:false`)が最終フレームに達したら、キューから優先度最大→FIFO順に1件取り出し適用。キューが空なら`idle`へ。
4. `castle-build` 中に同アクターへ `castle-break` が来たら規則1で即座に中断・移行。
5. 明示 `request('idle')` はキュー全消去+即座適用。

### 7.3 SpriteAtlas

```js
// src/battle/SpriteAtlas.js
export class SpriteAtlas {
  static async load(jsonPath) {}                 // -> Promise<SpriteAtlas>
  static createPlaceholder(config /* {palette} */) {} // -> SpriteAtlas(offscreen canvas合成)
  getFrame(frameName) {}       // -> {x,y,w,h}
  getAnimation(animationKey) {} // -> {frames:string[], fps:number, loop:boolean}
  get image() {}                // -> HTMLImageElement|HTMLCanvasElement
}
```

アトラスJSONスキーマ(`src/battle/sprites/placeholder-atlas.json`、本番差し替え時も同一形式):

```json
{
  "version": 1,
  "image": "placeholder-atlas.png",
  "imageSize": { "w": 512, "h": 512 },
  "frameSize": { "w": 64, "h": 64 },
  "frames": {
    "player_idle_0": { "x": 0, "y": 0, "w": 64, "h": 64 }
  },
  "animations": {
    "player.idle": { "frames": ["player_idle_0"], "fps": 2, "loop": true },
    "castle.yagura.build": { "frames": ["castle_yagura_build_0"], "fps": 4, "loop": false }
  }
}
```

命名規約: `animations` キーは `"<actorKind>.<animState>"`(fighter系)または `"castle.<castleId>.<animState>"`(castle系、`animState`はハイフンなし変換: `castle-build`→`build`)。未知`castleId`は `castle.default.*` にフォールバック(アトラスに必須用意)。

### 7.4 BattleStage(イベント→FSM要求マッピング、正準)

```js
// src/battle/BattleStage.js
export class BattleStage {
  constructor(deps /* { eventBus } */) {}
  attach() {}
  detach() {}
  update(dtMs) {}
  getSnapshot() {}
  // -> { actors:[{id,state,frameIndex,castleId}], particles:[{kind,x,y,ageMs,lifeMs,text?,color?}], shake:number }
}
```

| イベント(Tier B, §3) | 対象アクター | FSM要求 | 追加効果 |
|---|---|---|---|
| `attackStarted{attacker,power}` | `${attacker}-fighter` | `request('attack',{power})` | なし |
| `damageTaken{target,amount,cause,tier,isLethal}` | `${target}-fighter` | `request('damaged',{cause})` | `damage-number`パーティクル1件(`text:'-'+amount`, `color:battleTheme.CAUSE_COLOR[cause]`)。`shake=min(1,amount/battleConfig.shakeFullAmount)`、`battleConfig.shakeDecayMs`で減衰。`isLethal`時は`finishingBlow`相当の強調 |
| `castleBuilt{side,castleId}` | `${side}-castle` | `request('castle-build',{castleId})` | 完走後、以後の`idle`は`castle.${castleId}.idle`参照 |
| `castleBroken{side,castleId}` | `${side}-castle` | `request('castle-break',{castleId})` | `rubble`パーティクル3-5件、`shake`最大値 |
| `gameEnded{winner}` | 勝者:`request('attack')` / 敗者:`request('damaged')` | 上記2件 | バナーはDOM側の責務 |
| `gameStarted` | 全アクター | `request('idle')`(キュークリア) | シーン初期化 |

```js
// src/battle/battleTheme.js — CauseTagはkebab-case 4値と一致
export const CAUSE_COLOR = {
  'castle-break': '#ff4d4d',
  'attack-boost': '#ff9f43',
  'material':     '#4dd0ff',
  'other':        '#cfcfcf',
};
```

### 7.5 BattleRenderer(rAFループ)

```js
// src/battle/BattleRenderer.js [opt-out/視覚検証]
export class BattleRenderer {
  constructor(canvas, atlas, stage) {}
  start() {}   // 冪等
  stop() {}
  resize(cssWidth, cssHeight) {}
}
```

- `dt = min(now - lastTs, battleConfig.maxDtMs)` (既定100ms、タブ非アクティブ復帰時のスパイラル防止)。
- `document.visibilitychange` 購読、`document.hidden===true` の間は `stop()`。`#battle-window` の表示/非表示制御は呼び出し側(`main.js`)の責務。
- 描画レイヤー順序(固定): 背景 → `${cpu}-castle` → `${player}-castle` → `cpu-fighter` → `player-fighter` → パーティクル(`hit-flash`→`rubble`→`damage-number`) → HUD(HPバーはDOM側)。
- カメラシェイク: `shake(0-1)` を `ctx.translate(random(-shake*8,shake*8), random(-shake*8,shake*8))` へ、`_draw()`最外周で1回のみ適用。
- Canvas解像度: `dpr=min(devicePixelRatio,2)`、`canvas.width=cssWidth*dpr`、`ctx.setTransform(dpr,0,0,dpr,0,0)`。アクター座標は`BattleStage`側で%ベース保持、描画側でのみ変換(リサイズ時にロジック側の再計算は不要)。

### 7.6 レイアウト(DOM/CSS)

`#battle-window` を `#game-container` 内 `.game-status` と `.game-main` の間に新設(既存盤面操作導線とは独立、既存DOM構造は破壊しない)。

```html
<div id="battle-window" class="hidden">
    <canvas id="battle-canvas" role="img" aria-label="戦闘ウィンドウ"></canvas>
    <div class="battle-hud">
        <div class="battle-hp battle-hp--cpu">
            <span class="battle-hp__label">CPU</span>
            <div class="battle-hp__bar"><div class="battle-hp__fill" id="battle-hp-cpu"></div></div>
        </div>
        <div class="battle-hp battle-hp--player">
            <span class="battle-hp__label">あなた</span>
            <div class="battle-hp__bar"><div class="battle-hp__fill" id="battle-hp-player"></div></div>
        </div>
    </div>
</div>
```

```css
#battle-window {
    position: relative; width: 100%; aspect-ratio: 16 / 5;
    max-height: clamp(96px, 12vw, 160px);
    background: var(--panel-bg); border: 1px solid var(--panel-border);
    border-radius: var(--radius-md); overflow: hidden; margin-bottom: 12px;
}
#battle-canvas { width: 100%; height: 100%; display: block; }
.battle-hud { position: absolute; inset: 0; display: flex; justify-content: space-between;
    align-items: flex-end; padding: 6px 10px; pointer-events: none; }
.battle-hp__bar { width: 80px; height: 6px; background: var(--panel-border); border-radius: var(--radius-full); }
.battle-hp__fill { height: 100%; background: var(--eval-good); border-radius: var(--radius-full);
    transition: width 200ms ease-out; }
@media (max-width: 767px) {
    #battle-window { aspect-ratio: 16 / 4; max-height: clamp(72px, 20vw, 110px); }
    .battle-hp__label { display: none; }
    .battle-hp__bar { width: 56px; }
}
```

新規色は`battleTheme.js`のみ、CSSは既存変数(`--panel-bg`, `--eval-good`等)を再利用しダーク/ライト双方で自動整合させる。3Dモード(`#three-container`)側の`#battle-window-3d`対称実装は後続スコープ。

### 7.7 battleConfig.js

```js
// src/config/battleConfig.js — 描画専用パラメータ(dungeonConfigとは分離)
export const battleConfig = {
  animQueueMaxLength: 4,
  shakeFullAmount: 20,      // amount(damageHp)がこの値でshake=1.0
  shakeDecayMs: 400,
  maxDtMs: 100,
  // 正準値は docs/dungeon-rpg-data-spec.md §2.4 (囲い別キー構造)
  placeholderPalette: {
    player: '#4dd0ff', cpu: '#ff6b6b',
    'castle.default': '#9e9e9e',
    'castle.yagura': '#c9a15a', 'castle.mino': '#7fbf7f',
    'castle.anaguma': '#6b6b8f', 'castle.kani': '#e0a860',
    'castle.ginkanmuri': '#b0b0d0',
  },
};
```

---

## 8. 訓練機能の施設化方針

既存4機能(感想戦=AnalysisPanel、再演=ReplayMode、ドリル=DrillMode、ダッシュボード=DashboardPanel)は**無改修のまま**、`town`シーン上のオーバーレイパネルとして再配置する。

### 8.1 施設命名(確定)

| 施設ID | 表示名 | 実体 | 到達条件 |
|---|---|---|---|
| `strategist` | 軍師の間 | 感想戦(AnalysisPanel) | `game.gameOver===true` かつエンジン`yaneuraou` |
| `archive` | 修練の書庫 | ダッシュボード(DashboardPanel)、内部にドリル起動導線を含む | 常時 |

再演(ReplayMode)は独立施設にせず、両施設から起動される共通サブシーン(既存`#replay-banner`オーバーレイをそのまま維持)。ドリル(DrillMode)は独立起動ボタンを持たず、DashboardPanel内部生成の「この癖のドリルへ」ボタンから動的起動される。

### 8.2 FacilityRegistry

```js
// src/rpg/FacilityRegistry.js
/**
 * @typedef {Object} FacilityDef
 * @property {string} id
 * @property {string} name
 * @property {string} icon             // プレースホルダー絵文字。将来 'sprite:xxx' でアトラス参照可
 * @property {string} description
 * @property {string} triggerId        // 委譲先の既存DOM要素id(例: 'analyze-btn')
 * @property {string} panelId          // 開閉対象の既存パネルid
 * @property {(game: import('../../game.js').ShogiGame|null) => boolean} isAvailable
 * @property {string} unavailableReason
 */
export const FACILITIES = [
  { id: 'strategist', name: '軍師の間', icon: '🎖️',
    description: '直前の対局をAIと共に振り返る(感想戦)',
    triggerId: 'analyze-btn', panelId: 'analysis-panel',
    isAvailable: (game) => !!game && game.gameOver === true,
    unavailableReason: '対局を終えるとここに立ち寄れるようになる' },
  { id: 'archive', name: '修練の書庫', icon: '📚',
    description: '対局の記録と癖の傾向を確認する。奥には道場もある',
    triggerId: 'dashboard-btn', panelId: 'dashboard-panel',
    isAvailable: () => true, unavailableReason: '' },
];
```

`yaneuraou`要件チェックは重複させず、既存の `AnalysisPanel.js:48` / `DashboardPanel.js:111` の内部判定にそのまま委譲する(`isAvailable`はUI表示可否の簡易判定のみ)。

### 8.3 TownScene(既存パネルへのクリック委譲)

```js
// src/rpg/TownScene.js
export function setupTownScene({ getGame, onEnterDungeon }) { /* render/show/hide を返す */ }

function openFacility(facility) {
  const trigger = document.getElementById(facility.triggerId);
  if (!trigger) return;
  trigger.click(); // analyze-btn / dashboard-btn の既存リスナーをそのまま起動
}
```

既存パネル実装(AnalysisPanel/DashboardPanel/DrillMode/ReplayMode)は一切変更しない。

### 8.4 index.html / main.js への差分

- `index.html`: `#game-setup`直前に`#town-screen`(ダンジョン入口ドア + 施設ドア2つ)を新規追加。`#game-over`の`.game-end-actions`に「町に戻る」ボタン(`#town-return-btn`)を1つ追加(唯一の既存ブロック改修点)。
- `main.js`: 既存の`setupReviewPanel`/`setupAnalysisPanel`/`setupDashboardPanel`呼び出しは無改修。追加は`setupTownScene`呼び出しと`town-return-btn`のイベント登録のみ。`#game-setup`の初期表示トリガーを「ページロード時自動」から「ダンジョン入口ボタン押下時」に変更(`startGame()`内部処理は無改修)。

### 8.5 移行手順

1. `FacilityRegistry.js`追加(副作用なし)
2. `index.html`に`#town-screen`/`#town-return-btn`追加(未配線の間は無害)
3. `TownScene.js`追加、`openFacility`委譲を単体確認
4. `main.js`に`setupTownScene`呼び出し追加(既存3呼び出しは順序・引数とも不変)
5. `#game-setup`初期表示条件をダンジョン入口ボタン起点に変更
6. `#game-over`の「町に戻る」ボタン配線
7. 町マップ/施設ドアのCSS意匠調整([TDD opt-out]、視覚検証で代替)

---

## 9. 永続化スキーマ

既存 `src/storage/envelope.js`(`{schemaVersion:1, records:[]}`)流用。キーは `shogiGameSave`/`shogi-training/*` と非衝突。

| キー | ストア | 形態 |
|---|---|---|
| `shogi-dungeon/progress` | `DungeonProgressStore` | 単一レコード `id:'default'` |
| `shogi-dungeon/battles` | `DungeonBattleStore` | 追記型(`crypto.randomUUID()`) |

```js
// DungeonProgressRecord
{ id:'default', currentFloor, highestFloorCleared, totalWins, totalLosses,
  estimatedRating:{label,avgDrop,sampleSize,dungeonTitle}|null, updatedAt }  // 正準は data-spec §3.2

// DungeonBattleRecord
{ id, floor, result:'win'|'lose'|'draw', totalPlies, playerMoveDrops:number[], playedAt }
```

進行反映は純粋関数 `applyBattleResult(progress, result, floor)`(immutable): win→`highestFloorCleared=max(...)`, `floor<20`なら`currentFloor+1`; lose/draw→`currentFloor`据え置き。

`gameEnded`購読内(BattleDirector)での永続化フロー:
```
gameEnded 購読 → battleStore.save({floor, result, totalPlies, playerMoveDrops})
             → rating = estimateDungeonRating(battleStore.recent(10))
             → progressStore.save({...applyBattleResult(load(), result, floor), estimatedRating:rating})
```
`playerMoveDrops`はBattleDirectorが対局中`movePlayed`/評価差分から蓄積。

棋力表示は既存 `estimateRating(judgments, mover, config)` (`src/analysis/RatingEstimator.js`) を再利用するが、`DungeonBattleRecord.playerMoveDrops` は `number[]` のみで judgments が要求する `{mover, drop, skipped}` 形状を持たない。この変換を担う薄いラッパー `estimateDungeonRating(records)` を **`src/dungeon/DungeonRating.js`** に置く:
```js
// src/dungeon/DungeonRating.js
export function estimateDungeonRating(records) {
  const judgments = records.flatMap(r =>
    r.playerMoveDrops.map(drop => ({ mover: 'player', drop, skipped: false }))
  );
  return estimateRating(judgments, 'player');
}

export const RATING_TO_DUNGEON_TITLE = { /* ... */ };
```
`estimateDungeonRating` の戻り値をそのまま `estimatedRating` に格納し、`DungeonRating.RATING_TO_DUNGEON_TITLE` で称号に変換して表示する。

---

## 10. テスト方針

- **[TDD必須]**: `BattleEventBus`, `ActorAnimationFSM`, `SpriteAtlas`(パース), `BattleStage`(イベント→FSM要求マッピング), `CastleDetector`, `DamageModel`, `CauseClassifier`, `DungeonProgression`, `DungeonRating`, 各Store類, `SceneManager`(遷移ロジック), `BattleDirector`(評価正規化・イベント変換), `FacilityRegistry.isAvailable`, `TownScene.openFacility`(jsdom + `vi.fn()`でクリック委譲を検証)。
- **[opt-out/視覚検証]**: `BattleRenderer._draw()`, CSSレイアウト(320/768/1024pxでのスクリーンショット確認), 各Sceneの`enter`内DOM生成, `castleDefinitions.json`座標の妥当性(実対局目視)。
- `game.js`への追加コードは「`battleEventBus`未設定時=既存動作完全同一」の回帰テストを1本追加する。

---

## 11. 論点対応表(申し送り事項の解消状況)

| 論点 | 内容 | 本書該当節 |
|---|---|---|
| 論点1 | 全体アーキテクチャ(レイヤ結合方式) | §2, §3.1 |
| 論点2 | ダメージモデル | §4.1〜4.5 |
| 論点3 | 囲い検出(CastleDetector) | §5, data-spec §1 |
| 論点4 | 評価変動の原因分類 | §4.6 |
| 論点5 | 戦闘ウィンドウ描画設計 | §7 |
| 論点6 | ダンジョン構造(階層/AI強さ/セーブ) | §6, §9, data-spec §3〜4 |
| 論点7 | 訓練機能の再配置(施設化) | §8 |
| 論点8 | フェーズ分割ロードマップ | docs/dungeon-rpg-roadmap.md |

未確定として残る事項(別スコープ):
- `kingPressure`は駒の利き(実際の王手/王手予備軍)を考慮しない単純距離ヒューリスティック。将来の精度改善余地。
- 3Dモード(`#three-container`)側の`#battle-window-3d`対称実装。
- `castleDefinitions.json`の座標は概算。実対局での誤検出は座標調整のみで追従可能な設計だが、視覚検証を実装後に必ず行うこと。
