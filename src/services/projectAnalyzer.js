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
あなたはプロジェクト管理の専門家です。ユーザーの入力を分析し、実行可能なアクションプランを作成してください。

# 重要な指示
1. JSONオブジェクトのみを出力（\`\`\`json は不要）
2. pageContentには必ず詳細なWBSまたは具体的な内容を記述
3. 推測できない項目はnullを設定（ステータス以外）
4. 実際のNotionプロパティ値のみ使用（半角空白含む）

# Notionプロパティの正確な選択肢（半角空白を含む正確な値）

## 優先度
- "🔥 緊急" - 今すぐやる必要がある
- "⭐ 重要" - 重要だが少し時間に余裕がある  
- "📅 普通" - 通常の業務
- "💭 アイデア" - 将来的に検討したいアイデア

## 種別  
- "📋 企画・戦略" - 将来の方向性を決める、計画を立てる業務
- "🛠 制作・開発" - 具体的な成果物・コンテンツを作る業務
- "🚀 実行・運用" - 施策実行、日常業務オペレーション
- "👥 マネジメント" - 人・チーム・リソース管理
- "📊 分析・改善" - データ分析、振り返り、改善検討
- "📝 その他・雑務" - 上記に当てはまらない業務

## レベル
- "🏛 戦略レベル" - 3ヶ月以上、事業・組織全体に大きな影響
- "📂 プロジェクト" - 1-3ヶ月、複数人のチーム
- "✅ タスク" - 1-4週間、個人または少数で完結
- "⚡ アクション" - 1日-1週間、すぐできる作業
- "💭 メモ" - 思考整理、アイデア出し

## 成果物
- "📄 資料・企画書" - 戦略書、企画書、提案書、計画書
- "🎨 コンテンツ" - LP、動画、記事、SNS投稿、メルマガ
- "📈 レポート" - 分析結果、効果測定、業績報告
- "⚙ システム・ツール" - Webサイト、アプリ、業務ツール
- "📋 ルール・仕組み" - 業務フロー、マニュアル、制度設計
- "🎯 その他" - 上記に当てはまらない成果物

## 案件
- "ONEマーケ/マーケラボ" - マーケティング関連
- "るい/redeal" - 営業・セールス関連
- "アンスポーテ" - スポーツ関連事業
- "池袋サンシャイン美容" - 美容事業関連
- "femuse" - 女性向けサービス
- "その他" - 上記に当てはまらない案件

# 出力JSONフォーマット
{
  "properties": {
    "ステータス": "📥 未分類",
    "種別": null,
    "優先度": null,
    "期限": null,
    "成果物": null,
    "レベル": null,
    "案件": null
  },
  "pageContent": "## プロジェクト概要\\n\\n### 🎯 目的\\n- 具体的な目的\\n\\n### 📋 WBS（作業分解構成図）\\n\\n#### フェーズ1: 調査・準備\\n- [ ] 現状分析の実施\\n- [ ] 要件定義の明確化\\n\\n#### フェーズ2: 計画・設計\\n- [ ] 詳細計画の策定\\n- [ ] 設計・仕様の決定\\n\\n### 📊 期待される成果物\\n1. 計画書\\n2. 実行結果"
}

# ユーザー入力の分析
テキスト: "${text}"

上記の入力から：
1. 明記されている情報のみ設定（推測禁止）
2. 期限がある場合は正確に抽出（YYYY-MM-DD形式）
3. 具体的で実行可能なWBSをMarkdown形式で作成

JSON形式で出力してください：`;

      console.log('🤖 Using model: gemini-2.0-flash-lite');
      
      // Gemini 2.0 Flash-Liteモデルを使用
      const model = this.gemini.getGenerativeModel({ 
        model: "gemini-2.0-flash-lite",
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          maxOutputTokens: 1024
        }
      });

      // タイムアウト付きで実行
      const result = await Promise.race([
        model.generateContent(systemPrompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Gemini API timeout')), 8000)
        )
      ]);
      
      const response = await result.response;
      let jsonString = response.text().trim();
      
      // JSONの清理
      jsonString = this.cleanJsonResponse(jsonString);
      
      let parsedResult;
      try {
        parsedResult = JSON.parse(jsonString);
        
        // pageContentが空の場合は自動生成
        if (!parsedResult.pageContent || parsedResult.pageContent.trim() === '') {
          parsedResult.pageContent = this.generateWBS(text);
        }
        
      } catch (parseError) {
        console.warn('JSON parse failed, using enhanced fallback...', parseError);
        parsedResult = this.createEnhancedFallbackResponse(text);
      }
      
      // プロジェクト名を設定
      parsedResult.properties.Name = text;

      console.log('✅ Analyzed data from Gemini 2.0 Flash-Lite:', JSON.stringify(parsedResult, null, 2));
      return parsedResult;

    } catch (error) {
      console.error('❌ Error analyzing project with Gemini:', error);
      return this.createEnhancedFallbackResponse(text);
    }
  }

  // JSON応答の清理
  cleanJsonResponse(jsonString) {
    jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    jsonString = jsonString.trim();
    const jsonStart = jsonString.indexOf('{');
    if (jsonStart > 0) {
      jsonString = jsonString.substring(jsonStart);
    }
    return jsonString;
  }

  // WBS自動生成
  generateWBS(text) {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('プロジェクト') || textLower.includes('戦略') || textLower.includes('企画')) {
      return `## ${text}

### 🎯 プロジェクト概要
このプロジェクトの具体的な実行計画を以下に示します。

### 📋 WBS（作業分解構成図）

#### フェーズ1: 調査・準備（初期段階）
- [ ] 現状分析の実施
- [ ] 要件定義の明確化
- [ ] リソースの確認と調整
- [ ] 関係者との調整

#### フェーズ2: 計画・設計（中核段階）
- [ ] 詳細計画の策定
- [ ] 設計・仕様の決定
- [ ] スケジュールの最終化
- [ ] 品質基準の設定

#### フェーズ3: 実行・展開（実行段階）
- [ ] 実行開始
- [ ] 進捗管理と調整
- [ ] 品質チェック
- [ ] 関係者への報告

#### フェーズ4: 完了・評価（最終段階）
- [ ] 成果物の最終確認
- [ ] 評価とフィードバック
- [ ] 改善点の整理
- [ ] 次回への引き継ぎ

### 📊 期待される成果物
1. プロジェクト計画書
2. 実行結果レポート
3. 改善提案書`;
    } else {
      return `## ${text}

### 📝 タスク詳細
以下の手順で実行してください。

### ✅ 実行ステップ
1. **準備段階**
   - 必要な情報の収集
   - ツールや環境の準備

2. **実行段階**
   - 具体的な作業の実施
   - 進捗の確認

3. **完了段階**
   - 結果の確認
   - 必要に応じて調整

### 📌 注意点
- 期限を意識して実行する
- 不明点があれば早めに確認する
- 完了時には成果を記録する`;
    }
  }

  // 強化されたフォールバック応答
  createEnhancedFallbackResponse(text) {
    const textLower = text.toLowerCase();
    
    // 正確なNotionプロパティに基づく分析（半角空白含む）
    let priority = null;
    let type = null;
    let level = null;
    let deliverable = null;
    let project = null;
    let deadline = null;
    
    // 優先度判定（半角空白を含む正確な値）
    if (textLower.includes('緊急') || textLower.includes('至急') || textLower.includes('急ぎ')) {
      priority = "🔥 緊急";
    } else if (textLower.includes('重要') || textLower.includes('大切')) {
      priority = "⭐ 重要";
    } else if (textLower.includes('アイデア')) {
      priority = "💭 アイデア";
    }
    
    // 種別判定（半角空白を含む正確な値）
    if (textLower.includes('企画') || textLower.includes('戦略') || textLower.includes('計画')) {
      type = "📋 企画・戦略";
      deliverable = "📄 資料・企画書";
    } else if (textLower.includes('制作') || textLower.includes('開発') || textLower.includes('作成')) {
      type = "🛠 制作・開発";
      deliverable = "🎨 コンテンツ";
    } else if (textLower.includes('分析') || textLower.includes('調査') || textLower.includes('レポート')) {
      type = "📊 分析・改善";
      deliverable = "📈 レポート";
    } else if (textLower.includes('実行') || textLower.includes('運用')) {
      type = "🚀 実行・運用";
    } else if (textLower.includes('管理') || textLower.includes('マネジメント')) {
      type = "👥 マネジメント";
    }
    
    // レベル判定（半角空白を含む正確な値）
    if (textLower.includes('戦略')) {
      level = "🏛 戦略レベル";
    } else if (textLower.includes('プロジェクト')) {
      level = "📂 プロジェクト";
    } else if (textLower.includes('タスク')) {
      level = "✅ タスク";
    } else if (textLower.includes('メモ') || textLower.includes('アイデア')) {
      level = "💭 メモ";
    }
    
    // 案件判定（正確な値）
    if (textLower.includes('マーケ') || textLower.includes('マーケティング')) {
      project = "ONEマーケ/マーケラボ";
    } else if (textLower.includes('redeal') || textLower.includes('るい')) {
      project = "るい/redeal";
    } else if (textLower.includes('アンスポーテ') || textLower.includes('スポーツ')) {
      project = "アンスポーテ";
    } else if (textLower.includes('美容') || textLower.includes('池袋') || textLower.includes('サンシャイン')) {
      project = "池袋サンシャイン美容";
    } else if (textLower.includes('femuse')) {
      project = "femuse";
    }
    
    // 期限抽出
    const dateMatches = text.match(/(\d{1,2})月(\d{1,2})日|(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (dateMatches) {
      if (dateMatches[1] && dateMatches[2]) {
        const month = dateMatches[1].padStart(2, '0');
        const day = dateMatches[2].padStart(2, '0');
        deadline = `2023-${month}-${day}`;
      } else if (dateMatches[3] && dateMatches[4] && dateMatches[5]) {
        deadline = `${dateMatches[3]}-${dateMatches[4].padStart(2, '0')}-${dateMatches[5].padStart(2, '0')}`;
      }
    }

    const fallbackResponse = {
      properties: {
        Name: text,
        ステータス: "📥 未分類",
        種別: type,
        優先度: priority,
        期限: deadline,
        成果物: deliverable,
        レベル: level,
        案件: project
      },
      pageContent: this.generateWBS(text)
    };

    console.log('🔄 Using enhanced fallback response:', fallbackResponse);
    return fallbackResponse;
  }

  validateProjectData(data) {
    if (!data.properties) {
        throw new Error('"properties" field is missing from Gemini response.');
    }
    
    const requiredFields = ['Name', 'ステータス'];
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
