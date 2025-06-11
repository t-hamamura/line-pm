# デプロイメントガイド

**line-pm システムのデプロイメント手順と設定**

## 📋 概要

line-pmシステムのデプロイメント方法について詳しく説明します。Railway（推奨）での自動デプロイメントから、手動デプロイメント、各種設定まで包括的にカバーしています。

## 🚀 Railway デプロイメント（推奨）

### 1. Railway セットアップ

#### Railway アカウント作成
1. [Railway](https://railway.app/) にアクセス
2. GitHub アカウントでサインアップ
3. ダッシュボードにアクセス

#### プロジェクト作成
```bash
# Railway CLI インストール（オプション）
npm install -g @railway/cli

# ログイン
railway login

# プロジェクト作成
railway init
```

### 2. GitHub連携デプロイ

#### リポジトリ接続
1. Railway ダッシュボードで「New Project」
2. 「Deploy from GitHub repo」を選択
3. `t-hamamura/line-pm` リポジトリを選択
4. 自動デプロイが開始

#### デプロイ設定
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install",
    "startCommand": "npm start"
  },
  "deploy": {
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### 3. 環境変数設定

#### Railway Web UI での設定
```bash
# Variables タブで以下を設定
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
GEMINI_API_KEY=your_gemini_api_key
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_notion_database_id
NODE_ENV=production
PORT=8080
```

#### Railway CLI での設定
```bash
# 環境変数の一括設定
railway variables set LINE_CHANNEL_ACCESS_TOKEN=your_token
railway variables set LINE_CHANNEL_SECRET=your_secret
railway variables set GEMINI_API_KEY=your_gemini_key
railway variables set NOTION_API_KEY=your_notion_key
railway variables set NOTION_DATABASE_ID=your_db_id
railway variables set NODE_ENV=production

# 設定確認
railway variables
```

### 4. カスタムドメイン設定

#### 独自ドメイン（オプション）
```bash
# カスタムドメイン追加
railway domain add yourdomain.com

# SSL証明書自動設定
# Railway が Let's Encrypt で自動発行
```

#### デフォルトドメイン
```
https://line-pm-production.up.railway.app
```

## 🔧 手動デプロイメント

### 1. VPS/クラウドサーバー

#### Ubuntu/Debian での手順
```bash
# Node.js インストール（NodeSource repository）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 インストール（プロセス管理）
sudo npm install -g pm2

# アプリケーションクローン
git clone https://github.com/t-hamamura/line-pm.git
cd line-pm

# 依存関係インストール
npm install --production

# 環境変数設定
sudo nano .env
# または
export LINE_CHANNEL_ACCESS_TOKEN=your_token
export LINE_CHANNEL_SECRET=your_secret
export GEMINI_API_KEY=your_gemini_key
export NOTION_API_KEY=your_notion_key
export NOTION_DATABASE_ID=your_db_id
export NODE_ENV=production
export PORT=8080

# PM2でアプリケーション起動
pm2 start src/index.js --name "line-pm"

# PM2 プロセス確認
pm2 status

# PM2 自動起動設定
pm2 startup
pm2 save
```

#### CentOS/RHEL での手順
```bash
# Node.js インストール（NodeSource repository）
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 以下は Ubuntu と同様
```

### 2. Docker デプロイメント

#### Dockerfile 作成
```dockerfile
# Dockerfile
FROM node:18-alpine

# 作業ディレクトリ設定
WORKDIR /app

# package.json をコピー
COPY package*.json ./

# 依存関係インストール
RUN npm ci --only=production

# アプリケーションコードをコピー
COPY src/ ./src/

# ポート公開
EXPOSE 8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# アプリケーション起動
CMD ["npm", "start"]
```

#### Docker Compose設定
```yaml
# docker-compose.yml
version: '3.8'

services:
  line-pm:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - LINE_CHANNEL_ACCESS_TOKEN=${LINE_CHANNEL_ACCESS_TOKEN}
      - LINE_CHANNEL_SECRET=${LINE_CHANNEL_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - NOTION_API_KEY=${NOTION_API_KEY}
      - NOTION_DATABASE_ID=${NOTION_DATABASE_ID}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # オプション: Redis キャッシュ
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
```

#### デプロイ実行
```bash
# 環境変数ファイル作成
cat > .env << EOF
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret
GEMINI_API_KEY=your_gemini_key
NOTION_API_KEY=your_notion_key
NOTION_DATABASE_ID=your_db_id
EOF

# Docker Compose でビルド・起動
docker-compose up -d

# ログ確認
docker-compose logs -f line-pm

# ヘルスチェック
curl http://localhost:8080/
```

## 🌐 Nginx リバースプロキシ設定

### 1. Nginx インストール・設定

```bash
# Nginx インストール
sudo apt-get install nginx

# 設定ファイル作成
sudo nano /etc/nginx/sites-available/line-pm
```

### 2. Nginx 設定内容

```nginx
# /etc/nginx/sites-available/line-pm
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # HTTPからHTTPSにリダイレクト
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL証明書設定（Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL設定
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # ログ設定
    access_log /var/log/nginx/line-pm.access.log;
    error_log /var/log/nginx/line-pm.error.log;

    # リバースプロキシ設定
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # ヘルスチェック用エンドポイント
    location /health {
        proxy_pass http://localhost:8080/;
        access_log off;
    }
}
```

### 3. SSL証明書設定（Let's Encrypt）

```bash
# Certbot インストール
sudo apt-get install certbot python3-certbot-nginx

# SSL証明書取得
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 自動更新設定
sudo crontab -e
# 以下を追加
0 12 * * * /usr/bin/certbot renew --quiet
```

### 4. Nginx 有効化

```bash
# 設定ファイルを有効化
sudo ln -s /etc/nginx/sites-available/line-pm /etc/nginx/sites-enabled/

# 設定テスト
sudo nginx -t

# Nginx 再起動
sudo systemctl restart nginx

# 自動起動設定
sudo systemctl enable nginx
```

## 🔐 セキュリティ設定

### 1. ファイアウォール設定

#### ufw（Ubuntu）
```bash
# ufw 有効化
sudo ufw enable

# 必要なポートのみ開放
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# 不要なポート閉鎖
sudo ufw deny 8080  # Nginxを経由するため直接アクセスを拒否

# 設定確認
sudo ufw status verbose
```

#### iptables
```bash
# 基本ルール設定
sudo iptables -F
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT

# 必要な通信許可
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT    # SSH
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT    # HTTP
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT   # HTTPS

# 設定保存
sudo iptables-save > /etc/iptables/rules.v4
```

### 2. アプリケーションセキュリティ

#### 専用ユーザー作成
```bash
# line-pm 専用ユーザー作成
sudo useradd -r -s /bin/false line-pm-user

# アプリケーションディレクトリの所有者変更
sudo chown -R line-pm-user:line-pm-user /opt/line-pm

# PM2 を専用ユーザーで実行
sudo -u line-pm-user pm2 start src/index.js --name "line-pm"
```

#### 環境変数セキュリティ
```bash
# 環境変数ファイルの権限制限
chmod 600 .env
chown line-pm-user:line-pm-user .env

# システム環境変数での設定（推奨）
sudo nano /etc/systemd/system/line-pm.service
```

```ini
# /etc/systemd/system/line-pm.service
[Unit]
Description=LINE PM Bot
After=network.target

[Service]
Type=simple
User=line-pm-user
WorkingDirectory=/opt/line-pm
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

# 環境変数
Environment=NODE_ENV=production
Environment=LINE_CHANNEL_ACCESS_TOKEN=your_token
Environment=LINE_CHANNEL_SECRET=your_secret
Environment=GEMINI_API_KEY=your_gemini_key
Environment=NOTION_API_KEY=your_notion_key
Environment=NOTION_DATABASE_ID=your_db_id

[Install]
WantedBy=multi-user.target
```

## 📊 監視・ログ設定

### 1. システム監視

#### PM2 Monitoring
```bash
# PM2 モニタリング
pm2 monit

# ログ確認
pm2 logs line-pm

# リソース使用量確認
pm2 show line-pm
```

#### Systemd での監視
```bash
# サービス状態確認
sudo systemctl status line-pm

# ログ確認
sudo journalctl -u line-pm -f

# 自動起動設定
sudo systemctl enable line-pm
```

### 2. ログ管理

#### ログローテーション設定
```bash
# logrotate 設定
sudo nano /etc/logrotate.d/line-pm
```

```
# /etc/logrotate.d/line-pm
/var/log/line-pm/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    create 644 line-pm-user line-pm-user
    postrotate
        pm2 reloadLogs
    endscript
}
```

#### 構造化ログ
```javascript
// ログ設定例（src/utils/logger.js）
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: '/var/log/line-pm/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: '/var/log/line-pm/combined.log' 
    })
  ]
});

module.exports = logger;
```

### 3. アラート設定

#### 基本アラート
```bash
# 簡易監視スクリプト
cat > /opt/line-pm/monitor.sh << 'EOF'
#!/bin/bash

# ヘルスチェック
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)

if [ "$response" != "200" ]; then
    echo "ERROR: line-pm is down (HTTP $response)"
    # メール通知やSlack通知
    # mail -s "line-pm Alert" admin@yourdomain.com < message.txt
    
    # アプリケーション再起動
    pm2 restart line-pm
fi
EOF

chmod +x /opt/line-pm/monitor.sh

# Cron で定期実行
echo "*/5 * * * * /opt/line-pm/monitor.sh" | crontab -
```

## 🔄 CI/CD パイプライン

### 1. GitHub Actions（Railway）

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linter
      run: npm run lint
    
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Railway
      uses: bervProject/railway-deploy@v1.0.0
      with:
        railway_token: ${{ secrets.RAILWAY_TOKEN }}
        service: line-pm
```

### 2. 手動デプロイ自動化

```bash
# deploy.sh
#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Git 最新取得
git pull origin main

# 依存関係更新
npm ci --only=production

# テスト実行
npm test

# アプリケーション再起動
pm2 reload line-pm

# ヘルスチェック
sleep 5
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)

if [ "$response" = "200" ]; then
    echo "✅ Deployment successful!"
else
    echo "❌ Deployment failed (HTTP $response)"
    exit 1
fi
```

## 🧪 ステージング環境

### 1. 環境分離

#### ブランチ戦略
```
main        → Production (Railway)
develop     → Staging (Railway Staging)
feature/*   → Development (Local)
```

#### 環境変数分離
```bash
# Production
LINE_CHANNEL_ACCESS_TOKEN=prod_token
NOTION_DATABASE_ID=prod_database_id

# Staging
LINE_CHANNEL_ACCESS_TOKEN=staging_token
NOTION_DATABASE_ID=staging_database_id
```

### 2. Railway ステージング

```bash
# Railway プロジェクト複製
railway init --name line-pm-staging

# 環境変数設定
railway variables set NODE_ENV=staging
railway variables set LINE_CHANNEL_ACCESS_TOKEN=staging_token
# ... 他の環境変数
```

## 📈 パフォーマンス最適化

### 1. Node.js最適化

#### プロダクション設定
```bash
# Node.js オプション
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=512"

# PM2 設定
pm2 start src/index.js \
  --name "line-pm" \
  --instances 2 \
  --max-memory-restart 400M \
  --node-args="--max-old-space-size=512"
```

#### キャッシュ設定
```javascript
// Redis キャッシュ（オプション）
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});

// メモリキャッシュ最適化
const LRU = require('lru-cache');
const cache = new LRU({
  max: 500,
  maxAge: 1000 * 60 * 5  // 5分
});
```

### 2. データベース最適化

#### Notion API最適化
```javascript
// バッチ処理
const batchSize = 10;
const batches = chunk(requests, batchSize);

for (const batch of batches) {
  await Promise.all(batch.map(processRequest));
  await sleep(1000);  // レート制限対策
}
```

## ❓ トラブルシューティング

### よくある問題

#### デプロイ失敗
```bash
# Railway ログ確認
railway logs --tail

# ローカルでの確認
npm start
curl http://localhost:8080/
```

#### 環境変数エラー
```bash
# 環境変数確認
railway variables

# 環境変数テスト
node -e "console.log(process.env.GEMINI_API_KEY)"
```

#### メモリ不足
```bash
# メモリ使用量確認
pm2 show line-pm

# メモリ制限追加
pm2 restart line-pm --max-memory-restart 400M
```

### 緊急時対応

#### サービス復旧手順
```bash
# 1. 即座のサービス停止
pm2 stop line-pm

# 2. 前回正常動作バージョンに復帰
git checkout HEAD~1

# 3. 依存関係再インストール
npm ci --only=production

# 4. サービス再起動
pm2 start line-pm

# 5. ヘルスチェック
curl http://localhost:8080/
```

## 📞 サポート

### デプロイメント関連の問題

#### 一般的な解決方法
1. **ログ確認**: Railway/PM2/Systemd ログ
2. **環境変数**: 設定値の確認
3. **ネットワーク**: ポート・ファイアウォール確認
4. **リソース**: CPU・メモリ使用量確認

#### 連絡先
- **GitHub Issues**: [line-pm/issues](https://github.com/t-hamamura/line-pm/issues)
- **Documentation**: [docs/](../docs/)
- **Troubleshooting**: [docs/troubleshooting.md](./troubleshooting.md)

---

*このデプロイメントガイドは、実際の運用経験を基に継続的に更新されています。新しいプラットフォームや方法については、随時追加していきます。*