# 在庫管理システム

在庫管理システム20250809

## 概要

このプロジェクトは、サロンや小売店向けの包括的な在庫管理システムです。

## 機能

- 商品の入庫・出庫管理
- 在庫状況のリアルタイム監視
- 発注管理
- レポート生成
- ユーザー権限管理
- AI支援機能（Gemini API）

## 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **バックエンド**: Firebase Functions + TypeScript
- **データベース**: Firestore
- **認証**: Firebase Authentication
- **AI**: Google Gemini API

## セットアップ

### 前提条件
- Node.js (v18以上)
- npm または yarn

### インストール

1. 依存関係をインストール:
   ```bash
   npm install
   ```

2. 環境変数を設定:
   - `env.example`を参考に`.env.local`ファイルを作成
   - `GEMINI_API_KEY`を設定

3. 開発サーバーを起動:
   ```bash
   npm run dev
   ```

## ビルド

本番用ビルド:
```bash
npm run build
```

## デプロイ

Vercelへのデプロイ手順は`VERCEL_DEPLOY.md`を参照してください。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
