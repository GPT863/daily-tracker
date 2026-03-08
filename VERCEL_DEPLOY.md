# 🚀 Vercel 部署指南（最简单！）

## 为什么选择 Vercel？

✅ **最简单** - 拖拽文件即可部署
✅ **完全免费** - 无限带宽
✅ **自动HTTPS** - 安全连接
✅ **全球CDN** - 极速访问
✅ **自定义域名** - 支持绑定
✅ **自动部署** - Git推送自动更新

---

## 📋 方法1：网页拖拽部署（推荐，1分钟搞定）

### 步骤1：访问 Vercel
1. 打开浏览器，访问：https://vercel.com
2. 点击右上角 "Sign Up" 或 "Login"
3. 使用以下任一方式登录：
   - GitHub 账号（推荐）
   - GitLab 账号
   - Bitbucket 账号
   - Email 注册

### 步骤2：创建新项目
1. 登录后，点击 "Add New Project"
2. 或者直接点击 "Deploy" 按钮

### 步骤3：上传文件
**选择 "Import" 或直接拖拽**

1. **方式A：拖拽部署**
   - 把整个 `daily-tracker` 文件夹拖到页面
   - 或者把这4个文件压缩成zip后拖拽

2. **方式B：从GitHub导入**（如果有Git仓库）
   - 点击 "Import Git Repository"
   - 选择你的 GitHub 仓库
   - Vercel 会自动检测并部署

### 步骤4：配置项目
1. **Project Name**: `daily-tracker`（自动生成）
2. **Framework Preset**: Other（静态网站）
3. **Root Directory**: `./`（根目录）
4. **Build Settings**: 无需配置（静态文件）

### 步骤5：部署
1. 点击 "Deploy"
2. 等待1-2分钟
3. 部署成功！显示你的网址

---

## 📱 部署成功后

你的应用地址将是：
```
https://daily-tracker.vercel.app
```

或如果名称被占用：
```
https://daily-tracker-你的用户名.vercel.app
```

---

## 📂 需要的文件

**只需这 4 个文件：**
```
daily-tracker/
├── index.html       (11 KB)
├── style.css        (12 KB)
├── app.js          (23 KB)
└── manifest.json    (682 B)
```

**总计：约 47 KB**

---

## 🎯 完整流程（图文说明）

### 准备文件
1. 在 `/root/.openclaw/workspace/daily-tracker/` 目录
2. 确认这4个文件存在

### 上传到 Vercel
1. 访问：https://vercel.com/new
2. 登录 GitHub 账号
3. 选择 "Upload" 或 "Import"
4. 上传文件或仓库
5. 点击 "Deploy"

### 获取网址
- 部署完成后，Vercel 会显示你的网址
- 类似：`https://daily-tracker.vercel.app`

---

## 💡 方法2：通过 GitHub + Vercel（自动化）

### 步骤1：创建 GitHub 仓库
1. GitHub 创建新仓库：`daily-tracker`
2. 上传 4 个文件（index.html, style.css, app.js, manifest.json）

### 步骤2：连接 Vercel
1. 访问：https://vercel.com/new
2. 点击 "Import Git Repository"
3. 选择你的 `daily-tracker` 仓库
4. Vercel 自动检测配置
5. 点击 "Deploy"

### 步骤3：自动更新
- 以后修改文件推送到 GitHub
- Vercel 自动重新部署
- 1-2分钟后生效

---

## 🌐 在手机上使用

### iPhone (Safari)
```
1. Safari 访问：https://daily-tracker.vercel.app
2. 点击"分享"按钮
3. 选择"添加到主屏幕"
4. 桌面出现图标，像APP一样使用
```

### Android (Chrome)
```
1. Chrome 访问：https://daily-tracker.vercel.app
2. 点击右上角"三个点"
3. 选择"添加到主屏幕"或"安装应用"
4. 桌面出现图标，像APP一样使用
```

---

## 🔧 高级功能

### 自定义域名
1. 在 Vercel 项目设置中
2. 点击 "Domains"
3. 添加你的域名（如：health.yourdomain.com）
4. 配置 DNS：CNAME 到 `cname.vercel-dns.com`

### 自动 HTTPS
- Vercel 自动提供 HTTPS 证书
- 无需手动配置
- 自动续期

### 环境变量
- 静态网站不需要
- 如需后端API，可在设置中添加

---

## 📊 Vercel vs 其他方案

| 特性 | Vercel | GitHub Pages | Netlify |
|------|--------|--------------|---------|
| 部署难度 | ⭐ 最简单 | ⭐⭐ 简单 | ⭐⭐ 简单 |
| 免费 SSL | ✅ | ✅ | ✅ |
| 全球 CDN | ✅ | ✅ | ✅ |
| 自动部署 | ✅ | ✅ | ✅ |
| 预览部署 | ✅ | ❌ | ✅ |
| 边缘函数 | ✅ | ❌ | ✅ |
| 带宽限制 | 100GB/月 | 100GB/月 | 100GB/月 |

---

## ❓ 常见问题

**Q: 需要信用卡吗？**
A: 不需要！免费版无需信用卡。

**Q: 有限制吗？**
A: 免费版：100GB带宽/月，个人使用完全够。

**Q: 可以离线使用吗？**
A: 可以！添加到主屏幕后，支持PWA离线功能。

**Q: 数据存在哪里？**
A: 所有数据存在你的浏览器本地，Vercel只托管静态文件。

**Q: 会停止服务吗？**
A: Vercel 是专业平台，稳定性99.9%以上。

**Q: 可以修改应用吗？**
A: 可以！修改文件后重新部署，1-2分钟生效。

---

## 🎯 快速开始

**现在就开始：**

1. 打开浏览器访问：https://vercel.com
2. 注册/登录账号
3. 上传 4 个文件或连接 GitHub
4. 等待 1-2 分钟
5. 获得你的应用网址！

**就这么简单！** 🎉

---

## 📞 需要帮助？

- Vercel 文档：https://vercel.com/docs
- 部署问题：检查文件是否完整
- 访问问题：等待1-2分钟让部署完成

**有任何问题随时问我！**
