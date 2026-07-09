# ダンジョン将棋RPG 統一決定記録 (正準定義)

全設計はこの記録に従うこと。個別設計の記述と食い違う場合は**本記録が優先**する。

---

## 0. ディレクトリ構成 (正準)

既存の flat な `src/analysis/` `src/training/` `src/storage/` `src/config/` 慣習に合わせ、RPG も flat な top-level ディレクトリに分割する。Design 1 の `src/rpg/{events,scenes,dungeon,battle,render}` 全ネストは**不採用**。

| ディレクトリ | 役割 | 主なファイル |
|---|---|---|
| `src/dungeon/` | ダンジョン純粋ドメインロジック ([TDD]) | `CastleDetector.js`, `castleDefinitions.json`, `DamageModel.js`, `CauseClassifier.js`, `DungeonProgression.js`, `DungeonRating.js` |
| `src/battle/` | Canvas 描画・演出 | `BattleEventBus.js`, `ActorAnimationFSM.js`, `SpriteAtlas.js`, `BattleStage.js`, `BattleRenderer.js`, `battleTheme.js`, `sprites/placeholder-atlas.json` |
| `src/rpg/` | シーン/FSM/施設オーケストレーション | `SceneManager.js`, `BattleDirector.js`, `scenes/*`, `FacilityRegistry.js`, `TownScene.js` |
| `src/storage/` | 永続化 (既存慣習に合わせ全 Store をここへ) | `DungeonProgressStore.js`, `DungeonBattleStore.js` (既存 `envelope.js` 流用) |
| `src/config/` | 設定集約 (既存 `trainingConfig.js` と同居) | `dungeonConfig.js`, `battleConfig.js` |

**確定事項**:
- `BattleEventBus` は **1クラスのみ**、`src/battle/BattleEventBus.js` に置く。Design 1 の `src/rpg/events/BattleEventBus.js` は破棄。
- Store は Design 5 の `src/dungeon/` ではなく **`src/storage/`** に置く (既存 GameStore/MistakeStore/DrillStore と同居)。import は `./envelope.js`。Design 1 の単一 `DungeonStore.js` は破棄し、Design 5 の 2 ストア構成 (progress/battles) を採用。
- `dungeonConfig.js` は **`src/config/`** に置く (Design 3 が正)。Design 2/5 の `src/dungeon/dungeonConfig.js`・Design 5 決定の `src/dungeonConfig.js` は破棄。

---

## 1. BattleEventBus イベントカタログ (正準)

Design 1 (camelCase生イベント) と Design 4 (dot記法演出イベント) の**命名衝突を解消**。全イベントを **camelCase 過去形**に統一。1 対局につき 1 バスインスタンス、2 ティア構成。

### Tier A — game.js が発行 (生イベント)
| イベント名 | 発行元 | payload |
|---|---|---|
| `gameStarted` | BattleScene (ShogiGame 生成直後) | `{ floorId:number, engineType:'yaneuraou'\|'builtin', sfenInitial:string }` |
| `movePlayed` | game.js (4フック末尾) | `{ mover:'player'\|'cpu', ply:number, moveNumber:number, moveText:string, isDrop:boolean, from:{row,col}\|null, to:{row,col}, piece:string, promoted:boolean, captured:string\|null, sfenAfter:string }` |
| `gameEnded` | game.js (endGame/endGameDraw 先頭) | `{ winner:'player'\|'cpu'\|'draw', reason:string, finalPly:number }` |

### Tier B — BattleDirector (`src/rpg/BattleDirector.js`) が発行 (演出/派生イベント)
| イベント名 | 旧名(統合前) | payload |
|---|---|---|
| `hpUpdated` | D1 `evalUpdated` | `{ ply:number, winratePlayer:number(0-1), hpPlayer:number, hpCpu:number, maxHp:number }` |
| `attackStarted` | D4 `attack.start` | `{ attacker:'player'\|'cpu', power:number }` |
| `damageTaken` | D4 `damage.taken` | `{ target:'player'\|'cpu', amount:number, cause:CauseTag, tier:DamageTier, isLethal:boolean }` |
| `castleBuilt` | D1 `castleDetected` / D4 `castle.build` | `{ side:'player'\|'cpu', castleId:string, castleName:string, completion:number }` |
| `castleBroken` | D1 `castleDamaged` / D4 `castle.break` | `{ side:'player'\|'cpu', castleId:string, completionDrop:number }` |

**確定事項**:
- **game.js は eval を計算・発行しない**。Design 1 の `evalUpdated` (game.js の `getPlayerEvaluation()` tanh 曲線) は破棄。評価は BattleDirector が engine から取得し `hpUpdated` として発行 (§3参照)。理由: game.js の tanh(score/2000) 曲線と、ダメージモデルが使う `evalToWinrate` (1/(1+exp(-cp/600))) 曲線の二重管理を排除。
- Design 4 の renderer/stage は購読名を Tier B の正準名に読み替える (`attack.start`→`attackStarted` 等)。
- `emit` は同期。ハンドラ例外は握りつぶさず `console.error` して後続継続。
- game.js には `setBattleEventBus(bus)` を追加 (既存 `setRenderer` と同パターン)。未設定時は `?.` で全 emit スキップ (既存動作完全維持)。フック挿入箇所は Design 1 §4.2 の通り (`completeMove`/`makeMove`/`placeCapturedPiece`/`executeCpuDrop` の `updateUI()` 直後 + `endGame`/`endGameDraw` 先頭)。

---

## 2. 原因分類タグ (CauseTag) の正準名

3 設計で命名が割れていた (D1 camelCase+material2分割 / D2 snake_case / D4 kebab-case)。**kebab-case 4値**に統一。

```
CauseTag = 'castle-break' | 'attack-boost' | 'material' | 'other'
```

**確定事項**:
- Design 1 の `materialGain`/`materialLoss` 分割は破棄 (CauseClassifier は lossSide のみ分類するため gain/loss 区別不要)。
- Design 2 の `castle_break` 等 snake_case 文字列は kebab-case に変更して実装。
- `battleTheme.CAUSE_COLOR` (Design 4) のキーはこの kebab 4値と一致 (既に一致済み)。
- CauseClassifier の判定順序は Design 2 の固定 decision tree (`castle-break → material → attack-boost → other`) を採用。

---

## 3. 評価値・ダメージ・HP モデル (正準)

**評価ソースは engine centipawn + `evalToWinrate`** (Design 2 が正)。game.js の内蔵 heuristic は使わない。

### 3.1 評価取得 (BattleDirector の責務)
- `hpUpdated` の勝率は既存 `evalToWinrate(scoreCp)` (`src/analysis/EvalToWinrate.js`, `ponanzaC=600`) を使う。
- scoreCp は**先手(player)視点に正規化済み** centipawn (`GameAnalyzer.js` の視点正規化規約を踏襲: 相手手番局面の生 score は符号反転)。
- engine 呼び出しは **1手1回**に抑える (Design 2 §1.6): CPU 手は着手選択の getBestMove score を再利用、player 手のみ `getBestMove(sfenAfter, {time: dungeonConfig.engine.evalMovetimeMs})` を追加発行。前 ply 結果を `scoreBeforeCp` としてキャッシュ。
- `evalMovetimeMs = 300`。

### 3.2 HP 定義 (ゼロサム, Design 2)
```
winratePlayer = evalToWinrate(scoreCp_player視点)        // 0-1
maxHp(floor)  = clamp(100 + (floor-1)*4, 100, 300)       // ← コード版が正準
HP_player     = round(winratePlayer * maxHp)
HP_cpu        = maxHp - HP_player
```
**確定事項**: Design 2 の散文「maxHp = 100 + floor*4」は誤り。コード `computeMaxHp` の `base + max(0,floor-1)*perFloor` (= 1階で 100) が正準。`dungeonConfig.hp = { base:100, perFloor:4, max:300 }`。

### 3.3 HP バー表示 (Design 4 HUD の修正)
- `battle-hp__fill` の width は **`amount/100` ではなく現在 HP 割合** = player バーは `winratePlayer*100%`、cpu バーは `(1-winratePlayer)*100%`。`hpUpdated` イベントで駆動。
- Design 4 が仮定した「amount/100 を width に」は破棄 (Design 4 自身が「レンジ違えば要修正」と留保済み)。

### 3.4 ダメージ量 (Design 2)
```
deltaPlayer   = winrateAfterPlayer - winrateBeforePlayer  // 符号付き, 先手視点
damagePoints  = |deltaPlayer| * 100                        // 0-100 (勝率pt)
damageHp      = round(damagePoints/100 * maxHp)            // 階層スケール後の表示ダメージ
```
- `damageTaken.amount = damageHp` (階層依存の RPG ダメージ数値。高階ほど大きく見える)。
- **受け手 (target) は mover 無関係、delta の符号のみで決定** (Design 2 が正、Design 1 の「mover+delta で自傷判定」は破棄): `deltaPlayer<0 → target='player'`、`>0 → target='cpu'`、`=0 → target=null` (演出スキップ)。
- attacker = target の逆側。1 swing で `attackStarted{attacker}` + `damageTaken{target}` が対で発火。

### 3.5 ダメージ階級 (DamageTier) と閾値
既存 `trainingConfig.judgeThresholds` (0.05/0.10/0.20) を流用、graze/critical/fatal のみ新設。
```
DamageTier = 'none'|'graze'|'light'|'medium'|'heavy'|'critical'|'fatal'
resolveTier(p=|delta|):  // 確定版 (Design 2 の簡略形typoは破棄)
  p<0.02→graze  p<0.05→light  p<0.10→medium  p<0.20→heavy  p<0.40→critical  else→fatal
TIER_MOTION = { graze:'idle', light:'jab', medium:'strike', heavy:'heavyStrike',
                critical:'criticalHit', fatal:'ultimate' }
```
`dungeonConfig.damage = { graze:0.02, light:0.05, medium:0.10, heavy:0.20, critical:0.40 }` (medium/heavy は `judgeThresholds.mistake/blunder` を import 参照、二重定義しない)。

### 3.6 詰み (mate)
既存 `isMateScore(scoreCp)` (閾値 29000) をそのまま流用。検出時は数値 delta を無視し `tier='fatal'`, `motion='finishingBlow'`, `isLethal=true`, target = 詰まされた側に強制上書き。`isLethal` 時は呼び出し側が target HP を直接 0 に設定。

---

## 4. CastleDetector (正準は Design 3)

Design 2 が埋め込んだ簡易版 (`integrity`/`ownSquare`/JS定義/3囲い) は**破棄**。Design 3 の専任設計を正準とする。

### 4.1 API (Design 3)
```js
findKing(board, owner) -> {row,col}|null
evaluateCastle(board, owner, def) -> CastleMatch|null
detectCastle(board, owner, definitions?) -> { best: CastleMatch|null, all: CastleMatch[] }
diffCastleState(before, after) -> { demolished:boolean, castleId:string|null, completionDrop:number }

CastleMatch = { castleId:string, label:string, completion:number(0-1), slotDetail:[...] }
```
- 用語は **`completion`** (加重), **`castleId`** に統一 (Design 2 の `integrity`/`id` は破棄)。
- 定義データは **`src/dungeon/castleDefinitions.json`** (JSON, king相対 `{dr,dc,type,weight}`, player視点1系統, cpu は 180度符号反転)。Design 2 の JS `ownSquare` オフセット定義は破棄。
- v1 対応 5 囲い: `yagura`/`mino`/`anaguma`/`kani`(カニ囲い)/`ginkanmuri`(銀冠)。kani/銀冠は誤検出緩衝。
- 成駒は厳密不一致 (`'!'` prefix は別種)。玉は `'王'||'玉'` 等価。
- `minCompletionForCastle` は各囲い JSON に埋め込む (Design 2 のグローバル `minIntegrity=0.6` は破棄)。

### 4.2 CauseClassifier との接続 (Design 2 を Design 3 API に適合)
CauseClassifier の castle-break 判定は Design 3 API を使う:
```
beforeBest = detectCastle(boardBefore, lossSide).best
if beforeBest && beforeBest.completion >= (its minCompletionForCastle):
  afterMatch = evaluateCastle(boardAfter, lossSide, defOf(beforeBest.castleId))
  completionDrop = beforeBest.completion - afterMatch.completion
  if completionDrop >= dungeonConfig.castle.demolishDropThreshold → 'castle-break'
```
Design 2 の `castleIntegrity()` 呼び出し・`castleIntegrityDropThreshold` は破棄し、`dungeonConfig.castle.demolishDropThreshold = 0.15` (Design 3) に統一。

### 4.3 castleId → スプライト命名 (Design 4 接続)
SpriteAtlas の `formationId` (Design 4) = CastleDetector の `castleId` と一致させる。未知 formationId は `castle.default.*` フォールバック。`castleBuilt`/`castleBroken` の `castleId` をそのまま `castle.<castleId>.build/idle/break` にマップ。

---

## 5. AI 強さ制御 (正準は Design 5)

**`setStrength()` 4段階 enum は使わない** (Design 1 の setStrength 案は破棄)。
- `aiEngineManager.setPreferredEngine(ENGINE_TYPES.YANEURAOU)` + 各 CPU 手で `getBestMove(sfen, getEngineOptionsForFloor(floor))` に `{time, depth}` を直接渡す。
- 階層定義は `src/config/dungeonConfig.js` の静的配列 **`DUNGEON_FLOORS`** (20件) + `getFloorConfig(floor)` / `getEngineOptionsForFloor(floor)`。Design 1 の `src/rpg/dungeon/floors.js` は破棄。
- 全20階、ボス階 5/10/15/20。depth 上限 20 固定、16-20階は time のみ伸長 (floor20: time=18000, depth=20)。
- FloorConfig: `{ floor, zoneName, isBoss, bossName|null, bossKamaeFlavor|null, engineOptions:{time,depth}, enemySpriteId }`。Design 1 の `difficulty`/`strengthLevel` フィールドは持たない。
- `new ShogiGame(difficulty)` の difficulty 引数はダンジョンでは固定値 `'medium'` を渡す (外部 yaneuraou 使用時は BuiltinEngine フォールバック時のみ影響、実害なし)。
- BuiltinEngine フォールバック時は「劣化モード」として扱いダンジョン側は関知しない (Design 5)。
- `enemySpriteId` 命名: `{zoneKey}_{boss|mob}_NN` (例 `z1_mob_01`, `zone2_boss_01`)。

---

## 6. 永続化スキーマ (正準は Design 5)

既存 `src/storage/envelope.js` (`{schemaVersion:1, records:[]}`) 流用。キーは `shogiGameSave`/`shogi-training/*` と非衝突。

| キー | ストア | 形態 |
|---|---|---|
| `shogi-dungeon/progress` | `DungeonProgressStore` | 単一レコード `id:'default'` |
| `shogi-dungeon/battles` | `DungeonBattleStore` | 追記型 (`crypto.randomUUID()`) |

**確定事項**:
- レコード id は **`'default'`** (Design 5)。Design 1 の `'progress'` は破棄。
- `DungeonProgressRecord = { id:'default', currentFloor, highestFloorCleared, totalWins, totalLosses, estimatedRating:{label,avgDrop,sampleSize,dungeonTitle}|null, updatedAt }` (完全形は data-spec §3.2)。
- `DungeonBattleRecord = { id, floor, result:'win'|'lose'|'draw', totalPlies, playerMoveDrops:number[], playedAt }` (フル judgments は保存しない)。
- 進行反映は純粋関数 `applyBattleResult(progress, result, floor)` (immutable): win→`highestFloorCleared=max(...)`, `floor<20 なら currentFloor+1`; lose/draw→`currentFloor` 据え置き。
- 棋力表示は既存 `estimateRating()` 再利用 + `DungeonRating.RATING_TO_DUNGEON_TITLE` で称号変換 (Design 5)。

---

## 7. シーン/画面遷移 (Design 1 FSM を簡素化、Design 7 施設方式を採用)

Design 1 (フル FSM) と Design 7 (追加のみ・FSM先送り) の折衷。ユーザー方針「シンプル・既存資産再利用」に従い、**軽量 FSM + 既存パネル流用**を正準とする。

### 7.1 SceneManager FSM (`src/rpg/SceneManager.js`)
状態: `title` / `town` / `dungeonMap` / `battle`。hash: `#title` / `#town` / `#dungeon` / `#battle/floor/:n`。
- **施設は独立シーンにしない**。感想戦/ダッシュボード/ドリル/再演は `town` シーン上に開くオーバーレイパネルとし、既存 `AnalysisPanel`/`DashboardPanel`/`DrillMode`/`ReplayMode` を**無改修**で流用 (Design 7)。Design 1 の `FacilityScene` ラップは不採用。
- 施設起動は Design 7 の `FacilityRegistry` + trigger.click() 委譲方式 (`src/rpg/FacilityRegistry.js`, `TownScene.js`)。`town` = 施設ドア (軍師の間=strategist / 修練の書庫=archive) + ダンジョン入口を持つ拠点。
- `town` の `dungeonMap` への遷移でフロア選択 → `battle`。
- **battle→town 遷移は明示的** (Design 1): SceneManager が `gameEnded` を購読し `town` へ遷移。感想戦は「軍師の間」施設から明示起動。Design 1 の「ReviewPanel MutationObserver 廃止」は採用するが、review パネルの populate ロジック自体は流用 (自動シーン遷移のみ FSM 駆動に置換)。
- `#game-setup` の手動エンジン/強さ選択 UI は RPG メインフローでは使わない (floor が自動決定)。

### 7.2 対局終了の統合 (game.js フックは 1 経路)
`endGame`/`endGameDraw` は **`battleEventBus?.emit('gameEnded', ...)` の 1 経路のみ**。Design 5 の別 `onGameEnd` コールバック案・Design 2 の別コールバック案は破棄し、progression 永続化は BattleDirector が `gameEnded` 購読内で実行:
```
gameEnded 購読 → battleStore.save({floor, result, totalPlies, playerMoveDrops})
             → rating = estimateDungeonRating(battleStore.recent(10))
             → progressStore.save({...applyBattleResult(load(), result, floor), estimatedRating:rating})
```
`playerMoveDrops` は BattleDirector が対局中 `movePlayed`/評価差分から蓄積。

---

## 8. Canvas 描画層 (Design 4, 名前衝突のみ解消)

- **`BattleScene` 名前衝突を解消**: Design 4 の Canvas ロジックスシーン (actors/particles/getSnapshot) を **`BattleStage.js`** にリネーム。`BattleScene` の名は Design 1 の FSM シーン (`src/rpg/scenes/`) が保持。
- ActorAnimationFSM (5状態 idle/attack/damaged/castle-build/castle-break, 優先度 castle-break=3>damaged=2>attack=castle-build=1>idle=0)、SpriteAtlas (JSON アトラス, createPlaceholder)、`battleConfig.js` は Design 4 のまま採用。
- DOM: `#battle-window` を `#game-container` 内 `.game-status` と `.game-main` の間に新設 (Design 4)。3D 用 `#battle-window-3d` は後続スコープ。
- HP バー DOM は §3.3 の通り `hpUpdated` 駆動 (winrate 割合)。
- `damageTaken` payload に `tier`/`isLethal` を含める (§1)。renderer は cause(色/スプライト)・amount(シェイク/数値)・tier(強度)・isLethal(finishingBlow) を使用。

---

## 9. 設定ファイル分担 (正準)

| ファイル | 内容 |
|---|---|
| `src/config/dungeonConfig.js` | `hp`, `damage`, `cause`, `castle`, `engine`, `DUNGEON_FLOORS`, `MAX_FLOOR=20`, `BOSS_FLOORS=[5,10,15,20]` |
| `src/config/battleConfig.js` | `animQueueMaxLength=4`, `shakeFullAmount`, `shakeDecayMs`, `maxDtMs=100`, `placeholderPalette` 等の描画専用パラメータ |
| (既存) `src/config/trainingConfig.js` | 無改修。`judgeThresholds`/`tags.materialLossThreshold`/`winrate.ponanzaC`/`rating.tiers` を dungeonConfig から import 参照 |

閾値は既存 `trainingConfig` の値を import して二重定義しない (Design 2/3 共通方針)。

---

## 10. テスト方針 (統一)

- [TDD必須]: `BattleEventBus`, `ActorAnimationFSM`, `SpriteAtlas`(パース), `BattleStage`(イベント→FSM要求), `CastleDetector`, `DamageModel`, `CauseClassifier`, `DungeonProgression`, `DungeonRating`, `Store`類, `SceneManager`(遷移ロジック), `BattleDirector`(evalUpdated正規化・イベント変換)。
- [opt-out/視覚検証]: `BattleRenderer._draw`, CSS レイアウト, 各 Scene の DOM 生成, castleDefinitions 座標の妥当性(実対局目視)。
- game.js への追加コードは「`battleEventBus` 未設定時 = 既存動作完全同一」の回帰テストを1本追加。
