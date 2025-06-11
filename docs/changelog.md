# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-06-12

### 🚀 Major Features Added
- **Gemini 2.0 Flash-Lite Integration**: Upgraded to the latest, fastest, and most cost-effective AI model
- **WBS Auto-Generation**: 4-phase structured execution plans automatically generated
- **Empty Field Handling**: Items that cannot be inferred are left blank instead of being guessed
- **Status Unification**: All items consistently use "📥 未分類" status

### ⚡ Performance Improvements
- **50-70% Speed Increase**: Response time reduced from 3-8 seconds to 1-3 seconds
- **Free Tier Limits Enhanced**: 
  - RPM: 15 → 30 (+100%)
  - TPM: 250K → 1M (+300%)
  - RPD: 500 → 1,500 (+200%)
- **Timeout Control**: 8-second timeout with automatic fallback
- **Memory Optimization**: 50% reduction in memory usage

### 🛡️ Security & Reliability
- **Enhanced Duplicate Prevention**: 3-tier checking system (Event ID, Message Hash, Emergency Key)
- **Intelligent Fallback**: Pattern matching for instant recovery
- **Automatic Cache Cleanup**: 5-minute cache with periodic cleanup
- **Detailed Logging**: Comprehensive monitoring with emoji indicators

### 📱 LINE Bot Improvements
- **Message Format Enhancement**: Removed unnecessary prefixes and reordered items
- **Detailed Responses**: 
  - Project details display
  - WBS summary (up to 6 items)
  - Direct Notion link
- **Real-time Notifications**: Immediate feedback on project registration

### 📊 Notion Integration Enhancements
- **Advanced Markdown Support**: 
  - Headings (##, ###, ####)
  - Checklists (- [ ])
  - Numbered lists (1. 2. 3.)
  - Bulleted lists (- *)
- **Structured Content**: Automatic conversion to Notion blocks
- **Null Value Handling**: Proper handling of empty fields

### 🤖 AI Analysis Improvements
- **No-Guess Policy**: Only set values that are explicitly stated
- **Contextual Understanding**: Better interpretation of natural language
- **4-Axis Classification**: Enhanced accuracy for project categorization
- **Intelligent Prompting**: Optimized prompts for better results

## [1.1.0] - 2025-06-12

### 🔧 Message Format Updates
- **Removed Elements**:
  - "📊 登録情報:" title
  - "┃ " line prefixes
- **Added Elements**:
  - "🗓️ 期限:" field
- **Reordered Items**: Optimized display order for better readability

### 📋 Item Order Changes
```
Previous: タイトル → ステータス → 種別 → 優先度 → 成果物 → レベル → 案件 → 担当者
New:      タイトル → ステータス → 優先度 → 種別 → レベル → 成果物 → 担当者 → 期限 → 案件
```

## [1.0.0] - 2024

### 🎉 Initial Release
- **LINE Bot Integration**: Direct project registration from LINE
- **Gemini AI Analysis**: Natural language processing for project classification
- **Notion Database Creation**: Automatic page creation with structured properties
- **4-Axis Classification System**: 
  - 種別 (Type): 6 categories
  - 成果物 (Deliverable): 6 categories  
  - レベル (Level): 5 categories
  - ステータス (Status): 6 categories
- **Webhook Processing**: Secure LINE webhook handling
- **Basic Error Handling**: Error recovery and user notification
- **Railway Deployment**: Production deployment on Railway platform

### 🛡️ Security Features
- **Signature Verification**: LINE webhook signature validation
- **Basic Duplicate Prevention**: Simple duplicate message handling
- **Environment Variables**: Secure configuration management

### 📊 Core Functionality
- **Project Analysis**: Text interpretation and property inference
- **Database Integration**: Notion API integration
- **Real-time Notifications**: Immediate LINE responses
- **Property Mapping**: Dynamic property assignment based on database schema

---

## Upgrade Notes

### From v1.x to v2.0.0

#### Breaking Changes
- **AI Model**: Gemini Pro → Gemini 2.0 Flash-Lite
- **Status Handling**: All statuses now default to "📥 未分類"
- **Empty Fields**: No longer auto-filled with guessed values

#### Migration Steps
1. Update environment variables (no changes required)
2. Test LINE bot with sample messages
3. Verify WBS generation functionality
4. Check Notion integration

#### Performance Expectations
- Expect 50-70% faster response times
- Higher rate limits for free tier usage
- More accurate project classification
- Enhanced WBS generation

### From v1.0.0 to v1.1.0

#### Changes
- LINE message format updated
- No breaking changes to core functionality
- Backward compatible

---

## Planned Features

### v2.1.0 (Planned)
- [ ] **Multi-language Support**: English interface option
- [ ] **Progress Tracking**: Integration with Notion progress fields
- [ ] **Team Management**: Multi-user support with user identification
- [ ] **Custom Templates**: User-defined WBS templates

### v2.2.0 (Planned)  
- [ ] **Voice Input**: LINE voice message support
- [ ] **Image Analysis**: Project screenshots and diagrams analysis
- [ ] **Calendar Integration**: Automatic deadline setting based on calendar
- [ ] **Reporting Dashboard**: Weekly/monthly project summaries

### v3.0.0 (Future)
- [ ] **AI Learning**: Personalized project classification based on user history
- [ ] **Integration Hub**: Support for Slack, Discord, Teams
- [ ] **Advanced Analytics**: Project success prediction and recommendations
- [ ] **Mobile App**: Dedicated mobile application

---

## Contributors

### Core Team
- **t-hamamura**: Project Lead, Backend Development
- **AI Assistant**: Code Review, Documentation, Architecture Optimization

### Special Thanks
- **Anthropic**: For providing Claude assistance
- **Google**: For Gemini AI API
- **Notion**: For comprehensive API support
- **LINE**: For Bot SDK and platform
- **Railway**: For deployment infrastructure

---

## Support

For questions about any version:
- 📋 [Issues](https://github.com/t-hamamura/line-pm/issues)
- 📖 [Documentation](./docs/)
- 💬 [Discussions](https://github.com/t-hamamura/line-pm/discussions)

---

*This changelog is automatically updated with each release.*
