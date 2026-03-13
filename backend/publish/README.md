# DailyTracker Backend API - 发布包

## 📦 包信息

- **发布日期**: 2026-03-13
- **框架**: .NET 8.0
- **配置**: Release 模式
- **运行时**: 依赖框架（需要服务器安装 .NET 8 运行时）

---

## 🚀 快速部署

### Windows Server 部署

```cmd
# 1. 解压发布包到目标目录，例如：C:\DailyTracker\Api

# 2. 打开命令提示符，进入目录
cd C:\DailyTracker\Api

# 3. 运行应用
DailyTracker.Api.exe

# 或者指定端口
DailyTracker.Api.exe --urls "http://0.0.0.0:8080"
```

### Linux Server 部署

```bash
# 1. 上传整个 publish 目录到服务器
scp -r publish/* root@your-server:/opt/daily-tracker-api/

# 2. SSH 登录服务器
ssh root@your-server

# 3. 进入目录
cd /opt/daily-tracker-api/

# 4. 给执行文件添加权限
chmod +x DailyTracker.Api

# 5. 运行应用
./DailyTracker.Api --urls "http://0.0.0.0:8080"
```

---

## ⚙️ 配置文件

### appsettings.json
- 默认配置文件
- 包含腾讯云 MySQL 数据库连接

### appsettings.Production.json
- 生产环境配置
- 部署前请修改以下内容：
  - **JWT 密钥**: `Auth:SigningKey` - 务必修改为随机字符串
  - **数据库连接**: `ConnectionStrings:MySql` - 如需使用其他数据库

---

## 📝 API 端点

### 健康检查
```
GET /health
```

### 云同步
```
GET  /snapshot        # 获取快照
PUT  /snapshot        # 上传快照
```

### 认证
```
POST /api/auth/register  # 注册账号
POST /api/auth/login     # 登录获取Token
GET  /api/auth/me        # 获取当前用户信息
```

### 活动记录
```
GET    /api/activities           # 获取活动列表
POST   /api/activities           # 创建活动
PUT    /api/activities/{id}      # 更新活动
DELETE /api/activities/{id}      # 删除活动
```

### 健康数据
```
GET    /api/health-records           # 获取健康记录
POST   /api/health-records           # 创建健康记录
PUT    /api/health-records/{id}      # 更新健康记录
DELETE /api/health-records/{id}      # 删除健康记录
```

### 提醒
```
GET    /api/reminders              # 获取提醒列表
GET    /api/reminders/today        # 获取今日提醒
POST   /api/reminders              # 创建提醒
PUT    /api/reminders/{id}         # 更新提醒
DELETE /api/reminders/{id}         # 删除提醒
POST   /api/reminders/{id}/complete # 完成提醒
```

---

## 🔧 环境要求

### 服务器要求
- **操作系统**: Windows Server 2016+, Ubuntu 18.04+, CentOS 7+, Debian 10+
- **内存**: 至少 512MB，推荐 1GB+
- **磁盘**: 至少 500MB 可用空间
- **网络**: 开放 8080 端口（或自定义端口）

### 运行时要求
- **Windows**: 安装 ASP.NET Core 8.0 Hosting Bundle
  - 下载: https://dotnet.microsoft.com/download/dotnet/8.0
- **Linux**: 安装 ASP.NET Core 8.0 运行时
  ```bash
  # Ubuntu/Debian
  apt-get install aspnetcore-runtime-8.0

  # CentOS/RHEL
  yum install aspnetcore-runtime-8.0
  ```

### 数据库要求
- **MySQL**: 5.7+ 或 8.0+
- **连接**: 允许服务器外网访问（云数据库需配置安全组）

---

## 🔐 配置为系统服务（Linux）

### 创建 systemd 服务

```bash
sudo nano /etc/systemd/system/daily-tracker-api.service
```

### 服务配置内容

```ini
[Unit]
Description=DailyTracker Backend API
After=network.target

[Service]
Type=notify
WorkingDirectory=/opt/daily-tracker-api
ExecStart=/usr/bin/dotnet /opt/daily-tracker-api/DailyTracker.Api.dll --urls "http://0.0.0.0:8080"
Restart=always
RestartSec=10
SyslogIdentifier=daily-tracker-api
User=root
Environment=ASPNETCORE_ENVIRONMENT=Production

[Install]
WantedBy=multi-user.target
```

### 启动服务

```bash
# 重载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start daily-tracker-api

# 开机自启
sudo systemctl enable daily-tracker-api

# 查看状态
sudo systemctl status daily-tracker-api

# 查看日志
sudo journalctl -u daily-tracker-api -f
```

---

## ✅ 验证部署

### 本地测试
```bash
curl http://localhost:8080/health
```

### 远程测试
```bash
curl http://your-server-ip:8080/health
```

### 预期返回
```json
{
  "status":"ok",
  "service":"daily-tracker-backend",
  "serverTime":"2026-03-13T12:00:00Z",
  "storage":"mysql"
}
```

---

## 🔒 安全建议

### 1. 修改 JWT 密钥
生成随机密钥：
```bash
# Linux
openssl rand -base64 32

# PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

更新到配置文件：
```json
{
  "Auth": {
    "SigningKey": "你生成的随机密钥"
  }
}
```

### 2. 配置防火墙
```bash
# CentOS/RHEL
firewall-cmd --permanent --add-port=8080/tcp
firewall-cmd --reload

# Ubuntu
ufw allow 8080/tcp
```

### 3. 配置 HTTPS（推荐）
使用 Nginx 反向代理 + Let's Encrypt 证书

### 4. 限制 CORS 来源
修改配置只允许前端域名访问

---

## 📊 前端连接配置

在 DailyTracker 前端应用的云同步设置中：

```
同步服务地址: http://your-server-ip:8080
```

---

## 📝 常用命令

### Windows
```cmd
# 查看进程
tasklist | findstr DailyTracker

# 结束进程
taskkill /F /IM DailyTracker.Api.exe
```

### Linux
```bash
# 查看进程
ps aux | grep DailyTracker

# 结束进程
pkill -f DailyTracker.Api

# 查看端口占用
netstat -tlnp | grep 8080
```

---

## 🔄 更新应用

### Windows
```cmd
# 1. 停止服务
taskkill /F /IM DailyTracker.Api.exe

# 2. 备份旧版本
xcopy C:\DailyTracker\Api C:\DailyTracker\Api.backup\%date% /E /I

# 3. 替换文件（保留配置文件）
# 复制新版本的文件到目录，排除 appsettings.Production.json

# 4. 启动服务
DailyTracker.Api.exe
```

### Linux
```bash
# 1. 停止服务
sudo systemctl stop daily-tracker-api

# 2. 备份旧版本
cp -r /opt/daily-tracker-api /opt/daily-tracker-api.backup.$(date +%Y%m%d)

# 3. 替换文件（保留配置文件）
# 上传新文件，排除 appsettings.Production.json

# 4. 启动服务
sudo systemctl start daily-tracker-api
```

---

## ❓ 故障排查

### 问题1: 服务启动失败
**检查日志**:
```bash
# Linux
journalctl -u daily-tracker-api -n 50

# Windows
# 查看控制台输出
```

**常见原因**:
- 端口被占用: `netstat -tlnp | grep 8080`
- .NET 运行时未安装: `dotnet --info`
- 配置文件错误: 检查 JSON 格式
- 数据库连接失败: 检查连接字符串

### 问题2: 数据库连接失败
**测试连接**:
```bash
mysql -h 数据库地址 -P 3306 -u 用户名 -p
```

**检查项目**:
- 数据库地址、端口是否正确
- 用户名、密码是否正确
- 数据库是否已创建
- 云数据库安全组是否允许服务器IP访问

### 问题3: 无法从外部访问
**检查项**:
1. 服务是否正常运行
2. 防火墙是否开放 8080 端口
3. 云服务商安全组是否配置
4. 服务器内部是否可以访问: `curl http://localhost:8080/health`

---

## 📞 技术支持

如遇问题，请提供以下信息：
1. 操作系统版本
2. .NET 版本 (`dotnet --info`)
3. 错误日志
4. 服务状态

---

## 📄 许可证

MIT License

---

**祝部署顺利！** 🎉
