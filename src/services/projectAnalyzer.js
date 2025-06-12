const { GoogleGenerativeAI } = require('@google/generative-ai');

class ProjectAnalyzer {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.');
    }
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // レート制限管理
    this.requestCount = 0;
    this.resetTime = Date.now() + 60000; // 1分後
    this.dailyCount = 0;
    this.dailyResetTime = Date.now() + 24 * 60 * 60 * 1000; // 24時間後
  }

  // レート制限チェック
  canMakeRequest() {
    const now = Date.now();
    
    // 1分あたりの制限をリセット
    if (now > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = now + 60000;
      console.log('🔄 Rate limit counter reset (RPM)');
    }
    
    // 1日あたりの制限をリセット
    if (now > this.dailyResetTime) {
      this.dailyCount = 0;
      this.dailyResetTime = now + 24 * 60 * 60 * 1000;
      console.log('🔄 Daily limit counter reset (RPD)');
    }
    
    // 制限チェック（安全のため少し余裕を持たせる）
    const canRequest = this.requestCount < 8 && this.dailyCount < 450; // 10→8, 500→450
    
    if (!canRequest) {
      console.log(`📊 Rate limit status: RPM ${this.requestCount}/8, RPD ${this.dailyCount}/450`);
    }
    
    return canRequest;
  }

  recordRequest() {
    this.requestCount++;
    this.dailyCount++;
    console.log(`📊 Request recorded: RPM ${this.requestCount}/8, RPD ${this.dailyCount}/450`);
  }

  async analyzeText(text) {
    try {
      // レート制限チェック
      if (!this.canMakeRequest()) {
        console.warn('⚠️ Rate limit approaching, using fallback immediately');
        return this.createEnhancedFallbackResponse(text);
      }

const systemPrompt = `
あなたはマーケティング・コンサルティングに関するプロジェクト管理の専門家です。以下の入力を分析し、今すぐに実行可能なレベルに細分化されたWBSを含むプロジェクト情報を作成してください。

# 出力ルール
1. JSONのみ出力（\`\`\`は不要）
2. pageContentには必ず詳細なWBSまたは具体的な内容を記述
3. 具体的で実行可能なWBSをMarkdown形式で作成
4. 推測できない項目は必ずnullを設定（ステータス以外）
5. ステータスは常に"未分類"
6. 実際のNotionプロパティ値のみ使用（絵文字なし）
7. メッセージから読み取れない推論をしてはならない

# 期待する出力形式
{
  "properties": {
    "ステータス": "未分類",
    "種別": null,
    "優先度": null,
    "期限": null,
    "成果物": null,
    "レベル": null,
    "案件": null,
    "担当者": null
  },
  "pageContent": "## プロジェクト名\\n\\n### 🎯 概要\\nプロジェクトの目的と背景\\n\\n### 📋 WBS\\n\\n#### フェーズ1: 準備・調査\\n- [ ] 現状分析\\n- [ ] 要件定義\\n\\n#### フェーズ2: 計画・設計\\n- [ ] 詳細設計\\n- [ ] スケジュール策定\\n\\n#### フェーズ3: 実行・展開\\n- [ ] 実行開始\\n- [ ] 進捗管理\\n\\n#### フェーズ4: 完了・評価\\n- [ ] 成果確認\\n- [ ] 評価・改善\\n\\n### 📊 成果物\\n1. 項目1\\n2. 項目2"
}

# プロパティ選択肢

## 優先度
- "緊急": 「緊急」「至急」「急ぎ」などの明記があったり、「緊急である」と推察される場合のみ
- "重要": 「重要」と明記されていたり、「重要である」と推察される場合のみ
- "普通": 「普通」と明記されていたり、「普通である」と推察される場合のみ
- "アイデア": 「アイデア」「メモ」などの明記があったり、「アイデアである」と推察される場合のみ

## 種別（明確時のみ）
- "企画・戦略": 「戦略策定」「企画立案」など明確な企画・戦略関連の業務であると推察される場合のみ
- "制作・開発" : 「制作」「開発」「作成」など明確な制作・開発関連の業務であると推察される場合のみ
- "実行・運用" : 「実行」「運用」「実施」など明確な実行・運用関連の業務であると推察される場合のみ
- "マネジメント" : 「管理」「マネジメント」など明確な管理関連の業務であると推察される場合のみ
- "分析・改善" : 「分析」「改善」「検証」など明確な分析関連の業務であると推察される場合のみ
- "その他・雑務" : 上記に明確に該当しない場合

## レベル
- "戦略レベル": 3ヶ月以上の大型であり、事業・組織全体に大きな影響であると推察される場合のみ
- "プロジェクト": 1-3ヶ月の中型であり、複数人のチームで動かすと推察される場合のみ
- "タスク": 1日-4週間、個人または少数で完結すると推察される場合のみ
- "アクション": 1日-1週間、個人ですぐできる作業であると推察される場合のみ
- "メモ": アイデア整理、思考整理、アイデア出しであると推察される場合のみ

## 成果物
- "資料・企画書": 戦略書、企画書、提案書、計画書など
- "コンテンツ": LP、動画、記事、SNS投稿、メルマガ、Webサイトなど
- "レポート": 分析結果、効果測定、業績報告など
- "システム・ツール": アプリ、業務ツール、システムなど
- "ルール・仕組み": 業務フロー、マニュアル、制度設計など
- "その他": 上記に当てはまらない成果物

## 案件（キーワード含む時のみ）
- "ONEマーケ/マーケラボ": ONEマーケ/マーケラボ
- "ONLYONE": ONLYONE/オンリーワン
- "るい/redeal.": るい/redeal/リディアル
- "femuse": femuse/フェミューズ
- "アンズボーテ": アンズボーテ
- "neam": neam/ニーム
- "SPIRITS": spirits/スピリッツ
- "TalkLabel": talklabel/トークラベル
- "池袋サンシャイン美容外科": 池袋/サンシャイン
- "JUNOa": junoa/ユノア

## 期限
日付明記時のみYYYY-MM-DD形式

# 分析対象
"${text}"

上記の入力から：
2. 期限がある場合は正確に抽出（YYYY-MM-DD形式）

JSON形式で出力してください：`;

      console.log('🤖 Using model: gemini-2.5-flash (最新高性能モデル)');
      
      // 🚀 Gemini 2.5 Flash - 最新で最も高性能なモデル
      const model = this.gemini.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.2,        // 2.5では低めに設定（一貫性重視）
          topK: 20,               // 品質重視
          topP: 0.8,              // 精度を保ちつつ多様性も確保
          maxOutputTokens: 1024,
        }
      });

      console.log('📊 Gemini 2.5 Flash limits: RPM: 10, TPM: 250K, RPD: 500');

      // リクエスト記録
      this.recordRequest();

      // 🚀 タイムアウトを10秒に設定（2.5は少し時間がかかる場合がある）
      const result = await Promise.race([
        model.generateContent(systemPrompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Gemini 2.5 Flash timeout')), 10000)
        )
      ]);
      
      const response = await result.response;
      let jsonString = response.text().trim();
      
      console.log('✅ Gemini 2.5 Flash response received, length:', jsonString.length);
      
      // JSONの清理
      jsonString = this.cleanJsonResponse(jsonString);
      
      let parsedResult;
      try {
        parsedResult = JSON.parse(jsonString);
        console.log('✅ Successfully parsed Gemini 2.5 Flash response');
        
        // pageContentが空の場合は自動生成
        if (!parsedResult.pageContent || parsedResult.pageContent.trim() === '') {
          console.log('⚠️ Empty pageContent detected, generating WBS...');
          parsedResult.pageContent = this.generateWBS(text);
        }
        
        // プロパティの検証
        if (!parsedResult.properties) {
          console.log('⚠️ Missing properties, creating default structure...');
          parsedResult.properties = {
            ステータス: "未分類",
            種別: null,
            優先度: null,
            期限: null,
            成果物: null,
            レベル: null,
            案件: null,
            担当者: null
          };
        }
        
      } catch (parseError) {
        console.warn('❌ JSON parse failed with Gemini 2.5, using enhanced fallback...', parseError.message);
        console.log('Raw response preview:', jsonString.substring(0, 200) + '...');
        parsedResult = this.createEnhancedFallbackResponse(text);
      }
      
      // プロジェクト名を設定
      parsedResult.properties.Name = text;

      console.log('✅ Final analyzed data from Gemini 2.5 Flash:', {
        hasProperties: !!parsedResult.properties,
        hasPageContent: !!parsedResult.pageContent,
        propertiesKeys: Object.keys(parsedResult.properties || {}),
        pageContentLength: parsedResult.pageContent?.length || 0
      });
      
      return parsedResult;

    } catch (error) {
      console.error('❌ Error analyzing project with Gemini 2.5 Flash:', error.message);

      // Gemini 2.5 Flash特有のエラー処理
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        console.error('📊 Gemini 2.5 Flash rate limit exceeded');
        console.error('Current limits: RPM: 10, TPM: 250K, RPD: 500');
        console.error('📋 Suggestion: Wait 1-2 minutes before trying again');
      } else if (error.message.includes('timeout')) {
        console.error('⏰ Gemini 2.5 Flash request timed out (10 seconds)');
      } else if (error.message.includes('API key')) {
        console.error('🔑 API key issue. Check environment variable GEMINI_API_KEY');
      } else if (error.message.includes('model not found')) {
        console.error('🤖 Gemini 2.5 Flash model not available. Check API access');
      } else {
        console.error('🔍 Unknown error type:', error.message);
      }
      
      console.log('🔄 Using enhanced fallback response...');
      return this.createEnhancedFallbackResponse(text);
    }
  }

  // JSON応答の清理
  cleanJsonResponse(jsonString) {
    // ```json や ``` を削除
    jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    jsonString = jsonString.trim();
    
    // 最初の{から開始するように調整
    const jsonStart = jsonString.indexOf('{');
    if (jsonStart > 0) {
      jsonString = jsonString.substring(jsonStart);
    }
    
    // 最後の}で終わるように調整
    const jsonEnd = jsonString.lastIndexOf('}');
    if (jsonEnd > 0 && jsonEnd < jsonString.length - 1) {
      jsonString = jsonString.substring(0, jsonEnd + 1);
    }
    
    return jsonString;
  }

  // WBS自動生成
  generateWBS(text) {
    const textLower = text.toLowerCase();
    
    // プロジェクト系の判定を詳細化
    if (this.isProjectType(textLower)) {
      return this.generateProjectWBS(text);
    } else if (this.isTaskType(textLower)) {
      return this.generateTaskWBS(text);
    } else {
      return this.generateMemoWBS(text);
    }
  }

  isProjectType(textLower) {
    const projectKeywords = ['プロジェクト', '戦略', '企画', 'キャンペーン', '新規事業', '立ち上げ'];
    return projectKeywords.some(keyword => textLower.includes(keyword));
  }

  isTaskType(textLower) {
    const taskKeywords = ['作成', '制作', '開発', '分析', '資料', 'レポート'];
    return taskKeywords.some(keyword => textLower.includes(keyword));
  }

  generateProjectWBS(text) {
    return `## ${text}

### 🎯 プロジェクト概要
このプロジェクトの具体的な実行計画を段階的に示します。

### 📋 WBS（作業分解構成図）

#### フェーズ1: 調査・準備（初期段階）
- [ ] 現状分析の実施
- [ ] 要件定義の明確化
- [ ] リソースの確認と調整
- [ ] 関係者との調整
- [ ] スケジュールの仮策定

#### フェーズ2: 計画・設計（中核段階）
- [ ] 詳細計画の策定
- [ ] 設計・仕様の決定
- [ ] スケジュールの最終化
- [ ] 品質基準の設定
- [ ] リスク分析と対策

#### フェーズ3: 実行・展開（実行段階）
- [ ] 実行開始とキックオフ
- [ ] 進捗管理と調整
- [ ] 品質チェックと改善
- [ ] 関係者への定期報告
- [ ] 課題解決と軌道修正

#### フェーズ4: 完了・評価（最終段階）
- [ ] 成果物の最終確認
- [ ] 評価とフィードバック
- [ ] 改善点の整理と文書化
- [ ] 次回プロジェクトへの引き継ぎ
- [ ] 振り返りと知見の共有

### 📊 期待される成果物
1. プロジェクト計画書
2. 実行結果レポート
3. 改善提案書
4. 次回への申し送り事項

### 🎯 成功指標
- 計画通りの進捗達成
- 品質基準のクリア
- 関係者満足度の向上`;
  }

  generateTaskWBS(text) {
    return `## ${text}

### 📝 タスク概要
このタスクの効率的な実行手順を示します。

### ✅ 実行ステップ

#### ステップ1: 準備・情報収集
- [ ] 必要な情報の洗い出し
- [ ] 資料やツールの準備
- [ ] 作業環境の整備
- [ ] 関係者への確認

#### ステップ2: 計画・設計
- [ ] 作業手順の詳細化
- [ ] 完成イメージの明確化
- [ ] 品質基準の設定
- [ ] スケジュールの確認

#### ステップ3: 実行・作成
- [ ] 実際の作業開始
- [ ] 中間チェックポイント
- [ ] 品質確認と調整
- [ ] 必要に応じて修正

#### ステップ4: 完了・確認
- [ ] 最終確認と品質チェック
- [ ] 関係者への共有・報告
- [ ] フィードバックの収集
- [ ] 完了報告と次のアクション

### 📌 重要なポイント
- 期限を意識した効率的な実行
- 品質を担保するためのチェック
- 関係者との適切なコミュニケーション
- 完了時の適切な記録と共有`;
  }

  generateMemoWBS(text) {
    return `## ${text}

### 💭 アイデア・思考の整理
このアイデアを具体化するための検討事項を整理します。

### 🔍 検討ステップ

#### 1. 現状把握・分析
- [ ] 現在の状況を整理
- [ ] 課題や問題点の洗い出し
- [ ] 関連する情報の収集
- [ ] 既存の取り組みの確認

#### 2. アイデアの具体化
- [ ] アイデアの詳細化
- [ ] 実現可能性の検討
- [ ] 必要なリソースの確認
- [ ] 想定される効果の整理

#### 3. 実行計画の検討
- [ ] 具体的なアクションプランの作成
- [ ] スケジュールの検討
- [ ] 関係者の巻き込み方法
- [ ] 成功指標の設定

#### 4. 次のアクション
- [ ] 優先順位の決定
- [ ] 最初に取り組むべき項目の特定
- [ ] 関係者への相談・提案
- [ ] 具体的な実行開始

### 📝 メモ・備考
- このアイデアの背景や思考プロセス
- 関連する参考情報やヒント
- 今後検討すべき追加要素`;
    }
  }

  // 強化されたフォールバック応答
  createEnhancedFallbackResponse(text) {
    console.log('🔄 Creating enhanced fallback response...');
    const textLower = text.toLowerCase();
    
    // 基本構造（nullベース）
    let priority = null;
    let type = null;
    let level = null;
    let deliverable = null;
    let project = null;
    let deadline = null;
    let assignee = null;
    
    // 優先度判定 - 明確に記載されている場合のみ
    if (textLower.includes('緊急') || textLower.includes('至急') || textLower.includes('急ぎ')) {
      priority = "緊急";
    } else if (textLower.includes('重要') && !textLower.includes('重要な')) {
      priority = "重要";
    } else if (textLower.includes('普通')) {
      priority = "普通";
    } else if (textLower.includes('アイデア') || textLower.includes('メモ')) {
      priority = "アイデア";
    }
    
    // 種別判定 - 極めて明確な場合のみ
    if (textLower.includes('戦略策定') || textLower.includes('企画立案')) {
      type = "企画・戦略";
    } else if (textLower.includes('制作') && (textLower.includes('hp') || textLower.includes('サイト'))) {
      type = "制作・開発";
      deliverable = "コンテンツ";
    } else if (textLower.includes('システム開発') || textLower.includes('アプリ開発')) {
      type = "制作・開発";
      deliverable = "システム・ツール";
    } else if (textLower.includes('データ分析') || textLower.includes('効果測定')) {
      type = "分析・改善";
      deliverable = "レポート";
    }
    
    // レベル判定 - 明確に記載されている場合のみ
    if (textLower.includes('プロジェクト')) {
      level = "プロジェクト";
    } else if (textLower.includes('タスク')) {
      level = "タスク";
    } else if (textLower.includes('アクション')) {
      level = "アクション";
    } else if (textLower.includes('メモ') || textLower.includes('アイデア')) {
      level = "メモ";
    }
    
    // 案件判定 - キーワードが明確に含まれている場合のみ
    if (textLower.includes('oneマーケ') || textLower.includes('マーケラボ')) {
      project = "ONEマーケ/マーケラボ";
    } else if (textLower.includes('redeal') || textLower.includes('リディアル')) {
      project = "るい/redeal.";
    } else if (textLower.includes('池袋') || textLower.includes('サンシャイン')) {
      project = "池袋サンシャイン美容外科";
    } else if (textLower.includes('アンズボーテ')) {
      project = "アンズボーテ";
    } else if (textLower.includes('femuse') || textLower.includes('フェミューズ')) {
      project = "femuse";
    } else if (textLower.includes('spirits') || textLower.includes('スピリッツ')) {
      project = "SPIRITS";
    } else if (textLower.includes('talklabel') || textLower.includes('トークラベル')) {
      project = "TalkLabel";
    } else if (textLower.includes('junoa') || textLower.includes('ユノア')) {
      project = "JUNOa";
    } else if (textLower.includes('neam') || textLower.includes('ニーム')) {
      project = "neam";
    } else if (textLower.includes('onlyone') || textLower.includes('オンリーワン')) {
      project = "ONLYONE";
    }
    
    // 期限抽出 - 明確に日付が記載されている場合のみ
    const dateMatches = text.match(/(\d{1,2})月(\d{1,2})日|(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
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
        案件: project,
        担当者: assignee
      },
      pageContent: this.generateWBS(text)
    };

    console.log('✅ Fallback response created successfully');
    return fallbackResponse;
  }
}

module.exports = new ProjectAnalyzer();
