# 🚀 GitHub Pages 部署指南

## 为什么选择 GitHub Pages？

当前云服务器的端口被封，无法从外部访问。使用 GitHub Pages 是最佳解决方案：

✅ **完全免费** - 无需任何费用
✅ **全球可访问** - 任何地方都能打开
✅ **自动HTTPS** - 安全连接
✅ **CDN加速** - 访问速度快
✅ **稳定可靠** - GitHub托管
✅ **支持自定义域名**（可选）

---

## 📋 部署步骤

### 步骤1：注册 GitHub 账号（如果没有）

1. 访问：https://github.com
2. 点击"Sign up"注册
3. 验证邮箱

### 步骤2：创建新仓库

1. 登录 GitHub
2. 点击右上角 "+" → "New repository"
3. 填写信息：
   - Repository name: `daily-tracker`（或任意名称）
   - Description: `健康生活记录器`
   - 选择：Public（公开）
   - 勾选：Add a README file
4. 点击"Create repository"

### 步骤3：上传文件

**方法A：通过网页上传（最简单）**

1. 在创建的仓库页面，点击"Add file" → "Upload files"
2. 把以下文件拖拽上传：
   - `index.html`
   - `style.css`
   - `app.js`
   - `manifest.json`
3. 填写提交信息："Initial commit"
4. 点击"Commit changes"

**方法B：使用 Git（如果会用）**

```bash
git init
git add index.html style.css app.js manifest.json
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/daily-tracker.git
git push -u origin main
```

### 步骤4：启用 GitHub Pages

1. 在仓库页面，点击"Settings"
2. 左侧菜单找到"Pages"
3. 在"Source"下：
   - Branch: 选择 `main`
   - Folder: 选择 `/ (root)`
4. 点击"Save"

### 步骤5：等待部署

- GitHub 会自动部署（大约需要1-2分钟）
- 页面顶部会显示："Your site is live at ..."

---

## 📱 部署成功后访问

你的应用地址将是：

```
https://你的用户名.github.io/daily-tracker/
```

**例如：如果用户名是 `guiliangfeng`，地址就是：**
```
https://guiliangfeng.github.io/daily-tracker/
```

---

## 🎯 完整示例

### 假设你的 GitHub 用户名是 `guiliangfeng`：

1. **创建仓库：** `https://github.com/guiliangfeng/daily-tracker`
2. **上传4个文件：**
   - index.html
   - style.css
   - app.js
   - manifest.json
3. **启用 Pages 设置**
4. **等待1-2分钟**
5. **访问：** `https://guiliangfeng.github.io/daily-tracker/`

---

## 📂 需要上传的文件

从 `/root/.openclaw/workspace/daily-tracker/` 目录，只需要上传这4个文件：

```
index.html       (11 KB)
style.css        (12 KB)
app.js          (23 KB)
manifest.json    (682 B)
```

**总计：约 47 KB，非常小！**

---

## 🎉 部署成功后

### 在手机上使用：

1. **iPhone:**
   - Safari浏览器输入地址
   - 点击"分享" → "添加到主屏幕"

2. **Android:**
   - Chrome浏览器输入地址
   - 点击"三个点" → "添加到主屏幕"

### 分享给家人：

- 直接发送链接给家人
- 每个人都有独立的数据
- 互不影响

---

## 💡 GitHub Pages 的好处

### 与云服务器对比：

| 特性 | 云服务器 | GitHub Pages |
|------|---------|--------------|
| 费用 | 需要付费 | 完全免费 |
| 配置 | 需要配置防火墙 | 无需配置 |
| HTTPS | 需要证书 | 自动提供 |
| 速度 | 取决于服务器 | 全球CDN |
| 稳定性 | 可能宕机 | 99.9%在线 |
| 维护 | 需要维护 | 零维护 |

---

## 🔧 高级选项（可选）

### 自定义域名

如果你有自己的域名（如 `yourdomain.com`）：

1. 在域名DNS设置添加CNAME记录：
   - 主机记录：`@` 或 `www`
   - 记录值：`你的用户名.github.io`
2. 在GitHub仓库的Pages设置中添加自定义域名
3. 等待DNS生效（约1-24小时）

### 更新应用

如果以后要修改应用：

1. 修改本地文件
2. 在GitHub仓库页面，点击"Add file" → "Upload files"
3. 上传修改后的文件
4. GitHub会自动重新部署（1-2分钟）

---

## ❓ 常见问题

**Q: 需要懂代码吗？**
A: 不需要！只需要上传文件，点点鼠标就行。

**Q: 有流量限制吗？**
A: GitHub Pages 有100GB/月的带宽限制，个人使用完全够。

**Q: 数据安全吗？**
A: 安全！所有数据存在你的浏览器本地，GitHub只托管静态文件。

**Q: 可以私有仓库吗？**
A: 可以，但只有公开仓库才能免费使用GitHub Pages。

**Q: 会停止服务吗？**
A: GitHub Pages 是GitHub官方服务，非常稳定。

---

## 🎯 下一步

1. **注册 GitHub 账号**（如果没有）
2. **创建新仓库**
3. **上传4个文件**
4. **启用 Pages**
5. **访问你的应用！**

---

需要我帮你准备上传文件包吗？或者有任何问题随时问我！
