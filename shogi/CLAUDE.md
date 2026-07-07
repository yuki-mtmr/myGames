# 将棋アプリ プロジェクトルール

## プロジェクト概要
ブラウザで動作する将棋対局アプリ（Vite + Vanilla JS）

## 技術スタック
- フロントエンド: Vanilla JavaScript (ES Modules)
- ビルドツール: Vite
- スタイリング: CSS (CSS Variables使用)
- AIエンジン: やねうら王(WASM) / 内蔵Minimax

## コーディングルール

### JavaScript
- ES Modules形式を使用（import/export）
- クラスベースの設計（ShogiGameクラス等）
- 非同期処理はasync/awaitを使用
- console.logは開発時のみ、本番コードには残さない

### CSS
- CSS Variablesを活用（:root定義）
- ダークモード対応（data-theme属性）
- モバイルファースト、レスポンシブ対応必須
- BEM的な命名規則

### ファイル構成
```
shogi/
├── index.html      # エントリーポイント
├── main.js         # アプリ初期化・イベント
├── game.js         # ゲームロジック（ShogiGameクラス）
├── style.css       # スタイル定義
└── src/ai/         # AIエンジン関連
```

## 禁止事項
- ハードコードされたAPIキーやシークレット
- 未使用のimport文やデッドコード
- 日本語以外のUIテキスト（ユーザー向け）
- インラインスタイル（style属性）の多用

## コミットルール
- 日本語でコミットメッセージを記述
- 機能単位でコミット
- Co-Authored-By を含める

## テスト
- 手動テスト: `npm run dev` → ブラウザで確認
- 主要機能: 駒の移動、成り、持ち駒、AI対局、保存/読込
