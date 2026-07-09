# ダンジョン将棋RPG 実装ロードマップ

本ドキュメントは `docs/dungeon-rpg-decisions.md`(統一決定記録・正準)に基づく実装計画である。**本ロードマップとの記述齟齬は決定記録側が優先する。** 各フェーズは「動く縦切り」を単位とし、フェーズ終了時点でブラウザ上で目視確認できる状態を維持する。

全フェーズ共通の前提:
- 既存 `game.js`/`src/ai/`/`src/renderers/`/`src/ui/`/`src/storage/`/`src/analysis/`/`src/training/` は温存し、侵襲は最小限のフック追加に限定する。
- ディレクトリ構成は決定記録 §0 の通り: `src/dungeon/`(純粋ロジック)、`src/battle/`(Canvas描画)、`src/rpg/`(シーン/FSM/施設)、`src/storage/`(永続化、既存と同居)、`src/config/`(設定集約、既存と同居)。
- `[TDD]` 印のモジュールは RED→GREEN→REFACTOR を厳守し、実装前にテストを書く。`[opt-out]` は視覚検証で代替(理由: Canvas描画/DOMレイアウトは自動テスト困難)。
- 各フェーズ末尾で `npm run dev` を起動し、既存機能(通常対局・感想戦・再演・ドリル・ダッシュボード)が無改修で動作することを目視確認する。

---

## Phase 1: BattleEventBus + ダメージモデル + プレースホルダー戦闘ウィンドウ(最小で動く)

**ゴール**: 通常対局中、盤面下に戦闘ウィンドウ(単色矩形スプライト)が表示され、指し手のたびにHPバーが動き、勝率変動に応じたヒット演出(色矩形+シェイク)が出る。囲い・原因分類・ダンジョン進行はまだ無い(常に `cause:'other'` 相当の演出のみ)。

### 実装対象ファイル

新規:
- `src/battle/BattleEventBus.js` — pub/sub本体(§1)
- `src/dungeon/DamageModel.js` — `computeDamageEvent`/`resolveDamageHp`(§3)
- `src/config/dungeonConfig.js` — `hp`, `damage`, `engine` セクションのみ先行定義(§3.2, §3.5, §9)
- `src/config/battleConfig.js` — `animQueueMaxLength`, `shakeFullAmount`, `shakeDecayMs`, `maxDtMs`, `placeholderPalette`(§9)
- `src/battle/ActorAnimationFSM.js` — 5状態FSM(§8、v1では `castle-build`/`castle-break` は未使用だが状態自体は定義しておく)
- `src/battle/SpriteAtlas.js` — `createPlaceholder`/`getFrame`/`getAnimation`(§8)
- `src/battle/sprites/placeholder-atlas.json` — プレースホルダーアトラス定義
- `src/battle/BattleStage.js` — イベント→FSM要求マッピング、`getSnapshot()`(§8。旧名 `BattleScene` はFSMシーンが保持するためこの名前を使う)
- `src/battle/BattleRenderer.js` — rAFループ、Canvas描画(§8)
- `src/battle/battleTheme.js` — `CAUSE_COLOR`(§8。Phase1では `other` の灰色のみ実質使用)
- `src/rpg/BattleDirector.js` — game.js の `movePlayed`/`gameStarted`/`gameEnded` を購読し、engine評価取得→`hpUpdated`/`attackStarted`/`damageTaken` を発行する統合層(§1 Tier B, §3.6)

既存ファイル改修(最小侵襲):
- `game.js` — コンストラクタに `this.battleEventBus = null;` 追加。`setBattleEventBus(bus)` 追加。`completeMove`/`makeMove`/`placeCapturedPiece`/`executeCpuDrop` の `updateUI()` 直後に `movePlayed` emit追加。`endGame`/`endGameDraw` 先頭に `gameEnded` emit追加。
- `index.html` — `#battle-window`(canvas + HUD、§8 DOM構造)を `.game-status` と `.game-main` の間に追加。
- `main.js` — `initializeBattleWindow()` 新設、`initializeRenderer()` と並列に呼び出し。`ResizeObserver` 設置。

### BattleEventBus イベント(Phase1で使うもののみ、§1準拠)

Tier A(game.js発行): `gameStarted`, `movePlayed`, `gameEnded`
Tier B(BattleDirector発行): `hpUpdated`, `attackStarted`, `damageTaken`

`castleBuilt`/`castleBroken` はPhase2まで発行しない(BattleDirectorは購読ハンドラを持たない)。

### 受け入れ条件(ユーザー視点)

1. `npm run dev` で対局画面を開くと、盤面上部に戦闘ウィンドウ(帯状のCanvas領域)が表示され、CPU側・プレイヤー側それぞれのHPバーが表示される。
2. 対局開始直後、両者のHPバーはほぼ半分(互角)の位置にある。
3. 一手指すごとに、評価値変動に応じてHPバーの割合が滑らかに変化する(`transition: width 200ms`)。
4. 評価値が大きく傾く手(悪手相当)を指すと、該当側のHPバーが目に見えて減り、ダメージ数値(`-N`のようなテキスト矩形)が一瞬表示され、画面が軽く揺れる。
5. 詰みで対局が終了すると、負けた側のHPが0になる。
6. ブラウザタブを非アクティブにすると戦闘ウィンドウのrAFループが停止する(`document.hidden`監視、開発者ツールで `requestAnimationFrame` 呼び出しが止まることを確認)。
7. モバイル幅(375px相当)でも戦闘ウィンドウがレイアウト崩れなく表示される。

### テスト方針(TDD、vitest)

`[TDD]` 対象:
- `BattleEventBus.test.js`: `on`/`off`/`emit`/購読解除後は呼ばれないこと/ハンドラ内例外が後続ハンドラの実行を妨げないこと(`console.error`スパイで検証)。
- `DamageModel.test.js`: §3.4/3.5/3.6の全ケース(delta=0で`target:null`、詰みで`isLethal:true`、tier境界値 graze/light/medium/heavy/critical/fatal の6値、`resolveDamageHp`のisLethal分岐)。
- `ActorAnimationFSM.test.js`: 優先度割込み規則5パターン(§8の優先度テーブル、Phase1では `idle`/`attack`/`damaged`のみ実データで検証、`castle-*`はテーブル定義のみ確認)。
- `SpriteAtlas.test.js`: JSONパース、`getFrame`/`getAnimation`の戻り値契約、未知キーでのエラー処理、`createPlaceholder`が`load`と同じ形の戻り値を返すこと。
- `BattleStage.test.js`(旧`BattleScene`相当): `hpUpdated`→HPスナップショット反映、`damageTaken`→対象アクターの`damaged`要求+パーティクル1件spawn、`attackStarted`→対象アクターの`attack`要求。Canvas不要、`getSnapshot()`の戻り値のみ検証。
- `BattleDirector.test.js`: `movePlayed`購読→engine呼び出し1回/手(モックengine注入)→`hpUpdated`/`attackStarted`/`damageTaken`が§1の符号規約通りに発行されること。前ply結果のキャッシュ(`scoreBeforeCp`)が次呼び出しに正しく引き継がれること。

`[opt-out]` 対象: `BattleRenderer._draw()`、`#battle-window`のCSSレイアウト。理由: 描画結果はピクセル単位アサーションが脆く保守コストに見合わない。`npm run dev`での目視確認で代替。

### 回帰確認項目

- `battleEventBus` が `null`(未設定)の状態で `completeMove`/`makeMove`/`placeCapturedPiece`/`executeCpuDrop`/`endGame`/`endGameDraw` を呼んでも例外が発生せず、既存の対局進行が変わらないこと(回帰テスト1本を新規追加、§10準拠)。
- 既存の感想戦(`AnalysisPanel`)・再演(`ReplayMode`)・ドリル(`DrillMode`)・ダッシュボード(`DashboardPanel`)がすべて無改修で従来通り動作すること(手動確認)。
- `replayMode` 中の対局で `movePlayed`/`gameEnded` イベントが発行されても(BattleDirectorが未接続なら)UIに影響が出ないこと。
- 3D対局モード(`#three-container`)で戦闘ウィンドウが表示されない(Phase1は2D対局画面限定)ことを確認、エラーも出ないこと。
- `vite.config.js` の `assetsInlineLimit: 0` 制約を破らないこと(プレースホルダーアトラスはJSON+Canvas合成のみで画像ファイルを追加しない)。

---

## Phase 2: 囲い検出 + 城グラフィック変化

**ゴール**: 矢倉・美濃・穴熊(・カニ囲い・銀冠)を組むと戦闘ウィンドウの城グラフィックが変化し、囲いを崩されると崩壊演出が出る。

### 実装対象ファイル

新規:
- `src/dungeon/castleDefinitions.json` — 5囲いの定義データ(king相対オフセット、§4.1構造)
- `src/dungeon/CastleDetector.js` — `findKing`/`evaluateCastle`/`detectCastle`/`diffCastleState`(§4.1 API)

既存ファイル改修:
- `src/config/dungeonConfig.js` — `castle.demolishDropThreshold = 0.15` を追記(§4.2)
- `src/rpg/BattleDirector.js` — `movePlayed` 購読ハンドラ内で両陣営の `detectCastle` を毎手実行し、`castleBuilt`/`castleBroken` を発行するロジックを追加(§4.2 completionDrop判定)
- `src/battle/sprites/placeholder-atlas.json` — `castle.<castleId>.build/idle/break` フレーム/アニメーション追加(5囲い分 + `castle.default.*` フォールバック)
- `src/battle/BattleStage.js` — `castleBuilt`/`castleBroken` 購読ハンドラ追加(§8 イベント→FSM要求マッピング表の castle 行)

### 受け入れ条件(ユーザー視点)

1. プレイヤーが矢倉(または美濃・穴熊)を実戦通りに組み上げると、戦闘ウィンドウのプレイヤー側城グラフィックが「築城完了」の見た目に変化する(色/形が変わる、プレースホルダー段階でも視覚的に区別できる)。
2. 完成した囲いを金銀が剥がされるなどして大きく崩されると、城グラフィックが崩壊演出(矩形パーティクル散布+画面揺れ)に変化する。
3. CPU側が囲いを組んだ場合も同様にCPU側城グラフィックが変化する(180度鏡像判定、決定記録§4.1準拠)。
4. 初期配置や単なる駒組みの途中経過では誤って「囲い完成」と表示されない(`minCompletionForCastle` 閾値によるハードカット)。
5. 未定義の囲いパターン(囲い性のない乱戦)では城グラフィックは初期状態(`castle.default.*`)のまま。

### テスト方針(TDD、vitest)

`[TDD]` 対象:
- `CastleDetector.test.js`: `findKing`(該当なしでnull、player/cpu双方で正しい座標)。矢倉/美濃/穴熊/カニ囲い/銀冠それぞれの完成形fixtureで`completion=1.0`。1駒欠けでの`completion`低下と`slotDetail`反映。**鏡像対応テスト(player完成形を180度回転しcpu配置、同じcompletionを返すこと)を最重要ケースとして含める**。`detectCastle`の複数囲い同時該当時のcompletion最大選択。`diffCastleState`の`demolishDropThreshold`境界値、castleId変化時、afterがnullの全損ケース。誤検出対策の回帰(初期配置・未完成局面で`best===null`維持)。
- `BattleDirector.test.js`(追記): `movePlayed`購読内で `castleBuilt`/`castleBroken` が §4.2 のロジック通りに発行されること(モック盤面で検証)。

`[opt-out]` 対象: `castleDefinitions.json` の座標の妥当性(実対局目視確認)、城グラフィックのCSS/Canvas見た目。

### 回帰確認項目

- Phase1のダメージ演出(HPバー・ヒット演出)が引き続き正常動作すること(囲い検出追加によるBattleDirectorの処理負荷増でフレーム落ちが出ないか目視確認)。
- 囲い検出は「指し手確定」フックの中で両陣営×5囲い=定数オーダーの計算(決定記録内の計算量試算 O(40)程度)であり、既存のミニマックス探索・エンジン呼び出しのレイテンシに対して無視できることを確認(体感速度に劣化がないか`npm run dev`で確認)。
- 既存の感想戦・再演・ドリル・ダッシュボードが無改修で動作すること。
- `CastleDetector`は`SfenConverter.sfenToBoard`ではなく`board`引数を直接受け取る設計のため、`game.js`の`board`形式(`{type, owner, promoted}|null`)とのフィールド互換性を確認。

---

## Phase 3: 原因分類演出 + ダンジョン進行・セーブ

**ゴール**: ダメージの原因(囲い破壊/攻め強化/駒得駒損/その他)が色分けされたエフェクトで視覚的に区別される。ダンジョンマップ・階層選択・階層別AI強さ・進行セーブが機能し、20階を通しで遊べる。

### 実装対象ファイル

新規:
- `src/dungeon/CauseClassifier.js` — 決定木分類ロジック(castle-break→material→attack-boost→other)
- `src/config/dungeonConfig.js` に `cause`, `castle`(minCompletion系は既にJSON側にあるためdemolishDropThresholdのみ)セクション追記
- `src/config/dungeonConfig.js` に `DUNGEON_FLOORS`(20件配列)、`MAX_FLOOR=20`、`BOSS_FLOORS=[5,10,15,20]`、`getFloorConfig(floor)`、`getEngineOptionsForFloor(floor)` 追記(§5)
- `src/storage/DungeonProgressStore.js` — envelope永続化(§6、キー`shogi-dungeon/progress`)
- `src/storage/DungeonBattleStore.js` — envelope永続化(§6、キー`shogi-dungeon/battles`)
- `src/dungeon/DungeonProgression.js` — `applyBattleResult(progress, result, floor)` 純粋関数(§6)
- `src/dungeon/DungeonRating.js` — `estimateDungeonRating(recentBattles)`、`RATING_TO_DUNGEON_TITLE`(§6, 既存`RatingEstimator`再利用)
- `src/rpg/SceneManager.js` — 軽量FSM(§7.1、状態: `title`/`town`/`dungeonMap`/`battle`)
- `src/rpg/scenes/TitleScene.js`, `DungeonMapScene.js`, `BattleScene.js`(FSMシーン、Canvas戦闘ウィンドウの`BattleStage`とは別物)

既存ファイル改修:
- `src/rpg/BattleDirector.js` — `hpUpdated`発行前に`CauseClassifier.classifyCause`を呼び、`damageTaken`のpayloadに`cause`(kebab-case4値)を含める。対局中`playerMoveDrops`を蓄積し、`gameEnded`購読内で`DungeonBattleStore.save`→`estimateDungeonRating`→`DungeonProgressStore.save`(§7.2の連携シーケンス)を実行。
- `game.js` — コンストラクタに `this.engineOptions = null;` 追加。`setBattleEventBus`と同パターンで `setEngineOptions(options)` を追加。CPU着手選択の `this.aiEngine.getBestMove(sfen)` 呼び出しを `this.aiEngine.getBestMove(sfen, this.engineOptions)` に変更(未設定時は`null`を渡し、既存の引数無し呼び出しと同じ挙動を維持)。
- `index.html` — `#title-scene`, `#dungeon-map-scene` コンテナ追加(hashルーティング `#title`/`#town`/`#dungeon`/`#battle/floor/:n` に対応)。
- `main.js` — `SceneManager`生成・4状態register・`sceneManager.start()`呼び出しへ再編。既存`startGame()`/`initializeRenderer()`はロジックそのまま、呼び出し元を`BattleScene.enter()`に変更。`BattleScene.enter(floor)`内で`getEngineOptionsForFloor(floor)`の結果を`game.setEngineOptions(...)`経由でgame.jsへ注入する(§5準拠、これによりPhase3受け入れ条件3の階層別AI強さを実現する)。
- `src/battle/battleTheme.js` — `CAUSE_COLOR`の4値(`castle-break`/`attack-boost`/`material`/`other`)を実運用。

### 受け入れ条件(ユーザー視点)

1. タイトル画面→ダンジョンマップ→階層選択→戦闘、という一連の画面遷移がハッシュURL(`#title`/`#dungeon`/`#battle/floor/1`等)と連動して行える。
2. ダンジョンマップで到達済み最高階(`highestFloorCleared`)より先の階には挑戦できない、または視覚的にロック表示される。
3. 1階のCPUは明確に弱く(数手で優位に立てる)、20階のCPUは明確に強い(時間をかけて考えてくる)ことが体感できる。
4. 対局に勝利すると、次回訪問時に到達階が1つ進んでいる(ブラウザリロード後も`localStorage`から復元される)。
5. 対局に敗北すると、同じ階からの再挑戦になる(ローグライク的な階層リセットはされない)。
6. 悪手を指した際、原因(囲いが崩れた/駒を損した/相手の攻めが強化された/その他)に応じてヒットエフェクトの色が変わる(赤=囲い破壊、橙=攻め強化、青=駒得駒損、灰=その他)。
7. 直近の対局成績から推定棋力(称号表示、例:「駆け出し冒険者」〜「竜王討伐者」)がダンジョンマップ画面等で確認できる。

### テスト方針(TDD、vitest)

`[TDD]` 対象:
- `CauseClassifier.test.js`: §2.2決定木の全分岐(swing閾値未満で`other`、囲い崩壊優先、駒損閾値、攻め強化閾値、いずれも非該当で`other`)。優先順位が固定通り(castle-break→material→attack-boost→other)であることを検証する複合ケース(複数条件が同時成立する局面で最優先タグのみ返ること)。
- `DungeonProgression.test.js`: win/lose/draw各パターンでの`currentFloor`/`highestFloorCleared`/`totalWins`/`totalLosses`更新、floor20到達時の周回無し据え置き、`floor !== progress.currentFloor`でRangeError。immutability(引数オブジェクトが変更されないこと)を明示的に検証。
- `DungeonRating.test.js`: `estimateDungeonRating`が空配列で`sampleSize:0, label:null`、閾値以上のサンプルで`RatingEstimator`のtiersラベルと`dungeonTitle`マッピングが一致すること。
- `DungeonProgressStore.test.js`/`DungeonBattleStore.test.js`: envelope形式での保存/読込、`id:'default'`のupsert、`recent(n)`のplayedAt降順ソート、モックstorage注入でのテスト。
- `SceneManager.test.js`: 状態遷移(`transition()`が前シーンの`exit()`→新シーンの`enter()`の順でawaitされること)、hashルーティングとの対応(DOM操作を除く遷移ロジックのみ、jsdomの`location.hash`変更で検証)。
- `getFloorConfig`/`getEngineOptionsForFloor`: floor範囲外でRangeError、境界値(floor=1,20)での戻り値がDUNGEON_FLOORS定義と一致。
- `game.js`(追記): `setEngineOptions(options)`呼び出し後、CPU着手選択の`getBestMove`が`options`付きで呼ばれること(モックengineでスパイ検証)。`engineOptions`未設定(`null`)時は`options`引数無し(または`null`)呼び出しとなり、既存の対局進行が変わらないこと(§10回帰テスト方針に準拠)。

`[opt-out]` 対象: `DungeonMapScene`のDOM生成・レイアウト、各Sceneの画面遷移アニメーション。

### 回帰確認項目

- 既存の`shogiGameSave`キー・`shogi-training/*`キーと新規`shogi-dungeon/*`キーが衝突しないこと(localStorage実データで確認)。
- `SceneManager`導入によって既存の`#game-setup`モーダル経由の手動エンジン/強さ選択フロー(訓練モード用途、RPGメインフローでは未使用)がアクセス不能にならないか、別経路を用意するか要判断(決定記録§7.1「訓練モード単体アクセス経路の要否は別途要判断」に対する結論をこのフェーズで出す)。
- Phase1/2で実装した戦闘ウィンドウ・囲い演出が、シーン遷移(`BattleScene.exit()`)のたびに正しく`dispose`され、次の対局に前回のイベント購読やCanvas状態が漏れないこと(連続対局での目視・メモリリーク確認)。
- BuiltinEngineフォールバック発生時(やねうら王WASM初期化失敗時)、`playerMoveDrops`の欠損・ダンジョン進行の異常な巻き戻りが起きないこと(フォールバックは「劣化モード」として関知しない設計だが、クラッシュしないことは確認する)。
- `game.setEngineOptions()`未呼び出し(RPGメインフロー外・訓練モード単体アクセス時)でCPU着手選択が従来通り`options`無しで動作すること。1階〜20階で`getEngineOptionsForFloor(floor)`の`{time,depth}`が実際にCPU着手のレイテンシ/読みの深さへ反映され、受け入れ条件3(1階は明確に弱く、20階は明確に強い)が体感できることを`npm run dev`で確認する。

---

## Phase 4: 訓練機能の施設化 + 演出強化

**ゴール**: 感想戦・ダッシュボード(内部にドリル導線)が「町」の施設として自然に組み込まれる。演出面(モーション・パーティクル・城グラフィック)を仕上げる。

### 実装対象ファイル

新規:
- `src/rpg/FacilityRegistry.js` — `FACILITIES`配列(`strategist`/`archive`、§論点7 §3)
- `src/rpg/TownScene.js` — `setupTownScene`、`openFacility`(既存ボタンへの`click()`委譲、§論点7 §4)

既存ファイル改修:
- `index.html` — `#town-screen`(ダンジョン入口ドア+施設ドア2つ)追加。`#game-over`の`.game-end-actions`に`#town-return-btn`追加。
- `main.js` — `setupTownScene`呼び出し追加。`#game-setup`初期表示条件をダンジョン入口ボタン起点に変更(`startGame()`内部処理は無改修)。`town-return-btn`のイベント登録。
- `src/rpg/SceneManager.js` — `town`状態のenter/exitに`TownScene.show()/hide()`を接続。`gameEnded`購読による`battle→town`遷移(既存`ReviewPanel`のMutationObserver駆動を明示遷移に置換、感想戦自体のpopulateロジックは無改修)。
- `src/battle/sprites/placeholder-atlas.json` — モーション別フレーム数を増強(`jab`/`strike`/`heavyStrike`/`criticalHit`/`ultimate`/`finishingBlow`、§3.3 TIER_MOTIONの全モーション)。
- `src/battle/ActorAnimationFSM.js` — Phase1で定義済みの優先度規則をフル活用(`castle-break`最優先の実地検証)。

### 受け入れ条件(ユーザー視点)

1. 町画面に「軍師の間」「修練の書庫」の2つの施設ドアと、ダンジョン入口が表示される。
2. 対局を1局も終えていない状態では「軍師の間」が入場不可(理由がツールチップ等で表示される)、対局後は入場可能になる。
3. 「軍師の間」クリックで既存の感想戦(AnalysisPanel)がそのまま開く(中身は無改修)。
4. 「修練の書庫」クリックで既存のダッシュボード(DashboardPanel)が開き、そこから「この癖のドリルへ」を辿ると既存のドリル(DrillMode)が起動する(中身は無改修)。
5. 対局終了後、感想戦を経て「町に戻る」ボタンでダンジョンマップに戻れる。
6. 大ダメージ(critical/fatal tier)を受けた際、画面フラッシュ・強い画面揺れ・警告音相当の演出強度が小ダメージ(graze/light)と明確に区別できる。
7. 詰みによる決着(`finishingBlow`)が数値ダメージの大小に関わらず必ず即死級の演出になる。

### テスト方針(TDD、vitest)

`[TDD]` 対象:
- `FacilityRegistry.test.js`: `isAvailable`の真偽判定(`strategist`は`game.gameOver`依存、`archive`は常時true)。
- `TownScene.test.js`: `openFacility`が対応する`triggerId`のDOM要素に対し`click()`を1回呼ぶこと(jsdom + `vi.fn()`スパイ)。存在しないtriggerIdでは無害に無視されること。
- `ActorAnimationFSM.test.js`(追記): 全6モーション(`idle`/`jab`/`strike`/`heavyStrike`/`criticalHit`/`ultimate`)+`finishingBlow`が優先度規則通りに遷移すること、`castle-break`要求時に同アクターのキューが全消去されること。
- `SceneManager.test.js`(追記): `gameEnded`購読による`battle→town(facility=review)`への自動遷移が発火すること。

`[opt-out]` 対象: 町マップの意匠・ドアのアイコン表現、演出強度のフィーリング調整(視覚検証で代替)。

### 回帰確認項目

- 感想戦(`AnalysisPanel`)・ダッシュボード(`DashboardPanel`)・ドリル(`DrillMode`)・再演(`ReplayMode`)のロジック本体に一切変更が入っていないこと(diffで確認、`src/ui/`配下ファイルの変更ゼロを原則とする)。
- `ReviewPanel`の`#game-over`MutationObserver自動遷移を`SceneManager`の明示遷移に置き換えた後も、感想戦のpopulateロジック自体(評価値グラフ・悪手マーク表示)が従来通り機能すること。
- `#replay-banner`系DOMをReplayMode/DrillModeが共有する既存パターンが、町シーン導入後も競合しないこと(再演中に町シーンへ誤遷移しないか確認、`isReplayActive()`フラグとの整合)。
- 全フェーズ通しでの回帰: 20階クリアを通しで1周プレイし、セーブ/リロード、感想戦、ドリル、テーマ切替(ダーク/ライト)、モバイル/デスクトップ双方のレイアウトが崩れないことを最終手動確認する。

---

## フェーズ横断の注意点(決定記録からの転記、実装時に見落としやすい点)

- **evalMovetimeMs=300**(§3.1)。感想戦の800msより短い値を使うのは体感速度優先のため、感想戦用の`analysis.movetimeMs`とは別設定であることを混同しないこと。
- **CauseTagはkebab-case4値固定**(`castle-break`/`attack-boost`/`material`/`other`)。Phase3実装時に旧設計のcamelCase/snake_caseへ引きずられないこと。
- **BattleEventBusは1対局につき1インスタンス**。`BattleScene.exit()`(FSM側)で確実に破棄し、次の対局に持ち越さないこと。
- **`damageTaken`のtargetはmover非依存、delta符号のみで決定**(§3.4)。「自分が指した手で自分がダメージを受ける」ケースが正しい仕様であることを実装時に再確認すること。
- **BuiltinEngineフォールバック時は劣化モードとして関知しない**(§5)。フォールバック検知・UI通知は本ロードマップの範囲外。
