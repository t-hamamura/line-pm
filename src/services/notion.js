const { Client } = require('@notionhq/client');

/**
 * Markdown形式のテキストをNotionのブロックオブジェクトに変換します。
 * @param {string} markdownText - Markdown形式のテキスト。
 * @returns {Array} Notion APIのブロックオブジェクトの配列。
 */
function markdownToBlocks(markdownText) {
  if (!markdownText || typeof markdownText !== 'string' || markdownText.trim() === '') {
    console.log('📝 Empty or invalid markdown content, creating default block');
    return [{
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: '内容が自動生成されませんでした。詳細は手動で追加してください。' } }]
      }
    }];
  }

  console.log('📝 Converting markdown to Notion blocks...');
  console.log('Input markdown length:', markdownText.length);
  
  const blocks = [];
  const lines = markdownText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      continue;
    }
    
    // ## 見出し2
    if (trimmedLine.startsWith('## ')) {
      const text = trimmedLine.substring(3).trim();
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: text } }]
        }
      });
    }
    // ### 見出し3
    else if (trimmedLine.startsWith('### ')) {
      const text = trimmedLine.substring(4).trim();
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: text } }]
        }
      });
    }
    // #### 見出し4（小見出し）
    else if (trimmedLine.startsWith('#### ')) {
      const text = trimmedLine.substring(5).trim();
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ 
            type: 'text', 
            text: { content: text },
            annotations: { bold: true }
          }]
        }
      });
    }
    // - [ ] チェックリスト
    else if (trimmedLine.startsWith('- [ ] ')) {
      const text = trimmedLine.substring(6).trim();
      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [{ type: 'text', text: { content: text } }],
          checked: false
        }
      });
    }
    // 1. 番号付きリスト
    else if (trimmedLine.match(/^\d+\. /)) {
      const text = trimmedLine.replace(/^\d+\. /, '').trim();
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: {
          rich_text: [{ type: 'text', text: { content: text } }]
        }
      });
    }
    // - 箇条書きリスト
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      const text = trimmedLine.substring(2).trim();
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: text } }]
        }
      });
    }
    // 通常の段落
    else {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: trimmedLine } }]
        }
      });
    }
  }
  
  console.log(`📝 Converted to ${blocks.length} Notion blocks`);
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
    this.databaseSchema = null;
  }
  
  async getDatabaseSchema() {
    if (!this.databaseSchema) {
      console.log('[NOTION] Fetching database schema...');
      const database = await this.client.databases.retrieve({
        database_id: this.databaseId
      });
      this.databaseSchema = database.properties;
      
      console.log('[NOTION] Database schema retrieved:');
      Object.entries(this.databaseSchema).forEach(([key, prop]) => {
        console.log(`  - ${key}: ${prop.type}`);
        if (prop.type === 'select' && prop.select?.options) {
          console.log(`    Select options: ${prop.select.options.map(opt => opt.name).join(', ')}`);
        }
        if (prop.type === 'multi_select' && prop.multi_select?.options) {
          console.log(`    Multi-select options: ${prop.multi_select.options.map(opt => opt.name).join(', ')}`);
        }
        if (prop.type === 'status' && prop.status?.options) {
          console.log(`    Status options: ${prop.status.options.map(opt => opt.name).join(', ')}`);
        }
      });
    }
    return this.databaseSchema;
  }

  async createPageFromAnalysis(analysisResult) {
    try {
      console.log('[NOTION] Starting page creation process...');
      const { properties, pageContent } = analysisResult;
      
      // データベースのスキーマを取得
      const schema = await this.getDatabaseSchema();
      
      // 基本プロパティ（Nameは必須）
      const notionProperties = {};
      
      // タイトルプロパティを探して設定
      const titleProperty = Object.keys(schema).find(key => schema[key].type === 'title');
      if (titleProperty) {
        notionProperties[titleProperty] = {
          title: [{ text: { content: properties.Name || 'Untitled' } }]
        };
        console.log(`[NOTION] Set title property: ${titleProperty}`);
      }

      // 現在の日付を設定
      const today = new Date().toISOString().split('T')[0];
      
      // 各プロパティを動的にマッピング（新しいテーブル構造に対応）
      const valueMap = {
        '記入日': today,
        'ステータス': properties.ステータス || '📥 未分類'  // ステータスは常に設定
      };

      // nullでない場合のみvalueMapに追加（ステータス以外）
      if (properties.種別) valueMap['種別'] = properties.種別;
      if (properties.優先度) valueMap['優先度'] = properties.優先度;
      if (properties.成果物) valueMap['成果物'] = properties.成果物;
      if (properties.レベル) valueMap['レベル'] = properties.レベル;
      if (properties.案件) valueMap['案件'] = properties.案件;
      if (properties.担当者) valueMap['担当者'] = properties.担当者;

      // 期限が指定されている場合は追加
      if (properties.期限 && properties.期限 !== 'YYYY-MM-DD' && properties.期限 !== null) {
        valueMap['期限'] = properties.期限;
      }

      // 各プロパティを実際のスキーマに基づいて設定
      for (const [propName, value] of Object.entries(valueMap)) {
        if (!schema[propName]) {
          console.log(`[NOTION] Property "${propName}" not found in schema, skipping`);
          continue;
        }

        const propConfig = schema[propName];
        console.log(`[NOTION] Processing property: ${propName} (${propConfig.type}) = ${value}`);

        try {
          switch (propConfig.type) {
            case 'select':
              const selectOptions = propConfig.select?.options || [];
              const matchingSelect = selectOptions.find(opt => 
                opt.name === value || opt.name.toLowerCase() === value.toLowerCase()
              );
              
              if (matchingSelect) {
                notionProperties[propName] = { select: { name: matchingSelect.name } };
                console.log(`[NOTION] ✅ Set select: ${propName} = ${matchingSelect.name}`);
              } else {
                console.log(`[NOTION] ⚠️ Value "${value}" not found in select options for ${propName}`);
                console.log(`[NOTION] Available options: ${selectOptions.map(opt => opt.name).join(', ')}`);
                // デフォルト値を使用
                if (selectOptions.length > 0) {
                  notionProperties[propName] = { select: { name: selectOptions[0].name } };
                  console.log(`[NOTION] ✅ Using default: ${propName} = ${selectOptions[0].name}`);
                }
              }
              break;

            case 'multi_select':
              const multiOptions = propConfig.multi_select?.options || [];
              const matchingMulti = multiOptions.find(opt => 
                opt.name === value || opt.name.toLowerCase() === value.toLowerCase()
              );
              
              if (matchingMulti) {
                notionProperties[propName] = { multi_select: [{ name: matchingMulti.name }] };
                console.log(`[NOTION] ✅ Set multi_select: ${propName} = ${matchingMulti.name}`);
              } else {
                console.log(`[NOTION] ⚠️ Value "${value}" not found in multi_select options for ${propName}`);
                console.log(`[NOTION] Available options: ${multiOptions.map(opt => opt.name).join(', ')}`);
              }
              break;

            case 'status':
              const statusOptions = propConfig.status?.options || [];
              const matchingStatus = statusOptions.find(opt => 
                opt.name === value || opt.name.toLowerCase() === value.toLowerCase()
              );
              
              if (matchingStatus) {
                notionProperties[propName] = { status: { name: matchingStatus.name } };
                console.log(`[NOTION] ✅ Set status: ${propName} = ${matchingStatus.name}`);
              } else {
                console.log(`[NOTION] ⚠️ Value "${value}" not found in status options for ${propName}`);
                console.log(`[NOTION] Available options: ${statusOptions.map(opt => opt.name).join(', ')}`);
                // デフォルト値を使用
                if (statusOptions.length > 0) {
                  notionProperties[propName] = { status: { name: statusOptions[0].name } };
                  console.log(`[NOTION] ✅ Using default: ${propName} = ${statusOptions[0].name}`);
                }
              }
              break;

            case 'date':
              if (propName === '記入日') {
                notionProperties[propName] = { date: { start: today } };
                console.log(`[NOTION] ✅ Set date: ${propName} = ${today}`);
              } else if (value && typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                notionProperties[propName] = { date: { start: value } };
                console.log(`[NOTION] ✅ Set date: ${propName} = ${value}`);
              }
              break;

            case 'rich_text':
              notionProperties[propName] = {
                rich_text: [{ text: { content: value.toString() } }]
              };
              console.log(`[NOTION] ✅ Set rich_text: ${propName} = ${value}`);
              break;

            case 'number':
              if (!isNaN(value)) {
                notionProperties[propName] = { number: Number(value) };
                console.log(`[NOTION] ✅ Set number: ${propName} = ${value}`);
              }
              break;

            case 'relation':
              // リレーション（親プロジェクト、子タスク）は現時点では空のまま
              console.log(`[NOTION] ⚠️ Relation property ${propName} skipped (will be set manually later)`);
              break;

            default:
              console.log(`[NOTION] ⚠️ Unsupported property type: ${propConfig.type} for ${propName}`);
          }
        } catch (propError) {
          console.error(`[NOTION] ❌ Error setting property ${propName}:`, propError.message);
        }
      }

      console.log('[NOTION] Final properties to send:');
      console.log(JSON.stringify(notionProperties, null, 2));

      // ページを作成
      const response = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: notionProperties,
        children: markdownToBlocks(pageContent)
      });

      console.log('[NOTION] ✅ Page created successfully!');
      console.log(`[NOTION] Page ID: ${response.id}`);
      console.log(`[NOTION] Page URL: ${response.url}`);
      
      return response;

    } catch (error) {
      console.error('[NOTION] ❌ Error in createPageFromAnalysis:', error.message);
      
      if (error.code === 'validation_error') {
        console.log('[NOTION] 🔄 Attempting fallback page creation...');
        return await this.createFallbackPage(analysisResult);
      }
      
      throw new Error(`Notionページの作成に失敗しました: ${error.message}`);
    }
  }

  async createFallbackPage(analysisResult) {
    try {
      console.log('[NOTION] Creating fallback page with minimal properties...');
      
      const { properties, pageContent } = analysisResult;
      const schema = await this.getDatabaseSchema();
      
      // 最小限のプロパティ（タイトルと記入日のみ）
      const fallbackProperties = {};
      
      // タイトル
      const titleProperty = Object.keys(schema).find(key => schema[key].type === 'title');
      if (titleProperty) {
        fallbackProperties[titleProperty] = {
          title: [{ text: { content: properties.Name || 'Untitled' } }]
        };
      }

      // 記入日
      const today = new Date().toISOString().split('T')[0];
      if (schema['記入日'] && schema['記入日'].type === 'date') {
        fallbackProperties['記入日'] = { date: { start: today } };
      }

      const response = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: fallbackProperties,
        children: [
          {
            object: 'block',
            type: 'heading_2',
            heading_2: { rich_text: [{ type: 'text', text: { content: '解析結果' } }] }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ 
                type: 'text', 
                text: { content: `📝 解析内容: ${properties.Name}` } 
              }]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ 
                type: 'text', 
                text: { content: `📊 ステータス: ${properties.ステータス || '未設定'}` } 
              }]
            }
          },
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ 
                type: 'text', 
                text: { content: `🏷️ 種別: ${properties.種別 || '未設定'}` } 
              }]
            }
          },
          ...markdownToBlocks(pageContent)
        ]
      });

      console.log('[NOTION] ✅ Fallback page created successfully!');
      return response;

    } catch (fallbackError) {
      console.error('[NOTION] ❌ Fallback creation also failed:', fallbackError.message);
      throw new Error(`Notionページの作成に完全に失敗しました: ${fallbackError.message}`);
    }
  }

  async testConnection() {
    try {
      console.log('[NOTION] Testing connection...');
      console.log(`[NOTION] Using database ID: ${this.databaseId}`);
      console.log(`[NOTION] API Key format: ${process.env.NOTION_API_KEY?.substring(0, 10)}...`);
      
      await this.getDatabaseSchema();
      console.log('[NOTION] ✅ Connection test successful!');
      return true;
    } catch (error) {
      console.error('[NOTION] ❌ Connection test failed:', error.message);
      throw error;
    }
  }

// ヘルスチェック用メソッド
  getHealthStatus() {
    return {
      status: this.databaseSchema ? 'healthy' : 'unknown',
      databaseId: this.databaseId ? 'configured' : 'missing',
      apiKey: process.env.NOTION_API_KEY ? 'configured' : 'missing',
      schemaLoaded: !!this.databaseSchema
    };
  }

  // 🔧 ここに正しく追加
  async getPageProperties(pageId) {
    try {
      console.log(`[NOTION] 実際の値を確認中: ${pageId}`);
      
      const page = await this.client.pages.retrieve({
        page_id: pageId
      });

      const properties = page.properties;
      const result = {};

      // タイトル
      const titleProp = Object.values(properties).find(prop => prop.type === 'title');
      result.title = titleProp?.title?.[0]?.text?.content || '';

      // 各プロパティの実際の値を取得
      Object.entries(properties).forEach(([propName, propData]) => {
        switch (propData.type) {
          case 'select':
            if (propName === 'ステータス') {
              result[propName] = propData.select?.name || '📥 未分類';
            } else {
              result[propName] = propData.select?.name || null;
            }
            break;
          case 'date':
            if (propData.date?.start) {
              result[propName] = propData.date.start;
            } else {
              result[propName] = null;
            }
            break;
          case 'rich_text':
            result[propName] = propData.rich_text?.[0]?.text?.content || null;
            break;
          default:
            if (propName === 'ステータス') {
              result[propName] = '📥 未分類';
            } else {
              result[propName] = null;
            }
        }
      });

      console.log('[NOTION] 実際の登録値:', JSON.stringify(result, null, 2));
      return result;

    } catch (error) {
      console.error('[NOTION] 値の確認でエラー:', error.message);
      return {
        title: '確認失敗',
        ステータス: '未設定',
        種別: '未設定',
        優先度: '未設定',
        成果物: '未設定',
        レベル: '未設定',
        案件: '未設定',
        担当者: '未設定'
      };
    }
  }

} // ← class の閉じ括弧

module.exports = new NotionService(); // ← これは最後
