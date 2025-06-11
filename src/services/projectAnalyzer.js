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
あなたはプロジェクト管理のAIアシスタントです。
ユーザーからのテキスト入力を解釈し、Notionデータベースに登録するためのJSONオブジェクトを生成してください。

# 指示
- ユーザーのテキストから、以下のプロパティを推測して設定してください。
- テキストがプロジェクトや複数のステップを含むタスクの場合、具体的なアクションプランをWBS（作業分解構成図）として箇条書きで生成し、pageContentに格納してください。
- テキストが単純なメモや単一のアクションの場合は、pageContentにはその内容を簡潔にまとめた文章を入れてください。
- JSON以外の余計な文字列（例: \`\`\`json ... \`\`\`）は出力に含めないでください。
- プロジェクト名はユーザーの入力テキストをそのまま設定してください。

# 出力JSONフォーマット
{
  "properties": {
    "ステータス": "未着手",
    "種別": "企画",
    "優先度": "普通",
    "期限": "YYYY-MM-DD (不明な場合はnull)",
    "フェーズ": "企画",
    "担当者": "未定",
    "成果物": "その他",
    "レベル": "タスク"
  },
  "pageContent": "WBSやメモの内容をMarkdown形式の文字列で記述"
}

# 各プロパティの選択肢
- ステータス: "未着手", "進行中", "確認待ち", "完了", "保留", "ゴミ箱"
- 種別: "企画", "制作", "実行", "分析", "メモ"
- 優先度: "緊急", "重要", "普通", "アイデア"
- フェーズ: "アイデア", "企画", "実行", "分析", "改善・運用"
- 担当者: "自分", "チーム", "外部", "未定"
- 成果物: "資料", "コンテンツ", "データ", "企画書", "レポート", "その他"
- レベル: "プロジェクト", "タスク", "アクション"

ユーザー入力テキスト「${text}」を解析し、上記の形式でJSONオブジェクトのみを出力してください。
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
        ステータス: "未着手",
        種別: "メモ",
        優先度: "普通",
        期限: null,
        フェーズ: "アイデア",
        担当者: "未定",
        成果物: "その他",
        レベル: text.length > 20 ? "プロジェクト" : "タスク"
      },
      pageContent: `## 概要\n${text}\n\n## 次のアクション\n- 詳細を検討する\n- 必要なリソースを確認する\n- スケジュールを立てる`
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
      'フェーズ',
      '担当者',
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