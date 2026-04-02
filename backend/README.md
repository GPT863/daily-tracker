# DailyTracker Backend

后端项目目录，当前提供云同步第一版接口：

- `GET /health`
- `GET /snapshot`
- `PUT /snapshot`

当前已经支持两种快照存储：

- `file`：本地 JSON 文件持久化
- `mysql`：MySQL 持久化

当前配置支持统一复用 `ConnectionStrings:MySql`。各模块如果未单独填写自己的连接串，会自动回退到这条共享连接串。后续可按《健康生活记录器后端方案设计》继续演进到认证、结构化业务表和 AI 服务端代理。

当前还提供 JWT 认证第一版：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/send-sms`
- `POST /api/auth/login-sms`
- `GET /api/auth/me`

业务接口现在会优先读取 JWT 中的 `userId`；如果请求未携带 token，则仍会回退到各自配置里的 `DefaultUserId`，便于前后端分阶段联调。

当前还提供健康数据 CRUD 第一版：

- `GET /api/health-records?date=2026-03-12`
- `POST /api/health-records`
- `PUT /api/health-records/{id}`
- `DELETE /api/health-records/{id}`

以及症状记录 CRUD 第一版：

- `GET /api/symptom-records?date=2026-03-12`
- `POST /api/symptom-records`
- `PUT /api/symptom-records/{id}`
- `DELETE /api/symptom-records/{id}`

以及活动记录 CRUD 第一版：

- `GET /api/activities?date=2026-03-12`
- `POST /api/activities`
- `PUT /api/activities/{id}`
- `DELETE /api/activities/{id}`

以及提醒 CRUD / 动作接口第一版：

- `GET /api/reminders`
- `GET /api/reminders/today`
- `GET /api/reminders/upcoming`
- `POST /api/reminders`
- `PUT /api/reminders/{id}`
- `DELETE /api/reminders/{id}`
- `POST /api/reminders/{id}/complete`
- `POST /api/reminders/{id}/reopen`
- `POST /api/reminders/{id}/snooze`

- `GET /api/profile`
- `PUT /api/profile`

- `GET /api/daily-notes/{date}`
- `PUT /api/daily-notes/{date}`
- `DELETE /api/daily-notes/{date}`

## 目录结构

```text
backend/
  DailyTracker.Backend.sln
  data/
  src/
    DailyTracker.Api/
```

## 启动

```bash
cd backend/src/DailyTracker.Api
dotnet run
```

默认地址参考 `Properties/launchSettings.json`。

## 配置

`appsettings.json` 中可配置统一的 MySQL 连接，以及快照存储方式：

```json
{
  "ConnectionStrings": {
    "MySql": "Server=127.0.0.1;Port=3306;Database=daily_tracker;User ID=root;Password=123456;CharSet=utf8mb4;"
  },
  "SnapshotStore": {
    "Provider": "mysql",
    "FilePath": "../../data/cloud-sync-snapshot.json",
    "MySqlConnectionString": "",
    "TableName": "cloud_sync_snapshots",
    "ScopeKey": "default"
  }
}
```

如需让快照单独走另一套数据库，可单独填写 `SnapshotStore:MySqlConnectionString`；否则默认复用 `ConnectionStrings:MySql`。

认证配置示例：

```json
{
  "Auth": {
    "Issuer": "DailyTracker",
    "Audience": "DailyTracker.Client",
    "SigningKey": "请替换为足够长的生产密钥",
    "ExpireMinutes": 1440
  },
  "UserStore": {
    "ConnectionString": "Server=127.0.0.1;Port=3306;Database=daily_tracker;User ID=root;Password=123456;CharSet=utf8mb4;",
    "TableName": "users"
  }
}
```

短信认证说明：

- `POST /api/auth/send-sms` 请求体：`{ "phone": "13800138000" }`
- `POST /api/auth/login-sms` 请求体：`{ "account": "13800138000", "smsCode": "123456" }`
- 当前版本未接入真实短信网关，验证码由后端生成并写入服务日志
- 在 `Development` 环境下，`send-sms` 响应会额外返回 `debugCode` 便于联调
- `login-sms` 在手机号首次登录时会自动创建账号，再返回 JWT token

示例：

```json
{
  "SnapshotStore": {
    "Provider": "mysql",
    "MySqlConnectionString": "Server=127.0.0.1;Port=3306;Database=daily_tracker;User ID=root;Password=123456;CharSet=utf8mb4;"
  }
}
```

初始化脚本：

- [scripts/init-cloud-sync-mysql.sql](/d:/18健康记录daily-tracker/backend/scripts/init-cloud-sync-mysql.sql)

说明：

- 当前认证接口会在运行时自动尝试创建 `users` 表
- 当前后端会在运行时自动尝试创建 `cloud_sync_snapshots` 表
- 健康数据接口也会自动尝试创建 `health_records` 表
- 症状记录接口也会自动尝试创建 `symptom_records` 表
- 活动记录接口也会自动尝试创建 `activity_records` 表
- 提醒接口也会自动尝试创建 `reminders` 表
- 但生产环境仍建议先手工执行 SQL 脚本，再启动服务

## 健康数据接口说明

当前健康数据接口默认使用 `HealthRecordStore:DefaultUserId=1` 作为用户标识，便于在未接入登录前先联调前端。

示例请求：

```json
{
  "recordDate": "2026-03-12",
  "recordTime": "08:30",
  "type": "bloodPressure",
  "value": "120/80",
  "unit": "mmHg",
  "notes": "晨起测量",
  "imageUrl": ""
}
```
