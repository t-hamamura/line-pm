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
- **Gemini 2.5 Flash関連**: 新しいモデル対応、プロンプト改善、パフォーマンス最適化
- **バックグラウンド処理**: 非同期処理の改善、パフォーマンス向上
- **WBS生成**: 業界別テンプレート、生成ロジック改善
- **Notion統合**: 新しいプロパティタイプ対応、Markdown処理改善
- **LINE Bot機能**: プッシュ通知改善、メッセージフォーマット最適化
- **パフォーマンス**: レスポンス時間改善、メモリ最適化、キャッシュ改善
- **セキュリティ**: 脆弱性修正、セキュリティ強化、重複防止機能
- **国際化**: 多言語対応、グローバル展開

## 🛠️ 開発環境のセットアップ

### 前提条件
- **Node.js**: 18.0.0以上（推奨: 20.x LTS）
- **npm**: 9.0.0以上
- **Git**: 最新版
- **エディタ**: VS Code推奨（拡張機能: ESLint, Prettier）

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
npm list --depth=0
```

### 3. 環境変数の設定

```bash
# .env ファイルを作成
cp .env.example .env

# 必要な環境変数を設定
# LINE_CHANNEL_ACCESS_TOKEN=your_token
# LINE_CHANNEL_SECRET=your_secret  
# GEMINI_API_KEY=your_gemini_key (Gemini 2.5 Flash対応)
# NOTION_API_KEY=your_notion_key
# NOTION_DATABASE_ID=your_database_id
```

### 4. 開発サーバーの起動

```bash
# 開発サーバー起動
npm start

# ヘルスチェック確認
curl http://localhost:8080/

# 期待される応答
# {
#   "status": "OK",
#   "timestamp": "2025-06-12T10:30:00.000Z",
#   "services": {
#     "projectAnalyzer": true,
#     "notionService": true
#   }
# }
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
- **Gemini改善**: `gemini/improve-analysis`
- **パフォーマンス**: `perf/optimize-background-processing`

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
- **perf**: パフォーマンス改善
- **test**: テスト追加・修正
- **chore**: ビルド・設定変更

#### スコープ例
- **gemini**: Gemini AI関連
- **notion**: Notion統合関連
- **line**: LINE Bot関連
- **wbs**: WBS生成関連
- **cache**: キャッシュ関連
- **async**: 非同期処理関連

#### 例
```bash
feat(gemini): upgrade to Gemini 2.5 Flash

- Update model configuration for latest version
- Add new generation parameters for better accuracy
- Implement background processing for better UX
- Maintain backward compatibility

Closes #123
```

### コード品質

#### ESLintとPrettier（推奨）
```bash
# ESLint設定
npm install --save-dev eslint prettier eslint-config-prettier

# .eslintrc.js作成
module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'no-console': 'off', // ログ出力のため許可
    'no-unused-vars': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};
```

#### コーディング規約
- **インデント**: 2スペース
- **クォート**: シングルクォート優先
- **セミコロン**: 必須
- **変数名**: camelCase
- **定数**: UPPER_SNAKE_CASE
- **ファイル名**: camelCase (services), kebab-case (others)
- **関数**: async/await優先、Promiseチェーンは避ける

#### 例
```javascript
// ✅ Good
const projectAnalyzer = require('./services/projectAnalyzer');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CACHE_DURATION = 5 * 60 * 1000; // 5分

async function analyzeText(text) {
  try {
    const result = await projectAnalyzer.analyze(text);
    console.log('[SUCCESS] Analysis completed');
    return result;
  } catch (error) {
    console.error('[ERROR] Analysis failed:', error);
    throw error;
  }
}

// ❌ Bad
const ProjectAnalyzer = require('./services/ProjectAnalyzer');
const gemini_api_key = process.env.GEMINI_API_KEY;

function analyze_text(text) {
  return ProjectAnalyzer.analyze(text)
    .then(result => {
      console.log('Analysis completed')
      return result
    })
    .catch(error => {
      console.log('Analysis failed')
      throw error
    })
}
```

## 🧪 テスト

### テスト構造
```
tests/
├── unit/
│   ├── services/
│   │   ├── projectAnalyzer.test.js
│   │   └── notion.test.js
│   └── utils/
├── integration/
│   ├── webhook.test.js
│   └── gemini-integration.test.js
└── fixtures/
    ├── sample-messages.json
    └── notion-responses.json
```

### テスト実行
```bash
# 全テスト実行
npm test

# 特定ファイルのテスト
npm test -- tests/unit/services/projectAnalyzer.test.js

# カバレッジ付きテスト
npm run test:coverage
```

### テスト作成例
```javascript
// tests/unit/services/projectAnalyzer.test.js
const projectAnalyzer = require('../../../src/services/projectAnalyzer');

describe('ProjectAnalyzer', () => {
  describe('analyzeText', () => {
    it('should analyze simple project text', async () => {
      const text = 'マーケティング戦略を来月までに作成';
      const result = await projectAnalyzer.analyzeText(text);
      
      expect(result).toHaveProperty('properties');
      expect(result.properties.ステータス).toBe('未分類');
      expect(result).toHaveProperty('pageContent');
    });

    it('should handle empty text gracefully', async () => {
      const text = '';
      await expect(projectAnalyzer.analyzeText(text))
        .rejects.toThrow('Input text is required');
    });
  });
});
```

## 🔧 デバッグ

### ログレベル
プロジェクトでは以下のログ形式を使用：

```javascript
// 成功ログ
console.log('✅ Process completed successfully');

// 情報ログ  
console.log('[INFO] Processing user message');

// 警告ログ
console.warn('⚠️ Rate limit approaching');

// エラーログ
console.error('❌ Failed to process:', error.message);

// デバッグログ（開発時のみ）
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG] Variable state:', variable);
}
```

### VS Code デバッグ設定
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.js",
      "env": {
        "NODE_ENV": "development"
      },
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    }
  ]
}
```

## 🚀 パフォーマンス最適化

### 重要な考慮事項
1. **Gemini API制限**: RPM: 10, TPM: 250K, RPD: 500
2. **LINE応答制限**: 30秒以内
3. **メモリ使用量**: 512MB未満推奨
4. **レスポンス時間**: 初回応答100ms未満

### プロファイリング
```javascript
// パフォーマンス測定例
const startTime = Date.now();

// 処理実行
await processFunction();

const endTime = Date.now();
console.log(`[PERF] Processing took ${endTime - startTime}ms`);
```

## 🛡️ セキュリティ

### セキュリティチェックリスト
- [ ] 環境変数の適切な管理
- [ ] LINE Webhook署名検証
- [ ] 入力値のサニタイゼーション
- [ ] エラー情報の適切な隠蔽
- [ ] レート制限の実装
- [ ] ログ情報の機密性確保

### セキュリティテスト
```bash
# 脆弱性スキャン
npm audit

# 修正適用
npm audit fix
```

## 📝 ドキュメント更新

### ドキュメント種類
- **README.md**: プロジェクト概要
- **CONTRIBUTING.md**: 貢献ガイド（このファイル）
- **CHANGELOG.md**: 変更履歴
- **docs/**: 詳細ドキュメント
  - `classification-system.md`: 分類システム
  - `wbs_generation_doc.md`: WBS生成
  - `api_documentation.md`: API仕様
  - `architecture_doc.md`: システム設計
  - `troubleshooting_doc.md`: トラブルシューティング
  - `deployment_guide.md`: デプロイガイド
  - `gemini_upgrade_guide.md`: Geminiアップグレード

### ドキュメント更新ルール
- 機能追加時は必ずREADME更新
- API変更時はapi_documentation.md更新
- バージョン変更時はCHANGELOG.md更新
- コード例は動作確認済みのもののみ

## 🔍 Issue・Pull Request

### Issue作成
```markdown
## 問題の概要
簡潔に問題を説明

## 再現手順
1. 手順1
2. 手順2
3. 結果

## 期待する動作
何が起こるべきか

## 実際の動作  
何が起こったか

## 環境
- OS: macOS 14.0
- Node.js: 20.10.0
- npm: 10.2.0

## 追加情報
ログ、スクリーンショットなど
```

### Pull Request作成
```markdown
## 変更内容
- 機能追加/バグ修正の詳細
- 技術的な変更点

## 関連Issue
Closes #123

## テスト
- [ ] 既存テストが通過
- [ ] 新しいテストを追加
- [ ] 手動テストを実施

## チェックリスト
- [ ] コードレビュー済み
- [ ] ドキュメント更新済み
- [ ] CHANGELOG.md更新済み
- [ ] セキュリティ確認済み
```

### コードレビュー観点
1. **機能性**: 仕様通りに動作するか
2. **性能**: パフォーマンスに問題ないか
3. **保守性**: 理解しやすく修正しやすいか
4. **セキュリティ**: 脆弱性はないか
5. **一貫性**: 既存コードとの整合性
6. **テスト**: 適切なテストがあるか

## 🤝 コミュニティ

### 質問・相談
- **GitHub Issues**: バグ報告、機能要望
- **GitHub Discussions**: 技術相談、アイデア
- **Pull Request**: コードレビュー依頼

### レスポンス目標
- **Issue確認**: 48時間以内
- **PR初回レビュー**: 72時間以内
- **質問回答**: 24時間以内（平日）

## 🏆 貢献者の認定

### 貢献レベル
1. **First-time Contributor**: 初回貢献
2. **Regular Contributor**: 5回以上貢献
3. **Core Contributor**: 継続的な貢献・メンテナンス
4. **Maintainer**: プロジェクト管理権限

### 特別貢献
- **Security**: セキュリティ改善
- **Performance**: パフォーマンス向上
- **Documentation**: ドキュメント充実
- **Testing**: テスト改善
- **Gemini**: AI機能改善

## 📋 開発ロードマップ

### 短期目標（v2.6.0）
- [ ] 多言語対応（英語）
- [ ] プロジェクト進捗追跡
- [ ] カスタムテンプレート
- [ ] パフォーマンス監視

### 中期目標（v2.7.0）
- [ ] 音声入力対応
- [ ] 画像解析機能
- [ ] カレンダー統合
- [ ] レポート機能

### 長期目標（v3.0.0）
- [ ] 機械学習による個人化
- [ ] 他プラットフォーム対応
- [ ] 予測分析機能
- [ ] モバイルアプリ

## 📞 サポート

### 技術サポート
- **開発環境**: セットアップ支援
- **API統合**: Gemini/Notion/LINE
- **デプロイ**: Railway/その他プラットフォーム
- **トラブルシューティング**: 問題解決支援

### 連絡先
- **Issue作成**: 技術的な問題・要望
- **Discussion**: 設計・アーキテクチャ相談
- **Email**: 機密事項（セキュリティ等）

---

**🙏 皆様の貢献によって、line-pmはより良いプロジェクト管理ツールに成長します。**  
**💪 一緒に次世代のプロジェクト管理システムを作りましょう！**
