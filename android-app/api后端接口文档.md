# HealthyLifeRecorder 后端 API 接口文档

## 概述

- **技术栈**：.NET 8 Minimal API + MySQL
- **认证方式**：JWT Bearer Token
- **数据格式**：JSON（`Content-Type: application/json`）
- **CORS**：允许所有来源
- **基础 URL**：`https://<your-domain>`

---

## 通用约定

### 认证

需要认证的接口在请求头中携带 JWT Token：

```
Authorization: Bearer <token>
```

未携带 Token 时，系统使用默认用户 ID（兼容未登录的前端场景）。

### 日期/时间格式

| 字段 | 格式 | 示例 |
|------|------|------|
| 日期 | `yyyy-MM-dd` | `2026-03-14` |
| 时间 | `HH:mm` | `08:30` |
| 时间戳 | ISO 8601 | `2026-03-14T08:30:00.000+08:00` |

### 通用响应状态码

| 状态码 | 含义 |
|--------|------|
| `200 OK` | 成功 |
| `201 Created` | 创建成功 |
| `204 No Content` | 成功但无返回体（删除成功 / 数据为空） |
| `400 Bad Request` | 请求参数校验失败 |
| `401 Unauthorized` | 未认证或 Token 无效 |
| `404 Not Found` | 资源不存在 |
| `409 Conflict` | 资源冲突（如账号已存在） |

### 错误响应格式

```json
{
  "message": "错误描述"
}
```

---

## 1. 服务状态

### 1.1 服务信息

```
GET /
```

**认证**：不需要

**响应 200**：

```json
{
  "service": "DailyTracker Backend",
  "message": "Cloud sync service is running.",
  "endpoints": ["/health", "/snapshot", "/api/auth/register", "/api/auth/login"],
  "storage": "mysql"
}
```

### 1.2 健康检查

```
GET /health
```

**认证**：不需要

**响应 200**：

```json
{
  "status": "ok",
  "service": "daily-tracker-backend",
  "serverTime": "2026-03-14T08:30:00.0000000+00:00",
  "storage": "mysql"
}
```

---

## 2. 认证模块 `/api/auth`

### 2.1 注册

```
POST /api/auth/register
```

**认证**：不需要

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | **是** | 账号 |
| `password` | string | **是** | 密码（至少 6 位） |
| `nickname` | string | 否 | 昵称 |

**请求示例**：

```json
{
  "account": "zhangsan",
  "password": "123456",
  "nickname": "张三"
}
```

**响应 200**：

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "account": "zhangsan",
    "nickname": "张三"
  }
}
```

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | account 为空 | `account is required` |
| 400 | password 不足 6 位 | `password must be at least 6 characters` |
| 409 | 账号已存在 | `account already exists` |

### 2.2 登录

```
POST /api/auth/login
```

**认证**：不需要

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account` | string | **是** | 账号 |
| `password` | string | **是** | 密码 |

**请求示例**：

```json
{
  "account": "zhangsan",
  "password": "123456"
}
```

**响应 200**：

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "account": "zhangsan",
    "nickname": "张三"
  }
}
```

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | account 或 password 为空 | `account and password are required` |
| 401 | 账号不存在或密码错误 | _(无 body)_ |

### 2.3 获取当前用户

```
GET /api/auth/me
```

**认证**：**需要**

**响应 200**：

```json
{
  "id": 1,
  "account": "zhangsan",
  "nickname": "张三"
}
```

**错误响应**：

| 状态码 | 条件 |
|--------|------|
| 401 | 未携带 Token 或 Token 无效 |
| 404 | 用户不存在 |

---

## 3. 活动记录 `/api/activities`

### 3.1 按日期查询活动

```
GET /api/activities?date={date}
```

**参数**：

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| `date` | query | string | **是** | 日期，格式 `yyyy-MM-dd` |

**响应 200**：

```json
[
  {
    "id": 1,
    "userId": 1,
    "activityDate": "2026-03-14",
    "startTime": "08:30",
    "endTime": "09:00",
    "durationMinutes": 30,
    "type": "exercise",
    "content": "晨跑",
    "feeling": "精神很好",
    "imageUrl": null,
    "source": "template",
    "createdAt": "2026-03-14T08:30:00",
    "updatedAt": "2026-03-14T08:30:00"
  }
]
```

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | date 为空 | `date is required` |

### 3.2 创建活动

```
POST /api/activities
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `activityDate` | string | **是** | 活动日期 `yyyy-MM-dd` |
| `startTime` | string | 否 | 开始时间 `HH:mm` |
| `endTime` | string | 否 | 结束时间 `HH:mm` |
| `durationMinutes` | int | 否 | 持续时长（分钟） |
| `type` | string | **是** | 类型：`meal` \| `medication` \| `exercise` \| `sleep` \| `work` \| `other` |
| `content` | string | **是** | 活动内容 |
| `feeling` | string | 否 | 感受 |
| `imageUrl` | string | 否 | 图片 URL |
| `source` | string | 否 | 来源（如 `template`） |

**请求示例**：

```json
{
  "activityDate": "2026-03-14",
  "startTime": "08:30",
  "endTime": "09:00",
  "durationMinutes": 30,
  "type": "exercise",
  "content": "晨跑 3 公里",
  "feeling": "精神很好"
}
```

**响应 201**：返回创建的 `ActivityDto` 对象（同 3.1 中的单条结构）。

响应头包含 `Location: /api/activities/{id}`。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | activityDate 为空 | `activityDate is required` |
| 400 | type 为空 | `type is required` |
| 400 | content 为空 | `content is required` |

### 3.3 更新活动

```
PUT /api/activities/{id}
```

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | long | 活动 ID |

**请求体**：同 3.2 创建活动。

**响应 200**：返回更新后的 `ActivityDto` 对象。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | 必填字段为空 | 同 3.2 |
| 404 | ID 不存在 | `activity not found` |

### 3.4 删除活动

```
DELETE /api/activities/{id}
```

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | long | 活动 ID |

**响应 204**：删除成功（软删除），无返回体。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 404 | ID 不存在 | `activity not found` |

---

## 4. 健康数据 `/api/health-records`

### 4.1 按日期查询健康记录

```
GET /api/health-records?date={date}
```

**参数**：

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| `date` | query | string | **是** | 日期 `yyyy-MM-dd` |

**响应 200**：

```json
[
  {
    "id": 1,
    "userId": 1,
    "recordDate": "2026-03-14",
    "recordTime": "08:00",
    "type": "bloodPressure",
    "value": "120/80",
    "unit": "mmHg",
    "notes": "晨起测量",
    "imageUrl": null,
    "createdAt": "2026-03-14T08:00:00",
    "updatedAt": "2026-03-14T08:00:00"
  }
]
```

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | date 为空 | `date is required` |

### 4.2 创建健康记录

```
POST /api/health-records
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `recordDate` | string | **是** | 记录日期 `yyyy-MM-dd` |
| `recordTime` | string | 否 | 记录时间 `HH:mm` |
| `type` | string | **是** | 类型：`bloodPressure` \| `heartRate` \| `bloodSugar` \| `bloodLipid` \| `uricAcid` \| `other` |
| `value` | string | **是** | 数值（如 `"120/80"` 或 `"5.6"`） |
| `unit` | string | 否 | 单位：`mmHg` \| `bpm` \| `mmol/L` \| `umol/L` |
| `notes` | string | 否 | 备注 |
| `imageUrl` | string | 否 | 图片 URL |

**请求示例**：

```json
{
  "recordDate": "2026-03-14",
  "recordTime": "08:00",
  "type": "bloodPressure",
  "value": "120/80",
  "unit": "mmHg",
  "notes": "晨起测量"
}
```

**响应 201**：返回创建的 `HealthRecordDto` 对象。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | recordDate 为空 | `recordDate is required` |
| 400 | type 为空 | `type is required` |
| 400 | value 为空 | `value is required` |

### 4.3 更新健康记录

```
PUT /api/health-records/{id}
```

**路径参数**：`id` (long) - 记录 ID

**请求体**：同 4.2。

**响应 200**：返回更新后的 `HealthRecordDto` 对象。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | 必填字段为空 | 同 4.2 |
| 404 | ID 不存在 | `health record not found` |

### 4.4 删除健康记录

```
DELETE /api/health-records/{id}
```

**路径参数**：`id` (long) - 记录 ID

**响应 204**：删除成功（软删除）。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 404 | ID 不存在 | `health record not found` |

---

## 5. 症状记录 `/api/symptom-records`

### 5.1 按日期查询症状记录

```
GET /api/symptom-records?date={date}
```

**参数**：

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| `date` | query | string | **是** | 日期 `yyyy-MM-dd` |

**响应 200**：

```json
[
  {
    "id": 1,
    "userId": 1,
    "recordDate": "2026-03-14",
    "recordTime": "15:30",
    "description": "头痛，太阳穴位置胀痛",
    "measures": "服用布洛芬 1 片",
    "imageUrl": null,
    "createdAt": "2026-03-14T15:30:00",
    "updatedAt": "2026-03-14T15:30:00"
  }
]
```

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | date 为空 | `date is required` |

### 5.2 创建症状记录

```
POST /api/symptom-records
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `recordDate` | string | **是** | 记录日期 `yyyy-MM-dd` |
| `recordTime` | string | 否 | 记录时间 `HH:mm` |
| `description` | string | **是** | 症状描述 |
| `measures` | string | 否 | 已采取措施 |
| `imageUrl` | string | 否 | 图片 URL |

**请求示例**：

```json
{
  "recordDate": "2026-03-14",
  "recordTime": "15:30",
  "description": "头痛，太阳穴位置胀痛",
  "measures": "服用布洛芬 1 片"
}
```

**响应 201**：返回创建的 `SymptomRecordDto` 对象。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | recordDate 为空 | `recordDate is required` |
| 400 | description 为空 | `description is required` |

### 5.3 更新症状记录

```
PUT /api/symptom-records/{id}
```

**路径参数**：`id` (long) - 记录 ID

**请求体**：同 5.2。

**响应 200**：返回更新后的 `SymptomRecordDto` 对象。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | 必填字段为空 | 同 5.2 |
| 404 | ID 不存在 | `symptom record not found` |

### 5.4 删除症状记录

```
DELETE /api/symptom-records/{id}
```

**路径参数**：`id` (long) - 记录 ID

**响应 204**：删除成功（软删除）。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 404 | ID 不存在 | `symptom record not found` |

---

## 6. 提醒管理 `/api/reminders`

### 6.1 获取全部提醒

```
GET /api/reminders
```

**响应 200**：返回当前用户的所有提醒列表。

```json
[
  {
    "id": 1,
    "userId": 1,
    "title": "吃降压药",
    "type": "medication",
    "reminderDate": "2026-03-14",
    "reminderTime": "08:30",
    "repeatType": "daily",
    "notes": "饭后服用",
    "imageUrl": null,
    "completed": false,
    "completedAt": null,
    "snoozeUntil": null,
    "snoozeCount": 0,
    "createdAt": "2026-03-01T10:00:00",
    "updatedAt": "2026-03-01T10:00:00"
  }
]
```

### 6.2 获取今日提醒

```
GET /api/reminders/today
```

**响应 200**：返回 `reminderDate = 今天` 的提醒列表（结构同 6.1）。

### 6.3 获取即将到来的提醒

```
GET /api/reminders/upcoming
```

**响应 200**：返回日期 > 今天，或日期 = 今天但时间 > 当前时间的提醒列表（结构同 6.1）。

### 6.4 创建提醒

```
POST /api/reminders
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | **是** | 提醒标题 |
| `type` | string | **是** | 类型：`meal` \| `medication` \| `exercise` \| `sleep` \| `other` |
| `reminderDate` | string | **是** | 提醒日期 `yyyy-MM-dd` |
| `reminderTime` | string | **是** | 提醒时间 `HH:mm` |
| `repeatType` | string | 否 | 重复类型：`none`(默认) \| `daily` \| `weekly` \| `biweekly` \| `monthly` |
| `notes` | string | 否 | 备注 |
| `imageUrl` | string | 否 | 图片 URL |

**请求示例**：

```json
{
  "title": "吃降压药",
  "type": "medication",
  "reminderDate": "2026-03-14",
  "reminderTime": "08:30",
  "repeatType": "daily",
  "notes": "饭后服用"
}
```

**响应 201**：返回创建的 `ReminderDto` 对象。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | title 为空 | `title is required` |
| 400 | type 为空 | `type is required` |
| 400 | reminderDate 为空 | `reminderDate is required` |
| 400 | reminderTime 为空 | `reminderTime is required` |

### 6.5 更新提醒

```
PUT /api/reminders/{id}
```

**路径参数**：`id` (long) - 提醒 ID

**请求体**：同 6.4。

**响应 200**：返回更新后的 `ReminderDto` 对象。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | 必填字段为空 | 同 6.4 |
| 404 | ID 不存在 | `reminder not found` |

### 6.6 删除提醒

```
DELETE /api/reminders/{id}
```

**路径参数**：`id` (long) - 提醒 ID

**响应 204**：删除成功（软删除）。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 404 | ID 不存在 | `reminder not found` |

### 6.7 完成提醒

```
POST /api/reminders/{id}/complete
```

**路径参数**：`id` (long) - 提醒 ID

**请求体**：无

**响应 200**：返回更新后的 `ReminderDto` 对象（`completed = true`，`completedAt` 已填充）。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 404 | ID 不存在 | `reminder not found` |

### 6.8 重新打开提醒

```
POST /api/reminders/{id}/reopen
```

**路径参数**：`id` (long) - 提醒 ID

**请求体**：无

**响应 200**：返回更新后的 `ReminderDto` 对象（`completed = false`，`completedAt = null`）。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 404 | ID 不存在 | `reminder not found` |

### 6.9 延后提醒

```
POST /api/reminders/{id}/snooze
```

**路径参数**：`id` (long) - 提醒 ID

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `minutes` | int | **是** | 延后分钟数（必须 > 0） |

**请求示例**：

```json
{
  "minutes": 10
}
```

**响应 200**：返回更新后的 `ReminderDto` 对象（`snoozeUntil` 已更新，`snoozeCount` +1）。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | minutes <= 0 | `minutes must be greater than 0` |
| 404 | ID 不存在 | `reminder not found` |

---

## 7. 个人信息 `/api/profile`

### 7.1 获取个人信息

```
GET /api/profile
```

**响应 200**：

```json
{
  "userId": 1,
  "name": "张三",
  "gender": "male",
  "age": "35",
  "height": "175",
  "weight": "70",
  "bloodType": "A",
  "bloodPressure": "120/80",
  "bloodSugar": "5.6 mmol/L",
  "chronicConditions": "高血压",
  "allergies": "青霉素过敏",
  "medications": "降压药",
  "healthGoals": "每天运动 30 分钟",
  "notes": "",
  "createdAt": "2026-03-01T10:00:00",
  "updatedAt": "2026-03-14T08:00:00"
}
```

**响应 204**：该用户尚未设置个人信息（无返回体）。

### 7.2 创建/更新个人信息

```
PUT /api/profile
```

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 否 | 姓名 |
| `gender` | string | 否 | 性别：`male` \| `female` \| `other` \| `""` |
| `age` | string | 否 | 年龄 |
| `height` | string | 否 | 身高（cm） |
| `weight` | string | 否 | 体重（kg） |
| `bloodType` | string | 否 | 血型：`A` \| `B` \| `AB` \| `O` \| `""` |
| `bloodPressure` | string | 否 | 血压（如 `"120/80"`） |
| `bloodSugar` | string | 否 | 血糖（如 `"5.6 mmol/L"`） |
| `chronicConditions` | string | 否 | 慢性病史 |
| `allergies` | string | 否 | 过敏史 |
| `medications` | string | 否 | 用药情况 |
| `healthGoals` | string | 否 | 健康目标 |
| `notes` | string | 否 | 备注 |

**请求示例**：

```json
{
  "name": "张三",
  "gender": "male",
  "age": "35",
  "height": "175",
  "weight": "70",
  "bloodType": "A",
  "chronicConditions": "高血压",
  "medications": "降压药"
}
```

**响应 200**：返回更新后的 `ProfileDto` 对象（Upsert 语义，不存在则创建）。

---

## 8. 每日状态记录 `/api/daily-notes`

### 8.1 获取指定日期的状态记录

```
GET /api/daily-notes/{date}
```

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `date` | string | 日期 `yyyy-MM-dd` |

**响应 200**：

```json
{
  "id": 1,
  "userId": 1,
  "noteDate": "2026-03-14",
  "content": "今天精神不错，血压控制得比较好",
  "createdAt": "2026-03-14T09:00:00",
  "updatedAt": "2026-03-14T09:00:00"
}
```

**响应 204**：该日期尚无状态记录（无返回体）。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | date 为空 | `date is required` |

### 8.2 创建/更新指定日期的状态记录

```
PUT /api/daily-notes/{date}
```

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `date` | string | 日期 `yyyy-MM-dd` |

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `noteDate` | string | 否 | 日期（为空时自动使用路径中的 date） |
| `content` | string | **是** | 状态记录内容 |

**请求示例**：

```json
{
  "content": "今天精神不错，血压控制得比较好"
}
```

**响应 200**：返回创建/更新后的 `DailyNoteDto` 对象（Upsert 语义）。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | content 为空 | `content is required` |

### 8.3 删除指定日期的状态记录

```
DELETE /api/daily-notes/{date}
```

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `date` | string | 日期 `yyyy-MM-dd` |

**响应 204**：删除成功（软删除）。

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | date 为空 | `date is required` |
| 404 | 该日期无记录 | `daily note not found` |

---

## 9. 快照同步（旧版） `/snapshot`

> 旧版全量同步接口，用于将前端 localStorage/IndexedDB 数据整体上传/下载。新版按实体 CRUD 同步推荐使用上述各模块接口。

### 9.1 获取快照

```
GET /snapshot
```

**认证**：不需要

**响应 200**：

```json
{
  "snapshot": { ... },
  "updatedAt": "2026-03-14T08:30:00.0000000+00:00",
  "schemaVersion": 2,
  "savedAt": "2026-03-14T08:30:00.0000000+00:00"
}
```

**响应 204**：尚无快照数据。

### 9.2 保存快照

```
PUT /snapshot
```

**认证**：不需要

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `snapshot` | object | **是** | 完整的前端数据快照（JSON 对象） |
| `updatedAt` | string | 否 | 前端更新时间 |
| `schemaVersion` | int | 否 | Schema 版本号 |

**请求示例**：

```json
{
  "snapshot": {
    "activities": [...],
    "healthRecords": [...],
    "reminders": [...]
  },
  "updatedAt": "2026-03-14T08:30:00.000Z",
  "schemaVersion": 2
}
```

**响应 200**：

```json
{
  "message": "snapshot saved",
  "updatedAt": "2026-03-14T08:30:00.0000000+00:00",
  "savedAt": "2026-03-14T08:30:05.0000000+00:00"
}
```

**错误响应**：

| 状态码 | 条件 | message |
|--------|------|---------|
| 400 | snapshot 为空或 null | `snapshot is required` |

---

## 附录 A：数据模型汇总

### ActivityDto

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | long | 主键 |
| `userId` | long | 用户 ID |
| `activityDate` | string | 活动日期 |
| `startTime` | string? | 开始时间 |
| `endTime` | string? | 结束时间 |
| `durationMinutes` | int? | 持续时长（分钟） |
| `type` | string | 活动类型 |
| `content` | string | 活动内容 |
| `feeling` | string? | 感受 |
| `imageUrl` | string? | 图片 URL |
| `source` | string? | 来源 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

### HealthRecordDto

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | long | 主键 |
| `userId` | long | 用户 ID |
| `recordDate` | string | 记录日期 |
| `recordTime` | string? | 记录时间 |
| `type` | string | 健康数据类型 |
| `value` | string | 数值 |
| `unit` | string? | 单位 |
| `notes` | string? | 备注 |
| `imageUrl` | string? | 图片 URL |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

### SymptomRecordDto

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | long | 主键 |
| `userId` | long | 用户 ID |
| `recordDate` | string | 记录日期 |
| `recordTime` | string? | 记录时间 |
| `description` | string | 症状描述 |
| `measures` | string? | 已采取措施 |
| `imageUrl` | string? | 图片 URL |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

### ReminderDto

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | long | 主键 |
| `userId` | long | 用户 ID |
| `title` | string | 提醒标题 |
| `type` | string | 提醒类型 |
| `reminderDate` | string | 提醒日期 |
| `reminderTime` | string | 提醒时间 |
| `repeatType` | string | 重复类型（默认 `none`） |
| `notes` | string? | 备注 |
| `imageUrl` | string? | 图片 URL |
| `completed` | bool | 是否已完成 |
| `completedAt` | string? | 完成时间 |
| `snoozeUntil` | string? | 延后到的时间 |
| `snoozeCount` | int | 延后次数 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

### ProfileDto

| 字段 | 类型 | 说明 |
|------|------|------|
| `userId` | long | 用户 ID |
| `name` | string | 姓名 |
| `gender` | string | 性别 |
| `age` | string | 年龄 |
| `height` | string | 身高（cm） |
| `weight` | string | 体重（kg） |
| `bloodType` | string | 血型 |
| `bloodPressure` | string | 血压 |
| `bloodSugar` | string | 血糖 |
| `chronicConditions` | string | 慢性病史 |
| `allergies` | string | 过敏史 |
| `medications` | string | 用药情况 |
| `healthGoals` | string | 健康目标 |
| `notes` | string | 备注 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

### DailyNoteDto

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | long | 主键 |
| `userId` | long | 用户 ID |
| `noteDate` | string | 日期 |
| `content` | string | 状态记录内容 |
| `createdAt` | string | 创建时间 |
| `updatedAt` | string | 更新时间 |

### UserDto

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | long | 用户 ID |
| `account` | string | 账号 |
| `nickname` | string? | 昵称 |

### AuthResponseDto

| 字段 | 类型 | 说明 |
|------|------|------|
| `token` | string | JWT Token |
| `user` | UserDto | 用户信息 |

---

## 附录 B：枚举值速查

### 活动类型 (type)

| 值 | 含义 |
|----|------|
| `meal` | 饮食 |
| `medication` | 用药 |
| `exercise` | 运动 |
| `sleep` | 睡眠 |
| `work` | 工作 |
| `other` | 其他 |

### 健康数据类型 (type)

| 值 | 含义 | 数值格式 | 单位 |
|----|------|---------|------|
| `bloodPressure` | 血压 | `"120/80"` | mmHg |
| `heartRate` | 心率 | `"72"` | bpm |
| `bloodSugar` | 血糖 | `"5.6"` | mmol/L |
| `bloodLipid` | 血脂 | `"4.5"` | mmol/L |
| `uricAcid` | 尿酸 | `"360"` | umol/L |
| `other` | 其他 | 自由格式 | 自定义 |

### 提醒重复类型 (repeatType)

| 值 | 含义 |
|----|------|
| `none` | 不重复（默认） |
| `daily` | 每天 |
| `weekly` | 每周 |
| `biweekly` | 每两周 |
| `monthly` | 每月 |

---

## 附录 C：接口速查表

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `GET` | `/` | 服务信息 | 否 |
| `GET` | `/health` | 健康检查 | 否 |
| `GET` | `/snapshot` | 获取快照 | 否 |
| `PUT` | `/snapshot` | 保存快照 | 否 |
| `POST` | `/api/auth/register` | 注册 | 否 |
| `POST` | `/api/auth/login` | 登录 | 否 |
| `GET` | `/api/auth/me` | 获取当前用户 | **是** |
| `GET` | `/api/activities?date=` | 查询活动 | 可选 |
| `POST` | `/api/activities` | 创建活动 | 可选 |
| `PUT` | `/api/activities/{id}` | 更新活动 | 可选 |
| `DELETE` | `/api/activities/{id}` | 删除活动 | 可选 |
| `GET` | `/api/health-records?date=` | 查询健康记录 | 可选 |
| `POST` | `/api/health-records` | 创建健康记录 | 可选 |
| `PUT` | `/api/health-records/{id}` | 更新健康记录 | 可选 |
| `DELETE` | `/api/health-records/{id}` | 删除健康记录 | 可选 |
| `GET` | `/api/symptom-records?date=` | 查询症状记录 | 可选 |
| `POST` | `/api/symptom-records` | 创建症状记录 | 可选 |
| `PUT` | `/api/symptom-records/{id}` | 更新症状记录 | 可选 |
| `DELETE` | `/api/symptom-records/{id}` | 删除症状记录 | 可选 |
| `GET` | `/api/reminders` | 获取全部提醒 | 可选 |
| `GET` | `/api/reminders/today` | 获取今日提醒 | 可选 |
| `GET` | `/api/reminders/upcoming` | 获取即将到来的提醒 | 可选 |
| `POST` | `/api/reminders` | 创建提醒 | 可选 |
| `PUT` | `/api/reminders/{id}` | 更新提醒 | 可选 |
| `DELETE` | `/api/reminders/{id}` | 删除提醒 | 可选 |
| `POST` | `/api/reminders/{id}/complete` | 完成提醒 | 可选 |
| `POST` | `/api/reminders/{id}/reopen` | 重新打开提醒 | 可选 |
| `POST` | `/api/reminders/{id}/snooze` | 延后提醒 | 可选 |
| `GET` | `/api/profile` | 获取个人信息 | 可选 |
| `PUT` | `/api/profile` | 更新个人信息 | 可选 |
| `GET` | `/api/daily-notes/{date}` | 获取状态记录 | 可选 |
| `PUT` | `/api/daily-notes/{date}` | 更新状态记录 | 可选 |
| `DELETE` | `/api/daily-notes/{date}` | 删除状态记录 | 可选 |

> **认证说明**：标记为「可选」的接口在未携带 Token 时使用默认用户 ID，携带有效 Token 时使用 Token 中的用户 ID。
