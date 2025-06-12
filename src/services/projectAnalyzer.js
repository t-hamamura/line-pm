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
あなたはマーケティング・コンサルティングに関するプロジェクト管理の専門家です。ユーザーの入力を分析し、実行可能なアクションプランを作成してください。

# 重要な指示
1. JSONオブジェクトのみを出力（\`\`\`json は不要）
2. pageContentには必ず詳細なWBSまたは具体的な内容を記述
3. 推測できない項目は必ずnullを設定（ステータス以外）
4. 実際のNotionプロパティ値のみ使用（絵文字なし）
5. メッセージから明確に読み取れない推論は絶対にしてはならない
6. 特に優先度・種別・案件は明確な記載がない限りnull

# Notionプロパティの正確な選択肢（絵文字なし）

## 優先度（明確に記載されている場合のみ）
- "緊急" - 「緊急」「至急」「急ぎ」などの明記がある場合のみ
- "重要" - 「重要」と明記されている場合のみ
- "普通" - 「普通」と明記されている場合のみ
- "アイデア" - 「アイデア」と明記されている場合のみ

## 種別（明確に記載されている場合のみ）
- "企画・戦略" - 「戦略策定」「企画立案」など明確な戦略・企画作業
- "制作・開発" - 「制作」「開発」「作成」など明確な制作作業
- "実行・運用" - 「実行」「運用」「実施」など明確な実行作業
- "マネジメント" - 「管理」「マネジメント」など明確な管理作業
- "分析・改善" - 「分析」「改善」「検証」など明確な分析作業
- "その他・雑務" - 上記に明確に該当しない場合

## レベル
- "戦略レベル" - 3ヶ月以上、事業・組織全体に大きな影響
- "プロジェクト" - 1週間-3ヶ月、複数人のチーム
- "タスク" - 3分-1週間、個人または少数で完結
- "アクション" - 0分-3分、すぐできる作業
- "メモ" - 思考整理、アイデア出し

## 成果物
- "資料・企画書" - 戦略書、企画書、提案書、計画書
- "コンテンツ" - LP、動画、記事、SNS投稿、メルマガ、Webサイト
- "レポート" - 分析結果、効果測定、業績報告
- "システム・ツール" - アプリ、業務ツール、システム
- "ルール・仕組み" - 業務フロー、マニュアル、制度設計
- "その他" - 上記に当てはまらない成果物

## 案件（明確にキーワードが含まれている場合のみ）
- "ONEマーケ／マーケラボ" - 「ONEマーケ」「マーケラボ」が明記されている場合のみ
- "るい／redeal." - 「るい」「redeal」「リディアル」が明記されている場合のみ
- "アンズボーテ" - 「アンズボーテ」が明記されている場合のみ
- "池袋サンシャイン美容外科" - 「池袋」「サンシャイン」が明記されている場合のみ
- "femuse" - 「femuse」「フェミューズ」が明記されている場合のみ
- "その他" - 上記に該当しない場合

# 出力JSONフォーマット
{
  "properties": {
    "ステータス": "未分類",
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
1. 明記されている情報のみ設定（推測は絶対禁止）
2. 期限がある場合は正確に抽出（YYYY-MM-DD形式）
3. 具体的で実行可能なWBSをMarkdown形式で作成
4. 不明確な場合は必ずnullを設定

JSON形式で出力してください：`;

      console.log('🤖 Using model: gemini-2.5-flash (latest high-performance model)');
      
      // 🚀 Gemini 2.5 Flash - 最新で最も高性能なモデル
      const model = this.gemini.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.1,        // 2.5では低めに設定（一貫性重視）
          topK: 15,               // 少し減らして品質重視
          topP: 0.7,              // 精度を上げるため少し下げる
          maxOutputTokens: 1024,
        }
      });

      // 🚀 タイムアウトを6秒に設定（2.5の処理時間を考慮）
      const result = await Promise.race([
        model.generateContent(systemPrompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Gemini 2.5 Flash timeout')), 6000)  // ← 6秒に調整
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

      console.log('✅ Analyzed data from Gemini 2.5 Pro:', JSON.stringify(parsedResult, null, 2));
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

// 極めて厳格なフォールバック応答（推測を最小限に）
createEnhancedFallbackResponse(text) {
  const textLower = text.toLowerCase();
  
  // 絵文字なしの値を使用
  let priority = null;
  let type = null;
  let level = null;
  let deliverable = null;
  let project = null;
  let deadline = null;
  
  // 優先度判定 - 明確に記載されている場合のみ
  if (textLower.includes('緊急') || textLower.includes('至急') || textLower.includes('急ぎ')) {
    priority = "緊急";
  } else if (textLower.includes('重要') && textLower.match(/重要(?![な])/)) {
    // 「重要な〜」ではなく「重要」単体の場合のみ
    priority = "重要";
  } else if (textLower.includes('普通')) {
    priority = "普通";
  } else if (textLower.includes('アイデア')) {
    priority = "アイデア";
  }
  // その他の場合は一切推測しない
  
  // 種別判定 - 極めて明確な場合のみ
  if (textLower.includes('戦略策定') || textLower.includes('企画立案')) {
    type = "企画・戦略";
  } else if ((textLower.includes('hp') || textLower.includes('ホームページ') || textLower.includes('webサイト')) && 
             textLower.includes('制作')) {
    type = "制作・開発";
    deliverable = "コンテンツ";
  } else if (textLower.includes('システム開発') || textLower.includes('アプリ開発')) {
    type = "制作・開発";
    deliverable = "システム・ツール";
  } else if (textLower.includes('データ分析') || textLower.includes('効果測定')) {
    type = "分析・改善";
    deliverable = "レポート";
  } else if (textLower.includes('キャンペーン実行') || textLower.includes('広告運用')) {
    type = "実行・運用";
  } else if (textLower.includes('チーム管理') || textLower.includes('人事管理')) {
    type = "マネジメント";
  }
  // 「作成」「企画」「計画」「買う」などの単語だけでは一切推測しない
  
  // レベル判定 - 明確に記載されている場合のみ
  if (textLower.includes('戦略レベル')) {
    level = "戦略レベル";
  } else if (textLower.includes('プロジェクト')) {
    level = "プロジェクト";
  } else if (textLower.includes('タスク')) {
    level = "タスク";
  } else if (textLower.includes('アクション')) {
    level = "アクション";
  } else if (textLower.includes('メモ')) {
    level = "メモ";
  }
  
  // 案件判定 - キーワードが明確に含まれている場合のみ
  if (textLower.includes('oneマーケ') || textLower.includes('マーケラボ')) {
    project = "ONEマーケ／マーケラボ";
  } else if (textLower.includes('redeal') || textLower.includes('リディアル') || textLower.includes('るい')) {
    project = "るい／redeal.";
  } else if (textLower.includes('アンズボーテ')) {
    project = "アンズボーテ";
  } else if (textLower.includes('池袋') || textLower.includes('サンシャイン')) {
    project = "池袋サンシャイン美容外科";
  } else if (textLower.includes('femuse') || textLower.includes('フェミューズ')) {
    project = "femuse";
  }
  // キーワードが含まれていない場合は一切推測しない
  
  // 期限抽出 - 明確に日付が記載されている場合のみ
  const dateMatches = text.match(/(\d{1,2})月(\d{1,2})日|(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})|(\d{1,2})\/(\d{1,2})/);
  if (dateMatches) {
    if (dateMatches[1] && dateMatches[2]) {
      const currentYear = new Date().getFullYear();
      const month = dateMatches[1].padStart(2, '0');
      const day = dateMatches[2].padStart(2, '0');
      deadline = `${currentYear}-${month}-${day}`;
    } else if (dateMatches[3] && dateMatches[4] && dateMatches[5]) {
      deadline = `${dateMatches[3]}-${dateMatches[4].padStart(2, '0')}-${dateMatches[5].padStart(2, '0')}`;
    }
  }

  const fallbackResponse = {
    properties: {
      Name: text,
      ステータス: "未分類",
      種別: type,
      優先度: priority,
      期限: deadline,
      成果物: deliverable,
      レベル: level,
      案件: project
    },
    pageContent: this.generateWBS(text)
  };

  console.log('🔄 Using enhanced fallback response (strict mode):', fallbackResponse);
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
