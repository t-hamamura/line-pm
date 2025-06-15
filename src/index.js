'use strict';

// --- URL抽出関数の追加 ---
function extractURLs(text) {
  if (!text || typeof text !== 'string') return [];
  
  // URLの正規表現パターン
  const urlPattern = /(https?:\/\/[^\s\u3000]+)/gi;
  const matches = text.match(urlPattern);
  
  if (!matches) return [];
  
  // 重複を除去し、有効なURLのみを返す
  const uniqueUrls = [...new Set(matches)];
  console.log(`[URL] Extracted ${uniqueUrls.length} URLs:`, uniqueUrls);
  
  return uniqueUrls;
}

require('dotenv').config();
const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');

// --- 1. 設定とクライアントの初期化 ---

// 環境変数をチェック
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// 環境変数の存在チェック
if (!lineConfig.channelAccessToken || !lineConfig.channelSecret) {
    console.error('❌ LINE Channel Access Token or Channel Secret is not set in environment variables.');
    console.error('Please check your Railway environment variables.');
    process.exit(1);
}

const PORT = process.env.PORT || 8080;
const app = express();

let lineClient;
let projectAnalyzer;
let notionService;

// 重複防止用のメモリキャッシュ（簡易実装）
const processedEvents = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5分

// 定期的にキャッシュをクリーンアップ
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of processedEvents.entries()) {
    if (now - timestamp > CACHE_DURATION) {
      processedEvents.delete(key);
    }
  }
}, 60 * 1000); // 1分ごとにクリーンアップ

try {
    lineClient = new Client(lineConfig);
    console.log('✅ LINE client initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize LINE client:', error);
    process.exit(1);
}

// サービスの初期化（エラーハンドリング付き）
try {
    projectAnalyzer = require("./services/projectAnalyzer");
    console.log('✅ Project analyzer loaded successfully');
    console.log('🔑 GEMINI_API_KEY status:', process.env.GEMINI_API_KEY ? 'Set' : 'Missing');
} catch (error) {
    console.error('❌ Failed to load project analyzer:', error.message);
    console.error('📋 Details:', error.stack);
    projectAnalyzer = null;
}

try {
    notionService = require('./services/notion');
    console.log('✅ Notion service loaded successfully');
    console.log('🔑 NOTION_API_KEY status:', process.env.NOTION_API_KEY ? 'Set' : 'Missing');
    console.log('🔑 NOTION_DATABASE_ID status:', process.env.NOTION_DATABASE_ID ? 'Set' : 'Missing');
} catch (error) {
    console.error('❌ Failed to load notion service:', error.message);
    console.error('📋 Details:', error.stack);
    notionService = null;
}

// サービス状態の詳細ログ
console.log('📊 Service Status Summary:');
console.log(`  - Project Analyzer: ${projectAnalyzer ? '✅ Ready' : '❌ Failed'}`);
console.log(`  - Notion Service: ${notionService ? '✅ Ready' : '❌ Failed'}`);
console.log(`  - LINE Client: ${lineClient ? '✅ Ready' : '❌ Failed'}`);

// Gemini API キー or Google Cloud 認証のどちらかが必要
const requiredEnvVars = [
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_CHANNEL_SECRET',
  'NOTION_API_KEY',
  'NOTION_DATABASE_ID'
];

// Gemini API 認証チェック（新SDK対応）
const hasGeminiApiKey = !!process.env.GEMINI_API_KEY;
const hasGoogleCloudAuth = !!(
  process.env.GOOGLE_CLOUD_PROJECT && 
  process.env.GOOGLE_APPLICATION_CREDENTIALS
);

if (!hasGeminiApiKey && !hasGoogleCloudAuth) {
  console.error('❌ Gemini API authentication not configured');
  console.error('Either set GEMINI_API_KEY or configure Google Cloud authentication');
  process.exit(1);
}

console.log('🔍 Environment Variables Check:');
requiredEnvVars.forEach(varName => {
  const status = process.env[varName] ? '✅ Set' : '❌ Missing';
  const preview = process.env[varName] ? `${process.env[varName].substring(0, 8)}...` : 'Not set';
  console.log(`  - ${varName}: ${status} (${preview})`);
});

// --- 2. 高速化されたメイン処理フロー ---

async function handleEvent(event) {
  // テキストメッセージ以外、または空のメッセージは無視
  if (event.type !== 'message' || event.message.type !== 'text' || !event.message.text.trim()) {
    console.log('[INFO] Non-text message or empty message, ignoring');
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim();
  const lines = userText.split('\n');
  const title = lines[0].trim(); // 1行目をタイトルとして使用
  const details = lines.slice(1).join('\n').trim(); // 2行目以降を詳細として使用
  
  const userId = event.source.userId;
  const eventId = event.webhookEventId || `${userId}-${event.timestamp}`;
  const messageHash = `${userId}-${userText}-${Math.floor(Date.now() / 300000)}`;
  const emergencyKey = `${userId}-${userText}`;

  // 緊急重複防止
  if (processedEvents.has(emergencyKey)) {
    console.log('[EMERGENCY] Duplicate message detected, skipping');
    return Promise.resolve(null);
  }
  
  console.log(`[EVENT] Received text message: "${userText}"`);

  // 重複チェック
  if (processedEvents.has(eventId) || processedEvents.has(messageHash)) {
    console.log(`[DUPLICATE] Message already processed, skipping`);
    try {
      await lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '📝 同じような内容のメッセージを最近処理したため、重複を防ぐためスキップしました。'
      });
    } catch (replyError) {
      console.error('[ERROR] Failed to send duplicate notification:', replyError);
    }
    return Promise.resolve(null);
  }

  // 処理開始前に重複防止マークを設定
  const processingTimestamp = Date.now();
  processedEvents.set(eventId, processingTimestamp);
  processedEvents.set(messageHash, processingTimestamp);
  processedEvents.set(emergencyKey, processingTimestamp);

  // サービスが利用できない場合の処理
  if (!projectAnalyzer || !notionService) {
    console.error('[ERROR] Required services not available');
    console.error(`[ERROR] Project Analyzer: ${projectAnalyzer ? 'Available' : 'NOT AVAILABLE'}`);
    console.error(`[ERROR] Notion Service: ${notionService ? 'Available' : 'NOT AVAILABLE'}`);
    
    // 詳細なエラーメッセージを生成
    let errorDetails = [];
    if (!projectAnalyzer) {
      errorDetails.push('AI分析サービス (Gemini API)');
    }
    if (!notionService) {
      errorDetails.push('Notionサービス');
    }
    
    const detailedErrorMessage = `⚠️ システムの一部が利用できません。\n\n❌ 利用できないサービス:\n${errorDetails.map(service => `  • ${service}`).join('\n')}\n\n🔧 システム管理者に連絡してください。\n⏰ 時間をおいて再度お試しください。`;
    
    try {
      await lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: detailedErrorMessage
      });
    } catch (replyError) {
      console.error('[ERROR] Failed to send service unavailable reply:', replyError);
    }
    return;
  }

  try {
    // 🚀 【改善点1】即座に「処理中」メッセージを返信
    console.log('[QUICK] Sending immediate response...');
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '🤖 分析中です...\n少々お待ちください（約5-10秒）'
    });

    // 🚀 【改善点2】バックグラウンドで非同期処理を開始
    processInBackground(userId, title, details);

  } catch (error) {
    console.error('[ERROR] Failed to send immediate response:', error);
    
    // エラーの場合は処理済みマークを削除
    processedEvents.delete(eventId);
    processedEvents.delete(messageHash);
    processedEvents.delete(emergencyKey);
  }
}

async function processInBackground(userId, title, details) {
  try {
    console.log('[BACKGROUND] Starting analysis and page creation...');
    console.log(`[BACKGROUND] Title: "${title}"`);
    console.log(`[BACKGROUND] Details: "${details || '(なし)'}"`);
    const startTime = Date.now();
    
    // URLを抽出
    const combinedText = `${title} ${details || ''}`;
    const extractedUrls = extractURLs(combinedText);
    console.log(`[URL] Found ${extractedUrls.length} URLs in message`);
    
    // Geminiでテキストを解析（タイトル、詳細、URLを分けて渡す）
    console.log('[GEMINI] Analyzing text...');
    const analysisResult = await projectAnalyzer.analyzeText(title, details, extractedUrls);
    
    // Notionにページを作成
    console.log('[NOTION] Creating page...');
    const notionPage = await notionService.createPageFromAnalysis(analysisResult);

    // Notionに実際に登録された値を取得
    const actualProps = await notionService.getPageProperties(notionPage.id);

    const endTime = Date.now();
    const processingTime = endTime - startTime;
    console.log(`[PERFORMANCE] Total processing time: ${processingTime}ms`);

    // 🚀 【改善点3】完了後に詳細結果をプッシュメッセージで送信
    const detailedMessage = createDetailedReplyMessage(analysisResult, notionPage, actualProps);
    
    await lineClient.pushMessage(userId, {
      type: 'text',
      text: detailedMessage
    });

    console.log('[SUCCESS] Background processing completed');

  } catch (error) {
    console.error('[BACKGROUND ERROR] Failed to process in background:', error);
    
    // Gemini 2.5 Flash特有のエラー処理
    let errorMessage = '❌ 分析中にエラーが発生しました。';
    
    if (error.message.includes('rate limit') || error.message.includes('quota')) {
      errorMessage = `🤖 Gemini 2.5 Flash AIの利用上限に達しました。
      
📊 **制限情報**
• 1分間: 10回まで
• 1日: 500回まで

⏰ **対処法**
• 1-2分お待ちください
• しばらく時間をおいてから再度お試しください

✨ 高品質なAI分析のため、制限を設けています。ご理解ください。`;
    } else if (error.message.includes('timeout')) {
      errorMessage = `⏰ Gemini 2.5 Flash AIの処理に時間がかかっています。

🔄 **対処法**
• より簡潔な内容でお試しください
• 再度お試しください

💡 複雑な内容ほど時間がかかる場合があります。`;
    } else if (error.message.includes('model not found')) {
      errorMessage = `🤖 Gemini 2.5 Flash AIモデルにアクセスできません。

🔧 **システム側の問題です**
• システム管理者が確認中です
• しばらく時間をおいてから再度お試しください`;
    } else {
      errorMessage += `\n\n🔄 **再試行のお願い**
• 再度お試しください
• 問題が続く場合はシステム管理者にご連絡ください

💡 Gemini 2.5 Flash AI使用中のため、高品質な分析を提供しています。`;
    }
    
    // エラー時はユーザーに詳細な通知
    try {
      await lineClient.pushMessage(userId, {
        type: 'text',
        text: errorMessage
      });
    } catch (pushError) {
      console.error('[ERROR] Failed to send error notification:', pushError);
    }
  }
}

// 詳細応答メッセージ作成関数
function createDetailedReplyMessage(analysisResult, notionPage, actualProps) {
  const props = analysisResult.properties;
  
  let replyText = `✅ プロジェクトを登録しました！\n\n`;
  
  // タイトル
  replyText += `📝 タイトル\n${props.Name}\n\n`;
  
  // 優先度
  if (actualProps.優先度 && actualProps.優先度 !== '(空欄)' && actualProps.優先度 !== null) {
    replyText += `⭐ 優先度: ${actualProps.優先度}\n`;
  } else {
    replyText += `⭐ 優先度: (空欄)\n`;
  }
  
  // 種別
  if (actualProps.種別 && actualProps.種別 !== '(空欄)' && actualProps.種別 !== null) {
    replyText += `🏷️ 種別: ${actualProps.種別}\n`;
  } else {
    replyText += `🏷️ 種別: (空欄)\n`;
  }
  
  // レベル
  if (actualProps.レベル && actualProps.レベル !== '(空欄)' && actualProps.レベル !== null) {
    replyText += `🎚️ レベル: ${actualProps.レベル}\n`;
  } else {
    replyText += `🎚️ レベル: (空欄)\n`;
  }
  
  // 成果物
  if (actualProps.成果物 && actualProps.成果物 !== '(空欄)' && actualProps.成果物 !== null) {
    replyText += `📦 成果物: ${actualProps.成果物}\n`;
  } else {
    replyText += `📦 成果物: (空欄)\n`;
  }
  
  // 担当者
  if (actualProps.担当者 && actualProps.担当者 !== '(空欄)' && actualProps.担当者 !== null) {
    replyText += `👤 担当者: ${actualProps.担当者}\n`;
  } else {
    replyText += `👤 担当者: (空欄)\n`;
  }
  
  // 期限
  if (actualProps.期限 && actualProps.期限 !== '(空欄)' && actualProps.期限 !== null) {
    replyText += `🗓️ 期限: ${actualProps.期限}\n`;
  } else {
    replyText += `🗓️ 期限: (空欄)\n`;
  }
  
  // 案件
  if (actualProps.案件 && actualProps.案件 !== '(空欄)' && actualProps.案件 !== null) {
    replyText += `💼 案件: ${actualProps.案件}\n`;
  } else {
    replyText += `💼 案件: (空欄)\n`;
  }
  
  replyText += `\n`;
  
  // WBS提案の表示
  if (analysisResult.pageContent && analysisResult.pageContent.trim()) {
    replyText += `📋 WBS案:\n`;
    
    const wbsSummary = extractWBSSummary(analysisResult.pageContent);
    if (wbsSummary.length > 0) {
      wbsSummary.forEach((item, index) => {
        if (index < 6) {
          replyText += `${index + 1}. ${item}\n`;
        }
      });
      if (wbsSummary.length > 6) {
        replyText += `... 他${wbsSummary.length - 6}項目\n`;
      }
    } else {
      replyText += `詳細な実行計画が作成されました\n`;
    }
    replyText += `\n`;
  }
  
  replyText += `🔗 詳細: ${notionPage.url}`;
  return replyText;
}

// WBS要約抽出関数
function extractWBSSummary(pageContent) {
  const items = [];
  
  const checklistMatches = pageContent.match(/- \[ \] (.+)/g);
  if (checklistMatches) {
    checklistMatches.forEach(match => {
      const item = match.replace('- [ ] ', '').trim();
      if (item.length > 0 && item.length < 50) {
        items.push(item);
      }
    });
  }
  
  if (items.length === 0) {
    const phaseMatches = pageContent.match(/#### (.+)/g);
    if (phaseMatches) {
      phaseMatches.forEach(match => {
        const phase = match.replace('#### ', '').trim();
        if (phase.length > 0 && phase.length < 50) {
          items.push(phase);
        }
      });
    }
  }
  
  return items;
}

// --- 3. Webhookエンドポイントの設定 ---

// ルートパスへのアクセスはヘルスチェック用
app.get("/", (req, res) => {
  console.log('[HEALTH] Health check requested');
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      projectAnalyzer: !!projectAnalyzer,
      notionService: !!notionService
    },
    cache: {
      processedEvents: processedEvents.size
    },
    version: "2.1.0-fast-response"
  });
});

// デバッグ用エンドポイント
app.get("/debug", (req, res) => {
  console.log('[DEBUG] Debug endpoint requested');
  
  const envStatus = {
    LINE_CHANNEL_ACCESS_TOKEN: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
    LINE_CHANNEL_SECRET: !!process.env.LINE_CHANNEL_SECRET,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    NOTION_API_KEY: !!process.env.NOTION_API_KEY,
    NOTION_DATABASE_ID: !!process.env.NOTION_DATABASE_ID
  };

  const serviceStatus = {
    projectAnalyzer: !!projectAnalyzer,
    notionService: !!notionService,
    lineClient: !!lineClient
  };

  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    environmentVariables: envStatus,
    services: serviceStatus,
    cache: {
      processedEvents: processedEvents.size
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    },
    gemini: {
      sdk: '@google/genai',
      version: '1.4.0',
      model: 'gemini-2.5-flash-preview-05-20',
      rateLimits: projectAnalyzer ? projectAnalyzer.getRateLimitStatus() : null,
      status: projectAnalyzer ? 'Available (New SDK)' : 'Not Available'
    },
    lastErrors: [] // 実装時にエラーログを追加可能
  };

  // 環境変数の値のプレビュー（セキュリティのため最初の8文字のみ）
  const envPreviews = {};
  Object.keys(envStatus).forEach(key => {
    if (process.env[key]) {
      envPreviews[key] = process.env[key].substring(0, 8) + '...';
    } else {
      envPreviews[key] = 'NOT_SET';
    }
  });
  debugInfo.environmentPreviews = envPreviews;

  res.status(200).json(debugInfo);
});

// 処理済みイベントのクリア用エンドポイント（デバッグ用）
app.post('/clear-cache', (req, res) => {
  const previousSize = processedEvents.size;
  processedEvents.clear();
  console.log(`[CACHE] Cleared ${previousSize} processed events`);
  res.json({ 
    message: 'Cache cleared', 
    previousSize, 
    currentSize: processedEvents.size 
  });
});

// LINEからのWebhookリクエストを処理するエンドポイント
app.post('/webhook', (req, res) => {
  console.log('[WEBHOOK] Received request');
  
  try {
    // LINE署名の検証
    const signature = req.headers['x-line-signature'];
    if (!signature) {
      console.error('[WEBHOOK] Missing LINE signature');
      return res.status(400).send('Missing LINE signature');
    }

    // リクエストボディの取得
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        console.log('[WEBHOOK] Request body received');
        
        // 空のボディ（検証リクエスト）の場合
        if (!body || body.trim() === '') {
          console.log('[WEBHOOK] Empty body - this is a verification request');
          return res.status(200).send('OK');
        }

        // JSONパース
        let requestBody;
        try {
          requestBody = JSON.parse(body);
        } catch (parseError) {
          console.error('[WEBHOOK] Failed to parse JSON:', parseError);
          return res.status(400).send('Invalid JSON');
        }

        // 検証リクエストかどうかチェック
        if (!requestBody.events || requestBody.events.length === 0) {
          console.log('[WEBHOOK] No events - this is a verification request');
          return res.status(200).send('OK');
        }

        // LINE署名検証（実際のWebhookイベントの場合のみ）
        const crypto = require('crypto');
        const channelSecret = process.env.LINE_CHANNEL_SECRET;
        const hash = crypto.createHmac('sha256', channelSecret).update(body).digest('base64');
        
        if (signature !== hash) {
          console.error('[WEBHOOK] Invalid signature');
          return res.status(401).send('Invalid signature');
        }

        // 🚀 【改善点4】イベント処理を高速化
        console.log(`[WEBHOOK] Processing ${requestBody.events.length} events (fast mode)...`);
        for (const event of requestBody.events) {
          // 非同期で処理（レスポンスを待たない）
          handleEvent(event).catch(error => {
            console.error('[WEBHOOK] Event processing error:', error);
          });
        }

        // 即座にOKレスポンスを返す
        console.log('[WEBHOOK] Events queued for processing');
        res.status(200).send('OK');

        
      } catch (error) {
        console.error('[WEBHOOK] Error processing request:', error);
        res.status(500).send('Internal Server Error');
      }
    });

  } catch (error) {
    console.error('[WEBHOOK] Unexpected error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// --- 4. エラーハンドリング ---

// 404 ハンドラー
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.url} not found`);
  res.status(404).json({ error: 'Not Found' });
});

// エラーハンドラー
app.use((error, req, res, next) => {
  console.error('[ERROR] Unhandled error:', error);
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- 5. サーバーを起動 ---

app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`         🚀 Server running on port ${PORT}`);
  console.log(`         Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('  ✨ Fast response mode enabled!');
  console.log('  🤖 Using NEW SDK: @google/genai v1.4.0'); 
  console.log('  🚀 Model: Gemini 2.5 Flash (最新高性能AIモデル)');
  console.log('  📊 Dynamic rate limits based on API tier');
  console.log('  ⚡ Immediate response + Background analysis');
  console.log('  🎯 High-quality AI analysis with rate limiting');
  console.log('==================================================');
});
