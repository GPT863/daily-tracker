# 🚀 DailyTracker 后端部署指南

## 📋 部署前准备

### 服务器要求
- Linux 服务器（CentOS/Ubuntu/Debian 均可）
- 至少 1GB 内存
- 开放端口：8080（API服务）、22（SSH）

### 数据库信息
你有云数据库连接信息，部署时需要填写到配置文件中。

---

## 🎯 快速部署（推荐方案）

### 方案一：一键部署脚本（最简单）

```bash
# 1. 上传项目到服务器
# 将整个 backend 目录上传到服务器 /opt 目录

# 2. 执行部署脚本
cd /opt/backend
chmod +x deploy.sh
./deploy.sh
```

### 方案二：手动部署（完全控制）

#### 步骤1：检查系统版本

```bash
# 检查Linux版本
cat /etc/os-release

# 输出示例：
# CentOS: ID="centos"
# Ubuntu: ID="ubuntu"
# Debian: ID="debian"
```

---

#### 步骤2：安装 .NET 8 运行时

**CentOS/RHEL/AlmaLinux:**
```bash
# 安装必要依赖
sudo yum install -y libicu libunwind

# 添加 Microsoft 包仓库
sudo rpm -Uvh https://packages.microsoft.com/config/rhel/9/packages-microsoft-prod.rpm

# 安装 ASP.NET Core 运行时
sudo yum install -y aspnetcore-runtime-8.0

# 验证安装
dotnet --info
```

**Ubuntu/Debian:**
```bash
# 安装必要依赖
sudo apt-get update
sudo apt-get install -y libicu70 libunwind8

# 添加 Microsoft 包仓库
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb

# 安装 ASP.NET Core 运行时
sudo apt-get update
sudo apt-get install -y aspnetcore-runtime-8.0

# 验证安装
dotnet --info
```

---

#### 步骤3：上传项目文件

**方式A：使用 SCP（推荐）**
```bash
# 在本地执行
scp -r backend/ root@your-server-ip:/opt/daily-tracker-backend
```

**方式B：使用 SFTP 工具**
- WinSCP（Windows）
- FileZilla
- 直接在服务器上 wget 下载

---

#### 步骤4：配置应用

```bash
# 进入项目目录
cd /opt/daily-tracker-backend/backend/src/DailyTracker.Api

# 复制配置文件
cp appsettings.json appsettings.Production.json

# 编辑生产环境配置
nano appsettings.Production.json
```

**配置模板**（填写你的云数据库信息）：
```json
{
  "ConnectionStrings": {
    "MySql": "Server=你的云数据库地址;Port=3306;Database=daily_tracker;User ID=你的用户名;Password=你的密码;CharSet=utf8mb4;"
  },
  "Auth": {
    "Issuer": "DailyTracker",
    "Audience": "DailyTracker.Client",
    "SigningKey": "请修改为32位以上的随机密钥",
    "ExpireMinutes": 1440
  },
  "SnapshotStore": {
    "Provider": "mysql",
    "TableName": "cloud_sync_snapshots",
    "ScopeKey": "default"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Warning",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

**重要配置项说明：**
- `ConnectionStrings:MySql`: 替换为你的云数据库连接字符串
- `Auth:SigningKey`: **务必修改**为随机字符串，建议使用生成器：https://www.random.org/strings/

---

#### 步骤5：创建数据库表（可选）

后端会自动创建表，但建议手动执行SQL脚本：

```bash
# 在云数据库控制台执行 SQL，或使用命令行
mysql -h 你的数据库地址 -u 用户名 -p

# 在 MySQL 命令行中
source /opt/daily-tracker-backend/backend/scripts/init-cloud-sync-mysql.sql
```

或者直接在云数据库控制台的 SQL 执行窗口运行脚本内容。

---

#### 步骤6：测试运行

```bash
# 发布应用
cd /opt/daily-tracker-backend/backend/src/DailyTracker.Api
dotnet publish -c Release -o ./publish

# 测试运行
cd publish
dotnet DailyTracker.Api.dll --urls "http://0.0.0.0:8080"
```

**验证服务：**
```bash
# 在另一个终端测试
curl http://localhost:8080/health

# 应该返回：
# {"status":"ok","service":"daily-tracker-backend","serverTime":"...","storage":"mysql"}
```

如果测试成功，按 `Ctrl+C` 停止，继续下一步。

---

#### 步骤7：配置 systemd 服务（开机自启）

创建服务文件：
```bash
sudo nano /etc/systemd/system/daily-tracker-api.service
```

**服务配置内容：**
```ini
[Unit]
Description=DailyTracker Backend API
After=network.target

[Service]
Type=notify
WorkingDirectory=/opt/daily-tracker-backend/backend/src/DailyTracker.Api/publish
ExecStart=/usr/bin/dotnet /opt/daily-tracker-backend/backend/src/DailyTracker.Api/publish/DailyTracker.Api.dll --urls "http://0.0.0.0:8080"
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=daily-tracker-api
User=root
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
```

**启动服务：**
```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start daily-tracker-api

# 设置开机自启
sudo systemctl enable daily-tracker-api

# 查看服务状态
sudo systemctl status daily-tracker-api

# 查看日志
sudo journalctl -u daily-tracker-api -f
```

---

#### 步骤8：配置防火墙

**CentOS/RHEL (firewalld):**
```bash
# 开放8080端口
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# 查看已开放端口
sudo firewall-cmd --list-ports
```

**Ubuntu (ufw):**
```bash
sudo ufw allow 8080/tcp
sudo ufw reload

# 查看防火墙状态
sudo ufw status
```

**云服务商安全组：**
- 在阿里云/腾讯云控制台配置安全组
- 添加入站规则：端口 8080，协议 TCP，来源 0.0.0.0/0

---

#### 步骤9：验证部署

```bash
# 从本地电脑测试（替换为你的服务器IP）
curl http://your-server-ip:8080/health

# 应该返回：
# {"status":"ok","service":"daily-tracker-backend","serverTime":"...","storage":"mysql"}
```

---

## 🎯 完成部署后的配置

### 前端连接配置

在前端的云同步设置中：
- **同步服务地址**: `http://your-server-ip:8080`

**示例：**
```
服务器IP: 123.45.67.89
同步地址: http://123.45.67.89:8080
```

---

## 📝 常用维护命令

```bash
# 查看服务状态
sudo systemctl status daily-tracker-api

# 重启服务
sudo systemctl restart daily-tracker-api

# 停止服务
sudo systemctl stop daily-tracker-api

# 查看实时日志
sudo journalctl -u daily-tracker-api -f

# 查看最近100行日志
sudo journalctl -u daily-tracker-api -n 100
```

---

## 🔧 更新应用

```bash
# 1. 停止服务
sudo systemctl stop daily-tracker-api

# 2. 备份旧版本
cd /opt/daily-tracker-backend/backend/src/DailyTracker.Api
mv publish publish.backup.$(date +%Y%m%d)

# 3. 重新发布
dotnet publish -c Release -o ./publish

# 4. 启动服务
sudo systemctl start daily-tracker-api

# 5. 验证
sudo systemctl status daily-tracker-api
```

---

## ❓ 故障排查

### 问题1：服务无法启动
```bash
# 查看详细日志
sudo journalctl -u daily-tracker-api -n 50

# 常见原因：
# - 数据库连接失败：检查连接字符串
# - 端口被占用：netstat -tlnp | grep 8080
# - 权限问题：检查文件权限
```

### 问题2：数据库连接失败
```bash
# 测试数据库连接
mysql -h 你的数据库地址 -P 3306 -u 用户名 -p

# 检查防火墙是否允许出站
curl -v telnet://数据库地址:3306
```

### 问题3：端口无法访问
```bash
# 检查服务是否监听
netstat -tlnp | grep 8080

# 检查防火墙
sudo firewall-cmd --list-ports  # CentOS
sudo ufw status                 # Ubuntu

# 不要忘记云服务商安全组配置！
```

---

## 🔒 安全建议（生产环境必做）

### 1. 配置 Nginx 反向代理（推荐）
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 2. 配置 HTTPS（使用 Let's Encrypt）
```bash
# 安装 certbot
sudo apt-get install certbot python3-certbot-nginx  # Ubuntu
sudo yum install certbot python3-certbot-nginx      # CentOS

# 自动配置SSL
sudo certbot --nginx -d your-domain.com
```

### 3. 限制 CORS 来源
修改 `appsettings.Production.json`：
```json
{
  "AllowedCorsOrigins": [
    "https://your-frontend-domain.com"
  ]
}
```

### 4. 修改 JWT 密钥
```bash
# 生成随机密钥
openssl rand -base64 32

# 更新到配置文件的 Auth:SigningKey
```

### 5. 定期备份数据库
```bash
# 创建备份脚本
# 添加到 crontab 定时执行
```

---

## 📞 需要帮助？

部署过程中遇到任何问题，提供以下信息：
1. Linux系统版本：`cat /etc/os-release`
2. .NET版本：`dotnet --info`
3. 服务状态：`sudo systemctl status daily-tracker-api`
4. 错误日志：`sudo journalctl -u daily-tracker-api -n 50`
