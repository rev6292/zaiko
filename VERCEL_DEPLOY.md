# Vercel + Firebase デプロイ手順

## 概要
このプロジェクトは以下の構成でデプロイされます：
- **フロントエンド**: Vercel（React + TypeScript + Vite）
- **バックエンド**: Firebase Functions + Firestore

## 前提条件
- Vercelアカウント
- Firebaseアカウント
- GitHub、GitLab、またはBitbucketアカウント

## デプロイ手順

### 1. バックエンド（Firebase Functions）のデプロイ

#### 1.1 Firebase CLIのインストール
```bash
npm install -g firebase-tools
```

#### 1.2 Firebaseにログイン
```bash
firebase login
```

#### 1.3 バックエンドディレクトリに移動
```bash
cd backend
```

#### 1.4 依存関係をインストール
```bash
npm install
```

#### 1.5 Firebase Functionsをデプロイ
```bash
npm run deploy
```

### 2. フロントエンド（Vercel）のデプロイ

#### 2.1 リポジトリをGitにプッシュ
```bash
cd frontend
git add .
git commit -m "Deploy to Vercel with Firebase backend"
git push origin main
```

#### 2.2 Vercelでプロジェクトをインポート
1. [Vercel](https://vercel.com)にログイン
2. "New Project"をクリック
3. GitHub/GitLab/Bitbucketからリポジトリを選択
4. プロジェクト設定を確認：
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

#### 2.3 環境変数の設定
Vercelのプロジェクト設定で以下の環境変数を設定：

- `GEMINI_API_KEY`: あなたのGemini APIキー
- `NODE_ENV`: `production`

#### 2.4 デプロイ
"Deploy"ボタンをクリックしてデプロイを開始

## 重要な設定

### Firebase設定
- Firebase設定は`src/firebaseConfig.ts`に含まれています
- 本番環境では適切なFirebaseプロジェクトIDを設定してください

### API連携
- フロントエンドはFirebase Functionsを通じてバックエンドと通信します
- 認証はFirebase Authenticationを使用します
- データベースはFirestoreを使用します

### 環境変数
- 開発環境: `.env.local`
- 本番環境: Vercelの環境変数設定

## トラブルシューティング

### ビルドエラー
- ローカルで`npm run build`を実行して確認
- 環境変数が正しく設定されているか確認

### Firebase接続エラー
- Firebase設定が正しいか確認
- Firebase Functionsが正常にデプロイされているか確認

### 認証エラー
- Firebase Authenticationの設定を確認
- セキュリティルールが適切に設定されているか確認

## セキュリティ

### Firestoreセキュリティルール
- `firestore.rules`ファイルで適切なセキュリティルールを設定
- 本番環境では厳格なルールを適用

### 環境変数
- 機密情報は環境変数で管理
- リポジトリに直接コミットしない

## メンテナンス

### 更新デプロイ
1. コードを変更
2. Gitにコミット・プッシュ
3. Vercelが自動的に再デプロイ

### Firebase Functionsの更新
1. バックエンドコードを変更
2. `firebase deploy --only functions`で再デプロイ

## サポート
問題が発生した場合は、以下を確認してください：
1. Firebase Consoleでのログ
2. Vercelのデプロイログ
3. ブラウザのコンソールエラー
