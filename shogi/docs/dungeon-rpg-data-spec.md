# ダンジョン将棋RPG データ仕様書

本書は「統一決定記録(正準)」に完全準拠する。内容が他文書と食い違う場合は統一決定記録が優先し、本書はそれをデータ面(スキーマ・数値・ファイルパス)として具体化したものである。

対象範囲:
1. 囲い定義スキーマ・v1収録5種の完全JSON
2. 構築度(completion)・破壊度(diffCastleState)の算定仕様
3. スプライトアトラスJSONスキーマとプレースホルダー運用
4. セーブデータスキーマ(envelope形式準拠)
5. 階層→AI強さマッピング表(全20階)

---

## 1. 囲い定義データ

### 1.1 ファイルパス

```
src/dungeon/castleDefinitions.json
```

パース・判定ロジックは `src/dungeon/CastleDetector.js`(別モジュール、本書の範囲外)。

### 1.2 座標系(確定)

- 盤面は `board[row][col]`、row/col は 0-8。`board[row][col] = { type, owner, promoted } | null`。
- 玉の駒種文字列: player側 `'王'`、cpu側 `'玉'`。判定は `type==='王' || type==='玉'` で等価に扱う。
- 定義データは **player(先手)視点1系統のみ**。cpu側は玉位置からの相対座標 `(dr,dc)` を符号反転(180度回転)して照合する。
  - player判定: `(row, col) = (kingRow + dr, kingCol + dc)`
  - cpu判定: `(row, col) = (kingRow - dr, kingCol - dc)`
- 成駒は厳密不一致(`type` 文字列の完全一致のみ。`'!'` プレフィックスは別種として扱う)。

### 1.3 JSONスキーマ

```jsonc
{
  "schemaVersion": 1,
  "castles": [
    {
      "id": "string (小文字snake_case、一意。SpriteAtlasのformationIdと完全一致、§1.7参照)",
      "label": "string (UI表示用日本語名)",
      "kingAnchor": { "row": "number 0-8", "col": "number 0-8" }, // 表示用メタ情報、判定には未使用
      "pieces": [
        { "dr": "number", "dc": "number", "type": "string (駒種1文字)", "weight": "number > 0" }
      ],
      "tolerance": 0,                    // v1固定。未使用(将来拡張用の予約フィールド)
      "minCompletionForCastle": "number (0-1、この囲い固有の完成閾値)"
    }
  ]
}
```

### 1.4 v1収録5種 完全データ

```json
{
  "schemaVersion": 1,
  "castles": [
    {
      "id": "yagura",
      "label": "矢倉",
      "kingAnchor": { "row": 8, "col": 7 },
      "pieces": [
        { "dr": 0,  "dc": -1, "type": "金", "weight": 1.0 },
        { "dr": -1, "dc": -1, "type": "金", "weight": 1.0 },
        { "dr": -1, "dc": 0,  "type": "銀", "weight": 1.0 },
        { "dr": -1, "dc": 1,  "type": "歩", "weight": 0.6 },
        { "dr": 0,  "dc": 1,  "type": "桂", "weight": 0.5 },
        { "dr": -2, "dc": -1, "type": "歩", "weight": 0.4 },
        { "dr": -2, "dc": 0,  "type": "歩", "weight": 0.4 },
        { "dr": -1, "dc": -2, "type": "歩", "weight": 0.4 }
      ],
      "tolerance": 0,
      "minCompletionForCastle": 0.6
    },
    {
      "id": "mino",
      "label": "美濃",
      "kingAnchor": { "row": 8, "col": 7 },
      "pieces": [
        { "dr": -1, "dc": 1,  "type": "金", "weight": 1.0 },
        { "dr": 0,  "dc": 1,  "type": "銀", "weight": 1.0 },
        { "dr": -1, "dc": 2,  "type": "歩", "weight": 0.5 },
        { "dr": 0,  "dc": 2,  "type": "香", "weight": 0.5 },
        { "dr": -1, "dc": 0,  "type": "歩", "weight": 0.4 },
        { "dr": -2, "dc": 1,  "type": "歩", "weight": 0.3 }
      ],
      "tolerance": 0,
      "minCompletionForCastle": 0.6
    },
    {
      "id": "anaguma",
      "label": "穴熊",
      "kingAnchor": { "row": 8, "col": 8 },
      "pieces": [
        { "dr": 0,  "dc": 1,  "type": "香", "weight": 0.8 },
        { "dr": -1, "dc": 1,  "type": "桂", "weight": 0.6 },
        { "dr": -1, "dc": 0,  "type": "金", "weight": 1.0 },
        { "dr": -1, "dc": -1, "type": "金", "weight": 1.0 },
        { "dr": -2, "dc": 0,  "type": "銀", "weight": 0.7 },
        { "dr": -2, "dc": -1, "type": "歩", "weight": 0.4 },
        { "dr": -1, "dc": -2, "type": "歩", "weight": 0.4 },
        { "dr": 0,  "dc": -1, "type": "歩", "weight": 0.4 }
      ],
      "tolerance": 0,
      "minCompletionForCastle": 0.65
    },
    {
      "id": "kani",
      "label": "カニ囲い",
      "kingAnchor": { "row": 8, "col": 7 },
      "pieces": [
        { "dr": -1, "dc": -1, "type": "金", "weight": 1.0 },
        { "dr": -1, "dc": 1,  "type": "金", "weight": 1.0 },
        { "dr": 0,  "dc": -1, "type": "銀", "weight": 0.6 },
        { "dr": -1, "dc": 0,  "type": "歩", "weight": 0.4 }
      ],
      "tolerance": 0,
      "minCompletionForCastle": 0.55
    },
    {
      "id": "ginkanmuri",
      "label": "銀冠",
      "kingAnchor": { "row": 8, "col": 8 },
      "pieces": [
        { "dr": -1, "dc": 0,  "type": "金", "weight": 1.0 },
        { "dr": -1, "dc": -1, "type": "金", "weight": 1.0 },
        { "dr": -2, "dc": 0,  "type": "銀", "weight": 1.0 },
        { "dr": 0,  "dc": 1,  "type": "香", "weight": 0.5 },
        { "dr": -1, "dc": 1,  "type": "桂", "weight": 0.5 },
        { "dr": -2, "dc": -1, "type": "歩", "weight": 0.3 }
      ],
      "tolerance": 0,
      "minCompletionForCastle": 0.6
    }
  ]
}
```

**確定事項**: `id` は統一決定記録§4.1の正準表記(`ginkanmuri`)を用いる。旧設計内で使われた `hokoshingiri` は誤記であり不採用。`kani`/`ginkanmuri` はそれぞれ矢倉/美濃の未完成形が誤検出されないための緩衝定義であり、UI上は「独立した囲い」として扱ってよい(完成度が高い方が `best` として採用されるため、矢倉構築途中でカニ囲いの条件を満たせば一時的に「カニ囲い」表示になり得る仕様上の挙動)。

### 1.5 構築度(completion)算定仕様

```
evaluateCastle(board, owner, def):
  king = findKing(board, owner)
  if king is null: return null

  totalWeight = sum(p.weight for p in def.pieces)
  matchedWeight = 0
  slotDetail = []

  for p in def.pieces:
    if owner == 'player':
      targetRow = king.row + p.dr
      targetCol = king.col + p.dc
    else:  # 'cpu'
      targetRow = king.row - p.dr
      targetCol = king.col - p.dc

    if targetRow not in [0,8] or targetCol not in [0,8]:
      present = false
    else:
      cell = board[targetRow][targetCol]
      present = (cell != null) and (cell.owner == owner) and (cell.type == p.type)

    if present: matchedWeight += p.weight
    slotDetail.push({ dr: p.dr, dc: p.dc, type: p.type, present })

  completion = totalWeight > 0 ? matchedWeight / totalWeight : 0
  return { castleId: def.id, label: def.label, completion, slotDetail }
```

`detectCastle(board, owner, definitions?)`:
```
matches = definitions.map(d => evaluateCastle(board, owner, d)).filter(m => m != null)
        .sort by completion desc
best = matches.find(m => m.completion >= definitionOf(m.castleId).minCompletionForCastle) ?? null
return { best, all: matches }
```

### 1.6 破壊度(diffCastleState)算定仕様

```
diffCastleState(before, after):
  # before は呼び出し側が detectCastle().best をそのまま渡す契約
  # (minCompletionForCastle 未達の CastleMatch は渡さないこと)
  if before == null:
    return { demolished: false, castleId: null, completionDrop: 0 }
  if after == null:
    return { demolished: true, castleId: before.castleId, completionDrop: before.completion }
  if after.castleId !== before.castleId:
    return { demolished: true, castleId: before.castleId, completionDrop: before.completion }

  drop = max(0, before.completion - after.completion)
  demolished = drop >= dungeonConfig.castle.demolishDropThreshold  # = 0.15
  return { demolished, castleId: before.castleId, completionDrop: drop }
```

`dungeonConfig.castle.demolishDropThreshold = 0.15`(`src/config/dungeonConfig.js` に定義。統一決定記録§4.2により Design 2 の `castleIntegrityDropThreshold` は不採用)。

`CauseClassifier` との接続(統一決定記録§4.2、正準):
```
beforeBest = detectCastle(boardBefore, lossSide).best
if beforeBest && beforeBest.completion >= minCompletionForCastle(beforeBest.castleId):
  afterMatch = evaluateCastle(boardAfter, lossSide, defOf(beforeBest.castleId))
  completionDrop = beforeBest.completion - afterMatch.completion
  if completionDrop >= dungeonConfig.castle.demolishDropThreshold → cause = 'castle-break'
```

### 1.7 formationId 接続(スプライト命名との対応)

`castleId`(本データの `id`)は SpriteAtlas の `formationId` と完全一致させる。`castleBuilt`/`castleBroken` イベントの `castleId` をそのまま以下にマップする:

```
castle.<castleId>.build
castle.<castleId>.idle
castle.<castleId>.break
```

未知の `castleId` (v1収録5種以外、または将来追加分の実装漏れ)は `castle.default.*` にフォールバックする。アトラスJSONには必ず `castle.default.build/idle/break` を用意すること(§3参照)。

---

## 2. スプライトアトラス データ

### 2.1 ファイルパス

```
src/battle/sprites/placeholder-atlas.json   # プレースホルダー段階
assets/battle/atlas.json                    # 本番差し替え後(ファイル名は運用時に決定、同一スキーマ)
```

`vite.config.js` の `build.assetsInlineLimit: 0` により画像は data:URL化されない前提。本番PNG配置先は `assets/battle/` 配下。

### 2.2 JSONスキーマ(プレースホルダー・本番共通)

```jsonc
{
  "version": 1,
  "image": "string (画像ファイル名。プレースホルダー時はSpriteAtlas.createPlaceholder()がoffscreen canvasを生成しこの欄は無視)",
  "imageSize": { "w": "number", "h": "number" },
  "frameSize": { "w": "number", "h": "number" },
  "frames": {
    "<frameName>": { "x": "number", "y": "number", "w": "number", "h": "number" }
  },
  "animations": {
    "<animationKey>": {
      "frames": ["frameName", "..."],
      "fps": "number",
      "loop": "boolean"
    }
  }
}
```

**命名規約(確定)**:
- fighter系 `animationKey`: `"<actorKind>.<animState>"` (`actorKind` = `player`|`cpu`、`animState` = `idle`|`attack`|`damaged`)
- castle系 `animationKey`: `"castle.<castleId>.<animState>"` (`animState` = `build`|`idle`|`break`)
- `ActorAnimationFSM.state` の値(`idle`/`attack`/`damaged`/`castle-build`/`castle-break`)は `BattleRenderer` 側で1箇所だけ持つ変換テーブルにより `animState` へマップする(`castle-build`→`build`、`castle-break`→`break`のハイフン除去)。

### 2.3 v1プレースホルダー完全データ

```json
{
  "version": 1,
  "image": "placeholder-atlas.png",
  "imageSize": { "w": 512, "h": 512 },
  "frameSize": { "w": 64, "h": 64 },
  "frames": {
    "player_idle_0": { "x": 0,   "y": 0,   "w": 64, "h": 64 },
    "player_idle_1": { "x": 64,  "y": 0,   "w": 64, "h": 64 },
    "player_attack_0": { "x": 0,   "y": 64,  "w": 64, "h": 64 },
    "player_attack_1": { "x": 64,  "y": 64,  "w": 64, "h": 64 },
    "player_attack_2": { "x": 128, "y": 64,  "w": 64, "h": 64 },
    "player_damaged_0": { "x": 0,  "y": 128, "w": 64, "h": 64 },
    "player_damaged_1": { "x": 64, "y": 128, "w": 64, "h": 64 },
    "cpu_idle_0": { "x": 0,   "y": 192, "w": 64, "h": 64 },
    "cpu_idle_1": { "x": 64,  "y": 192, "w": 64, "h": 64 },
    "cpu_attack_0": { "x": 128, "y": 192, "w": 64, "h": 64 },
    "cpu_attack_1": { "x": 192, "y": 192, "w": 64, "h": 64 },
    "cpu_attack_2": { "x": 256, "y": 192, "w": 64, "h": 64 },
    "cpu_damaged_0": { "x": 320, "y": 192, "w": 64, "h": 64 },
    "cpu_damaged_1": { "x": 384, "y": 192, "w": 64, "h": 64 },
    "castle_default_build_0": { "x": 0,   "y": 256, "w": 64, "h": 64 },
    "castle_default_idle_0":  { "x": 64,  "y": 256, "w": 64, "h": 64 },
    "castle_default_break_0": { "x": 128, "y": 256, "w": 64, "h": 64 },
    "castle_yagura_build_0": { "x": 0,   "y": 320, "w": 64, "h": 64 },
    "castle_yagura_idle_0":  { "x": 64,  "y": 320, "w": 64, "h": 64 },
    "castle_yagura_break_0": { "x": 128, "y": 320, "w": 64, "h": 64 },
    "castle_mino_build_0": { "x": 0,   "y": 384, "w": 64, "h": 64 },
    "castle_mino_idle_0":  { "x": 64,  "y": 384, "w": 64, "h": 64 },
    "castle_mino_break_0": { "x": 128, "y": 384, "w": 64, "h": 64 },
    "castle_anaguma_build_0": { "x": 0,   "y": 448, "w": 64, "h": 64 },
    "castle_anaguma_idle_0":  { "x": 64,  "y": 448, "w": 64, "h": 64 },
    "castle_anaguma_break_0": { "x": 128, "y": 448, "w": 64, "h": 64 },
    "castle_kani_build_0": { "x": 192, "y": 448, "w": 64, "h": 64 },
    "castle_kani_idle_0":  { "x": 256, "y": 448, "w": 64, "h": 64 },
    "castle_kani_break_0": { "x": 320, "y": 448, "w": 64, "h": 64 },
    "castle_ginkanmuri_build_0": { "x": 384, "y": 448, "w": 64, "h": 64 },
    "castle_ginkanmuri_idle_0":  { "x": 448, "y": 448, "w": 64, "h": 64 },
    "castle_ginkanmuri_break_0": { "x": 192, "y": 384, "w": 64, "h": 64 }
  },
  "animations": {
    "player.idle":    { "frames": ["player_idle_0", "player_idle_1"], "fps": 2,  "loop": true },
    "player.attack":  { "frames": ["player_attack_0", "player_attack_1", "player_attack_2"], "fps": 12, "loop": false },
    "player.damaged": { "frames": ["player_damaged_0", "player_damaged_1"], "fps": 10, "loop": false },
    "cpu.idle":    { "frames": ["cpu_idle_0", "cpu_idle_1"], "fps": 2,  "loop": true },
    "cpu.attack":  { "frames": ["cpu_attack_0", "cpu_attack_1", "cpu_attack_2"], "fps": 12, "loop": false },
    "cpu.damaged": { "frames": ["cpu_damaged_0", "cpu_damaged_1"], "fps": 10, "loop": false },
    "castle.default.build": { "frames": ["castle_default_build_0"], "fps": 4, "loop": false },
    "castle.default.idle":  { "frames": ["castle_default_idle_0"], "fps": 1, "loop": true },
    "castle.default.break": { "frames": ["castle_default_break_0"], "fps": 8, "loop": false },
    "castle.yagura.build": { "frames": ["castle_yagura_build_0"], "fps": 4, "loop": false },
    "castle.yagura.idle":  { "frames": ["castle_yagura_idle_0"], "fps": 1, "loop": true },
    "castle.yagura.break": { "frames": ["castle_yagura_break_0"], "fps": 8, "loop": false },
    "castle.mino.build": { "frames": ["castle_mino_build_0"], "fps": 4, "loop": false },
    "castle.mino.idle":  { "frames": ["castle_mino_idle_0"], "fps": 1, "loop": true },
    "castle.mino.break": { "frames": ["castle_mino_break_0"], "fps": 8, "loop": false },
    "castle.anaguma.build": { "frames": ["castle_anaguma_build_0"], "fps": 4, "loop": false },
    "castle.anaguma.idle":  { "frames": ["castle_anaguma_idle_0"], "fps": 1, "loop": true },
    "castle.anaguma.break": { "frames": ["castle_anaguma_break_0"], "fps": 8, "loop": false },
    "castle.kani.build": { "frames": ["castle_kani_build_0"], "fps": 4, "loop": false },
    "castle.kani.idle":  { "frames": ["castle_kani_idle_0"], "fps": 1, "loop": true },
    "castle.kani.break": { "frames": ["castle_kani_break_0"], "fps": 8, "loop": false },
    "castle.ginkanmuri.build": { "frames": ["castle_ginkanmuri_build_0"], "fps": 4, "loop": false },
    "castle.ginkanmuri.idle":  { "frames": ["castle_ginkanmuri_idle_0"], "fps": 1, "loop": true },
    "castle.ginkanmuri.break": { "frames": ["castle_ginkanmuri_break_0"], "fps": 8, "loop": false }
  }
}
```

`castle.default.*` は v1収録5種以外のformationIdが来た場合、および実装漏れの安全網として必須。全 `animationKey` は `castleId` が `castleDefinitions.json` の `id` 一覧(`yagura`/`mino`/`anaguma`/`kani`/`ginkanmuri`)と1:1対応していることをテストで固定すること(§5参照)。

### 2.4 プレースホルダー生成API

```js
SpriteAtlas.createPlaceholder({ palette: Record<actorKind|castleId, cssColorString> }) -> SpriteAtlas
```
- offscreen canvasに単色矩形+簡易図形を描画して合成した `SpriteAtlas` を返す。`load(jsonPath)` と同一の戻り値契約(`getFrame`/`getAnimation`/`image`)を持ち、`BattleRenderer` はプレースホルダーか本番PNGかを意識しない。
- `palette` の既定値は `src/config/battleConfig.js` の `placeholderPalette` に集約する:
  ```js
  placeholderPalette: {
    player: '#4dd0ff', cpu: '#ff6b6b',
    'castle.default': '#9e9e9e',
    'castle.yagura': '#c9a15a', 'castle.mino': '#7fbf7f',
    'castle.anaguma': '#6b6b8f', 'castle.kani': '#e0a860',
    'castle.ginkanmuri': '#b0b0d0',
  }
  ```

### 2.5 本番差し替え手順(運用メモ)

1. `assets/battle/atlas.png` を配置。
2. `src/battle/sprites/placeholder-atlas.json` と同一スキーマの `atlas.json` を作成(フレーム座標のみ実画像に合わせて更新)。
3. 初期化コードの `SpriteAtlas.createPlaceholder(...)` 呼び出しを `await SpriteAtlas.load('/assets/battle/atlas.json')` に置換。
4. `animationKey` 命名規約(§2.2)を変更しないこと。変更するとイベント→FSM→描画のマッピングテーブル全体の改修が必要になる。

---

## 3. セーブデータ スキーマ

既存 `src/storage/envelope.js` の `{ schemaVersion, records }` 封筒形式に完全準拠。`loadEnvelope(storage, key)` / `saveEnvelope(storage, key, envelope, records)` をそのまま利用する。

### 3.1 ストレージキー一覧(既存キーと非衝突)

| キー | ストア | 形態 | ファイルパス |
|---|---|---|---|
| `shogi-dungeon/progress` | `DungeonProgressStore` | 単一レコード(`id:'default'`) | `src/storage/DungeonProgressStore.js` |
| `shogi-dungeon/battles` | `DungeonBattleStore` | 追記型(`crypto.randomUUID()`) | `src/storage/DungeonBattleStore.js` |

既存キー `shogiGameSave`・`shogi-training/{games,drills,mistakes}` とは名前空間が独立しており衝突しない。

### 3.2 DungeonProgressRecord

```js
/**
 * @typedef {Object} DungeonProgressRecord
 * @property {'default'} id
 * @property {number} currentFloor          - 1-20。次に挑戦する(=挑戦中の)階。初期値1
 * @property {number} highestFloorCleared   - 0-20。0は未クリア
 * @property {number} totalWins
 * @property {number} totalLosses
 * @property {{label:string|null, avgDrop:number|null, sampleSize:number, dungeonTitle:string|null}|null} estimatedRating
 * @property {string} updatedAt             - ISO8601
 */
```

保存例(envelope全体):
```json
{
  "schemaVersion": 1,
  "records": [
    {
      "id": "default",
      "currentFloor": 6,
      "highestFloorCleared": 5,
      "totalWins": 5,
      "totalLosses": 2,
      "estimatedRating": { "label": "7〜9級", "avgDrop": 0.041, "sampleSize": 34, "dungeonTitle": "駆け出し冒険者" },
      "updatedAt": "2026-07-09T10:00:00.000Z"
    }
  ]
}
```

未保存時のデフォルト値(`DungeonProgressStore.load()` が返す):
```js
{
  id: 'default', currentFloor: 1, highestFloorCleared: 0,
  totalWins: 0, totalLosses: 0, estimatedRating: null,
  updatedAt: '<load時点のISO8601>',
}
```

### 3.3 DungeonBattleRecord

```js
/**
 * @typedef {Object} DungeonBattleRecord
 * @property {string} id                - crypto.randomUUID()、save時自動付与
 * @property {number} floor             - 挑戦した階(1-20)
 * @property {'win'|'lose'|'draw'} result
 * @property {number} totalPlies
 * @property {number[]} playerMoveDrops - プレイヤー着手ごとのwinrate下落幅(0-1)。skipped(評価失敗)手は含めない
 * @property {string} playedAt          - ISO8601
 */
```

保存例:
```json
{
  "schemaVersion": 1,
  "records": [
    {
      "id": "b-3f1a2c9e-....",
      "floor": 6,
      "result": "win",
      "totalPlies": 58,
      "playerMoveDrops": [0.01, 0.0, 0.12, 0.03, 0.0],
      "playedAt": "2026-07-09T09:40:00.000Z"
    }
  ]
}
```

フル `judgments` 配列(GameAnalyzer.js の出力)は保存しない(軽量化、統一決定記録§6)。

### 3.4 進行反映(純粋関数、参照実装)

```js
// src/dungeon/DungeonProgression.js
function applyBattleResult(progress, result, floor) {
  if (floor !== progress.currentFloor) {
    throw new RangeError(`floor(${floor}) must equal progress.currentFloor(${progress.currentFloor})`);
  }
  const isWin = result === 'win';
  return {
    ...progress,
    currentFloor: isWin && floor < 20 ? floor + 1 : progress.currentFloor,
    highestFloorCleared: isWin ? Math.max(progress.highestFloorCleared, floor) : progress.highestFloorCleared,
    totalWins: progress.totalWins + (isWin ? 1 : 0),
    totalLosses: progress.totalLosses + (result === 'lose' ? 1 : 0),
  };
}
```
win: `highestFloorCleared = max(highestFloorCleared, floor)`、`floor<20` なら `currentFloor+1`。lose/draw: `currentFloor` 据え置き(敗北はその階から再挑戦)。

### 3.5 対局終了時の書き込みシーケンス(統一決定記録§7.2、正準)

`gameEnded` イベント購読内で BattleDirector が1経路のみ実行する:
```js
gameEnded 購読 →
  battle = battleStore.save({ floor: currentFloor, result, totalPlies, playerMoveDrops })
  rating = estimateDungeonRating(battleStore.recent(10))
  next   = applyBattleResult(progressStore.load(), result, currentFloor)
  progressStore.save({ ...next, estimatedRating: rating })
```

---

## 4. 階層→AI強さ マッピング表

### 4.1 配置場所

```
src/config/dungeonConfig.js
```
静的配列 `DUNGEON_FLOORS`(20件、floor昇順)として定義する。式(formula)ではなく**明示的な20行配列を正**とし、丸め誤差を排除する。

### 4.2 FloorConfig 型

```js
/**
 * @typedef {Object} FloorConfig
 * @property {number} floor
 * @property {string} zoneName
 * @property {boolean} isBoss
 * @property {string|null} bossName
 * @property {string|null} bossKamaeFlavor   - 表示専用フレーバー。AIの実際の指し手挙動には影響しない
 * @property {{time:number, depth:number}} engineOptions
 * @property {string} enemySpriteId          - "{zoneKey}_{boss|mob}_NN" 形式
 */
```

### 4.3 全20階 完全データ

| floor | zoneName | isBoss | bossName | bossKamaeFlavor | time(ms) | depth | enemySpriteId |
|---|---|---|---|---|---|---|---|
| 1 | 見習いの回廊 | false | null | null | 100 | 3 | z1_mob_01 |
| 2 | 見習いの回廊 | false | null | null | 250 | 4 | z1_mob_02 |
| 3 | 見習いの回廊 | false | null | null | 400 | 5 | z1_mob_03 |
| 4 | 見習いの回廊 | false | null | null | 600 | 6 | z1_mob_01 |
| 5 | 見習いの回廊 | true | 雑兵頭 | null | 900 | 7 | z1_boss_01 |
| 6 | 番兵の間 | false | null | null | 1000 | 8 | z2_mob_01 |
| 7 | 番兵の間 | false | null | null | 1300 | 8 | z2_mob_02 |
| 8 | 番兵の間 | false | null | null | 1700 | 9 | z2_mob_03 |
| 9 | 番兵の間 | false | null | null | 2200 | 10 | z2_mob_01 |
| 10 | 番兵の間 | true | 番兵長 | 矢倉 | 2800 | 11 | z2_boss_01 |
| 11 | 精鋭の陣 | false | null | null | 3000 | 12 | z3_mob_01 |
| 12 | 精鋭の陣 | false | null | null | 4000 | 13 | z3_mob_02 |
| 13 | 精鋭の陣 | false | null | null | 5000 | 14 | z3_mob_03 |
| 14 | 精鋭の陣 | false | null | null | 6500 | 15 | z3_mob_01 |
| 15 | 精鋭の陣 | true | 精鋭大将 | 美濃 | 8000 | 16 | z3_boss_01 |
| 16 | 竜王の間近 | false | null | null | 9000 | 20 | z4_mob_01 |
| 17 | 竜王の間近 | false | null | null | 10500 | 20 | z4_mob_02 |
| 18 | 竜王の間近 | false | null | null | 12000 | 20 | z4_mob_03 |
| 19 | 竜王の間近 | false | null | null | 14000 | 20 | z4_mob_01 |
| 20 | 竜王の間近 | true | 竜王 | 穴熊 | 18000 | 20 | z4_boss_01 |

`MAX_FLOOR = 20`、`BOSS_FLOORS = [5, 10, 15, 20]`。

depth上限は20固定(このWASMビルドでの検証済み最大値)。16-19階の強化は time のみで行い、20階(最終ボス)も depth=20 で time のみ最大化する。

タイムアウト検算: floor20 の実効タイムアウトは `time(18000) + 5000 = 23000ms` < worker側ハードタイムアウト60000ms。全階層で安全マージンを確保している。

### 4.4 API

```js
// src/config/dungeonConfig.js
export const DUNGEON_FLOORS = [ /* 上表20件、値そのまま */ ];
export const MAX_FLOOR = 20;
export const BOSS_FLOORS = [5, 10, 15, 20];

/** @param {number} floor 1-20 @returns {FloorConfig} @throws {RangeError} 範囲外時 */
export function getFloorConfig(floor) {
  if (!Number.isInteger(floor) || floor < 1 || floor > MAX_FLOOR) {
    throw new RangeError(`floor must be 1-${MAX_FLOOR}, got ${floor}`);
  }
  return DUNGEON_FLOORS[floor - 1];
}

/** @param {number} floor @returns {{time:number, depth:number}} */
export function getEngineOptionsForFloor(floor) {
  return getFloorConfig(floor).engineOptions;
}
```

呼び出し側は `aiEngineManager.setPreferredEngine(ENGINE_TYPES.YANEURAOU)` 済みの前提で `aiEngineManager.getBestMove(sfen, getEngineOptionsForFloor(floor))` を呼ぶだけでよい。`setStrength()` 4段階enumは使わない。

### 4.5 bossKamaeFlavor の位置づけ(確定)

`bossKamaeFlavor` は表示専用フレーバーであり、AIの実際の指し手挙動には一切影響しない。盤上でその囲いが実際に構築されたかどうかは `CastleDetector`(§1)が独立に判定し、戦闘ウィンドウの城グラフィックへ反映する。ボスが `bossKamaeFlavor` 通りに指すとは限らない(両者は独立)。

---

## 5. テスト方針(本データに対して[TDD]必須)

- `castleDefinitions.json`: `id` 一覧が `placeholder-atlas.json` の `animations` に定義された `castle.<id>.*` 3種(build/idle/break)と1:1対応することを検証する固定テスト。
- `CastleDetector.evaluateCastle`/`detectCastle`/`diffCastleState`: §1.5-1.6の算定仕様通りの入出力(完成形盤面でcompletion=1.0、鏡像対応、閾値境界、破壊度)。
- `DungeonProgression.applyBattleResult`: win/lose/draw分岐、floor不一致時のRangeError、floor=20到達時のcurrentFloor据え置き。
- `dungeonConfig.getFloorConfig`/`getEngineOptionsForFloor`: 範囲外floorでRangeError、全20件の値が上表(§4.3)と一致すること。
- `DungeonProgressStore`/`DungeonBattleStore`: envelope形式でのsave/load、id`'default'`のupsert、battlesの追記型蓄積。
- `SpriteAtlas.createPlaceholder`/`load`: 戻り値契約(`getFrame`/`getAnimation`/`image`)が同一であることの回帰テスト。

`BattleRenderer._draw()` の実描画結果・CSSレイアウトは視覚検証で代替(opt-out、architecture.md方針)。
