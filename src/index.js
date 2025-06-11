require('dotenv').config();
const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');

const app = express();

/* ---------- LINE Bot 設定 ---------- */
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret:      process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);

/* ---------- 必須: 生のリクエストを LINE ミドルウェアへ ---------- */
app.post(
  '/webhook',
  middleware(config),                // ←必ず最初
  express.json(),                    // ←署名検証後なら JSON で OK
  (req, res) => {
    Promise
      .all(req.body.events.map(handleEvent))
      .then((result) => res.json(result))
      .catch((err)   => {
        console.error(err);
        res.status(500).end();
      });
  }
);

/* ---------- 任意: echo 用ハンドラ ---------- */
function handleEvent (e) {
  if (e.type !== 'message' || e.message.type !== 'text') {
    return Promise.resolve(null);
  }
  return client.replyMessage(e.replyToken, {
    type : 'text',
    text : `echo: ${e.message.text}`
  });
}

/* ---------- Railway のヘルスチェック ---------- */
app.get('/', (_, res) => res.status(200).send('OK'));   // ← 200 を返せば Stop されない

/* ---------- サーバー起動 ---------- */
const PORT = process.env.PORT || 3000;                  // ← Railway は PORT を渡してくる
app.listen(PORT, () => {
  console.log('===============================');
  console.log(`✅  Server running on ${PORT}`);
  console.log('✅  Ready for LINE webhooks!');
  console.log('===============================');
});

// --- keep-alive ---------------------------------
// 5分おきに自分自身を GET して Railway に「生きている」ことを通知
if (process.env.KEEP_ALIVE_URL) {
  setInterval(() => {
    fetch(process.env.KEEP_ALIVE_URL).catch(() => {});
  }, 1000 * 60 * 5);
}
