const { Client } = require('@notionhq/client');

/**
 * Markdown形式のWBS文字列をNotionのブロックオブジェクトに変換します。
 * @param {string} wbsText - Markdown形式のテキスト。
 * @returns {Array} Notion APIのブロックオブジェクトの配列。
 */
function wbsToBlocks(wbsText) {
  if (!wbsText || typeof wbsText !== 'string' || wbsText.trim() === '') {
    return [];
  }

  const blocks = [{
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: 'WBS案' } }]
    }
  }];

  wbsText.split('\\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      const content = trimmedLine.substring(2);
      if (content) {
        blocks.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content } }]
          }
        });
      }
    } else if (trimmedLine) {
       // WBSの箇条書きではないが、何らかのテキストがある場合は段落として追加
       blocks.push({
         object: 'block',
         type: 'paragraph',
         paragraph: {
            rich_text: [{ type: 'text', text: { content: trimmedLine } }]
         }
       });
    }
  });
  return blocks;
}

class NotionService {
  constructor() {
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
      throw new Error('Notion API Key or Database ID is not configured in .env file');
    }

    this.client = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    this.databaseId = process.env.NOTION_DATABASE_ID;
  }
  
  async createPageFromAnalysis(analysisResult) {
    try {
      console.log('Saving analysis result to Notion:', JSON.stringify(analysisResult, null, 2));
      const { properties, pageContent } = analysisResult;

      const notionProperties = {
        'Name': { title: [{ text: { content: properties.Name } }] },
        'ステータス': { select: { name: properties.ステータス } },
        '種別': { select: { name: properties.種別 } },
        '優先度': { select: { name: properties.優先度 } },
        'フェーズ': { select: { name: properties.フェーズ } },
        '担当者': { multi_select: [{ name: properties.担当者 }] },
        '成果物': { multi_select: [{ name: properties.成果物 }] },
        'レベル': { select: { name: properties.レベル } }
      };

      // 期限が有効な日付文字列の場合のみ追加
      if (properties.期限 && typeof properties.期限 === 'string' && properties.期限.match(/^\d{4}-\d{2}-\d{2}$/)) {
        notionProperties['期限'] = { date: { start: properties.期限 } };
      }
      
      const response = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: notionProperties,
        children: wbsToBlocks(pageContent)
      });
      
      console.log('Page created successfully in Notion:', response.id);
      return response;
    } catch (error) {
      console.error('Notion API Error in createPageFromAnalysis:', error);
      throw new Error('Notionへのページ作成に失敗しました: ' + error.body?.message);
    }
  }

  async testConnection() {
    try {
      console.log('Testing Notion connection...');
      console.log('Using database ID:', this.databaseId);
      
      const response = await this.client.databases.retrieve({
        database_id: this.databaseId
      });
      
      console.log('Notion connection successful!');
      console.log('Database info:', {
        id: response.id,
        title: response.title[0]?.plain_text || 'Untitled',
        created_time: response.created_time,
        last_edited_time: response.last_edited_time
      });
      return true;
    } catch (error) {
      console.error('Notion connection error:', {
        code: error.code,
        message: error.message,
        status: error.status
      });
      
      if (error.code === 'unauthorized') {
        throw new Error('APIキーが無効です。インテグレーションシークレットを確認してください。');
      } else if (error.code === 'object_not_found') {
        throw new Error('データベースが見つかりません。データベースIDとアクセス権限を確認してください。');
      }
      throw new Error(`Notionとの接続に失敗しました: ${error.message}`);
    }
  }
}

module.exports = new NotionService(); 