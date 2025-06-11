'use strict';

require('dotenv').config();
const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const projectAnalyzer = require("./services/projectAnalyzer");
const notionService = require('./services/notion');

// --- 1. 設定とクライアントの初期化 ---

// 環境変数をチェック
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};
if (!lineConfig.channelAccessToken || !lineConfig.channelSecret) {
    console.error('LINE Channel Access Token or Channel Secret is not set in .env file.');
    process.exit(1);
}

const PORT = process.env.PORT || 3000;
const app = express();
const lineClient = new Client(lineConfig);

// --- 2. メインの処理フローを定義 ---

async function handleEvent(event) {
  // テキストメッセージ以外、または空のメッセージは無視
  if (event.type !== 'message' || event.message.type !== 'text' || !event.message.text.trim()) {
    return Promise.resolve(null);
  }

  const userText = event.message.text;
  console.log(`[EVENT] Received text message: "${userText}"`);

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
      text: `Notionにページを作成しました！\n\n${notionPage.url}`
    };
    await lineClient.replyMessage(event.replyToken, replyMessage);

  } catch (error) {
    console.error('[ERROR] Failed to handle event:', error);
    // エラーが発生したことをLINEに通知
    const errorMessage = {
      type: 'text',
      text: `エラーが発生しました。\n大変お手数ですが、再度お試しください。\n\n詳細: ${error.message}`
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
app.get("/", (req, res) => res.status(200).send("OK"));

// LINEからのWebhookリクエストを処理するエンドポイント
app.post('/webhook', middleware(lineConfig), (req, res) => {
  // 署名検証が成功すれば、リクエストボディからイベントを取り出して処理
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('[FATAL] Unhandled error in webhook processing:', err);
      res.status(500).end();
    });
});

// --- 4. サーバーを起動 ---

app.listen(PORT, () => {
  console.log('==================================================');
  console.log(`         Server running on port ${PORT}`);
  console.log('  Ready to receive LINE webhook requests!');
  console.log('==================================================');
});
