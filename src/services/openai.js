const OpenAI = require('openai');
const config = require('../config');

class OpenAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey
    });
  }

  async analyzeProject(projectInfo) {
    try {
      console.log('Analyzing project with OpenAI...');
      const systemPrompt = `あなたは、プロジェクト管理のエキスパートです。
以下の条件に従って、プロジェクト情報を解析・抽出してください。

条件：
1. 現在の日付を考慮して処理する
2. 各項目は単一の値を選択する（配列ではなく）
3. 不明な情報は適切なデフォルト値を設定する

出力形式（JSON）：
{
  "プロジェクト名": "文字列（具体的なプロジェクト名）",
  "ステータス": "未着手",
  "種別": "企画",
  "優先度": "⭐重要",
  "期限": "YYYY-MM-DD",
  "フェーズ": "企画",
  "担当者": "自分",
  "成果物": "企画書",
  "レベル": "🎯プロジェクト"
}

※各項目の選択肢：
- ステータス: "未着手", "進行中", "確認待ち", "完了", "保留"
- 種別: "企画", "制作", "実行", "分析"
- 優先度: "🔥緊急", "⭐重要", "📅普通", "💭アイデア"
- フェーズ: "企画", "実行", "分析", "改善"
- 担当者: "自分", "チーム", "外部", "未定"
- 成果物: "資料", "コンテンツ", "データ", "企画書", "レポート", "その他"
- レベル: "🎯プロジェクト", "📋タスク", "⚡アクション"`;

      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: projectInfo }
        ]
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log('Analysis result:', result);
      return result;
    } catch (error) {
      console.error('OpenAI API Error in analyzeProject:', error);
      throw new Error('プロジェクト情報の解析に失敗しました: ' + error.message);
    }
  }

  async generateWBS(projectData) {
    try {
      console.log('Generating WBS with OpenAI...');
      const systemPrompt = `あなたは、プロジェクト管理のエキスパートです。
以下のプロジェクト情報からWBS（Work Breakdown Structure）を生成してください。

条件：
1. タスクは具体的なアクションレベルまで分解
2. 各タスクに想定期間を設定
3. タスクの順序関係を考慮
4. レベルは3段階（🎯プロジェクト/📋タスク/⚡アクション）

出力形式（JSON）：
{
  "プロジェクト": {
    "名称": "プロジェクト名",
    "レベル": "🎯プロジェクト",
    "想定期間": "日数",
    "サブタスク": [
      {
        "名称": "タスク名",
        "レベル": "📋タスク or ⚡アクション",
        "想定期間": "X日",
        "開始目安": "YYYY-MM-DD",
        "終了目安": "YYYY-MM-DD",
        "担当": "自分 | チーム | 外部 | 未定",
        "成果物": "資料 | コンテンツ | データ | 企画書 | レポート | その他"
      }
    ]
  }
}

タスクは以下のフェーズで分類してください：
1. 要件定義・設計フェーズ
2. 開発フェーズ
3. テストフェーズ
4. リリース準備フェーズ`;

      const response = await this.client.chat.completions.create({
        model: config.openai.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(projectData, null, 2) }
        ]
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log('Generated WBS:', result);
      return result;
    } catch (error) {
      console.error('OpenAI API Error in generateWBS:', error);
      throw new Error('WBSの生成に失敗しました: ' + error.message);
    }
  }
}

module.exports = new OpenAIService(); 