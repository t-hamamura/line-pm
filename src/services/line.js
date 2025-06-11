const line = require('@line/bot-sdk');
const config = require('../config');
const openai = require('./openai');
const notion = require('./notion');

class LineService {
  constructor() {
    this.client = new line.Client({
      channelAccessToken: config.line.channelAccessToken
    });
  }

  async handleEvent(event) {
    try {
      if (event.type !== 'message' || event.message.type !== 'text') {
        console.log('Unsupported event type:', event.type);
        return null;
      }

      const messageText = event.message.text;
      console.log('Received message:', messageText);

      // プロジェクト情報を解析
      const projectData = await openai.analyzeProject(messageText);
      console.log('Project data:', projectData);

      // プロジェクト情報をNotionに保存
      await notion.saveProjectData(projectData);

      // WBSを生成
      const wbsData = await openai.generateWBS(projectData);
      console.log('WBS data:', wbsData);

      // WBSをNotionに保存
      await notion.saveWBSData(wbsData);

      // ユーザーに応答
      const replyMessage = {
        type: 'text',
        text: `✅ プロジェクト情報を解析しました：\n\n📌 プロジェクト名：${projectData.プロジェクト名}\n📊 ステータス：${projectData.ステータス}\n🏷 種別：${projectData.種別}\n⭐ 優先度：${projectData.優先度}\n📅 期限：${projectData.期限}\n🔄 フェーズ：${projectData.フェーズ}\n👤 担当者：${projectData.担当者}\n📝 成果物：${projectData.成果物}\n🎯 レベル：${projectData.レベル}\n\nWBSを生成し、Notionに保存しました。`
      };

      await this.client.replyMessage(event.replyToken, replyMessage);
      return;
    } catch (error) {
      console.error('Error in handleEvent:', error);
      const errorMessage = {
        type: 'text',
        text: `エラーが発生しました：${error.message}`
      };
      await this.client.replyMessage(event.replyToken, errorMessage);
    }
  }
}

module.exports = new LineService(); 