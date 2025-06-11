const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
require('dotenv').config();

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);

// LINEのWebhookイベント受信用
app.post('/webhook', middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error handling event:', err);
      res.status(500).end();
    });
});

// イベント処理
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }
  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `あなたのメッセージ: ${event.message.text}`
  });
}

// サーバー起動（環境変数 PORT を使用）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('===================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log('✅ Ready to receive LINE webhook requests!');
  console.log('===================================');
});
