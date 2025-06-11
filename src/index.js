'use strict';

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

const PORT = process.env.PORT || 8080; // Railwayは通常8080を使用
const app = express();

let lineClient;
let projectAnalyzer;
let notionService;

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
    console.log('✅ Project analyzer loaded');
} catch (error) {
    console.error('❌ Failed to load project analyzer:', error.message);
    projectAnalyzer = null;
}

try {
    notionService = require('./services/notion');
    console.log('✅ Notion service loaded');
} catch (error) {
    console.error('❌ Failed to load notion service:', error.message);
    notionService = null;
}

// --- 2. メインの処理フローを定義 ---

async function handleEvent(event) {
  // テキストメッセージ以外、または空のメッセージは無視
  if (event.type !== 'message' || event.message.type !== 'text' || !event.message.text.trim()) {
    console.log('[INFO] Non-text message or empty message, ignoring');
    return Promise.resolve(null);
  }

  const userText = event.message.text;
  console.log(`[EVENT] Received text message: "${userText}"`);

  // サービスが利用できない場合の処理
  if (!projectAnalyzer || !notionService) {
    console.error('[ERROR] Required services not available');
    const errorMessage = {
      type: 'text',
      text: '⚠️ システムの一部が利用できません。しばらく時間をおいてから再度お試しください。'
    };
    try {
      await lineClient.replyMessage(event.replyToken, errorMessage);
    } catch (replyError) {
      console.error('[ERROR] Failed to send service unavailable reply:', replyError);
    }
    return;
  }

  try {
    // Geminiでテキストを解析
    console.log('[GEMINI] Analyzing text...');
    const analysisResult = await projectAnalyzer.analyzeText(userText);
    
    // Notionにページを作成
    console.log('[NOTION] Creating page...');
    const notionPage = await notionService.createPageFromAnalysis(analysisResult);

    // 成功をLINEに通知
    console.log(`[LINE] Replying with success message. Notion URL: ${notionPage.url}`);
    const replyMessage = {
      type: 'text',
      text: `✅ Notionにページを作成しました！\n\n📄 ページ: ${notionPage.url}`
    };
    await lineClient.replyMessage(event.replyToken, replyMessage);

  } catch (error) {
    console.error('[ERROR] Failed to handle event:', error);
    // エラーが発生したことをLINEに通知
    const errorMessage = {
      type: 'text',
      text: `❌ エラーが発生しました。\n大変お手数ですが、再度お試しください。\n\n詳細: ${error.message}`
    };
    // エラー時はいつでもリプライできるとは限らないので、try-catchで囲む
    try {
      await lineClient.replyMessage(event.replyToken, errorMessage);
    } catch (replyError) {
      console.error('[ERROR] Failed to send error reply to LINE:', replyError);
    }
  }
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
    }
  });
});

// LINEからのWebhookリクエストを処理するエンドポイント
app.post('/webhook', (req, res) => {
  console.log('[WEBHOOK] Received request');
  console.log('[WEBHOOK] Headers:', JSON.stringify(req.headers, null, 2));
  
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
        console.log('[WEBHOOK] Request body:', body);
        
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

        console.log('[WEBHOOK] Parsed body:', JSON.stringify(requestBody, null, 2));

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

        // イベント処理
        console.log('[WEBHOOK] Processing events...');
        await Promise.all(requestBody.events.map(handleEvent));
        
        console.log('[WEBHOOK] Events processed successfully');
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
  console.log('  Ready to receive LINE webhook requests!');
  console.log('==================================================');
});