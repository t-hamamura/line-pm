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
あなたはマーケティング・事業部長向けのプロジェクト管理AIアシスタントです。
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
    "ステータス": "未分類",
    "種別": "企画・戦略",
    "優先度": "普通",
    "期限": "YYYY-MM-DD (不明な場合はnull)",
    "成果物": "資料・企画書",
    "レベル": "タスク",
    "案件": "その他",
    "担当者": "自分"
  },
  "pageContent": "WBSやメモの内容をMarkdown形式の文字列で記述"
}

# 各プロパティの選択肢

## ステータス（必ず「未分類」を設定）
- "未分類" ← 必ずこれを設定

## 種別（業務の性質）
- "企画・戦略": 将来の方向性を決める、計画を立てる業務
- "制作・開発": 具体的な成果物・コンテンツを作る業務
- "実行・運用": 施策実行、日常業務オペレーション
- "マネジメント": 人・チーム・リソース管理
- "分析・改善": データ分析、振り返り、改善検討
- "その他・雑務": 上記に当てはまらない業務

## 優先度
- "緊急": 今すぐやる必要がある
- "重要": 重要だが少し時間に余裕がある
- "普通": 通常の業務
- "アイデア": 将来的に検討したいアイデア

## 成果物（最終アウトプット）
- "資料・企画書": 戦略書、企画書、提案書、計画書
- "コンテンツ": LP、動画、記事、SNS投稿、メルマガ
- "レポート": 分析結果、効果測定、業績報告
- "システム・ツール": Webサイト、アプリ、業務ツール
- "ルール・仕組み": 業務フロー、マニュアル、制度設計
- "その他": 上記に当てはまらない成果物

## レベル（規模）
- "戦略レベル": 3ヶ月以上、事業・組織全体に大きな影響
- "プロジェクト": 1-3ヶ月、複数人のチーム
- "タスク": 1-4週間、個人または少数で完結
- "アクション": 1日-1週間、すぐできる作業
- "メモ": 思考整理、アイデア出し

## 案件（関連プロジェクト）
- "ONEマーケ/マーケラボ": マーケティング関連
- "るい/redeal": 営業・セールス関連
- "アンスポーテ": スポーツ関連事業
- "池袋サンシャイン美容": 美容事業関連
- "femuse": 女性向けサービス
- "その他": 上記に当てはまらない案件

## 担当者
- "自分": 基本的に自分が担当

# 判断基準

## 種別の判断
- 「考える」「計画する」「戦略を練る」→ 企画・戦略
- 「作る」「開発する」「制作する」→ 制作・開発
- 「実行する」「運用する」「動かす」→ 実行・運用
- 「管理する」「育成する」「組織を動かす」→ マネジメント
- 「分析する」「振り返る」「改善する」→ 分析・改善
- どれにも当てはまらない → その他・雑務

## レベルの判断
- 期間と関係者数で判断
- 迷ったら小さめに分類（プロジェクト→タスク→アクション）

## 成果物の判断
- 「最終的に何ができるか」で判断
- 迷ったら「その他」

## 案件の判断
- テキストに特定のプロジェクト名やキーワードが含まれている場合は該当する案件を選択
- 不明な場合は「その他」

# 例
ユーザー入力: "新商品のマーケティング戦略を来月までに策定する"
→ 種別: "企画・戦略", レベル: "プロジェクト", 成果物: "資料・企画書", 案件: "ONEマーケ/マーケラボ"

ユーザー入力: "部下の1on1を来週実施"  
→ 種別: "マネジメント", レベル: "アクション", 成果物: "その他", 案件: "その他"

ユーザー入力: "キャンペーンのLPを制作"
→ 種別: "制作・開発", レベル: "タスク", 成果物: "コンテンツ", 案件: "ONEマーケ/マーケラボ"

ユーザー入力: "池袋の美容サロンの集客分析"
→ 種別: "分析・改善", レベル: "タスク", 成果物: "レポート", 案件: "池袋サンシャイン美容"

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
      
      // ステータスを必ず「未分類」に設定
      parsedResult.properties.ステータス = "未分類";

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
        ステータス: "未分類",
        種別: "その他・雑務",
        優先度: "普通",
        期限: null,
        成果物: "その他",
        レベル: text.length > 20 ? "タスク" : "アクション",
        案件: "その他",
        担当者: "自分"
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
