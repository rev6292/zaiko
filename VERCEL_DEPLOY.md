# Vercelデプロイ手順

## 前提条件
- Vercelアカウントが必要です
- GitHub、GitLab、またはBitbucketアカウントが必要です

## デプロイ手順

### 1. リポジトリをGitにプッシュ
```bash
cd frontend
git init
git add .
git commit -m "Initial commit for Vercel deployment"
git remote add origin <your-repository-url>
git push -u origin main
```

### 2. Vercelでプロジェクトをインポート
1. [Vercel](https://vercel.com)にログイン
2. "New Project"をクリック
3. GitHub/GitLab/Bitbucketからリポジトリを選択
4. プロジェクト設定を確認：
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### 3. 環境変数の設定
Vercelのプロジェクト設定で以下の環境変数を設定：

- `GEMINI_API_KEY`: あなたのGemini APIキー

### 4. デプロイ
"Deploy"ボタンをクリックしてデプロイを開始

## 注意事項
- Firebase設定は既に`src/firebaseConfig.ts`に含まれています
- SPAのルーティングのために`vercel.json`でリライトルールを設定しています
- 本番環境では適切な環境変数を設定してください

## トラブルシューティング
- ビルドエラーが発生した場合は、ローカルで`npm run build`を実行して確認
- 環境変数が正しく設定されているか確認
- Firebase設定が正しいか確認
