const { OpenAI } = require('openai');
require('dotenv').config();

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 共通の設定
const config = {
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  max_tokens: 1000
};

// プロジェクト情報抽出用のプロンプト
const projectPrompt = `あなたは、プロジェクト管理のエキスパートです。
以下の条件に従って、プロジェクト情報を解析・抽出してください。

条件：
1. 現在の日付を考慮して処理する
2. 各項目は単一の値を選択する（配列ではなく）
3. 不明な情報は適切なデフォルト値を設定する

入力テキスト：
「${userInput}」

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
- ステータス: "未着手", "進行中", "確認待ち", "完了", "保留", "🗑️ゴミ箱"
- 種別: "企画", "制作", "実行", "分析", "📝メモ"
- 優先度: "🔥緊急", "⭐重要", "📅普通", "💭アイデア"
- フェーズ: "アイデア", "企画", "実行", "分析", "改善・運用"
- 担当者: "自分", "チーム", "外部", "未定"
- 成果物: "資料", "コンテンツ", "データ", "企画書", "レポート", "その他"
- レベル: "🎯プロジェクト", "📋タスク", "⚡アクション"`;

// WBS生成用のプロンプト
const wbsPrompt = `あなたは、プロジェクト管理のエキスパートです。
以下のプロジェクトに対する具体的なWBSを生成してください。

プロジェクト情報：
${projectInfo}

以下の条件でWBSを生成してください：
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
}`;

// プロジェクト情報の解析
const analyzeProject = async (text) => {
  try {
    const completion = await openai.chat.completions.create({
      ...config,
      messages: [
        { role: 'system', content: projectPrompt },
        { role: 'user', content: text }
      ]
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Error analyzing project:', error);
    throw error;
  }
};

// WBSの生成
const generateWBS = async (projectInfo) => {
  try {
    const completion = await openai.chat.completions.create({
      ...config,
      messages: [
        { role: 'system', content: wbsPrompt },
        { role: 'user', content: JSON.stringify(projectInfo) }
      ]
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Error generating WBS:', error);
    throw error;
  }
};

module.exports = {
  analyzeProject,
  generateWBS
}; 