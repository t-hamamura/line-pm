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

      const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(systemPrompt);
      const response = await result.response;
      const jsonString = response.text();
      
      const parsedResult = JSON.parse(jsonString);
      
      // プロジェクト名を別途設定
      parsedResult.properties.Name = text;

      console.log('Analyzed data from Gemini:', JSON.stringify(parsedResult, null, 2));
      return parsedResult;

    } catch (error) {
      console.error('Error analyzing project with Gemini:', error);
      throw new Error('プロジェクト情報の解析に失敗しました: ' + error.message);
    }
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