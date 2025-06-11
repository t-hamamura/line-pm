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

  wbsText.split('\n').forEach(line => {
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
      console.log('[NOTION] Saving analysis result to Notion:', JSON.stringify(analysisResult, null, 2));
      
      const { properties, pageContent } = analysisResult;

      // 基本的なプロパティを設定（Notionの実際の構造に基づく）
      const notionProperties = {
        'Name': { 
          title: [{ text: { content: properties.Name || 'Untitled' } }] 
        }
      };

      // 記入日を現在の日付に設定
      const today = new Date().toISOString().split('T')[0];
      notionProperties['記入日'] = { 
        date: { start: today } 
      };

      // 各プロパティを安全に設定
      const propertyMapping = {
        'ステータス': properties.ステータス || '未着手',
        '種別': properties.種別 || 'メモ',
        '優先度': properties.優先度 || '普通',
        'フェーズ': properties.フェーズ || 'アイデア',
        '成果物': properties.成果物 || 'その他',
        'レベル': properties.レベル || 'タスク'
      };

      // 各プロパティを設定（select typeと仮定）
      for (const [notionKey, value] of Object.entries(propertyMapping)) {
        if (value) {
          try {
            notionProperties[notionKey] = { select: { name: value } };
          } catch (error) {
            console.log(`[NOTION] Warning: Could not set ${notionKey} to ${value}`);
          }
        }
      }

      // 担当者（multi_select typeと仮定）
      if (properties.担当者) {
        try {
          notionProperties['担当者'] = { 
            multi_select: [{ name: properties.担当者 }] 
          };
        } catch (error) {
          console.log(`[NOTION] Warning: Could not set 担当者 to ${properties.担当者}`);
        }
      }

      // 期限（日付がある場合）
      if (properties.期限 && typeof properties.期限 === 'string' && properties.期限.match(/^\d{4}-\d{2}-\d{2}$/)) {
        notionProperties['期限'] = { date: { start: properties.期限 } };
      }

      console.log('[NOTION] Properties to send:', JSON.stringify(notionProperties, null, 2));
      
      const response = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: notionProperties,
        children: wbsToBlocks(pageContent)
      });
      
      console.log('[NOTION] Page created successfully:', response.id);
      console.log('[NOTION] Page URL:', response.url);
      return response;
      
    } catch (error) {
      console.error('[NOTION] API Error in createPageFromAnalysis:', error);
      
      // Notion APIエラーの詳細を解析
      if (error.body) {
        console.error('[NOTION] Error body:', JSON.stringify(error.body, null, 2));
        
        // プロパティ関連のエラーの場合、より詳細な情報を提供
        if (error.body.message && error.body.message.includes('expected to be')) {
          console.error('[NOTION] Property validation error detected');
          
          // データベース構造を取得してデバッグ情報を出力
          try {
            const database = await this.client.databases.retrieve({
              database_id: this.databaseId
            });
            
            console.log('[NOTION] Available database properties:');
            Object.entries(database.properties).forEach(([key, prop]) => {
              console.log(`  - ${key}: ${prop.type}`);
              if (prop.type === 'select' && prop.select?.options) {
                console.log(`    Select options: ${prop.select.options.map(opt => opt.name).join(', ')}`);
              }
              if (prop.type === 'multi_select' && prop.multi_select?.options) {
                console.log(`    Multi-select options: ${prop.multi_select.options.map(opt => opt.name).join(', ')}`);
              }
            });
          } catch (dbError) {
            console.error('[NOTION] Could not retrieve database structure:', dbError.message);
          }
          
          // フォールバック：最小限のプロパティでページを作成
          return await this.createMinimalPage(analysisResult);
        }
      }
      
      throw new Error('Notionへのページ作成に失敗しました: ' + (error.body?.message || error.message));
    }
  }

  // フォールバック用の最小限ページ作成
  async createMinimalPage(analysisResult) {
    try {
      console.log('[NOTION] Creating minimal page as fallback...');
      
      const { properties, pageContent } = analysisResult;
      
      const minimalProperties = {
        'Name': { 
          title: [{ text: { content: properties.Name || 'Untitled' } }] 
        }
      };

      // 記入日のみ設定
      const today = new Date().toISOString().split('T')[0];
      minimalProperties['記入日'] = { 
        date: { start: today } 
      };

      const response = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: minimalProperties,
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: {
              rich_text: [{ type: 'text', text: { content: '解析結果' } }]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ 
                type: 'text', 
                text: { content: `ステータス: ${properties.ステータス || '未設定'}` } 
              }]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ 
                type: 'text', 
                text: { content: `種別: ${properties.種別 || '未設定'}` } 
              }]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ 
                type: 'text', 
                text: { content: `優先度: ${properties.優先度 || '未設定'}` } 
              }]
            }
          },
          ...wbsToBlocks(pageContent)
        ]
      });
      
      console.log('[NOTION] Minimal page created successfully:', response.id);
      return response;
      
    } catch (fallbackError) {
      console.error('[NOTION] Fallback page creation also failed:', fallbackError);
      throw new Error('Notionページの作成に完全に失敗しました: ' + fallbackError.message);
    }
  }

  async testConnection() {
    try {
      console.log('[NOTION] Testing connection...');
      console.log('[NOTION] Using database ID:', this.databaseId);
      
      const response = await this.client.databases.retrieve({
        database_id: this.databaseId
      });
      
      console.log('[NOTION] Connection successful!');
      console.log('[NOTION] Database info:', {
        id: response.id,
        title: response.title[0]?.plain_text || 'Untitled',
        created_time: response.created_time,
        last_edited_time: response.last_edited_time
      });
      
      console.log('[NOTION] Database properties:');
      Object.entries(response.properties).forEach(([key, prop]) => {
        console.log(`  - ${key}: ${prop.type}`);
        if (prop.type === 'select' && prop.select?.options) {
          console.log(`    Options: ${prop.select.options.map(opt => opt.name).join(', ')}`);
        }
        if (prop.type === 'multi_select' && prop.multi_select?.options) {
          console.log(`    Options: ${prop.multi_select.options.map(opt => opt.name).join(', ')}`);
        }
      });
      
      return true;
    } catch (error) {
      console.error('[NOTION] Connection error:', {
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