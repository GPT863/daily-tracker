# 健康日记 Phase 3 视觉打磨 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 5 项视觉与体验打磨：空状态升级、提醒卡片缩略图、提醒表单统一、「我的」页 Profile Header、Header 过渡与全屏按钮位置修复。

**Architecture:** 纯前端修改，无新依赖。HTML 提供静态结构，CSS 提供样式，app.js 负责动态渲染。Profile Header 在 `switchPage('my')` 时调用新函数渲染；其余均为静态 HTML 替换或 CSS 调整。

**Tech Stack:** Vanilla JS, HTML5, CSS3（CSS 变量复用现有 `--primary-color`, `--forest-color`, `--mint-color`）

---

## 文件改动索引

| 文件 | 涉及 Task |
|------|----------|
| `style.css` | Task 1, 3, 5 |
| `index.html` | Task 2, 3, 4, 6 |
| `app.js` | Task 4, 5, 6 |

---

## Task 1：CSS 基础样式 — 空状态、Header 过渡、全屏按钮

**Files:**
- Modify: `style.css`

- [ ] **Step 1：在 style.css 末尾追加 `.empty-state-block` 样式**

在 `style.css` 文件末尾（`}` 最后一行后）追加：

```css
/* ── Phase 3: 空状态升级 ── */
.empty-state-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 36px 20px 28px;
    text-align: center;
    gap: 6px;
}

.empty-state-block .empty-icon {
    font-size: 52px;
    line-height: 1;
    margin-bottom: 8px;
}

.empty-state-block .empty-title {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
}

.empty-state-block .empty-subtitle {
    font-size: 13px;
    color: #999;
    margin: 0 0 12px;
}

.empty-state-block .empty-cta {
    display: inline-block;
    background: var(--primary-color);
    color: #fff;
    border: none;
    border-radius: 20px;
    padding: 9px 24px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.empty-state-block .empty-cta:hover {
    background: var(--forest-color);
}
```

- [ ] **Step 2：修改 `.app-header` 添加底部圆角**

找到 `style.css` 中：
```css
.app-header {
    background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%);
    color: white;
    padding: 10px 14px 8px;
```
在该规则块内（`}`之前）追加：
```css
    border-radius: 0 0 20px 20px;
```

- [ ] **Step 3：修改 `.app-main` 添加层叠过渡**

找到 `style.css` 中：
```css
.app-main {
    padding: var(--space-md);
    padding-bottom: calc(var(--space-md) + 85px + env(safe-area-inset-bottom));
    display: flex;
```
在该规则块内追加：
```css
    margin-top: -10px;
    padding-top: 18px;
    position: relative;
    z-index: 0;
```

- [ ] **Step 4：修改全屏按钮位置**

找到 `style.css` 中：
```css
.daily-note-fullscreen-btn {
    position: absolute;
    top: -14px;
    right: 16px;
```
将 `top: -14px;` 改为：
```css
    top: auto;
    bottom: 8px;
```
即整段改为：
```css
.daily-note-fullscreen-btn {
    position: absolute;
    top: auto;
    bottom: 8px;
    right: 16px;
```

- [ ] **Step 5：同步修复全屏模式下按钮位置**

找到：
```css
.daily-summary-card.fullscreen .daily-note-fullscreen-btn {
    top: 16px;
    right: 16px;
```
将 `top: 16px;` 改为：
```css
    top: 16px;
    bottom: auto;
```

- [ ] **Step 6：提交**

```bash
git add style.css
git commit -m "style: 空状态样式、Header圆角过渡、全屏按钮位置修复"
```

---

## Task 2：HTML 空状态替换（首页 + 记录页）

**Files:**
- Modify: `index.html`

涉及 4 处静态空状态 HTML：时间线、首页健康、首页提醒、记录页。

- [ ] **Step 1：替换时间线空状态（添加 emoji，保留现有按钮）**

找到：
```html
                    <div id="emptyState" class="empty-state">
                        <p>今天还没有记录哦</p>
                        <button type="button" id="timelineEmptyActionBtn" class="btn-empty-action">去添加</button>
                    </div>
```
替换为：
```html
                    <div id="emptyState" class="empty-state-block">
                        <div class="empty-icon">📋</div>
                        <p class="empty-title">今天还没有记录哦</p>
                        <p class="empty-subtitle">记录饮食、运动、用药等日常活动</p>
                        <button type="button" id="timelineEmptyActionBtn" class="empty-cta">去添加</button>
                    </div>
```

- [ ] **Step 2：替换首页「今日数据」空状态**

找到：
```html
                        <div id="healthEmptyState" class="empty-state small">
                            <p>今天还没有健康数据</p>
                            <button type="button" id="healthEmptyActionBtn" class="btn-empty-action">去测量</button>
                        </div>
```
替换为：
```html
                        <div id="healthEmptyState" class="empty-state-block">
                            <div class="empty-icon">📊</div>
                            <p class="empty-title">今天还没有测量数据</p>
                            <p class="empty-subtitle">记录血压、血糖、心率等健康指标</p>
                            <button type="button" id="healthEmptyActionBtn" class="empty-cta">+ 去测量</button>
                        </div>
```

- [ ] **Step 3：替换首页「今日提醒」空状态**

找到：
```html
                    <div id="todayRemindersEmptyState" class="empty-state small">
                        <p>今天还没有提醒哦</p>
                        <button type="button" id="reminderEmptyActionBtn" class="btn-empty-action">去添加</button>
                    </div>
```
替换为：
```html
                    <div id="todayRemindersEmptyState" class="empty-state-block">
                        <div class="empty-icon">🔔</div>
                        <p class="empty-title">今天没有提醒</p>
                        <p class="empty-subtitle">添加服药、运动等定时提醒</p>
                        <button type="button" id="reminderEmptyActionBtn" class="empty-cta">+ 添加提醒</button>
                    </div>
```

- [ ] **Step 4：替换记录页（活动/测量/症状）空状态**

找到：
```html
                        <div id="recordsEmptyState" class="empty-state">
                            <p id="recordsEmptyTitle">今天还没有活动记录</p>
                            <p id="recordsEmptyHint">点击右上角按钮添加第一条内容。</p>
                        </div>
```
替换为：
```html
                        <div id="recordsEmptyState" class="empty-state-block">
                            <div class="empty-icon" id="recordsEmptyIcon">🏃</div>
                            <p class="empty-title" id="recordsEmptyTitle">今天还没有活动记录</p>
                            <p class="empty-subtitle" id="recordsEmptySubtitle">记录饮食、运动、用药等日常活动</p>
                            <button type="button" id="recordsEmptyCta" class="empty-cta">+ 添加活动</button>
                        </div>
```

- [ ] **Step 5：提交**

```bash
git add index.html
git commit -m "feat: 替换首页与记录页空状态为新视觉结构"
```

---

## Task 3：app.js — 记录页空状态动态内容 + 提醒页空状态

**Files:**
- Modify: `app.js`

- [ ] **Step 1：更新 `updateRecordsPage` 中的空状态配置对象**

在 `app.js` 中找到三处 `emptyTitle` + `emptyHint`（约第 2826–2862 行），在每个配置对象中额外加入 `emptyIcon` 和 `emptySubtitle`：

**活动（已有 `emptyTitle: '今天还没有活动记录'`）：**
```js
emptyTitle: '今天还没有活动记录',
emptyIcon: '🏃',
emptySubtitle: '记录饮食、运动、用药等日常活动',
emptyCtaText: '+ 添加活动',
```

**测量（已有 `emptyTitle: '今天还没有测量记录'`）：**
```js
emptyTitle: '今天还没有测量数据',
emptyIcon: '📊',
emptySubtitle: '记录血压、血糖、心率等健康指标',
emptyCtaText: '+ 去测量',
```

**症状（已有 `emptyTitle: '今天还没有症状记录'`）：**
```js
emptyTitle: '今天没有症状记录',
emptyIcon: '🩺',
emptySubtitle: '记录身体不适，方便后续追踪',
emptyCtaText: '+ 记录症状',
```

- [ ] **Step 2：在 `updateRecordsPage` 中同步更新空状态 DOM**

找到（约第 2904–2910 行）：
```js
    if (config.items.length === 0) {
        list.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
```
替换为：
```js
    if (config.items.length === 0) {
        list.innerHTML = '';
        emptyState.style.display = 'flex';
        const iconEl = document.getElementById('recordsEmptyIcon');
        const subtitleEl = document.getElementById('recordsEmptySubtitle');
        const ctaEl = document.getElementById('recordsEmptyCta');
        const titleEl = document.getElementById('recordsEmptyTitle');
        if (iconEl) iconEl.textContent = config.emptyIcon || '📋';
        if (titleEl) titleEl.textContent = config.emptyTitle || '';
        if (subtitleEl) subtitleEl.textContent = config.emptySubtitle || '';
        if (ctaEl) {
            ctaEl.textContent = config.emptyCtaText || '+ 新增';
            ctaEl.onclick = () => document.getElementById('recordPrimaryActionBtn')?.click();
        }
        return;
    }
```

- [ ] **Step 3：更新提醒页「今日」tab 的 JS 空状态渲染**

找到（约第 5426–5428 行）：
```js
    container.innerHTML = todayReminders.length === 0
        ? '<div class="reminder-empty-state"><div class="reminder-empty-state-icon">📋</div><div class="reminder-empty-state-text">今天没有提醒</div></div>'
        : todayReminders.map(r => renderReminderItem(r)).join('');
```
替换为：
```js
    container.innerHTML = todayReminders.length === 0
        ? `<div class="empty-state-block">
            <div class="empty-icon">🔔</div>
            <p class="empty-title">今天没有提醒</p>
            <p class="empty-subtitle">添加服药、运动等定时提醒</p>
            <button class="empty-cta" onclick="document.getElementById('reminderHeaderAddBtn')?.click()">+ 添加提醒</button>
           </div>`
        : todayReminders.map(r => renderReminderItem(r)).join('');
```

- [ ] **Step 4：提交**

```bash
git add app.js
git commit -m "feat: 记录页与提醒页空状态动态内容适配"
```

---

## Task 4：Profile Header — HTML 结构

**Files:**
- Modify: `index.html`

- [ ] **Step 1：在 `#myModal` 的 `.my-panel` 前插入 Profile Header 容器**

找到：
```html
                <div class="my-panel">
                    <button id="exportBtn" class="my-panel-action">
```
在其上方插入：
```html
                <div id="myProfileHeader" class="my-profile-header">
                    <div class="my-profile-avatar" id="myProfileAvatar"></div>
                    <div class="my-profile-name" id="myProfileName">健康用户</div>
                    <div class="my-profile-meta" id="myProfileMeta"></div>
                    <div class="my-profile-tags" id="myProfileTags"></div>
                </div>
```

- [ ] **Step 2：提交**

```bash
git add index.html
git commit -m "feat: 我的页面插入 Profile Header HTML 结构"
```

---

## Task 5：Profile Header — CSS + app.js 渲染

**Files:**
- Modify: `style.css`, `app.js`

- [ ] **Step 1：在 style.css 末尾追加 Profile Header 样式**

```css
/* ── Phase 3: 我的页 Profile Header ── */
.my-profile-header {
    background: linear-gradient(135deg, var(--forest-color) 0%, var(--primary-color) 100%);
    border-radius: 16px;
    padding: 20px 16px;
    margin: 0 0 16px;
    text-align: center;
    color: #fff;
}

.my-profile-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.25);
    border: 2px solid rgba(255, 255, 255, 0.5);
    margin: 0 auto 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
    overflow: hidden;
}

.my-profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.my-profile-name {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 4px;
}

.my-profile-meta {
    font-size: 12px;
    opacity: 0.85;
    margin-bottom: 10px;
    min-height: 16px;
}

.my-profile-tags {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
}

.my-profile-tag {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 4px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s;
}

.my-profile-tag:hover {
    background: rgba(255, 255, 255, 0.35);
}
```

- [ ] **Step 2：在 app.js 中新增 `renderMyProfileHeader()` 函数**

在 app.js 中找到 `function switchPage` 定义（约第 2586 行），在其上方插入：

```js
function renderMyProfileHeader() {
    const avatarEl = document.getElementById('myProfileAvatar');
    const nameEl = document.getElementById('myProfileName');
    const metaEl = document.getElementById('myProfileMeta');
    const tagsEl = document.getElementById('myProfileTags');
    if (!avatarEl || !nameEl || !metaEl || !tagsEl) return;

    // 头像
    const name = profile.name || '';
    if (profile.avatar) {
        avatarEl.innerHTML = `<img src="${profile.avatar}" alt="头像">`;
    } else {
        avatarEl.textContent = name ? name.charAt(0) : '健';
    }

    // 姓名
    nameEl.textContent = name || '健康用户';

    // 年龄·性别·BMI 行
    const parts = [];
    if (profile.age) parts.push(`${profile.age}岁`);
    const genderMap = { male: '男', female: '女' };
    if (profile.gender && genderMap[profile.gender]) parts.push(genderMap[profile.gender]);
    const h = parseFloat(profile.height);
    const w = parseFloat(profile.weight);
    if (h > 0 && w > 0) {
        const bmi = (w / Math.pow(h / 100, 2)).toFixed(1);
        parts.push(`BMI ${bmi}`);
    }
    metaEl.textContent = parts.join(' · ');

    // 标签行
    const todayCount = activities.length + healthRecords.length + symptomRecords.length;
    const completeness = calculateProfileCompleteness(); // 复用现有函数

    if (!name && !profile.age && !profile.gender) {
        // 空档案：显示引导
        tagsEl.innerHTML = `<span class="my-profile-tag" onclick="document.getElementById('profileBtn')?.click()">完善个人档案 →</span>`;
    } else {
        tagsEl.innerHTML = `
            <span class="my-profile-tag">档案 ${completeness}%</span>
            <span class="my-profile-tag">今日 ${todayCount} 条</span>
        `;
    }
}
```

- [ ] **Step 3：在 `switchPage` 中调用 `renderMyProfileHeader()`**

找到：
```js
function switchPage(page, isBack = false) {
    if (!isBack && currentPage && currentPage !== page) {
        pageHistory.push(currentPage);
    }
    currentPage = page;
    updatePageDisplay();
```
在 `updatePageDisplay();` 之后添加：
```js
    if (page === 'my') {
        renderMyProfileHeader();
    }
```

- [ ] **Step 4：验证 `calculateProfileCompleteness` 函数存在**

```bash
grep -n "function calculateProfileCompleteness" app.js
```
如果不存在，改用以下替代计算（在 `renderMyProfileHeader` 内替换 `calculateProfileCompleteness()` 调用）：
```js
const fields = ['name','gender','age','height','weight','bloodType','bloodPressure','bloodSugar','chronicConditions','allergies','medications','smoking','drinking','exercise','sleepHours','healthGoals','notes'];
const filled = fields.filter(f => profile[f] && String(profile[f]).trim() !== '').length;
const pct = Math.round(filled / fields.length * 100);
```

- [ ] **Step 5：提交**

```bash
git add style.css app.js
git commit -m "feat: 我的页面 Profile Header 样式与动态渲染"
```

---

## Task 6：提醒卡片图片缩略图化

**Files:**
- Modify: `app.js`

- [ ] **Step 1：修改 `renderReminderItem` 中图片渲染部分**

找到（约第 5595–5622 行）整段 return 模板字符串，将图片段落：
```js
            ${reminder.image ? `
                <div class="reminder-detail-image-wrap">
                    <img class="reminder-detail-image" src="${reminder.image}" alt="${escapeHtml(reminder.title)}">
                </div>
            ` : ''}
```
替换为缩略图渲染（移到 header 右侧）：

将整个 return 模板字符串改为：
```js
    return `
        <div class="reminder-detail-item ${isCompleted ? 'completed' : ''} ${isPast && !isCompleted ? 'overdue' : ''}">
            <div class="reminder-detail-header" style="display:flex;align-items:flex-start;gap:10px;">
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span class="reminder-detail-time">${timeStr}</span>
                        <span class="reminder-detail-date">${dateStr}</span>
                        ${repeatLabel ? `<span style="font-size:0.8rem;">🔄 ${repeatLabel}</span>` : ''}
                    </div>
                    <div class="reminder-detail-title">${escapeHtml(reminder.title)}</div>
                    ${(reminder.notes || snoozeInfo) ? `<div class="reminder-detail-notes">${escapeHtml([reminder.notes, snoozeInfo].filter(Boolean).join(' · '))}</div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
                    <span style="font-size:20px;">${typeIcons[reminder.type] || ''}</span>
                    ${reminder.image ? `<img src="${reminder.image}" alt="" style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0;">` : ''}
                </div>
            </div>
            <div class="reminder-detail-actions">
                ${!isCompleted ? `<button class="btn-action btn-edit" onclick="editReminder('${reminder.id}')">编辑</button>` : ''}
                <button class="btn-action btn-complete" onclick="completeReminder('${reminder.id}')">
                    ${isCompleted ? '✓ 已完成' : '标记完成'}
                </button>
                <button class="btn-action btn-delete" onclick="deleteReminder('${reminder.id}')">删除</button>
            </div>
        </div>
    `;
```

- [ ] **Step 2：提交**

```bash
git add app.js
git commit -m "feat: 提醒卡片列表图片改为56px缩略图"
```

---

## Task 7：添加提醒表单视觉统一

**Files:**
- Modify: `index.html`, `style.css`

- [ ] **Step 1：给提醒表单添加 `activity-form` class**

找到：
```html
                <form id="reminderForm" class="reminder-form">
```
改为：
```html
                <form id="reminderForm" class="reminder-form activity-form">
```

- [ ] **Step 2：检查 `.reminder-form` 是否有覆盖背景色的样式**

```bash
grep -n "reminder-form" style.css
```
如果有 `background` 声明与 `.activity-form` 冲突，在 style.css 中添加：
```css
/* Task 7: 提醒表单视觉统一 */
#reminderFormModal .activity-form {
    background: var(--mint-color);
}
```

- [ ] **Step 3：提交**

```bash
git add index.html style.css
git commit -m "style: 提醒表单添加activity-form class，与活动表单视觉统一"
```

---

## 验收检查清单

浏览器打开 `http://localhost:8080`，手机模拟器（390×844）下逐项验证：

- [ ] **空状态**：清空本地数据后，活动/测量/症状/提醒/时间线均显示 emoji + 标题 + 副标题 + CTA 按钮；点击 CTA 能正确触发对应弹窗
- [ ] **记录页 Tab 切换**：切换活动/测量/症状时，空状态 emoji 和文案随之切换
- [ ] **Profile Header**：进入「我的」页显示绿色渐变卡片，有头像/姓名/BMI/今日条数；清空 profile 后显示「完善个人档案」引导
- [ ] **提醒卡片缩略图**：有图片的提醒在列表中图片为 56×56px；到点提醒弹窗中图片正常大图显示
- [ ] **提醒表单**：「添加提醒」表单背景与「添加活动」一致（浅绿色），字段样式统一
- [ ] **Header 过渡**：首页绿色 Header 底部有圆角（20px），与下方卡片自然层叠
- [ ] **全屏按钮**：「今日状态记录」区域的全屏按钮在 textarea 右下角，不遮挡输入起始位置
