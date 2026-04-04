# 健康日记 V1.0 第三期优化设计文档
# Phase 3 — 视觉与体验打磨

**日期：** 2026-04-04
**来源：** 健康日记V1.0评审报告.md — 🟡 低优先级 5 项
**范围：** 纯前端修改（index.html + style.css + app.js），无需后端变更

---

## 背景

评审发现 5 个视觉与体验问题，不影响核心功能但显著拉低整体品质感：

1. 空状态视觉单薄（仅一行灰色文字）
2. 提醒卡片列表中图片占比过大（约 120px 高）
3. 「添加提醒」表单与「添加活动」表单视觉风格割裂
4. 「我的」页面缺少用户 Profile Header
5. 首页 Header 底部边缘过渡生硬；全屏按钮遮挡 textarea 输入区

---

## 设计决策

### ⑬ 「我的」页 Profile Header（方案 B：卡片展开型）

**位置：** `#myPage` 页面顶部，功能列表 `.my-panel` 之上

**视觉：**
- 绿色渐变卡片（`linear-gradient(135deg, #1f7a3d, #4CAF50)`），`border-radius: 16px`
- 居中布局：头像（56px 圆形）→ 姓名（粗体 16px）→ 年龄·性别·BMI（12px 辅助色）
- 底部两枚标签：「档案 XX%」「今日 N 条」（`rgba(255,255,255,0.2)` 背景）

**数据来源：**
- 姓名、年龄、性别、身高、体重：读取 `profile` 对象
- BMI：`(weight / (height/100)²).toFixed(1)`，身高体重任一为空则隐藏
- 「今日 N 条」：`activities.length + healthRecords.length + symptomRecords.length`（当天数据）
- 头像：使用现有 `profile.avatar`，无头像时显示姓名首字（与个人信息页一致）

**空档案兜底：** 姓名为空时显示「健康用户」；BMI/年龄行数据不足时整行隐藏；底部改为单枚「完善个人档案 →」引导标签（点击跳转 `#profileModal`）

---

### ⑩ 空状态视觉升级（方案 A：大 emoji + 短文案 + 绿色 CTA）

**影响页面：** 活动、测量、症状、提醒（今日）

**统一结构（新增 CSS class `.empty-state-block`）：**
```
[emoji 图标 52px]
[主标题 15px 加粗]
[副标题 13px 灰色]
[CTA 按钮 绿色实心 pill]
```

**各页面内容：**

| 页面 | emoji | 主标题 | 副标题 | CTA |
|------|-------|--------|--------|-----|
| 活动 | 🏃 | 今天还没有活动记录 | 记录饮食、运动、用药等日常活动 | + 添加活动 |
| 测量 | 📊 | 今天还没有测量数据 | 记录血压、血糖、心率等健康指标 | + 去测量 |
| 症状 | 🩺 | 今天没有症状记录 | 记录身体不适，方便后续追踪 | + 记录症状 |
| 提醒（今日） | 🔔 | 今天没有提醒 | 添加服药、运动等定时提醒 | + 添加提醒 |

**CTA 行为：** 与各页面 header 右上角「+新增」按钮触发相同函数

**时间线空状态：** 保持现有文案，仅补充 emoji 图标（📋），不加 CTA（避免与顶部操作重复）

---

### ⑪ 提醒卡片图片缩略图化

**列表视图（`#reminderList`, `#todayReminderList`）：**
- 图片尺寸：56×56px，`border-radius: 8px`，`object-fit: cover`
- 位置：卡片右侧对齐，与文字内容左右排布（flex row）
- 无图片时不预留空位，卡片内容自动占满宽度

**详情弹窗（`#reminderAlertModal` 及编辑弹窗）：**
- 保留大图展示，`max-height: 160px`（与时间线图片一致）

**实现方式：** 修改 `renderReminderItem()` / `renderTodayReminderItem()` 中图片渲染的 HTML 结构和内联样式

---

### ⑫ 添加提醒表单视觉统一（方案 A：跟随活动表单）

**目标：** `#reminderModal` 内表单视觉与 `#activityModal` 完全一致

**具体改动（style.css）：**
- `#reminderModal .activity-form`：已有此 class，确认背景色为 `var(--mint-color)`（#dff5e4）
- 字段 `label`：`font-weight: 600; color: #1a1a1a; font-size: 14px`
- `input`, `select`, `textarea`：白色背景，`border-radius: 10px`，`border: 1px solid rgba(40,122,68,0.18)`
- 提交按钮：确认使用 `.btn-submit` class（与活动表单一致）

**HTML 侧：** `#reminderModal` 内层表单确认已有 `activity-form` class；若无则添加

---

### ⑭ Header 过渡 + 全屏按钮位置修复

**Header 底部过渡（style.css）：**
- `.app-header`：添加 `border-radius: 0 0 20px 20px`
- `.app-main`：添加 `margin-top: -8px; padding-top: 8px`，使第一张卡片自然叠压在 Header 圆角之下，形成层叠过渡感

**全屏按钮位置（style.css）：**
- `#dailyNoteFullscreenBtn`（`.daily-note-fullscreen-btn`）：
  - 将 `top: 8px` 改为 `bottom: 8px`
  - 保持 `right: 8px`
  - 效果：按钮移至 textarea 右下角，远离用户开始输入的左上区域

---

## 文件改动范围

| 文件 | 改动类型 |
|------|---------|
| `style.css` | 新增 `.empty-state-block` 样式；修改 `.app-header`、`.app-main`、`.daily-note-fullscreen-btn`、`#reminderModal` 相关样式 |
| `index.html` | `#myPage` 顶部插入 Profile Header 结构；各空状态 HTML 替换为新结构 |
| `app.js` | 新增/修改 `renderMyPage()` 渲染 Profile Header；修改 `renderReminderItem()` 使用缩略图；CTA 按钮绑定对应新增函数 |

---

## 验收标准

- [ ] 「我的」页顶部显示 Profile Header，数据来自 profile；无数据时显示引导
- [ ] 活动、测量、症状、提醒四处空状态均有 emoji + 文案 + CTA
- [ ] 提醒列表图片不超过 56×56px；提醒弹窗内大图正常显示
- [ ] 添加提醒表单背景色、字段样式与添加活动表单一致
- [ ] 首页 Header 底部有圆角过渡，不再有硬切断感
- [ ] 全屏按钮在 textarea 右下角，不遮挡输入区域
