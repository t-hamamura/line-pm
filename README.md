# line-pm

**LINE Bot × Gemini AI × Notion** を使ったプロジェクト管理システム

LINEでメッセージを送るだけで、AIが内容を解析してNotionにプロジェクトページを自動作成します。

## 🌟 主な機能

- **📱 LINE Bot統合**: LINEから直接プロジェクトを登録
- **🤖 AI分析**: Google Gemini AIがテキストを解析し、適切なプロパティを推測
- **📊 Notion連携**: 分析結果を基にNotionデータベースに自動でページ作成
- **🔄 重複防止**: 同じメッセージの重複処理を防ぐ仕組み
- **⚡ リアルタイム通知**: 処理結果をLINEで即座に通知

## 🚀 動作フロー

```
1. LINE でメッセージ送信
   ↓
2. Gemini AI で分析
   ↓  
3. Notion にページ作成
   ↓
4. LINE に結果通知
```

## 🛠️ 技術スタック

- **バックエンド**: Node.js + Express.js
- **AI分析**: Google Gemini API
- **データベース**: Notion API
- **メッセージング**: LINE Bot SDK
- **デプロイ**: Railway

## 📚 プロジェクト分類体系

このシステムは独自の4軸分類でプロジェクトを管理します：

- **🏷️ 種別** - 企画・戦略、制作・開発、実行・運用、マネジメント、分析・改善、その他（6分類）
- **📦 成果物** - 資料・企画書、コンテンツ、レポート、システム・ツール、ルール・仕組み、その他（6分類）  
- **🎚️ レベル** - 戦略レベル、プロジェクト、タスク、アクション、メモ（5分類）
- **📊 ステータス** - 未分類、検討中、作業中、他人待ち、完了、削除（6分類）

Gemini AIがテキストを解析し、これらの軸で自動分類することで、一貫性のあるプロジェクト管理を実現します。

📋 **詳細**: [プロジェクト分類体系の詳細はこちら](./docs/classification-system.md)

## 📋 必要な環境変数

以下の環境変数を設定してください：

```env
# LINE Bot設定
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Google Gemini AI設定  
GEMINI_API_KEY=your_gemini_api_key

# Notion設定
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_database_id

# サーバー設定（オプション）
PORT=8080
NODE_ENV=production
```

## 🔧 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/t-hamamura/line-pm.git
cd line-pm
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env` ファイルを作成し、上記の環境変数を設定

### 4. LINE Bot の設定

1. [LINE Developers Console](https://developers.line.biz/) でBot作成
2. Channel Access Token と Channel Secret を取得
3. Webhook URL を設定: `https://your-domain.com/webhook`

### 5. Google Gemini API の設定

1. [Google AI Studio](https://makersuite.google.com/) でAPI キー取得
2. `GEMINI_API_KEY` に設定

### 6. Notion の設定

1. [Notion Developers](https://developers.notion.com/) でインテグレーション作成
2. API キーを取得
3. データベースをインテグレーションと共有
4. データベースIDを取得

### 7. アプリケーションの起動

```bash
npm start
```

## 📊 Notion データベース構造

システムが想定しているデータベースのプロパティ：

| プロパティ名 | 型 | 説明 |
|------------|-----|------|
| Name | タイトル | プロジェクト名 |
| ステータス | セレクト | 未分類、進行中、完了など |
| 種別 | セレクト | 企画・戦略、制作・開発など |
| 優先度 | セレクト | 緊急、重要、普通、アイデア |
| 成果物 | セレクト | 資料・企画書、コンテンツなど |
| レベル | セレクト | 戦略レベル、プロジェクト、タスク |
| 案件 | セレクト | 関連プロジェクト名 |
| 担当者 | セレクト | 担当者名 |
| 期限 | 日付 | 完了予定日 |
| 記入日 | 日付 | 登録日 |

## 💬 使用方法

1. **LINE Botを友だち追加**
2. **プロジェクトの内容をメッセージで送信**

### 例：
```
新商品のマーケティング戦略を来月までに策定する
```

### システムの応答：
- AIが分析し、適切なプロパティを自動設定
- Notionにページを作成
- 作成されたページのURLと詳細をLINEで通知

### 分析例：
- **種別**: 企画・戦略（「戦略を策定」→計画立案）
- **レベル**: プロジェクト（1-3ヶ月、チーム作業）  
- **成果物**: 資料・企画書（戦略書作成）
- **ステータス**: 未分類（システム自動設定）

## 🔍 API エンドポイント

- `GET /` - ヘルスチェック
- `POST /webhook` - LINE Webhook
- `POST /clear-cache` - キャッシュクリア（デバッグ用）

## 🛡️ セキュリティ機能

- **署名検証**: LINE Webhookの署名を検証
- **重複防止**: メッセージの重複処理を防止（3段階チェック）
- **エラーハンドリング**: 適切なエラー処理とログ出力

## 📈 ログとモニタリング

### ログの種類
- `[EVENT]` - イベント処理
- `[GEMINI]` - AI分析
- `[NOTION]` - Notion操作
- `[WEBHOOK]` - Webhook処理
- `[EMERGENCY]` - 重複防止
- `[ERROR]` - エラー

### ヘルスチェック
```bash
curl https://your-domain.com/
```

## 🚀 デプロイ

### Railway でのデプロイ

1. [Railway](https://railway.app/) でアカウント作成
2. GitHubリポジトリを接続
3. 環境変数を設定
4. 自動デプロイが開始

### 手動デプロイ

```bash
# 本番環境での起動
NODE_ENV=production npm start
```

## 🤖 AI分析の特徴

### 高精度な分類
- **文脈理解**: 単語だけでなく文脈から判断
- **業界特化**: マーケティング・事業領域に最適化
- **学習機能**: 継続的に分類精度を向上

### 柔軟な入力対応
- **自然言語**: 話し言葉での入力OK
- **簡潔な表現**: 「LP作成」などの短文でも分析
- **複合タスク**: 複数の要素を含む複雑なプロジェクトも対応

## 🎯 活用シーン

### 個人利用
- 日々のタスク管理
- アイデアの整理
- プロジェクトの進捗管理

### チーム利用  
- プロジェクトの一元管理
- 業務の標準化
- 進捗の可視化

### 組織利用
- 部門横断プロジェクトの管理
- 業務効率の分析
- リソース配分の最適化

## 🤝 開発に参加する

### 開発環境のセットアップ

```bash
# 開発モードで起動
npm run dev
```

### コードスタイル

- JavaScript ES6+
- エラーハンドリングの徹底
- 詳細なログ出力
- 関数の単一責任原則

### 貢献方法

1. Issuesで議論
2. Forkしてfeatureブランチ作成
3. Pull Request作成
4. レビュー後マージ

## 📝 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🐛 バグ報告・機能要望

[Issues](https://github.com/t-hamamura/line-pm/issues) でバグ報告や機能要望をお送りください。

## 📞 サポート

質問やサポートが必要な場合は、Issuesまたは開発者までお気軽にお問い合わせください。

---

**🎉 プロジェクト管理をもっと簡単に、もっと効率的に！**
