// =========================================
// LINE Bot 最小構成 – Railway 用
// =========================================
require("dotenv").config();
const express = require("express");
const { middleware, Client } = require("@line/bot-sdk");

const app = express();

// ── LINE Bot 設定 ───────────────────────
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret:      process.env.LINE_CHANNEL_SECRET
};
const client = new Client(config);

// ── Webhook ルート（必ず /webhook）──────
app.post("/webhook", middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err)   => {
      console.error("Error:", err);
      res.status(500).end();
    });
});

// ── イベント処理（テキストをそのまま返すだけ）──
function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `echo: ${event.message.text}`
  });
}

// ── ポートは **必ず環境変数 PORT** を使う ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("===================================");
  console.log(`✅  Server running on port ${PORT}`);
  console.log("✅  Ready to receive LINE webhooks!");
  console.log("===================================");
});
