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
あなたはプロジェクト管理AIアシスタントです。
ユーザーからのテキスト入力を解釈し、Notionデータベースに登録するためのJSONオブジェクトを生成してください。

# 重要なルール
- **推測は一切禁止**: テキストに明記されていない項目は必ずnullにしてください
- **ステータスのみ例外**: 「📥 未分類」を必ず設定
- **WBS案作成**: プロジェクトの作業分解構成図を作成してください
- **JSON形式**: 余計な文字列は含めず、JSONのみ出力

# 出力JSONフォーマット
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
  "pageContent": "WBS作業分解構成図（Notion用詳細版）",
  "wbsProposal": "WBS作業分解構成図（LINE用簡潔版）"
}

# 具体例（推測禁止の徹底）

例1: "新しいプロジェクトを考える"
→ 全ての項目をnullに設定（「新しい」「プロジェクト」「考える」だけでは具体的な分類不可）

例2: "マーケティング戦略を12月15日までに緊急で作成する"
→ 期限: "2024-12-15", 優先度: "🔥緊急" のみ設定（他はnull）

例3: "LP制作"
→ 全ての項目をnullに設定（「LP」だけでは詳細不明）

ユーザー入力テキスト「${text}」を解析し、上記の原則に従ってJSONオブジェクトのみを出力してください。
`;

      // 最新のGemini 1.5 Flashモデルを使用
      const model = this.gemini.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });
      
      console.log('[GEMINI] Using model: gemini-1.5-flash');
      const result = await model.generateContent(systemPrompt);
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
      
      // Geminiエラーの場合は、フォールバック処理
      if (error.message.includes('GoogleGenerativeAI') || error.message.includes('404')) {
        console.log('[GEMINI] Using fallback analysis due to API error');
        return this.createFallbackAnalysis(text);
      }
      
      throw new Error('プロジェクト情報の解析に失敗しました: ' + error.message);
    }
  }

  // フォールバック用の簡易解析
  createFallbackAnalysis(text) {
    const analysis = {
      properties: {
        Name: text,
        ステータス: "📥 未分類",
        種別: null,
        優先度: null,
        期限: null,
        成果物: null,
        レベル: null,
        案件: null,
        担当者: null
      },
      pageContent: `## 概要\n${text}\n\n## 次のアクション\n- 詳細を検討する\n- 必要なリソースを確認する\n- スケジュールを立てる`,
      wbsProposal: `📋 ${text}のWBS案:\n\n1. 要件整理・分析\n2. 計画策定\n3. 実行準備\n4. 実施・進捗管理\n5. 完了・振り返り`
    };
    
    console.log('[GEMINI] Fallback analysis created:', JSON.stringify(analysis, null, 2));
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
