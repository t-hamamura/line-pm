const express = require('express');
const line = require('@line/bot-sdk');
require('dotenv').config();

// LINE Bot設定
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
};

// LINEクライアントの初期化
const client = new line.Client(config);

// Expressアプリケーションの初期化
const app = express();

// ミドルウェアの設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Webhookエンドポイント
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    await Promise.all(events.map(handleEvent));
    res.status(200).end();
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).end();
  }
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// メッセージハンドラー
const handleEvent = async (event) => {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  try {
    // 簡単なエコーレスポンス
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `受信したメッセージ: ${event.message.text}`
    });
  } catch (error) {
    console.error('Error handling message:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'エラーが発生しました。しばらく時間をおいて再度お試しください。'
    });
  }
};

// サーバーの起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 