# 📦 DailyTracker 后端部署工具包

本工具包提供了一套完整的后端部署解决方案，让你能够快速将 DailyTracker 后端部署到 Linux 服务器。

---

## 🎯 三步快速部署

### 方式一：Windows 用户（最简单）

```batch
# 1. 双击运行上传工具
upload-to-server.bat

# 2. 输入服务器信息：
#    - 服务器IP: 例如 123.45.67.89
#    - SSH用户名: root
#    - 目标路径: /opt/daily-tracker-backend

# 3. SSH 登录服务器
ssh root@your-server-ip

# 4. 进入项目目录并执行部署
cd /opt/daily-tracker-backend/backend
chmod +x deploy.sh
./deploy.sh
```

### 方式二：Mac/Linux 用户

```bash
# 1. 上传到服务器
scp -r backend/ root@your-server-ip:/opt/daily-tracker-backend

# 2. SSH 登录服务器
ssh root@your-server-ip

# 3. 进入项目目录并执行部署
cd /opt/daily-tracker-backend/backend
chmod +x deploy.sh
./deploy.sh
```

---

## 📋 部署前检查（推荐）

在执行部署前，建议先运行环境检查：

```bash
cd /opt/daily-tracker-backend/backend
chmod +x check-env.sh
./check-env.sh
```

检查项包括：
- ✅ 操作系统版本
- ✅ .NET 运行时
- ✅ 内存和磁盘空间
- ✅ 防火墙配置
- ✅ 端口占用情况
- ✅ systemd 支持

---

## 🔧 部署脚本功能说明

`deploy.sh` 脚本会自动完成以下任务：

1. **检测系统类型** - 自动识别 CentOS/Ubuntu/Debian
2. **安装 .NET 8** - 根据系统类型选择合适的安装命令
3. **配置防火墙** - 自动开放 8080 端口
4. **发布应用** - 执行 `dotnet publish` 编译项目
5. **创建服务** - 配置 systemd 服务，支持开机自启
6. **启动服务** - 启动 DailyTracker API 服务

---

## 📝 配置数据库

### 1. 编辑配置文件

部署完成后，编辑生产环境配置：

```bash
cd /opt/daily-tracker-backend/backend/src/DailyTracker.Api
nano appsettings.Production.json
```

### 2. 填写数据库信息

```json
{
  "ConnectionStrings": {
    "MySql": "Server=你的数据库地址;Port=3306;Database=daily_tracker;User ID=用户名;Password=密码;CharSet=utf8mb4;"
  },
  "Auth": {
    "SigningKey": "修改为32位以上随机字符串"
  }
}
```

### 3. 重启服务

```bash
systemctl restart daily-tracker-api
```

---

## ✅ 验证部署

### 1. 检查服务状态

```bash
systemctl status daily-tracker-api
```

应该显示 `active (running)`

### 2. 测试API接口

```bash
curl http://localhost:8080/health
```

应该返回：
```json
{
  "status":"ok",
  "service":"daily-tracker-backend",
  "serverTime":"...",
  "storage":"mysql"
}
```

### 3. 从外部访问

在本地电脑浏览器访问：
```
http://your-server-ip:8080/health
```

**如果无法访问，请检查：**
- 云服务商安全组是否开放 8080 端口
- 服务器防火墙是否开放 8080 端口
- 服务是否正常运行

---

## 🎯 前端连接配置

部署成功后，在前端应用的云同步设置中填写：

```
同步服务地址: http://your-server-ip:8080
```

---

## 📚 常用维护命令

```bash
# 查看服务状态
systemctl status daily-tracker-api

# 查看实时日志
journalctl -u daily-tracker-api -f

# 重启服务
systemctl restart daily-tracker-api

# 停止服务
systemctl stop daily-tracker-api

# 查看最近100行日志
journalctl -u daily-tracker-api -n 100
```

---

## 🔄 更新应用

当有新版本时：

```bash
# 1. 上传新的 backend 目录到服务器
scp -r backend/ root@your-server-ip:/opt/daily-tracker-backend/

# 2. SSH 登录服务器
ssh root@your-server-ip

# 3. 重新发布并重启
cd /opt/daily-tracker-backend/backend/src/DailyTracker.Api
dotnet publish -c Release -o ./publish
systemctl restart daily-tracker-api

# 4. 查看状态
systemctl status daily-tracker-api
```

---

## ❓ 常见问题

### 1. 服务启动失败

**查看详细日志：**
```bash
journalctl -u daily-tracker-api -n 50
```

**常见原因：**
- 数据库连接失败：检查连接字符串
- 端口被占用：`netstat -tlnp | grep 8080`
- .NET未安装：`dotnet --info`

### 2. 数据库连接失败

**测试连接：**
```bash
mysql -h 数据库地址 -P 3306 -u 用户名 -p
```

**检查项目：**
- 数据库地址、端口是否正确
- 用户名、密码是否正确
- 数据库是否已创建
- 云数据库是否允许外网访问

### 3. 端口无法访问

**检查服务监听：**
```bash
netstat -tlnp | grep 8080
```

**检查防火墙：**
```bash
# CentOS
firewall-cmd --list-ports

# Ubuntu
ufw status
```

**云服务商安全组：**
- 在阿里云/腾讯云控制台
- 配置入站规则：端口 8080，协议 TCP，来源 0.0.0.0/0

---

## 🔒 安全建议

生产环境建议配置：

1. **配置 HTTPS**
   - 使用 Nginx 反向代理
   - 申请 Let's Encrypt 免费证书

2. **限制 CORS**
   - 修改 `appsettings.Production.json`
   - 只允许前端域名访问

3. **修改 JWT 密钥**
   ```bash
   # 生成随机密钥
   openssl rand -base64 32
   ```

4. **定期备份数据库**

---

## 📞 需要帮助？

遇到问题时，提供以下信息：

1. 操作系统版本
   ```bash
   cat /etc/os-release
   ```

2. .NET 版本
   ```bash
   dotnet --info
   ```

3. 服务状态
   ```bash
   systemctl status daily-tracker-api
   ```

4. 错误日志
   ```bash
   journalctl -u daily-tracker-api -n 50
   ```

---

## 📄 文件说明

- `DEPLOYMENT.md` - 详细部署文档
- `DEPLOY_GUIDE.md` - 本文件，快速入门指南
- `deploy.sh` - 自动部署脚本
- `check-env.sh` - 环境检查脚本
- `upload-to-server.bat` - Windows上传工具

---

## 🎉 开始部署

现在就选择你的部署方式，开始部署吧！

建议先运行 `check-env.sh` 检查环境，然后执行 `deploy.sh` 自动部署。

祝你部署顺利！🚀
