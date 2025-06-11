# Contributing Guide

**line-pm プロジェクトへの貢献ガイド**

line-pmプロジェクトへの貢献を検討していただき、ありがとうございます！このガイドでは、効果的に貢献するための方法と手順について説明します。

## 🎯 貢献の種類

### 💡 できる貢献
- **🐛 バグ報告**: 問題の発見と詳細な報告
- **✨ 機能要望**: 新機能のアイデアと提案
- **🔧 バグ修正**: コードの問題解決
- **⚡ 機能実装**: 新機能の開発
- **📚 ドキュメント改善**: 説明の追加・改善
- **🧪 テスト追加**: テストカバレッジ向上
- **🎨 UI/UX改善**: ユーザー体験の向上
- **🔍 コードレビュー**: 他の貢献者のコードレビュー

### 🚀 特に歓迎する貢献
- **Gemini AI関連**: 新しいモデル対応、プロンプト改善
- **WBS生成**: 業界別テンプレート、生成ロジック改善
- **Notion統合**: 新しいプロパティタイプ対応
- **パフォーマンス**: レスポンス時間改善、メモリ最適化
- **セキュリティ**: 脆弱性修正、セキュリティ強化
- **国際化**: 多言語対応

## 🛠️ 開発環境のセットアップ

### 前提条件
- **Node.js**: 18.0.0以上
- **npm**: 8.0.0以上
- **Git**: 最新版
- **エディタ**: VS Code推奨（Cursor, WebStorm等も可）

### 1. リポジトリのフォーク・クローン

```bash
# 1. GitHubでリポジトリをフォーク
# https://github.com/t-hamamura/line-pm/fork

# 2. フォークしたリポジトリをクローン
git clone https://github.com/YOUR_USERNAME/line-pm.git
cd line-pm

# 3. 上流リポジトリを追加
git remote add upstream https://github.com/t-hamamura/line-pm.git
```

### 2. 依存関係のインストール

```bash
# 依存関係インストール
npm install

# インストール確認
npm list
```

### 3. 環境変数の設定

```bash
# .env ファイルを作成
cp .env.example .env

# 必要な環境変数を設定
# LINE_CHANNEL_ACCESS_TOKEN=your_token
# LINE_CHANNEL_SECRET=your_secret  
# GEMINI_API_KEY=your_gemini_key
# NOTION_API_KEY=your_notion_key
# NOTION_DATABASE_ID=your_database_id
```

### 4. 開発サーバーの起動

```bash
# 開発サーバー起動
npm start

# ヘルスチェック確認
curl http://localhost:8080/
```

### 5. ngrokセットアップ（LINE Botテスト用）

```bash
# ngrok インストール
npm install -g ngrok

# ローカルサーバーを外部公開
ngrok http 8080

# LINE Developer Console で Webhook URL を設定
# https://xxxxx.ngrok.io/webhook
```

## 📋 開発フロー

### ブランチ戦略

```bash
# 最新の変更を取得
git fetch upstream
git checkout main
git merge upstream/main

# 機能ブランチを作成
git checkout -b feature/your-feature-name

# または
git checkout -b fix/issue-number-description
```

#### ブランチ命名規則
- **機能追加**: `feature/feature-name`
- **バグ修正**: `fix/issue-number-description`
- **ドキュメント**: `docs/update-readme`
- **リファクタリング**: `refactor/improve-performance`
- **テスト**: `test/add-unit-tests`

### コミット規則

#### コミットメッセージ形式
```
<type>(<scope>): <subject>

<body>

<footer>
```

#### タイプ
- **feat**: 新機能
- **fix**: バグ修正
- **docs**: ドキュメント変更
- **style**: フォーマット変更（機能に影響なし）
- **refactor**: リファクタリング
- **test**: テスト追加・修正
- **chore**: ビルド・設定変更

#### 例
```bash
feat(gemini): add Gemini 2.5 Flash support

- Update model configuration
- Add new generation parameters
- Maintain backward compatibility

Closes #123
```

### コード品質

#### ESLintとPrettier（推奨）
```bash
# ESLint設定
npm install --save-dev eslint prettier

# .eslintrc.js作成
module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: ['eslint:recommended'],
  rules: {
    'no-console': 'off',
    'no-unused-vars': 'warn'
  }
};
```

#### コーディング規約
- **インデント**: 2スペース
- **クォート**: シングルクォート優先
- **セミコロン**: 必須
- **変数名**: camelCase
- **定数**: UPPER_SNAKE_CASE
- **ファイル名**: kebab-case

#### 例
```javascript
// ✅ Good
const projectAnalyzer = require('./services/project-analyzer');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function analyzeText(text) {
  return projectAnalyzer.analyze(text);
}

// ❌ Bad
const ProjectAnalyzer = require('./services/ProjectAnalyzer');
const gemini_api_key = process.env.GEMINI_API_KEY;

function analyze_text(text) {
  return ProjectAnalyzer.analyze(text)
}
```

## 🧪 テスト

### テスト構造

```
test/
├── unit/
│   ├── services/
│   │   ├── project-analyzer.test.js
│   │   ├── notion.test.js
│   │   └── line.test.js
│   └── utils/
│       └── helpers.test.js
├── integration/
│   ├── webhook.test.js
│   └── api.test.js
└── fixtures/
    ├── sample-messages.json
    └── expected-results.json
```

### テスト実行

```bash
# 全テスト実行
npm test

# 特定テスト実行
npm test -- test/unit/services/project-analyzer.test.js

# カバレッジ確認
npm run test:coverage
```

### テスト例

```javascript
// test/unit/services/project-analyzer.test.js
const projectAnalyzer = require('../../../src/services/projectAnalyzer');

describe('ProjectAnalyzer', () => {
  describe('analyzeText', () => {
    test('should analyze simple project text', async () => {
      const input = '新しいプロジェクトを考える';
      const result = await projectAnalyzer.analyzeText(input);
      
      expect(result.properties).toBeDefined();
      expect(result.properties.Name).toBe(input);
      expect(result.properties.ステータス).toBe('📥 未分類');
      expect(result.pageContent).toBeDefined();
    });
    
    test('should extract deadline correctly', async () => {
      const input = 'マーケティング戦略を12月20日まで作成';
      const result = await projectAnalyzer.analyzeText(input);
      
      expect(result.properties.期限).toBe('2023-12-20');
    });
    
    test('should handle invalid input gracefully', async () => {
      const result = await projectAnalyzer.analyzeText('');
      
      expect(result.properties.ステータス).toBe('📥 未分類');
      expect(result.pageContent).toBeDefined();
    });
  });
  
  describe('createEnhancedFallbackResponse', () => {
    test('should create valid fallback response', () => {
      const input = 'テストプロジェクト';
      const result = projectAnalyzer.createEnhancedFallbackResponse(input);
      
      expect(result.properties.Name).toBe(input);
      expect(result.pageContent).toContain('WBS');
    });
  });
});
```

### モックとスタブ

```javascript
// Gemini APIのモック
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            properties: {
              Name: 'テスト',
              ステータス: '📥 未分類'
            },
            pageContent: 'テスト用WBS'
          })
        }
      })
    })
  }))
}));
```

## 📝 ドキュメント

### ドキュメント構造

```
docs/
├── api.md                    # API仕様書
├── architecture.md           # システム設計書
├── wbs-generation.md         # WBS生成機能
├── gemini-upgrade-guide.md   # Gemini升级指南
├── troubleshooting.md        # トラブルシューティング
├── classification-system.md  # 分類体系
└── deployment.md            # デプロイメント手順
```

### ドキュメント作成・更新指針

#### 対象読者を明確に
- **エンドユーザー**: README.md
- **開発者**: docs/*.md
- **運用担当**: deployment.md, troubleshooting.md

#### 文書構造
```markdown
# タイトル

## 📋 概要
- 目的と対象読者
- 前提知識

## 📊 詳細内容
- 具体的な説明
- 図表・コード例

## 📞 関連情報
- 関連ドキュメントへのリンク
```

#### コード例の品質
- **動作する例**: 実際に動作確認済み
- **コメント**: 重要な部分に説明追加
- **エラーハンドリング**: 適切な例外処理

## 🐛 Issue報告

### バグ報告

#### 必要な情報
1. **現象**: 何が起きているか
2. **期待値**: 何が起きるべきか
3. **再現手順**: 問題を再現する方法
4. **環境**: OS、Node.jsバージョン等
5. **ログ**: エラーメッセージやスタックトレース

#### バグ報告テンプレート
```markdown
## 🐛 バグ報告

### 現象
WBS生成で空の内容が生成される

### 期待値
具体的なWBS構造が生成される

### 再現手順
1. LINE Botに「新しいプロジェクト」と送信
2. 返信メッセージを確認
3. NotionページでWBS内容を確認

### 環境
- OS: macOS 13.0
- Node.js: 18.17.0
- npm: 9.6.7

### ログ
```
[GEMINI] Empty pageContent generated
[NOTION] Creating fallback WBS
```

### 追加情報
月曜日の朝によく発生する傾向がある
```

### 機能要望

#### 提案テンプレート
```markdown
## ✨ 機能要望

### 概要
Slack Bot対応の追加

### 背景・動機
チームがSlackを主に使用しており、LINEからの移行を希望

### 提案する解決方法
Slack Bot SDKを使用した実装

### 代替案
Slack Webhookによる簡易実装

### 優先度
Medium（3ヶ月以内）

### 実装に必要なリソース
- Slack Bot SDK導入
- 認証フロー実装
- メッセージフォーマット調整
```

## 🔄 Pull Request

### PR作成前チェックリスト

- [ ] **ブランチ**: feature/fix ブランチから作成
- [ ] **テスト**: 新規・既存テストが通過
- [ ] **ドキュメント**: 必要に応じて更新
- [ ] **コード品質**: ESLint/Prettierチェック通過
- [ ] **コミット**: 適切なコミットメッセージ
- [ ] **競合**: mainブランチとの競合解決済み

### PR作成手順

```bash
# 1. 最新のmainを取得
git fetch upstream
git checkout main
git merge upstream/main

# 2. 機能ブランチを最新化
git checkout feature/your-feature
git rebase main

# 3. テスト実行
npm test

# 4. プッシュ
git push origin feature/your-feature

# 5. GitHub でPull Request作成
```

### PRテンプレート

```markdown
## 📋 概要
このPRは何を変更しますか？

## 🔧 変更内容
- [ ] 新機能追加
- [ ] バグ修正
- [ ] ドキュメント更新
- [ ] リファクタリング
- [ ] テスト追加

## 📊 詳細
### 変更したファイル
- `src/services/projectAnalyzer.js`: Gemini 2.5対応
- `docs/gemini-upgrade-guide.md`: ドキュメント更新

### テスト
- [ ] 新規テスト追加
- [ ] 既存テスト修正
- [ ] 手動テスト実施

## 🔗 関連Issue
Closes #123

## 📸 スクリーンショット
（UI変更の場合）

## ✅ チェックリスト
- [ ] 動作テスト完了
- [ ] ドキュメント更新
- [ ] 下位互換性確認
- [ ] エラーハンドリング実装
```

### コードレビュー

#### レビューポイント
- **機能性**: 要件を満たしているか
- **品質**: バグや問題がないか
- **性能**: パフォーマンスへの影響
- **セキュリティ**: セキュリティリスクの有無
- **保守性**: 理解しやすく変更しやすいか
- **テスト**: 適切なテストが含まれているか

#### レビューの心構え
- **建設的**: 改善提案を含む
- **具体的**: 曖昧な指摘は避ける
- **敬意**: 相手への敬意を持つ
- **学習**: 互いの学習機会として活用

## 🎯 コミュニティ

### コミュニケーション

#### GitHub Discussions
- **質問**: 使い方がわからない時
- **アイデア**: 新機能のブレインストーミング
- **ショーケース**: 作成した拡張機能の紹介

#### Issues
- **バグ報告**: 具体的な問題の報告
- **機能要望**: 明確な改善提案

### 行動規範

#### 基本原則
- **包含性**: 全ての人を歓迎
- **尊重**: 異なる意見や経験を尊重
- **協力**: 建設的な協力関係
- **学習**: 互いの成長を支援

#### 禁止事項
- 個人攻撃や嫌がらせ
- 差別的な言動
- スパムや無関係な投稿
- 機密情報の漏洩

## 📚 参考リソース

### 学習リソース

#### プロジェクト関連
- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/guide/)
- [LINE Bot SDK](https://line.github.io/line-bot-sdk-nodejs/)
- [Notion API](https://developers.notion.com/)
- [Google Gemini AI](https://ai.google.dev/docs)

#### 開発ツール
- [Git 基本操作](https://git-scm.com/docs)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

### 内部ドキュメント
- [API仕様書](./docs/api.md)
- [アーキテクチャ](./docs/architecture.md)
- [トラブルシューティング](./docs/troubleshooting.md)

## 🏆 貢献者

### 現在の貢献者
- **@t-hamamura**: プロジェクトリード
- **Claude AI**: 設計・ドキュメント支援

### 貢献の認識
- **Contributors**: README.mdで名前を掲載
- **Changelog**: 各リリースで貢献を記録
- **GitHub**: Contributor graphで可視化

### 特別な貢献
- **First-time Contributors**: 初回貢献者は特別に歓迎
- **Long-term Contributors**: 継続的な貢献者には感謝

## ❓ よくある質問

### Q: どこから始めれば良いですか？
A: [Good First Issues](https://github.com/t-hamamura/line-pm/labels/good%20first%20issue) ラベルの付いたIssueから始めることをお勧めします。

### Q: 開発環境でうまく動作しません
A: [トラブルシューティングガイド](./docs/troubleshooting.md) を確認し、それでも解決しない場合はIssueを作成してください。

### Q: 機能要望はどのように提案すれば良いですか？
A: GitHub Issuesで機能要望テンプレートを使用して提案してください。実装前にディスカッションすることをお勧めします。

### Q: AIモデルやAPIの知識がなくても貢献できますか？
A: はい。ドキュメント改善、UI/UX改善、テスト追加など、様々な形で貢献が可能です。

---

**🎉 皆様の貢献をお待ちしています！**

質問や不明点があれば、遠慮なくIssueやDiscussionで相談してください。一緒に素晴らしいプロジェクト管理システムを作り上げましょう！