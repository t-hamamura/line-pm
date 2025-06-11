require('dotenv').config();

// 環境変数の設定
const config = {
  line: {
    channelId: '2007541238',
    channelSecret: '78020e2eabdae1d99198c2bae2d43391',
    channelAccessToken: '38AgW2PurYi4g1hBfmvc4QokE13+i5DpK53Fw69GCFu+0zmI3KlurEy6Ly679jFZB+61akXj65NGdRJQaRqh7rqNi2fyAlpCytbS8QwFIsVXNjFsK2HSTrURJCvRFkTSqrb/CsRwlDzNFO7T6jrhJQdB04t89/1O/w1cDnyilFU='
  },
  notion: {
    auth: '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',
    databaseId: '1d3d37483838800e800ade446ad82090'
  },
  server: {
    port: 3000
  }
};

module.exports = config; 