# DailyTracker 后端多端同步加固实施方案

> **For Claude：** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 将当前后端从“前后端联调用后端”升级为“可支撑多设备可靠同步”的正式同步服务。

**架构思路：** 保留现有 ASP.NET Core Minimal API + MySQL 的整体结构，不推倒重来；在现有按业务分表的基础上，补齐认证边界、记录级同步元数据、增量同步接口和冲突检测能力。第一阶段避免过度设计，不引入 CRDT、事件溯源等复杂同步模型。

**技术栈：** ASP.NET Core Minimal API、MySqlConnector、JWT Bearer、MySQL、浏览器 IndexedDB / localStorage 客户端

---

### 任务 1：收紧认证边界

**涉及文件：**
- 修改：`backend/src/DailyTracker.Api/Program.cs`
- 修改：`backend/src/DailyTracker.Api/appsettings.json`
- 修改：`backend/README.md`

**步骤 1：移除默认用户兜底逻辑**

- 删除未登录请求自动回退 `DefaultUserId` 的行为。
- 所有业务接口统一只从 JWT 中解析用户身份。
- 请求未携带有效 token 时直接返回 `401`。

**步骤 2：为所有业务路由组启用强制鉴权**

- 对以下路由组统一加 `.RequireAuthorization()`：
  - `/api/activities`
  - `/api/health-records`
  - `/api/symptom-records`
  - `/api/reminders`
  - `/api/profile`
  - `/api/daily-notes`
- 保持以下接口仍为公开接口：
  - `/`
  - `/health`
  - `/api/auth/register`
  - `/api/auth/login`

**步骤 3：去掉运行时对 `DefaultUserId` 的依赖**

- 配置里如果暂时还保留 `DefaultUserId`，也不能再参与正式请求鉴权逻辑。
- 如需兼容迁移，可保留字段，但不能继续作为生产请求的用户兜底。

**步骤 4：移除仓库中的明文密钥**

- 将 `backend/src/DailyTracker.Api/appsettings.json` 中提交到仓库的 MySQL 连接串和 JWT 签名密钥替换为占位值。
- 生产环境改为环境变量或部署配置注入。

**步骤 5：验证**

- 未登录访问 `/api/activities?date=2026-04-02` 返回 `401`。
- 登录后携带 token 访问同接口可正常返回数据。

**步骤 6：提交**

```bash
git add backend/src/DailyTracker.Api/Program.cs backend/src/DailyTracker.Api/appsettings.json backend/README.md
git commit -m "feat: require auth for sync endpoints"
```

### 任务 2：统一前后端认证接口契约

**涉及文件：**
- 修改：`backend/src/DailyTracker.Api/Program.cs`
- 新建：`backend/src/DailyTracker.Api/Models/AuthSendSmsRequest.cs`
- 新建：`backend/src/DailyTracker.Api/Models/AuthLoginSmsRequest.cs`
- 修改：`backend/README.md`

**步骤 1：先确定认证范围**

- 如果当前阶段不需要短信登录，就不要继续保留前端对短信接口的依赖。
- 如果短信登录是上线必须项，则补齐：
  - `POST /api/auth/send-sms`
  - `POST /api/auth/login-sms`

**步骤 2：建议第一阶段先收敛能力**

- 第一阶段建议只保留以下认证能力：
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
- 短信登录单独作为下一阶段需求，避免同步主链路被认证扩展拖慢。

**步骤 3：验证**

- 前端认证页面不再调用后端不存在的接口。
- 如果保留短信登录，则前后端接口路径、请求体、响应体需完全一致。

**步骤 4：提交**

```bash
git add backend/src/DailyTracker.Api backend/README.md
git commit -m "chore: align auth API surface with frontend"
```

### 任务 3：为每条业务记录增加同步元数据

**涉及文件：**
- 修改：`backend/scripts/init-cloud-sync-mysql.sql`
- 修改：`backend/src/DailyTracker.Api/Models/ActivityDto.cs`
- 修改：`backend/src/DailyTracker.Api/Models/ReminderDto.cs`
- 修改：`backend/src/DailyTracker.Api/Models/DailyNoteDto.cs`
- 修改：`backend/src/DailyTracker.Api/Models/ActivityUpsertRequest.cs`
- 修改：`backend/src/DailyTracker.Api/Models/ReminderUpsertRequest.cs`
- 修改：健康记录、症状记录、资料、日记对应的 DTO / Request / Store 文件

**步骤 1：增加客户端稳定标识**

- 为每条记录增加 `client_id` 字段，作为客户端生成的稳定 ID。
- 首次创建时由客户端生成 UUID。
- 在数据库中为 `(user_id, client_id)` 建唯一索引，保证同一用户下逻辑记录唯一。

**步骤 2：增加同步和冲突检测字段**

- 为各业务表增加以下字段：
  - `version` BIGINT NOT NULL DEFAULT 1
  - `server_updated_at` DATETIME(3) NOT NULL
  - `client_updated_at` DATETIME(3) NULL
  - `deleted_at` DATETIME(3) NULL
  - `last_modified_by_device` VARCHAR(64) NULL

**步骤 3：停止用 `VARCHAR` 保存同步关键时间**

- 将同步相关时间字段改为 `DATETIME(3)`。
- 类似 `activity_date`、`note_date` 这种业务日期字段可以继续按业务语义保留。

**步骤 4：更新存储层写入逻辑**

- 每次新增 / 更新都需要：
  - 维护 `client_id`
  - 更新 `server_updated_at`
  - 接收并保存 `client_updated_at`
  - 增加 `version`
  - 记录 `last_modified_by_device`

**步骤 5：验证**

- 设备 A 创建的同一条逻辑记录，设备 B 能通过 `client_id` 正确识别并同步。

**步骤 6：提交**

```bash
git add backend/scripts/init-cloud-sync-mysql.sql backend/src/DailyTracker.Api
git commit -m "feat: add per-record sync metadata"
```

### 任务 4：增加增量同步接口

**涉及文件：**
- 修改：`backend/src/DailyTracker.Api/Program.cs`
- 修改：`backend/src/DailyTracker.Api/Services/*.cs`
- 新建：`backend/src/DailyTracker.Api/Models/SyncChangesResponse.cs`

**步骤 1：为每个业务域增加变化查询接口**

- 为每类业务增加类似接口：
  - `GET /api/activities/changes?since=2026-04-02T10:00:00.000Z&limit=500`
  - `GET /api/reminders/changes?since=...`
- 响应中返回：
  - 变更记录列表
  - `nextCursor`
  - `hasMore`
  - `serverTime`

**步骤 2：在 Store 层增加增量查询方法**

- 建议方法名：
  - `ListChangesSinceAsync(userId, since, limit, cancellationToken)`
- 排序方式统一为：
  - `server_updated_at ASC, id ASC`
- 这样可以保证分页和断点续拉行为稳定。

**步骤 3：删除记录也必须进入变更流**

- `/changes` 接口不能把软删除记录过滤掉。
- 客户端必须收到“墓碑记录”，才能把本地缓存正确删除或标记删除。

**步骤 4：保留现有按日期查询接口**

- 现有 `/api/activities?date=...` 这类接口仍然保留，继续服务页面渲染。
- 增量同步接口只用于同步引擎。

**步骤 5：验证**

- 修改一条记录、删除一条记录后，再请求 `/changes`，两类变化都能被正确返回。

**步骤 6：提交**

```bash
git add backend/src/DailyTracker.Api
git commit -m "feat: add incremental sync endpoints"
```

### 任务 5：增加显式冲突检测

**涉及文件：**
- 修改：`backend/src/DailyTracker.Api/Program.cs`
- 修改：`backend/src/DailyTracker.Api/Models/*UpsertRequest.cs`
- 修改：相关 Store 文件

**步骤 1：扩展写入请求结构**

- 所有写接口请求体增加：
  - `ClientId`
  - `ClientUpdatedAt`
  - `ExpectedVersion`
  - `DeviceId`

**步骤 2：对过期写入进行拒绝**

- 更新时校验客户端提交的 `ExpectedVersion` 是否等于数据库当前 `version`。
- 不一致时返回 `409 Conflict`，并把服务器当前版本记录返回给前端。

**步骤 3：第一阶段先采用简单冲突策略**

- 先不做自动合并。
- 服务端策略为：
  - 检测到冲突就拒绝写入
  - 客户端拉取服务器最新版本
  - 用户自行重试，后续再演进自动合并

**步骤 4：验证**

- 设备 A、B 同时拿到版本 3。
- 设备 A 先更新为版本 4。
- 设备 B 再提交版本 3 的修改时收到 `409`。

**步骤 5：提交**

```bash
git add backend/src/DailyTracker.Api
git commit -m "feat: detect sync conflicts with record versions"
```

### 任务 6：增加设备上下文和同步状态追踪

**涉及文件：**
- 修改：`backend/scripts/init-cloud-sync-mysql.sql`
- 新建：`backend/src/DailyTracker.Api/Models/SyncStatusDto.cs`
- 修改：`backend/src/DailyTracker.Api/Program.cs`

**步骤 1：增加设备 / 会话表**

- 新建 `sync_devices` 或 `sync_sessions` 表，至少包含：
  - `user_id`
  - `device_id`
  - `platform`
  - `app_version`
  - `last_seen_at`
  - `last_sync_at`

**步骤 2：增加轻量同步状态接口**

- `POST /api/sync/devices/heartbeat`
- `GET /api/sync/status`

**步骤 3：第一阶段先用于可观测性**

- 先不要让设备注册成为同步前置条件。
- 先把它作为排查多端同步问题、后续支持设备管理 / 设备下线的基础设施。

**步骤 4：提交**

```bash
git add backend/scripts/init-cloud-sync-mysql.sql backend/src/DailyTracker.Api
git commit -m "feat: track sync devices and sessions"
```

### 任务 7：补齐媒体上传方案

**涉及文件：**
- 修改：`backend/src/DailyTracker.Api/Program.cs`
- 新建：`backend/src/DailyTracker.Api/Models/UploadInitRequest.cs`
- 新建：`backend/src/DailyTracker.Api/Models/UploadInitResponse.cs`
- 修改：`backend/README.md`

**步骤 1：不要再假设 `image_url` 天然可用**

- 明确选择一种方案：
  - 自托管场景：本地文件存储
  - 正式部署场景：对象存储

**步骤 2：增加上传流程接口**

- 最小可用方案建议：
  - `POST /api/uploads/init`
  - `POST /api/uploads/complete`
- 只有在上传成功后，业务表才保存最终可访问 URL。

**步骤 3：验证**

- 设备 A 上传的图片，设备 B 能通过同步结果正确访问。

**步骤 4：提交**

```bash
git add backend/src/DailyTracker.Api backend/README.md
git commit -m "feat: add media upload API for sync"
```

### 任务 8：增加同步关键链路测试

**涉及文件：**
- 新建：`backend/tests/DailyTracker.Api.Tests/`
- 新建：认证、增量同步、冲突处理、删除同步等集成测试文件
- 修改：`backend/DailyTracker.Backend.sln`

**步骤 1：增加后端集成测试项目**

- 不只测 Store 层，要测完整 API 行为。

**步骤 2：覆盖最低限度同步场景**

- 未登录写入被拒绝
- 已登录创建成功
- `/changes` 能返回更新
- `/changes` 能返回删除墓碑
- 过期写入返回 `409`
- 同一用户第二台设备能拉到第一台设备的变更

**步骤 3：补回归测试**

- 确保原有按日期读取接口在新同步体系下仍然正常工作。

**步骤 4：提交**

```bash
git add backend/tests backend/DailyTracker.Backend.sln
git commit -m "test: cover sync authentication and conflict flows"
```

### 任务 9：后端改完后同步更新前端契约

**涉及文件：**
- 修改：`app.js`
- 修改：`README.md`
- 修改：`HOW_TO_USE.md`

**步骤 1：前端云同步必须先登录**

- 不再假设后端业务接口允许匿名调用。

**步骤 2：按业务域保存同步游标**

- 分别记录这些模块的最后同步时间 / 游标：
  - activities
  - health records
  - symptom records
  - reminders
  - profile
  - daily notes

**步骤 3：写入时带上同步元数据**

- 每次写入都发送：
  - `clientId`
  - `deviceId`
  - `clientUpdatedAt`
  - `expectedVersion`

**步骤 4：处理 `409 Conflict`**

- 给用户明确提示该条记录已被其他设备更新。
- 后续可增加“服务器版本 vs 本地待提交版本”的对比展示。

**步骤 5：提交**

```bash
git add app.js README.md HOW_TO_USE.md
git commit -m "feat: update frontend to use incremental sync contract"
```

### 任务 10：部署与迁移落地

**涉及文件：**
- 修改：`backend/DEPLOY_GUIDE.md`
- 修改：`backend/DEPLOYMENT.md`
- 修改：`backend/发布说明.md`

**步骤 1：定义迁移顺序**

- 先部署数据库变更
- 再部署兼容模式后端
- 然后更新前端
- 最后移除所有旧兜底逻辑

**步骤 2：补回滚说明**

- 记录如何回滚到旧版本后端
- 记录如何保护已有数据不受迁移影响

**步骤 3：增加上线检查项**

- 认证后业务接口是否正常
- `/changes` 是否正常返回数据
- 两台设备是否能互相同步新增、修改、删除

**步骤 4：提交**

```bash
git add backend/DEPLOY_GUIDE.md backend/DEPLOYMENT.md backend/发布说明.md
git commit -m "docs: add sync rollout and migration guidance"
```

## 推荐实施顺序

1. 任务 1
2. 任务 2
3. 任务 3
4. 任务 4
5. 任务 5
6. 任务 8
7. 任务 9
8. 任务 6
9. 任务 7
10. 任务 10

## 范围说明

- 第一阶段不引入 CRDT、OT、事件溯源等高复杂度同步方案。
- 第一阶段不重构整个后端架构。
- 第一阶段不回退成单一 `snapshot` 大对象同步模式。
- 保留现有按日期读取的页面接口，避免页面逻辑和同步逻辑一次性耦合改造。

## 完成标准

- 所有业务读写接口必须登录后才能访问。
- 同一用户在多台设备上可以通过认证接口进行可靠同步。
- 客户端可以按游标拉取增量变更，而不是每次全量拉取。
- 删除操作能正确同步到其他设备。
- 旧版本写入会被明确拒绝，不再静默覆盖。
- 至少具备基础集成测试，能覆盖认证、增量同步、删除同步、冲突处理四类关键链路。
