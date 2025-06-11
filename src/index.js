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

  const userText = event.message.text.trim(); // trimを追加
  const userId = event.source.userId;
  const eventId = event.webhookEventId || `${userId}-${event.timestamp}`;
  const messageHash = `${userId}-${userText}-${Math.floor(Date.now() / 300000)}`; // 5分単位に変更
  const emergencyKey = `${userId}-${userText}`; // 緊急重複防止用

  // 緊急重複防止（この部分を追加）
  if (processedEvents.has(emergencyKey)) {
    console.log('[EMERGENCY] Duplicate message detected, skipping');
    return Promise.resolve(null);
  }
  
  console.log(`[EVENT] Received text message: "${userText}"`);
  console.log(`[EVENT] Event ID: ${eventId}`);
  console.log(`[EVENT] Message hash: ${messageHash}`);

  // 重複チェック
  if (processedEvents.has(eventId)) {
    console.log(`[DUPLICATE] Event ${eventId} already processed, skipping`);
    return Promise.resolve(null);
  }

  if (processedEvents.has(messageHash)) {
    console.log(`[DUPLICATE] Similar message processed recently, skipping`);
    // 重複の場合は簡単な通知のみ
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

  // 処理開始前に重複防止マークを設定（重要！）
  const processingTimestamp = Date.now();
  processedEvents.set(eventId, processingTimestamp);
  processedEvents.set(messageHash, processingTimestamp);
  processedEvents.set(emergencyKey, processingTimestamp); // 緊急キーも追加

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
    // 処理開始の通知
    console.log('[PROCESSING] Starting analysis and page creation...');
    
    // Geminiでテキストを解析
    console.log('[GEMINI] Analyzing text...');
    const analysisResult = await projectAnalyzer.analyzeText(userText);
    
    // Notionにページを作成
    console.log('[NOTION] Creating page...');
    const notionPage = await notionService.createPageFromAnalysis(analysisResult);

    // 詳細な成功通知を作成
    console.log(`[LINE] Creating success message with actual Notion values`);

    // Notionに実際に登録された値を取得
    const actualProps = await notionService.getPageProperties(notionPage.id);

    // 詳細な応答メッセージを作成
    function createDetailedReplyMessage(analysisResult, notionPage, actualProps) {
      const props = analysisResult.properties;
      
      let replyText = `✅ プロジェクトを登録しました！\n\n`;
      replyText += `📝 タイトル: ${props.Name}\n`;
      replyText += `📋 ステータス: 📥 未分類\n`;
      
      // 詳細情報（値がある場合のみ表示）
      if (actualProps.優先度 && actualProps.優先度 !== '(空欄)') {
        replyText += `⭐ 優先度: ${actualProps.優先度}\n`;
      } else {
        replyText += `⭐ 優先度: (空欄)\n`;
      }
      
      if (actualProps.種別 && actualProps.種別 !== '(空欄)') {
        replyText += `🏷️ 種別: ${actualProps.種別}\n`;
      } else {
        replyText += `🏷️ 種別: (空欄)\n`;
      }
      
      if (actualProps.レベル && actualProps.レベル !== '(空欄)') {
        replyText += `🎚️ レベル: ${actualProps.レベル}\n`;
      } else {
        replyText += `🎚️ レベル: (空欄)\n`;
      }
      
      if (actualProps.成果物 && actualProps.成果物 !== '(空欄)') {
        replyText += `📦 成果物: ${actualProps.成果物}\n`;
      } else {
        replyText += `📦 成果物: (空欄)\n`;
      }
      
      replyText += `👤 担当者: (空欄)\n`;
      
      if (actualProps.期限 && actualProps.期限 !== '(空欄)') {
        replyText += `🗓️ 期限: ${actualProps.期限}\n`;
      } else {
        replyText += `🗓️ 期限: (空欄)\n`;
      }
      
      if (actualProps.案件 && actualProps.案件 !== '(空欄)') {
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

    const replyText = createDetailedReplyMessage(analysisResult, notionPage, actualProps);

    const replyMessage = {
      type: 'text',
      text: replyText
    };

    await lineClient.replyMessage(event.replyToken, replyMessage);

    console.log('[SUCCESS] Event processed successfully with detailed notification');

  } catch (error) {
    console.error('[ERROR] Failed to handle event:', error);
    
    // エラーの場合は処理済みマークを削除（再試行可能にする）
    processedEvents.delete(eventId);
    processedEvents.delete(messageHash);
    processedEvents.delete(emergencyKey); // 緊急キーも削除
    
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
    },
    cache: {
      processedEvents: processedEvents.size
    }
  });
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

        // イベント処理
        console.log(`[WEBHOOK] Processing ${requestBody.events.length} events...`);
        for (const event of requestBody.events) {
          await handleEvent(event);
        }

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
  console.log('  ✨ Deduplication feature enabled');
  console.log('==================================================');
});
