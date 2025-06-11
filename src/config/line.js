const line = require('@line/bot-sdk');
require('dotenv').config();

// LINE Bot設定
const config = {
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
};

// LINEクライアントの初期化
const client = new line.Client(config);

// Webhookミドルウェア
const middleware = line.middleware(config);

// メッセージハンドラー
const handleEvent = async (event) => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  try {
    // プロジェクト情報の解析と応答
    const response = await analyzeAndRespond(event.message.text);
    
    // LINEへの応答メッセージ送信
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: response
    });
  } catch (error) {
    console.error('Error handling message:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'エラーが発生しました。しばらく時間をおいて再度お試しください。'
    });
  }
};

// エラーハンドリング用のラッパー関数
const handleEventSafely = async (event) => {
  try {
    await handleEvent(event);
  } catch (err) {
    console.error('Error in event handler:', err);
  }
};

module.exports = {
  config,
  client,
  middleware,
  handleEvent: handleEventSafely
}; 