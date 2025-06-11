# トラブルシューティングガイド

**line-pm システムの問題解決と対処方法**

## 📋 概要

line-pmシステムの運用中に発生する可能性のある問題と、その解決方法をまとめたガイドです。開発・運用・ユーザー利用の各段階での問題に対応しています。

## 🚨 緊急時対応

### システム全体停止
#### 症状
- LINE Botが応答しない
- Railway アプリケーションが停止

#### 確認手順
```bash
# 1. Railway ステータス確認
curl https://line-pm-production.up.railway.app/

# 2. ログ確認
railway logs --tail

# 3. 環境変数確認
railway variables
```

#### 対処法
```bash
# 緊急再起動
railway redeploy

# または強制再デプロイ
git commit --allow-empty -m "🔥 Emergency redeploy"
git push origin main
```

### LINE Bot応答遅延
#### 症状
- レスポンスが30秒以上かかる
- タイムアウトエラーが頻発

#### 確認ポイント
- Gemini APIのレート制限
- Notion APIの応答時間
- Railway アプリケーションの負荷

#### 対処法
1. **即座の対応**:
   ```javascript
   // タイムアウト時間を短縮
   const result = await Promise.race([
     model.generateContent(systemPrompt),
     new Promise((_, reject) => 
       setTimeout(() => reject(new Error('Timeout')), 5000) // 8秒→5秒
     )
   ]);
   ```

2. **フォールバック強化**:
   ```javascript
   // より積極的なフォールバック
   if (error.message.includes('timeout') || responseTime > 5000) {
     return this.createEnhancedFallbackResponse(text);
   }
   ```

## 🤖 Gemini AI関連の問題

### Gemini API エラー

#### 問題: "Model not found"
```javascript
// エラー例
Error: GoogleGenerativeAI: Model `gemini-2.0-flash-lite` not found
```

**原因**: 
- モデル名の誤記
- APIキーの権限不足
- 地域制限

**解決方法**:
```javascript
// 1. モデル名の確認
const availableModels = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash', 
  'gemini-1.5-flash-8b'
];

// 2. フォールバックモデル
const fallbackModel = 'gemini-1.5-flash-8b';

// 3. モデル存在確認
async function validateModel(modelName) {
  try {
    const model = this.gemini.getGenerativeModel({ model: modelName });
    await model.generateContent('test');
    return true;
  } catch (error) {
    console.warn(`Model ${modelName} not available:`, error.message);
    return false;
  }
}
```

#### 問題: "Rate limit exceeded"
```javascript
// エラー例
Error: GoogleGenerativeAI: Rate limit exceeded
```

**原因**: 
- フリーティア制限超過（RPM: 30, TPM: 1M, RPD: 1,500）
- 短時間での大量リクエスト

**解決方法**:
```javascript
// 1. レート制限監視
class RateLimitManager {
  constructor() {
    this.requestCount = 0;
    this.resetTime = Date.now() + 60000; // 1分後
  }
  
  canMakeRequest() {
    if (Date.now() > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = Date.now() + 60000;
    }
    
    return this.requestCount < 25; // 30の余裕を持って25
  }
  
  recordRequest() {
    this.requestCount++;
  }
}

// 2. 使用例
if (rateLimitManager.canMakeRequest()) {
  rateLimitManager.recordRequest();
  const result = await model.generateContent(prompt);
} else {
  console.warn('Rate limit approaching, using fallback');
  return this.createFallbackResponse(text);
}
```

#### 問題: "API key invalid"
```javascript
// エラー例
Error: GoogleGenerativeAI: API key is invalid
```

**原因**: 
- 環境変数の設定ミス
- APIキーの期限切れ
- 権限不足

**解決方法**:
```bash
# 1. 環境変数確認
echo $GEMINI_API_KEY

# 2. Railway環境変数確認
railway variables

# 3. APIキーテスト
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
     https://generativelanguage.googleapis.com/v1/models
```

### WBS生成の問題

#### 問題: WBSが生成されない
**症状**: 
- `pageContent` が null
- WBS案が「生成に失敗しました」

**デバッグ手順**:
```javascript
// 1. Gemini応答の確認
console.log('Raw Gemini response:', jsonString);

// 2. JSON解析の確認
try {
  const parsed = JSON.parse(jsonString);
  console.log('Parsed result:', parsed);
} catch (error) {
  console.error('JSON parse error:', error);
  console.log('Trying to clean JSON...');
}

// 3. フォールバック発動確認
if (!parsedResult.pageContent) {
  console.log('Triggering WBS fallback generation');
  parsedResult.pageContent = this.generateWBS(text);
}
```

**解決方法**:
```javascript
// より強力なフォールバック
createEnhancedFallbackResponse(text) {
  // 必ずWBSを生成
  const wbsContent = this.generateDetailedWBS(text);
  
  return {
    properties: {
      Name: text,
      ステータス: "📥 未分類",
      // ... 他のプロパティ
    },
    pageContent: wbsContent
  };
}

generateDetailedWBS(text) {
  return `## ${text}

### 🎯 プロジェクト概要
このプロジェクトの実行計画を以下に示します。

### 📋 WBS（作業分解構成図）

#### フェーズ1: 調査・準備
- [ ] 現状分析の実施
- [ ] 要件定義の明確化
- [ ] リソースの確認

#### フェーズ2: 計画・設計  
- [ ] 詳細計画の策定
- [ ] 設計・仕様の決定
- [ ] スケジュールの確定

#### フェーズ3: 実行・管理
- [ ] 実行開始
- [ ] 進捗管理
- [ ] 品質チェック

#### フェーズ4: 完了・評価
- [ ] 成果物の確認
- [ ] 評価とフィードバック
- [ ] 改善点の整理

### 📊 期待される成果物
1. プロジェクト計画書
2. 実行結果レポート
3. 改善提案書`;
}
```

## 📊 Notion関連の問題

### Notion API エラー

#### 問題: "Database not found"
```javascript
// エラー例
NotionAPIError: object_not_found: Database not found
```

**原因**: 
- データベースIDの誤り
- インテグレーションの権限不足
- データベースが削除済み

**解決方法**:
```javascript
// 1. データベース接続テスト
async function testNotionConnection() {
  try {
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });
    console.log('✅ Database found:', database.title[0].plain_text);
    return true;
  } catch (error) {
    console.error('❌ Database error:', error.message);
    return false;
  }
}

// 2. 権限確認
async function checkIntegrationPermissions() {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: 1
    });
    console.log('✅ Read permission confirmed');
    return true;
  } catch (error) {
    console.error('❌ Permission error:', error.message);
    return false;
  }
}
```

#### 問題: "Property validation failed"
```javascript
// エラー例
NotionAPIError: validation_error: Property value does not match schema
```

**原因**: 
- セレクト選択肢の不一致
- プロパティタイプの誤り
- 必須プロパティの欠如

**解決方法**:
```javascript
// 1. スキーマ動的取得と検証
async function validatePropertyValue(propName, value, schema) {
  const propConfig = schema[propName];
  if (!propConfig) {
    console.warn(`Property ${propName} not found in schema`);
    return null;
  }

  switch (propConfig.type) {
    case 'select':
      const options = propConfig.select?.options || [];
      const validOption = options.find(opt => 
        opt.name === value || opt.name.toLowerCase() === value.toLowerCase()
      );
      
      if (!validOption) {
        console.warn(`Value "${value}" not valid for ${propName}`);
        console.warn(`Available options:`, options.map(opt => opt.name));
        return options[0]?.name || null; // デフォルト値
      }
      
      return validOption.name;
      
    case 'date':
      if (value && !value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.warn(`Invalid date format for ${propName}: ${value}`);
        return null;
      }
      return value;
      
    default:
      return value;
  }
}

// 2. プロパティ設定の安全化
async function safeSetProperty(properties, propName, value, schema) {
  const validatedValue = await validatePropertyValue(propName, value, schema);
  
  if (validatedValue !== null) {
    properties[propName] = { select: { name: validatedValue } };
    console.log(`✅ Set ${propName}: ${validatedValue}`);
  } else {
    console.log(`⚠️ Skipped ${propName}: invalid value`);
  }
}
```

### Markdown変換の問題

#### 問題: Notionブロック変換失敗
**症状**: 
- チェックリストが表示されない
- 見出しが正しく変換されない
- 改行が無視される

**解決方法**:
```javascript
// より堅牢なMarkdown変換
function robustMarkdownToBlocks(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') {
    return [createDefaultBlock()];
  }

  const blocks = [];
  const lines = markdownText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (!trimmedLine) continue;
    
    try {
      // パターンマッチングの順序重要
      if (trimmedLine.startsWith('#### ')) {
        blocks.push(createHeading4Block(trimmedLine.substring(5)));
      } else if (trimmedLine.startsWith('### ')) {
        blocks.push(createHeading3Block(trimmedLine.substring(4)));
      } else if (trimmedLine.startsWith('## ')) {
        blocks.push(createHeading2Block(trimmedLine.substring(3)));
      } else if (trimmedLine.startsWith('- [ ] ')) {
        blocks.push(createTodoBlock(trimmedLine.substring(6)));
      } else if (trimmedLine.match(/^\d+\. /)) {
        blocks.push(createNumberedListBlock(trimmedLine.replace(/^\d+\. /, '')));
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        blocks.push(createBulletListBlock(trimmedLine.substring(2)));
      } else {
        blocks.push(createParagraphBlock(trimmedLine));
      }
    } catch (error) {
      console.warn(`Failed to convert line: ${trimmedLine}`, error);
      blocks.push(createParagraphBlock(trimmedLine));
    }
  }
  
  return blocks.length > 0 ? blocks : [createDefaultBlock()];
}

// ブロック作成ヘルパー関数
function createTodoBlock(text) {
  return {
    object: 'block',
    type: 'to_do',
    to_do: {
      rich_text: [{ type: 'text', text: { content: text.trim() } }],
      checked: false
    }
  };
}

function createDefaultBlock() {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ 
        type: 'text', 
        text: { content: '内容の自動生成に失敗しました。手動で内容を追加してください。' } 
      }]
    }
  };
}
```

## 📱 LINE Bot関連の問題

### Webhook検証エラー

#### 問題: "Invalid signature"
```javascript
// エラー例
Error: Invalid signature from LINE webhook
```

**原因**: 
- Channel Secretの設定ミス
- 署名計算の誤り
- リクエストボディの改変

**解決方法**:
```javascript
// 署名検証の強化
function validateLineSignature(body, signature, channelSecret) {
  const crypto = require('crypto');
  
  // 1. 署名の存在確認
  if (!signature) {
    console.error('Missing LINE signature header');
    return false;
  }
  
  // 2. ボディの確認
  if (!body) {
    console.error('Empty request body');
    return false;
  }
  
  // 3. 署名計算
  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');
  
  // 4. 署名比較
  const isValid = signature === hash;
  
  if (!isValid) {
    console.error('Signature mismatch');
    console.error('Expected:', hash);
    console.error('Received:', signature);
  }
  
  return isValid;
}

// 使用例
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-line-signature'];
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    if (!validateLineSignature(body, signature, process.env.LINE_CHANNEL_SECRET)) {
      return res.status(401).send('Unauthorized');
    }
    
    // 処理続行
    processWebhook(JSON.parse(body));
    res.status(200).send('OK');
  });
});
```

### 重複メッセージ処理

#### 問題: 同じメッセージが複数回処理される
**症状**: 
- 同じプロジェクトが複数回登録
- "重複を防ぐためスキップ" メッセージが表示されない

**解決方法**:
```javascript
// 3段階重複防止の強化
class DuplicateManager {
  constructor() {
    this.processedEvents = new Map();
    this.emergencyKeys = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5分
  }
  
  isDuplicate(event) {
    const userId = event.source.userId;
    const userText = event.message.text.trim();
    const eventId = event.webhookEventId || `${userId}-${event.timestamp}`;
    const messageHash = `${userId}-${userText}-${Math.floor(Date.now() / 300000)}`;
    const emergencyKey = `${userId}-${userText}`;
    
    // レベル1: Event ID チェック
    if (this.processedEvents.has(eventId)) {
      console.log(`[DUPLICATE-L1] Event ${eventId} already processed`);
      return true;
    }
    
    // レベル2: Message Hash チェック
    if (this.processedEvents.has(messageHash)) {
      console.log(`[DUPLICATE-L2] Similar message processed recently`);
      return true;
    }
    
    // レベル3: Emergency Key チェック
    if (this.emergencyKeys.has(emergencyKey)) {
      const lastProcessed = this.emergencyKeys.get(emergencyKey);
      if (Date.now() - lastProcessed < 30000) { // 30秒以内
        console.log(`[DUPLICATE-L3] Emergency duplicate detected`);
        return true;
      }
    }
    
    return false;
  }
  
  markAsProcessed(event) {
    const userId = event.source.userId;
    const userText = event.message.text.trim();
    const eventId = event.webhookEventId || `${userId}-${event.timestamp}`;
    const messageHash = `${userId}-${userText}-${Math.floor(Date.now() / 300000)}`;
    const emergencyKey = `${userId}-${userText}`;
    const timestamp = Date.now();
    
    this.processedEvents.set(eventId, timestamp);
    this.processedEvents.set(messageHash, timestamp);
    this.emergencyKeys.set(emergencyKey, timestamp);
  }
  
  cleanup() {
    const now = Date.now();
    
    for (const [key, timestamp] of this.processedEvents.entries()) {
      if (now - timestamp > this.CACHE_DURATION) {
        this.processedEvents.delete(key);
      }
    }
    
    for (const [key, timestamp] of this.emergencyKeys.entries()) {
      if (now - timestamp > 60000) { // 1分でクリーンアップ
        this.emergencyKeys.delete(key);
      }
    }
  }
}
```

## 🚀 Railway関連の問題

### デプロイメント失敗

#### 問題: Build failed
**症状**: 
- Railway デプロイが失敗
- "Build failed" メッセージ

**確認手順**:
```bash
# 1. ローカルビルドテスト
npm install
npm start

# 2. 依存関係確認
npm audit
npm outdated

# 3. Node.jsバージョン確認
node --version
```

**解決方法**:
```json
// package.json でNode.jsバージョン指定
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "scripts": {
    "start": "node src/index.js",
    "build": "echo 'No build step required'",
    "test": "echo 'No tests specified'"
  }
}
```

#### 問題: Environment variables not set
**症状**: 
- 環境変数エラー
- "API key not set" エラー

**解決方法**:
```bash
# Railway環境変数設定
railway variables set GEMINI_API_KEY=your_key
railway variables set LINE_CHANNEL_ACCESS_TOKEN=your_token
railway variables set LINE_CHANNEL_SECRET=your_secret
railway variables set NOTION_API_KEY=your_notion_key
railway variables set NOTION_DATABASE_ID=your_db_id

# 設定確認
railway variables
```

### アプリケーション応答なし

#### 問題: Health check failed
**症状**: 
- `/` エンドポイントが応答しない
- Railway ヘルスチェック失敗

**解決方法**:
```javascript
// より詳細なヘルスチェック
app.get("/", (req, res) => {
  try {
    const healthStatus = {
      status: "OK",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        projectAnalyzer: !!projectAnalyzer,
        notionService: !!notionService,
        lineClient: !!lineClient
      },
      cache: {
        processedEvents: processedEvents ? processedEvents.size : 0
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    };
    
    console.log('[HEALTH] Health check requested:', healthStatus);
    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('[HEALTH] Health check failed:', error);
    res.status(500).json({ 
      status: "ERROR", 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

## 📊 監視とアラート

### ログ監視

#### 重要ログパターン
```bash
# 成功パターン
grep "✅\|🚀\|📄" railway.log

# エラーパターン  
grep "❌\|ERROR\|FAILED" railway.log

# パフォーマンス監視
grep "⏱️\|TIMEOUT\|SLOW" railway.log

# 重複検出
grep "DUPLICATE\|EMERGENCY" railway.log
```

#### ログ解析スクリプト
```bash
#!/bin/bash
# log_analysis.sh

echo "=== LINE-PM システム ログ解析 ==="
echo "期間: 過去24時間"
echo ""

# 成功率計算
SUCCESS_COUNT=$(railway logs --since="24h" | grep -c "✅.*ページが作成されました")
ERROR_COUNT=$(railway logs --since="24h" | grep -c "❌.*エラーが発生")
TOTAL_COUNT=$((SUCCESS_COUNT + ERROR_COUNT))

if [ $TOTAL_COUNT -gt 0 ]; then
  SUCCESS_RATE=$(echo "scale=2; $SUCCESS_COUNT * 100 / $TOTAL_COUNT" | bc)
  echo "📊 成功率: $SUCCESS_RATE% ($SUCCESS_COUNT/$TOTAL_COUNT)"
else
  echo "📊 成功率: データなし"
fi

echo ""
echo "🔍 エラー詳細:"
railway logs --since="24h" | grep "❌\|ERROR" | tail -5

echo ""
echo "⚡ パフォーマンス:"
railway logs --since="24h" | grep "Response time" | tail -3
```

### アラート設定

#### 自動監視
```javascript
// 簡易監視システム
class SystemMonitor {
  constructor() {
    this.errorCount = 0;
    this.totalRequests = 0;
    this.slowRequests = 0;
    this.startTime = Date.now();
  }
  
  recordRequest(success, responseTime) {
    this.totalRequests++;
    
    if (!success) {
      this.errorCount++;
    }
    
    if (responseTime > 5000) {
      this.slowRequests++;
    }
    
    // アラート条件チェック
    this.checkAlerts();
  }
  
  checkAlerts() {
    const errorRate = this.errorCount / this.totalRequests;
    const slowRate = this.slowRequests / this.totalRequests;
    
    if (errorRate > 0.1) { // 10%超
      console.error(`🚨 HIGH ERROR RATE: ${(errorRate * 100).toFixed(1)}%`);
    }
    
    if (slowRate > 0.2) { // 20%超
      console.warn(`⚠️ HIGH LATENCY: ${(slowRate * 100).toFixed(1)}% slow requests`);
    }
  }
  
  getStats() {
    const uptime = Math.round((Date.now() - this.startTime) / 1000);
    const errorRate = this.totalRequests > 0 ? this.errorCount / this.totalRequests : 0;
    
    return {
      uptime: uptime + ' seconds',
      totalRequests: this.totalRequests,
      errorCount: this.errorCount,
      errorRate: (errorRate * 100).toFixed(2) + '%',
      slowRequests: this.slowRequests
    };
  }
}

// 使用例
const monitor = new SystemMonitor();

// リクエスト処理時に呼び出し
monitor.recordRequest(success, responseTime);
```

## 🆘 エスカレーション手順

### レベル1: 自動復旧
- フォールバック機能の発動
- エラーログの自動記録
- 基本機能の継続提供

### レベル2: 手動対応
- Railway ログの詳細確認
- 環境変数・設定の確認
- 一時的な設定変更

### レベル3: 緊急対応
- 前バージョンへの即座復帰
- 外部サービス（Gemini/Notion）の状態確認
- システム管理者への連絡

### 連絡先・リソース
- **GitHub Issues**: [line-pm/issues](https://github.com/t-hamamura/line-pm/issues)
- **Railway サポート**: [Railway Help](https://help.railway.app/)
- **LINE Developers**: [LINE Developers](https://developers.line.biz/)
- **Notion Developers**: [Notion API](https://developers.notion.com/)

---

*このガイドは運用経験と発生した問題を基に継続的に更新されています。新しい問題や解決方法があれば、ドキュメントに追加してください。*