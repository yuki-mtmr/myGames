# デザイントークン設計書 — 和風・落ち着いたUI（将棋ウォーズ/クエスト水準）

現行の `style.css` はグラスモーフィズム系（`--glass-*`, backdrop-blur, 半透明パネル）。
本トークンは **過剰なblur/大角丸を廃し、木目・和紙・墨色を基調にした落ち着いたUI** へ置き換える設計。

---

## 1. カラートークン一覧（ライト / ダーク）

### 1.1 盤面・駒・駒台

| トークン | 用途 | ライト値 | ダーク値 |
|---|---|---|---|
| `--board-light` | 盤目 明（木目ハイライト） | `#e8c98a` | `#8a6a3c` |
| `--board-dark` | 盤目 暗（木目シャドウ） | `#d9b06e` | `#7a5a30` |
| `--board-mid` | 木目グラデーション中間色 | `#e0bd7c` | `#816035` |
| `--board-border` | 盤枠（框） | `#5c3d1f` | `#4a3018` |
| `--board-shadow` | 盤の落ち影 | `rgba(30, 18, 8, 0.35)` | `rgba(0, 0, 0, 0.55)` |
| `--piece-bg` | 駒地（黄楊木風） | `#f2debb` | `#e8d4ab` |
| `--piece-text` | 駒文字（成駒以外） | `#1f1108` | `#1f1108` |
| `--piece-promoted-text` | 成駒文字（朱） | `#a3122a` | `#c23a4f` |
| `--piece-border` | 駒の輪郭線 | `#3a2412` | `#2a1808` |
| `--piece-shadow` | 駒の落ち影 | `rgba(30, 18, 8, 0.28)` | `rgba(0, 0, 0, 0.5)` |
| `--komadai-bg` | 駒台（濃木） | `#7a5530` | `#5c3f22` |
| `--komadai-border` | 駒台縁 | `#5c3d1f` | `#3a2814` |

コントラスト検証: `--piece-bg #f2debb` に対し `--piece-text #1f1108` → 比率 **13.2:1**（AA/AAA両方クリア）。
`--piece-promoted-text #a3122a` on `#f2debb` → **6.1:1**（AA通常文字クリア）。
ダーク駒地 `#e8d4ab` に対し朱文字 `#c23a4f` → **4.6:1**（AAクリア、通常文字4.5以上）。

### 1.2 背景・パネル

| トークン | 用途 | ライト値 | ダーク値 |
|---|---|---|---|
| `--bg-app` | アプリ背景 | `#f4ede0` | `#191510` |
| `--bg-gradient` | 背景グラデーション | `linear-gradient(160deg, #f7f1e6 0%, #ece1cd 100%)` | `linear-gradient(160deg, #1c1712 0%, #14100b 100%)` |
| `--panel-bg` | パネル地（旧 `--glass-bg-solid`） | `#fffaf2` | `#242019` |
| `--panel-border` | パネル境界（旧 `--glass-border`） | `#d8c6a3` | `#3c3226` |
| `--panel-shadow` | パネル影（旧 `--glass-shadow`） | `0 2px 10px rgba(90, 65, 30, 0.12)` | `0 2px 14px rgba(0, 0, 0, 0.5)` |

### 1.3 テキスト

| トークン | ライト値 | ダーク値 | 用途 |
|---|---|---|---|
| `--text-primary` | `#231a10` | `#ece3d2` | 本文 |
| `--text-secondary` | `#5c4c38` | `#b0a288` | 補足 |
| `--text-muted` | `#8a7a62` | `#7a6d58` | 弱情報 |

コントラスト: `--text-primary #231a10` on `--bg-app #f4ede0` → **14.8:1**。
`--text-secondary #5c4c38` on `#f4ede0` → **6.0:1**（AAクリア）。
ダーク `--text-primary #ece3d2` on `--bg-app #191510` → **13.6:1**。

### 1.4 アクセント（差し手ハイライト・評価バー）

| トークン | 用途 | ライト値 | ダーク値 |
|---|---|---|---|
| `--accent-gold` | 主アクセント（旧同名） | `#a8781f` | `#c9a04a` |
| `--accent-gold-light` | ホバー用明るい金 | `#c99a3d` | `#e0b968` |
| `--selected-cell` | 選択マス | `rgba(58, 96, 130, 0.28)` | `rgba(90, 140, 180, 0.35)` |
| `--valid-move-dot` | 移動可能マス・ドット | `rgba(60, 110, 70, 0.75)` | `rgba(100, 170, 110, 0.8)` |
| `--valid-move-bg` | 移動可能マス背景 | `rgba(60, 110, 70, 0.16)` | `rgba(100, 170, 110, 0.22)` |
| `--last-move-from` | 直前手・移動元 | `rgba(168, 120, 31, 0.20)` | `rgba(201, 160, 74, 0.25)` |
| `--last-move-to` | 直前手・移動先 | `rgba(168, 120, 31, 0.35)` | `rgba(201, 160, 74, 0.42)` |
| `--eval-good` | 好手（緑） | `#2f7a3d` | `#4fae5f` |
| `--eval-inaccuracy` | 疑問手（橙） | `#c8791a` | `#e08f30` |
| `--eval-mistake` | 悪手（赤） | `#a8192c` | `#d63a4e` |
| `--eval-player` | 評価値バー：先手 | `#a8781f` | `#c9a04a` |
| `--eval-cpu` | 評価値バー：後手 | `#3a6082` | `#5a8bb0` |

備考: 従来 `--accent-blue #4a90a4` / `--accent-red #b8192c` / `--accent-green #5a9a6a` はやや彩度過多で
グラスモーフィズム向け。和テイストでは彩度を落とし明度を調整した上表の値に統一する。

---

## 2. 木目パターン（画像なし・CSSのみ）

盤面木目は「斜め方向グラデーション（板目）+ 微細ノイズ（節・繊維感）」の2層合成で表現する。

```css
.board {
  background-color: var(--board-mid);
  background-image:
    /* 1. 板目の縦木目（幅の異なる帯を斜めに） */
    repeating-linear-gradient(
      100deg,
      var(--board-light) 0px,
      var(--board-light) 3px,
      var(--board-mid) 3px,
      var(--board-mid) 7px,
      var(--board-dark) 7px,
      var(--board-dark) 9px
    ),
    /* 2. 微細ノイズ(節目) — 極小のドット状グラデーションを不規則配置 */
    radial-gradient(circle at 12% 22%, rgba(255,255,255,0.06) 0px, transparent 3px),
    radial-gradient(circle at 68% 8%,  rgba(0,0,0,0.05) 0px, transparent 2px),
    radial-gradient(circle at 40% 70%, rgba(255,255,255,0.05) 0px, transparent 4px),
    radial-gradient(circle at 85% 55%, rgba(0,0,0,0.04) 0px, transparent 3px),
    radial-gradient(circle at 25% 90%, rgba(0,0,0,0.05) 0px, transparent 2px);
  background-size: auto, 140px 140px, 90px 90px, 160px 160px, 110px 110px, 130px 130px;
  background-blend-mode: normal, overlay, overlay, overlay, overlay, overlay;
}

.komadai {
  background-color: var(--komadai-bg);
  background-image: repeating-linear-gradient(
    95deg,
    rgba(0,0,0,0.06) 0px,
    rgba(0,0,0,0.06) 2px,
    transparent 2px,
    transparent 6px
  );
}
```

ポイント:
- `repeating-linear-gradient` の角度は `100deg` 前後にずらし、真横/真縦の機械的な縞に見えないようにする。
- ノイズは `radial-gradient` を複数重ねて `background-blend-mode: overlay` で馴染ませる（画像アセット不要、軽量）。
- ダークテーマは `--board-light/--board-dark` の値を差し替えるだけで同じグラデーション定義を流用可能。

---

## 3. 角丸・影・余白スケール

過剰な `blur()` と大きい `border-radius` を避け、和紙・木質の硬質感を保つ方針。

| トークン | 旧値 | 新値 | 方針 |
|---|---|---|---|
| `--radius-sm` | 6px | `4px` | 駒・小ボタン |
| `--radius-md` | 10px | `6px` | カード・入力欄 |
| `--radius-lg` | 14px | `8px` | パネル |
| `--radius-xl` | 18px | `10px` | モーダル（最大値。旧`--radius-full`の丸ピル形状は廃止） |
| `--radius-full` | 50px | **削除**（ピルボタンは`--radius-sm`+paddingで代替） | — |
| `--shadow-sm` | (なし/glass-shadow流用) | `0 1px 3px rgba(30,18,8,0.15)` | ボタン等 |
| `--shadow-md` | — | `0 2px 8px rgba(30,18,8,0.18)` | カード |
| `--shadow-lg` | — | `0 4px 16px rgba(30,18,8,0.22)` | モーダル |
| `--blur-panel` | `blur(12px)` | **廃止**（パネルは不透明 `--panel-bg` に統一、`backdrop-filter`不使用） | 和紙質感を保つため半透明+ぼかしをやめる |
| `--space-*` | 4/8/16/24/32px | 変更なし | 既存スケールを維持 |

---

## 4. 旧変数 → 新値 置き換え表（style.css にそのまま適用）

```css
:root {
  /* 背景 */
  --bg-app: #f4ede0;
  --bg-container: #fffaf2;
  --bg-gradient: linear-gradient(160deg, #f7f1e6 0%, #ece1cd 100%);

  /* 盤 */
  --board-light: #e8c98a;
  --board-dark: #d9b06e;
  --board-mid: #e0bd7c;
  --board-border: #5c3d1f;
  --board-shadow: rgba(30, 18, 8, 0.35);

  /* 駒 */
  --piece-bg: #f2debb;
  --piece-text: #1f1108;
  --piece-promoted: #a3122a;       /* 旧名を維持しつつ値更新 */
  --piece-border: #3a2412;
  --piece-shadow: rgba(30, 18, 8, 0.28);

  /* 駒台 */
  --komadai-bg: #7a5530;
  --komadai-border: #5c3d1f;

  /* パネル（旧 glass-* を panel-* に置換、blurは撤去） */
  --panel-bg: #fffaf2;
  --panel-border: #d8c6a3;
  --panel-shadow: 0 2px 10px rgba(90, 65, 30, 0.12);
  /* --glass-blur は使用箇所を削除 or panel-bg の不透明版で代替 */

  /* アクセント */
  --accent-gold: #a8781f;
  --accent-gold-light: #c99a3d;
  --accent-blue: #3a6082;   /* 旧 #4a90a4 から明度・彩度調整 */
  --accent-red: #a8192c;    /* 旧 #b8192c から微調整 */
  --accent-green: #2f7a3d;  /* 旧 #5a9a6a から彩度を落として和色に */

  /* ハイライト */
  --selected-cell: rgba(58, 96, 130, 0.28);
  --valid-move-bg: rgba(60, 110, 70, 0.16);
  --valid-move-dot: rgba(60, 110, 70, 0.75);
  --last-move-from: rgba(168, 120, 31, 0.20);
  --last-move-to: rgba(168, 120, 31, 0.35);
  --hover-glow: rgba(168, 120, 31, 0.25);

  /* テキスト */
  --text-primary: #231a10;
  --text-secondary: #5c4c38;
  --text-muted: #8a7a62;
  --text-light: #fffaf2;

  /* 評価値 */
  --eval-player: #a8781f;
  --eval-cpu: #3a6082;
  --eval-good: #2f7a3d;
  --eval-inaccuracy: #c8791a;
  --eval-mistake: #a8192c;

  /* モーダル/入力 */
  --modal-overlay: rgba(20, 14, 6, 0.55);
  --input-bg: rgba(90, 65, 30, 0.05);
  --border-color: rgba(90, 65, 30, 0.15);

  /* 角丸（縮小） */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 10px;

  /* 影 */
  --shadow-sm: 0 1px 3px rgba(30, 18, 8, 0.15);
  --shadow-md: 0 2px 8px rgba(30, 18, 8, 0.18);
  --shadow-lg: 0 4px 16px rgba(30, 18, 8, 0.22);
}

[data-theme="dark"] {
  --bg-app: #191510;
  --bg-container: #242019;
  --bg-gradient: linear-gradient(160deg, #1c1712 0%, #14100b 100%);

  --board-light: #8a6a3c;
  --board-dark: #7a5a30;
  --board-mid: #816035;
  --board-border: #4a3018;
  --board-shadow: rgba(0, 0, 0, 0.55);

  --piece-bg: #e8d4ab;
  --piece-text: #1f1108;
  --piece-promoted: #c23a4f;
  --piece-border: #2a1808;
  --piece-shadow: rgba(0, 0, 0, 0.5);

  --komadai-bg: #5c3f22;
  --komadai-border: #3a2814;

  --panel-bg: #242019;
  --panel-border: #3c3226;
  --panel-shadow: 0 2px 14px rgba(0, 0, 0, 0.5);

  --accent-gold: #c9a04a;
  --accent-gold-light: #e0b968;
  --accent-blue: #5a8bb0;
  --accent-red: #d63a4e;
  --accent-green: #4fae5f;

  --selected-cell: rgba(90, 140, 180, 0.35);
  --valid-move-bg: rgba(100, 170, 110, 0.22);
  --valid-move-dot: rgba(100, 170, 110, 0.8);
  --last-move-from: rgba(201, 160, 74, 0.25);
  --last-move-to: rgba(201, 160, 74, 0.42);
  --hover-glow: rgba(201, 160, 74, 0.3);

  --text-primary: #ece3d2;
  --text-secondary: #b0a288;
  --text-muted: #7a6d58;

  --eval-player: #c9a04a;
  --eval-cpu: #5a8bb0;
  --eval-good: #4fae5f;
  --eval-inaccuracy: #e08f30;
  --eval-mistake: #d63a4e;

  --modal-overlay: rgba(0, 0, 0, 0.7);
  --input-bg: rgba(255, 255, 255, 0.04);
  --border-color: rgba(255, 255, 255, 0.08);
}
```

適用時の注意:
- `--glass-bg`, `--glass-bg-solid`, `--glass-border`, `--glass-shadow`, `--glass-blur` を参照している箇所
  （`backdrop-filter: var(--glass-blur)` 含む）は `--panel-bg` / `--panel-border` / `--panel-shadow` に置換し、
  `backdrop-filter` の行ごと削除する（不透明パネルへ統一するため）。
- `--radius-full` を使うピルボタン（`border-radius: var(--radius-full)`）は `--radius-sm` + 十分な
  左右paddingに変更する。
- 駒文字色は成駒/不成で `--piece-text` / `--piece-promoted` を使い分ける（現行の実装踏襲）。

---

## 5. 適用チェックリスト

- [ ] `:root` と `[data-theme="dark"]` を上記表で置換
- [ ] `.board` に木目CSSスニペットを適用（画像アセット不要）
- [ ] `--glass-*` 参照箇所を `--panel-*` に置換し `backdrop-filter` を削除
- [ ] `--radius-full` 使用箇所をピル形状の代替に変更
- [ ] 駒文字・本文のコントラストをブラウザDevToolsで再検証（本書の計算値は目安）
