# LINE PM - Next Generation Project Management System

![Version](https://img.shields.io/badge/version-2.6.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

**LINE Bot × Gemini 2.5 Flash × Notion による次世代プロジェクト管理システム**

LINEメッセージを送信するだけで、AI（Gemini 2.5 Flash）がプロジェクト内容を分析し、自動的にWBS（Work Breakdown Structure）付きのプロジェクトページをNotionに作成します。

## ✨ 主な機能

### 🤖 AI駆動の自動分析
- **Gemini 2.5 Flash**による高精度なプロジェクト分析
- テキストから優先度、種別、レベル、成果物を自動判定
- 詳細なWBS（作業分解構成図）の自動生成

### ⚡ 高速レスポンス
- 即座に「処理中」メッセージを返信
- バックグラウンドでAI分析とNotion登録を実行
- 完了時に詳細結果をプッシュ通知

### 🔗 URL解析機能
- メッセージ内のURLを自動抽出
- Webページタイトルを自動取得
- Notionの関連リンクプロパティに自動登録

### 📊 プロジェクト管理
- **優先度**: 緊急/重要/普通/アイデア
- **種別**: 企画・戦略/制作・開発/実行・運用/マネジメント/分析・改善/その他・雑務
- **レベル**: 戦略レベル/プロジェクト/タスク/アクション/メモ
- **成果物**: 資料・企画書/コンテンツ/レポート/システム・ツール/ルール・仕組み/その他

### 🛡️ 信頼性機能
- 重複メッセージの自動検出・防止
- レート制限管理（Gemini API制限対応）
- エラーハンドリングとフォールバック機能

## 🚀 セットアップ

### 必要な要件
- Node.js >= 18.0.0
- LINE Developers アカウント
- Gemini API キー
- Notion API キー

### 1. プロジェクトのクローン
```bash
git clone https://github.com/t-hamamura/line-pm.git
cd line-pm
npm install
```

### 2. 環境変数の設定
`.env`ファイルを作成し、以下の環境変数を設定：

```env
# LINE Bot設定
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Gemini AI設定
GEMINI_API_KEY=your_gemini_api_key

# Notion設定
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_database_id

# オプション設定
PORT=8080
NODE_ENV=production
GEMINI_API_TIER=free
```

### 3. LINE Bot設定

#### LINE Developersコンソールで設定：
1. [LINE Developers](https://developers.line.biz/)でプロバイダーとチャネルを作成
2. **Webhook URL**を設定: `https://your-domain.com/webhook`
3. **Channel Access Token**と**Channel Secret**を取得

#### 必要な権限：
- Send messages
- Reply messages
- Push messages

### 4. Gemini API設定

#### Google AI Studioで設定：
1. [Google AI Studio](https://aistudio.google.com/)でAPIキーを取得
2. **Gemini 2.5 Flash**モデルへのアクセスを確認

#### レート制限（2025年版）:
- **Free Tier**: 5 requests/min, 25 requests/day
- **Tier 1**: 15 requests/min, 1500 requests/day
- **Tier 2**: 2000 requests/min, 無制限

### 5. Notion設定

#### Notionでインテグレーションを作成：
1. [Notion Developers](https://developers.notion.com/)でインテグレーションを作成
2. **Internal Integration Token**を取得
3. データベースをインテグレーションと共有

#### 必要なデータベースプロパティ：
```
- Name (タイトル)
- ステータス (セレクト): 未分類, 進行中, 完了, 保留
- 種別 (セレクト): 企画・戦略, 制作・開発, 実行・運用, マネジメント, 分析・改善, その他・雑務
- 優先度 (セレクト): 緊急, 重要, 普通, アイデア
- レベル (セレクト): 戦略レベル, プロジェクト, タスク, アクション, メモ
- 成果物 (セレクト): 資料・企画書, コンテンツ, レポート, システム・ツール, ルール・仕組み, その他
- 案件 (セレクト): 各プロジェクト名
- 担当者 (リッチテキスト)
- 期限 (日付)
- 記入日 (日付)
- 関連リンク (ファイル&メディア)
- 備考 (リッチテキスト)
```

## 🎯 使用方法

### 基本的な使い方

1. **LINE Botを友だち追加**
2. **プロジェクト内容をメッセージで送信**

```
新商品LPの制作
・ターゲット：20-30代女性
・デザイン：シンプル&モダン
・期限：3月15日
・参考サイト：https://example.com
```

3. **即座に処理開始の通知**
```
🤖 分析中です...
少々お待ちください（約5-10秒）
```

4. **完了時に詳細結果を受信**
```
✅ プロジェクトを登録しました！

📝 タイトル: 新商品LPの制作
⭐ 優先度: 普通
🏷️ 種別: 制作・開発
🎚️ レベル: タスク
📦 成果物: コンテンツ
🗓️ 期限: 2025-03-15

📋 WBS案:
1. 現状分析の実施
2. 要件定義の明確化
3. デザイン設計
...

🔗 詳細: https://notion.so/...
```

### メッセージ形式のコツ

#### 効果的なメッセージ例：
```
# タイトルは1行目に明確に
顧客満足度調査の実施

# 詳細情報は2行目以降に
・対象：既存顧客500名
・方法：Webアンケート
・期間：2週間
・目的：サービス改善のため
・参考：https://survey-example.com
```

#### 自動判定されるキーワード：

**優先度**:
- 「緊急」「至急」「急ぎ」→ 緊急
- 「重要」→ 重要
- 「アイデア」「メモ」→ アイデア

**期限**:
- 「3月15日」「2025-03-15」→ 自動で日付形式に変換

**案件**:
- 「ONEマーケ」「redeal」「池袋サンシャイン」等 → 該当案件に自動分類

## 🛠️ 開発・運用

### ローカル開発
```bash
# 開発モードで起動
npm run dev

# 本番モードで起動
npm start
```

### ヘルスチェック
```bash
# システム状態確認
curl https://your-domain.com/

# 詳細デバッグ情報
curl https://your-domain.com/debug

# キャッシュクリア
curl -X POST https://your-domain.com/clear-cache
```

### ログ監視
システムは詳細なログを出力します：
```
✅ LINE client initialized successfully
🤖 Using NEW SDK: @google/genai v1.4.0
🚀 Model: gemini-2.5-flash-preview-05-20
📊 Request recorded: RPM 1/15, RPD 1/1500
✅ Page created successfully!
```

### エラーハンドリング

#### Gemini API制限対応：
```
🤖 Gemini 2.5 Flash AIの利用上限に達しました。

📊 制限情報:
• 1分間: 15回まで
• 1日: 1500回まで

⏰ 対処法:
• 1-2分お待ちください
• しばらく時間をおいてから再度お試しください
```

#### フォールバック機能：
- Gemini API障害時は自動的にローカル分析に切り替え
- 最低限のWBS構造を保証
- データ損失の防止

## 📁 プロジェクト構造

```
line-pm/
├── src/
│   ├── index.js              # メインアプリケーション
│   └── services/
│       ├── notion.js         # Notion API統合
│       └── projectAnalyzer.js # Gemini AI分析
├── package.json              # 依存関係管理
├── .env                      # 環境変数（作成必要）
├── .gitignore               # Git除外設定
└── README.md                # このファイル
```

## 🔧 API仕様

### Webhook エンドポイント

#### `POST /webhook`
LINE からのWebhookを処理

**Headers:**
- `X-Line-Signature`: LINE署名（必須）

**Body:**
```json
{
  "events": [
    {
      "type": "message",
      "message": {
        "type": "text",
        "text": "プロジェクトの内容"
      },
      "source": {
        "userId": "U123456..."
      },
      "replyToken": "reply_token..."
    }
  ]
}
```

### ヘルスチェック エンドポイント

#### `GET /`
システムステータスの確認

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-06-24T10:00:00.000Z",
  "environment": "production",
  "services": {
    "projectAnalyzer": true,
    "notionService": true
  },
  "cache": {
    "processedEvents": 5
  },
  "version": "2.6.0"
}
```

#### `GET /debug`
詳細なシステム情報

**Response:**
```json
{
  "environmentVariables": {
    "LINE_CHANNEL_ACCESS_TOKEN": true,
    "GEMINI_API_KEY": true,
    "NOTION_API_KEY": true
  },
  "services": {
    "projectAnalyzer": true,
    "notionService": true
  },
  "gemini": {
    "sdk": "@google/genai",
    "version": "1.4.0",
    "model": "gemini-2.5-flash-preview-05-20",
    "status": "Available (New SDK)"
  }
}
```

## 🚀 デプロイメント

### Railway でのデプロイ（推奨）

1. **Githubリポジトリを接続**
2. **環境変数を設定**
3. **自動デプロイを有効化**

### その他のプラットフォーム
- Heroku
- Vercel
- Google Cloud Run
- AWS Lambda

## 📊 パフォーマンス

### レスポンス時間
- **即座レスポンス**: < 500ms
- **AI分析 + Notion登録**: 5-10秒
- **トータル処理時間**: < 15秒

### スケーラビリティ
- **同時処理**: 無制限（非同期処理）
- **レート制限**: Gemini API制限に依存
- **メモリ使用量**: ~50MB

## 🔒 セキュリティ

### 実装済みセキュリティ
- LINE署名検証
- 環境変数による秘密情報管理
- 重複リクエスト防止
- APIレート制限管理

### 推奨事項
- HTTPS通信の使用
- 定期的なAPIキーローテーション
- ログの監視とアラート設定

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成: `git checkout -b feature/new-feature`
3. 変更をコミット: `git commit -am 'Add new feature'`
4. ブランチをプッシュ: `git push origin feature/new-feature`
5. プルリクエストを作成

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙋‍♂️ サポート

### よくある質問

**Q: Gemini APIの制限に達した場合はどうなりますか？**
A: 自動的にフォールバック機能が動作し、基本的なWBS構造でNotionページが作成されます。

**Q: Notionデータベースのプロパティは自由に変更できますか？**
A: 基本プロパティは固定ですが、追加プロパティは自由に設定可能です。

**Q: 複数のNotionワークスペースで使用できますか？**
A: 環境変数でデータベースIDを変更することで可能です。

### サポートチャンネル
- GitHub Issues: バグレポートや機能要望
- Email: [サポートメール](mailto:support@example.com)

## 📈 ロードマップ

### v2.7.0 (予定)
- [ ] 音声メッセージ対応
- [ ] 画像解析機能
- [ ] 複数データベース対応

### v3.0.0 (予定)
- [ ] Slack統合
- [ ] Teams統合
- [ ] カスタムワークフロー

---

**Made with ❤️ by [t-hamamura](https://github.com/t-hamamura)**

[![GitHub stars](https://img.shields.io/github/stars/t-hamamura/line-pm.svg?style=social&label=Star)](https://github.com/t-hamamura/line-pm)
[![GitHub forks](https://img.shields.io/github/forks/t-hamamura/line-pm.svg?style=social&label=Fork)](https://github.com/t-hamamura/line-pm/fork)
