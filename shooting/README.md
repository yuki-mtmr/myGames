# Street View Shooting Game

Google Maps Street Viewを背景にした3Dシューティングゲームです。

## デプロイURL
[https://yuki-mtmr.github.io/myGames/shooting/](https://yuki-mtmr.github.io/myGames/shooting/)

## 開発環境のセットアップ (Development Setup)

このプロジェクトは [Vite](https://vitejs.dev/) を使用しています。

1. 依存関係のインストール:
   ```bash
   npm install
   ```

2. 環境変数の設定:
   `.env` ファイルを作成し、Google Maps APIキーを設定してください（すでに作成済みの場合があります）。
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

3. ローカルサーバーの起動:
   ```bash
   npx vite
   ```
   ブラウザで表示されるURL（通常は `http://localhost:5173`）にアクセスしてください。

## デプロイ方法 (Deployment)

GitHub Pagesにデプロイする場合、ビルドが必要です。

1. ビルドの実行:
   ```bash
   npx vite build
   ```
   `dist` フォルダが生成されます。

2. GitHub Pagesへのデプロイ:
   - `dist` フォルダの中身を公開するか、GitHub Actionsを使用してビルド・デプロイを行ってください。
   - **注意**: GitHub Actionsを使用する場合、リポジトリのSettings > Secrets and variables > Actions に `VITE_GOOGLE_MAPS_API_KEY` を登録する必要があります。

## 遊び方

- **WASD**: 移動
- **マウス**: 視点操作
- **クリック**: 射撃
- **スペース**: ジャンプ

## ルール
- 迫ってくる赤い敵を倒してください。
- 敵に接触するとHPが減ります。
- HPが0になるとゲームオーバーです。

## Google Maps APIの料金設定について
Google Maps APIの無料枠を超えた場合に課金を停止するには、Google Cloud Consoleで「予算とアラート」を設定することをお勧めします。
（詳細は前述の通り）
