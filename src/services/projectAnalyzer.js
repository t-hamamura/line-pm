const { GoogleGenerativeAI } = require('@google/generative-ai');

class ProjectAnalyzer {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.');
    }
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  async analyzeText(text) {
    try {
      const systemPrompt = `
テキスト「${text}」を解析してJSONのみ出力:

{
  "properties": {
    "ステータス": "📥 未分類",
    "種別": null,
    "優先度": null,
    "期限": null,
    "成果物": null,
    "レベル": null,
    "案件": null,
    "担当者": null
  },
  "pageContent": "WBS案の詳細説明",
  "wbsProposal": "WBS案の簡潔版"
}

ルール: テキストに明記されていない項目はnull。期限は「YYYY-MM-DD」形式。優先度は「🔥緊急」「⭐️重要」「📅普通」「💭アイデア」のみ。
`;

      // 最新・最安・最速モデルに変更
      const model = this.gemini.getGenerativeModel({ 
        model: "gemini-1.5-flash-8b",
        generationConfig: {
          temperature: 0.3,        // 推測禁止なので低温度で一貫性重視
          topK: 20,               // 候補を絞って高速化
          topP: 0.8,              // 精度と速度のバランス
          maxOutputTokens: 512,   // WBS案が短縮されたので半分に
        }
      });
      
      console.log('[GEMINI] Using model: gemini-1.5-flash-8b (最新・最安・最速)');
      
      // タイムアウト処理（5秒）
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini timeout')), 5000)
      );
      
      const result = await Promise.race([
        model.generateContent(systemPrompt),
        timeoutPromise
      ]);
      
      const response = await result.response;
      const jsonString = response.text();
      
      console.log('[GEMINI] Raw response:', jsonString);
      
      // JSONの前後にある不要な文字列を除去
      let cleanedJsonString = jsonString.trim();
      
      // ```json ``` などのマークダウン形式を除去
      if (cleanedJsonString.startsWith('```json')) {
        cleanedJsonString = cleanedJsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedJsonString.startsWith('```')) {
        cleanedJsonString = cleanedJsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsedResult = JSON.parse(cleanedJsonString);
      
      // プロジェクト名を別途設定
      parsedResult.properties.Name = text;
      
      // ステータスを必ず「📥 未分類」に設定
      parsedResult.properties.ステータス = "📥 未分類";

      console.log('[GEMINI] Analyzed data:', JSON.stringify(parsedResult, null, 2));
      return parsedResult;

    } catch (error) {
      console.error('[GEMINI] Error details:', error);
      
      // 任意のエラーでフォールバック（パフォーマンス重視）
      console.log('[GEMINI] Using fallback analysis for faster response');
      return this.createFallbackAnalysis(text);
    }
  }

  // 高速フォールバック処理（簡易パターンマッチング）
  createFallbackAnalysis(text) {
    const lowerText = text.toLowerCase();
    
    // 簡易的な期限検出
    let deadline = null;
    const dateMatch = text.match(/(\d{1,2})[月/](\d{1,2})[日]?|\d{4}[-/](\d{1,2})[-/](\d{1,2})/);
    if (dateMatch) {
      const now = new Date();
      const year = now.getFullYear();
      const month = dateMatch[1] || dateMatch[3];
      const day = dateMatch[2] || dateMatch[4];
      deadline = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // 簡易的な優先度検出
    let priority = null;
    if (lowerText.includes('緊急') || lowerText.includes('急ぎ')) priority = "🔥緊急";
    else if (lowerText.includes('重要')) priority = "⭐️重要";
    else if (lowerText.includes('アイデア')) priority = "💭アイデア";
    
    const analysis = {
      properties: {
        Name: text,
        ステータス: "📥 未分類",
        種別: null,
        優先度: priority,
        期限: deadline,
        成果物: null,
        レベル: null,
        案件: null,
        担当者: null
      },
      pageContent: `## ${text}\n\n### 実行ステップ\n1. 要件の整理\n2. 計画の策定\n3. 実行・管理\n4. 完了・振り返り`,
      wbsProposal: `📋 ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}のWBS案:\n\n1. 要件整理・分析\n2. 計画策定\n3. 実行準備\n4. 実施・管理\n5. 完了・振り返り`
    };
    
    console.log('[GEMINI] Fast fallback analysis:', JSON.stringify(analysis, null, 2));
    return analysis;
  }

  validateProjectData(data) {
    if (!data.properties) {
        throw new Error('"properties" field is missing from Gemini response.');
    }
    const requiredFields = [
      'Name',
      'ステータス',
      '種別',
      '優先度',
      '成果物',
      'レベル'
    ];

    const missingFields = requiredFields.filter(field => !data.properties[field]);
    if (missingFields.length > 0) {
      throw new Error(`必須項目が不足しています: ${missingFields.join(', ')}`);
    }
    
    if (typeof data.pageContent !== 'string') {
        throw new Error('pageContent must be a string.');
    }

    return true;
  }
}

module.exports = new ProjectAnalyzer();
