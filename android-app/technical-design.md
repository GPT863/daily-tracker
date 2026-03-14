# HealthyLifeRecorder Android 原生应用 - 技术方案

## 1. 项目概述

### 1.1 目标

将现有 HealthyLifeRecorder Web 应用（HTML + CSS + JavaScript）完全重写为 Kotlin 原生 Android 应用，实现全部现有功能，并充分利用 Android 原生能力提升用户体验。

### 1.2 核心决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 实现方式 | Kotlin 原生重写 | 最佳用户体验、完整原生能力 |
| UI 框架 | Jetpack Compose | 现代声明式 UI、代码简洁、官方推荐 |
| 最低版本 | Android 8.0 (API 26) | 覆盖 95%+ 设备 |
| 架构模式 | MVVM + Clean Architecture | 可测试、可维护、职责分离 |
| 本地存储 | Room (SQLite) | 替代 IndexedDB/localStorage |
| 网络请求 | Retrofit + OkHttp | 成熟稳定、与后端 REST API 对接 |
| 图片处理 | Coil | Compose 原生支持、轻量高效 |
| 依赖注入 | Hilt | 官方推荐、与 Compose/ViewModel 集成好 |

---

## 2. 技术栈与依赖

### 2.1 Gradle 配置

```
compileSdk = 35
minSdk = 26
targetSdk = 35
kotlinVersion = 2.1.x
composeCompilerVersion = (由 Kotlin 插件管理)
```

### 2.2 核心依赖清单

| 类别 | 库 | 用途 |
|------|----|------|
| UI | `androidx.compose.material3` | Material 3 组件 |
| UI | `androidx.compose.material:material-icons-extended` | 图标 |
| 导航 | `androidx.navigation:navigation-compose` | Compose 导航 |
| 架构 | `androidx.lifecycle:lifecycle-viewmodel-compose` | ViewModel |
| 数据库 | `androidx.room:room-runtime` / `room-ktx` | 本地数据库 |
| 网络 | `com.squareup.retrofit2:retrofit` | HTTP 客户端 |
| 网络 | `com.squareup.retrofit2:converter-kotlinx-serialization` | JSON 序列化 |
| 网络 | `com.squareup.okhttp3:logging-interceptor` | 请求日志 |
| 序列化 | `org.jetbrains.kotlinx:kotlinx-serialization-json` | JSON 处理 |
| 图片 | `io.coil-kt.coil3:coil-compose` | 图片加载 |
| DI | `com.google.dagger:hilt-android` | 依赖注入 |
| 图表 | `com.patrykandpatrick.vico:compose-m3` | 原生图表（替代 Chart.js） |
| 相机 | `androidx.camera:camera-camera2` / `camera-view` | 相机拍照 |
| 通知 | `androidx.work:work-runtime-ktx` | 后台定时任务 |
| 权限 | `com.google.accompanist:accompanist-permissions` | 运行时权限 |
| DataStore | `androidx.datastore:datastore-preferences` | 轻量键值存储（替代 SharedPreferences） |
| Markdown | `com.mikepenz:multiplatform-markdown-renderer-m3` | AI 诊断结果渲染 |

---

## 3. 项目结构

```
app/src/main/java/com/healthyliferecorder/
├── HealthyLifeRecorderApp.kt                  # Application 类 (@HiltAndroidApp)
├── MainActivity.kt                      # 单 Activity 入口
│
├── data/                                # 数据层
│   ├── local/                           # 本地数据源
│   │   ├── db/
│   │   │   ├── AppDatabase.kt           # Room 数据库定义
│   │   │   ├── dao/
│   │   │   │   ├── ActivityDao.kt
│   │   │   │   ├── HealthRecordDao.kt
│   │   │   │   ├── SymptomRecordDao.kt
│   │   │   │   ├── ReminderDao.kt
│   │   │   │   ├── DailyNoteDao.kt
│   │   │   │   ├── ProfileDao.kt
│   │   │   │   └── TemplateDao.kt
│   │   │   ├── entity/
│   │   │   │   ├── ActivityEntity.kt
│   │   │   │   ├── HealthRecordEntity.kt
│   │   │   │   ├── SymptomRecordEntity.kt
│   │   │   │   ├── ReminderEntity.kt
│   │   │   │   ├── DailyNoteEntity.kt
│   │   │   │   ├── ProfileEntity.kt
│   │   │   │   └── TemplateEntity.kt
│   │   │   └── converter/
│   │   │       └── Converters.kt        # Room 类型转换器
│   │   └── datastore/
│   │       ├── UserPreferences.kt       # 用户偏好设置
│   │       └── AiConfigStore.kt         # AI 配置存储
│   │
│   ├── remote/                          # 远程数据源
│   │   ├── api/
│   │   │   ├── AuthApi.kt               # 认证 API
│   │   │   ├── ActivityApi.kt           # 活动 API
│   │   │   ├── HealthRecordApi.kt       # 健康数据 API
│   │   │   ├── SymptomRecordApi.kt      # 症状 API
│   │   │   ├── ReminderApi.kt           # 提醒 API
│   │   │   ├── ProfileApi.kt           # 个人信息 API
│   │   │   ├── DailyNoteApi.kt         # 每日状态 API
│   │   │   └── AiDiagnosisApi.kt       # AI 诊断 API（多提供商）
│   │   ├── dto/                         # 网络数据传输对象
│   │   │   ├── ActivityDto.kt
│   │   │   ├── HealthRecordDto.kt
│   │   │   ├── SymptomRecordDto.kt
│   │   │   ├── ReminderDto.kt
│   │   │   ├── ProfileDto.kt
│   │   │   ├── DailyNoteDto.kt
│   │   │   ├── AuthDto.kt
│   │   │   └── AiDto.kt
│   │   └── interceptor/
│   │       └── AuthInterceptor.kt       # JWT Token 注入
│   │
│   └── repository/                      # 仓库实现
│       ├── ActivityRepository.kt
│       ├── HealthRecordRepository.kt
│       ├── SymptomRecordRepository.kt
│       ├── ReminderRepository.kt
│       ├── DailyNoteRepository.kt
│       ├── ProfileRepository.kt
│       ├── TemplateRepository.kt
│       ├── AuthRepository.kt
│       └── AiDiagnosisRepository.kt
│
├── domain/                              # 领域层
│   ├── model/                           # 领域模型
│   │   ├── Activity.kt
│   │   ├── HealthRecord.kt
│   │   ├── SymptomRecord.kt
│   │   ├── Reminder.kt
│   │   ├── DailyNote.kt
│   │   ├── Profile.kt
│   │   ├── Template.kt
│   │   ├── AiConfig.kt
│   │   └── enums/
│   │       ├── ActivityType.kt          # meal/medication/exercise/sleep/work/other
│   │       ├── HealthType.kt            # bloodPressure/heartRate/bloodSugar/...
│   │       ├── RepeatType.kt            # none/daily/weekly/biweekly/monthly
│   │       └── AiProvider.kt            # openai/anthropic/deepseek/tongyi/custom
│   └── validation/
│       └── HealthValidator.kt           # 健康数据校验规则
│
├── ui/                                  # 表现层
│   ├── navigation/
│   │   └── NavGraph.kt                  # 导航图定义
│   ├── theme/
│   │   ├── Theme.kt                     # Material 3 主题
│   │   ├── Color.kt                     # 颜色定义
│   │   └── Type.kt                      # 字体定义
│   ├── components/                      # 通用组件
│   │   ├── DateSelector.kt              # 日期选择器 + 日历面板
│   │   ├── TimelineItem.kt             # 时间线条目
│   │   ├── HealthSummaryCard.kt        # 健康数据摘要卡片
│   │   ├── ReminderCard.kt             # 提醒卡片
│   │   ├── ImagePicker.kt              # 图片选择/拍照组件
│   │   ├── EmptyState.kt               # 空状态占位
│   │   └── BottomSheet.kt              # 底部弹出表单
│   │
│   ├── home/                            # 首页
│   │   ├── HomeScreen.kt
│   │   └── HomeViewModel.kt
│   ├── activity/                        # 活动记录
│   │   ├── ActivityFormSheet.kt         # 新增/编辑活动（BottomSheet）
│   │   └── ActivityFormViewModel.kt
│   ├── health/                          # 健康数据
│   │   ├── HealthFormSheet.kt
│   │   └── HealthFormViewModel.kt
│   ├── symptom/                         # 症状记录
│   │   ├── SymptomFormSheet.kt
│   │   └── SymptomFormViewModel.kt
│   ├── reminder/                        # 提醒管理
│   │   ├── ReminderScreen.kt            # 提醒管理全屏（4 Tab）
│   │   ├── ReminderViewModel.kt
│   │   ├── ReminderFormSheet.kt
│   │   └── ReminderAlertDialog.kt       # 到点提醒弹窗
│   ├── profile/                         # 个人信息
│   │   ├── ProfileScreen.kt
│   │   └── ProfileViewModel.kt
│   ├── stats/                           # 统计分析
│   │   ├── StatsScreen.kt
│   │   └── StatsViewModel.kt
│   ├── ai/                              # AI 诊断
│   │   ├── AiDiagnosisScreen.kt
│   │   ├── AiDiagnosisViewModel.kt
│   │   └── AiConfigSheet.kt
│   ├── sync/                            # 云同步
│   │   ├── CloudSyncScreen.kt
│   │   └── CloudSyncViewModel.kt
│   ├── export/                          # 数据导入导出
│   │   ├── DataManageScreen.kt
│   │   └── DataManageViewModel.kt
│   └── template/                        # 模板管理
│       ├── TemplateManageSheet.kt
│       └── TemplateViewModel.kt
│
├── service/                             # 后台服务
│   ├── ReminderWorker.kt               # WorkManager 定时检查提醒
│   └── ReminderNotificationHelper.kt   # 通知创建与管理
│
└── di/                                  # 依赖注入模块
    ├── DatabaseModule.kt                # Room 数据库提供
    ├── NetworkModule.kt                 # Retrofit/OkHttp 提供
    └── RepositoryModule.kt              # Repository 绑定
```

---

## 4. 数据模型与 Room 数据库设计

### 4.1 数据库概览

数据库名：`healthy_life_recorder.db`，当前 Schema 版本：1

### 4.2 Entity 定义

#### 4.2.1 ActivityEntity

```kotlin
@Entity(tableName = "activities")
data class ActivityEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val serverId: Long? = null,           // 云端 ID，用于同步
    val activityDate: String,             // "2026-03-14"
    val startTime: String?,               // "08:30"
    val endTime: String?,                 // "09:00"
    val durationMinutes: Int?,
    val type: String,                     // "meal"|"medication"|"exercise"|"sleep"|"work"|"other"
    val content: String,
    val feeling: String?,
    val imagePath: String?,               // 本地图片文件路径（替代 Base64）
    val imageUrl: String?,                // 云端图片 URL
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isDeleted: Boolean = false,       // 软删除
    val isSynced: Boolean = false         // 同步状态
)
```

#### 4.2.2 HealthRecordEntity

```kotlin
@Entity(tableName = "health_records")
data class HealthRecordEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val serverId: Long? = null,
    val recordDate: String,               // "2026-03-14"
    val recordTime: String?,              // "08:30"
    val type: String,                     // "bloodPressure"|"heartRate"|"bloodSugar"|"bloodLipid"|"uricAcid"|"other"
    val value: String,                    // "120/80" 或 "5.6"
    val unit: String?,                    // "mmHg"|"bpm"|"mmol/L"|"umol/L"
    val notes: String?,
    val imagePath: String?,
    val imageUrl: String?,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isDeleted: Boolean = false,
    val isSynced: Boolean = false
)
```

#### 4.2.3 SymptomRecordEntity

```kotlin
@Entity(tableName = "symptom_records")
data class SymptomRecordEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val serverId: Long? = null,
    val recordDate: String,
    val recordTime: String?,
    val description: String,
    val measures: String?,
    val imagePath: String?,
    val imageUrl: String?,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isDeleted: Boolean = false,
    val isSynced: Boolean = false
)
```

#### 4.2.4 ReminderEntity

```kotlin
@Entity(tableName = "reminders")
data class ReminderEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val serverId: Long? = null,
    val title: String,
    val type: String,                     // "meal"|"medication"|"exercise"|"sleep"|"other"
    val reminderDate: String,             // "2026-03-14"
    val reminderTime: String,             // "08:30"
    val repeatType: String = "none",      // "none"|"daily"|"weekly"|"biweekly"|"monthly"
    val notes: String?,
    val imagePath: String?,
    val imageUrl: String?,
    val completed: Boolean = false,
    val completedAt: Long? = null,
    val snoozeUntil: Long? = null,        // 延后到的时间戳
    val snoozeCount: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isDeleted: Boolean = false,
    val isSynced: Boolean = false
)
```

#### 4.2.5 DailyNoteEntity

```kotlin
@Entity(
    tableName = "daily_notes",
    indices = [Index(value = ["noteDate"], unique = true)]
)
data class DailyNoteEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val serverId: Long? = null,
    val noteDate: String,                 // "2026-03-14"
    val content: String,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isDeleted: Boolean = false,
    val isSynced: Boolean = false
)
```

#### 4.2.6 ProfileEntity

```kotlin
@Entity(tableName = "profile")
data class ProfileEntity(
    @PrimaryKey val id: Long = 1,         // 单行，固定 ID
    val name: String = "",
    val gender: String = "",              // "male"|"female"|"other"|""
    val age: String = "",
    val height: String = "",              // cm
    val weight: String = "",              // kg
    val bloodType: String = "",           // "A"|"B"|"AB"|"O"|""
    val bloodPressure: String = "",       // "120/80"
    val bloodSugar: String = "",          // "5.6 mmol/L"
    val chronicConditions: String = "",
    val allergies: String = "",
    val medications: String = "",
    val healthGoals: String = "",
    val notes: String = "",
    val updatedAt: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false
)
```

#### 4.2.7 TemplateEntity

```kotlin
@Entity(tableName = "templates")
data class TemplateEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val type: String,                     // 活动类型
    val content: String,
    val feeling: String?,
    val durationMinutes: Int?,
    val icon: String = "💊",              // 模板图标 emoji
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)
```

### 4.3 DAO 接口示例

```kotlin
@Dao
interface ActivityDao {
    @Query("SELECT * FROM activities WHERE activityDate = :date AND isDeleted = 0 ORDER BY startTime ASC")
    fun getByDate(date: String): Flow<List<ActivityEntity>>

    @Query("SELECT * FROM activities WHERE isDeleted = 0 ORDER BY activityDate DESC, startTime DESC")
    fun getAll(): Flow<List<ActivityEntity>>

    @Query("SELECT DISTINCT activityDate FROM activities WHERE isDeleted = 0")
    fun getAllDatesWithData(): Flow<List<String>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(activity: ActivityEntity): Long

    @Update
    suspend fun update(activity: ActivityEntity)

    @Query("UPDATE activities SET isDeleted = 1, updatedAt = :now WHERE id = :id")
    suspend fun softDelete(id: Long, now: Long = System.currentTimeMillis())

    @Query("SELECT * FROM activities WHERE isSynced = 0 AND isDeleted = 0")
    suspend fun getUnsyncedRecords(): List<ActivityEntity>

    @Query("UPDATE activities SET isSynced = 1, serverId = :serverId WHERE id = :localId")
    suspend fun markSynced(localId: Long, serverId: Long)
}
```

其他 DAO 遵循相同模式，按需调整查询条件。

### 4.4 健康数据校验规则

```kotlin
object HealthValidator {
    data class Range(val min: Double, val max: Double, val label: String)

    val rules = mapOf(
        "bloodPressure" to BloodPressureRule(
            systolicRange = 60.0..250.0,
            diastolicRange = 40.0..150.0
        ),
        "heartRate" to Range(30.0, 220.0, "心率"),
        "bloodSugar" to Range(1.0, 30.0, "血糖"),
        "bloodLipid" to Range(0.5, 20.0, "血脂"),
        "uricAcid" to Range(60.0, 1200.0, "尿酸")
    )
}
```

---

## 5. 网络层设计

### 5.1 Retrofit API 接口

#### AuthApi

```kotlin
interface AuthApi {
    @POST("/api/auth/register")
    suspend fun register(@Body request: AuthRegisterRequest): AuthResponse

    @POST("/api/auth/login")
    suspend fun login(@Body request: AuthLoginRequest): AuthResponse

    @GET("/api/auth/me")
    suspend fun getCurrentUser(): UserDto
}
```

#### ActivityApi

```kotlin
interface ActivityApi {
    @GET("/api/activities")
    suspend fun getByDate(@Query("date") date: String): List<ActivityDto>

    @POST("/api/activities")
    suspend fun create(@Body request: ActivityUpsertRequest): ActivityDto

    @PUT("/api/activities/{id}")
    suspend fun update(@Path("id") id: Long, @Body request: ActivityUpsertRequest): ActivityDto

    @DELETE("/api/activities/{id}")
    suspend fun delete(@Path("id") id: Long)
}
```

其余 API（HealthRecordApi、SymptomRecordApi、ReminderApi、ProfileApi、DailyNoteApi）遵循相同模式，对应后端端点。

#### ReminderApi（特殊操作）

```kotlin
interface ReminderApi {
    // 标准 CRUD 省略...

    @GET("/api/reminders/today")
    suspend fun getToday(): List<ReminderDto>

    @GET("/api/reminders/upcoming")
    suspend fun getUpcoming(): List<ReminderDto>

    @POST("/api/reminders/{id}/complete")
    suspend fun complete(@Path("id") id: Long): ReminderDto

    @POST("/api/reminders/{id}/reopen")
    suspend fun reopen(@Path("id") id: Long): ReminderDto

    @POST("/api/reminders/{id}/snooze")
    suspend fun snooze(@Path("id") id: Long, @Body request: SnoozeRequest): ReminderDto
}
```

### 5.2 JWT 认证拦截器

```kotlin
class AuthInterceptor(
    private val tokenProvider: () -> String?
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
        tokenProvider()?.let { token ->
            request.addHeader("Authorization", "Bearer $token")
        }
        return chain.proceed(request.build())
    }
}
```

Token 存储在 DataStore（加密）中，Retrofit 的 OkHttpClient 全局注入此拦截器。

### 5.3 AI 诊断网络层

AI 诊断不经过自有后端，而是直接从客户端调用第三方 AI API：

```kotlin
class AiDiagnosisRepository(
    private val okHttpClient: OkHttpClient
) {
    suspend fun sendDiagnosis(config: AiConfig, messages: List<AiMessage>): String {
        val (url, headers, body) = when (config.provider) {
            AiProvider.OPENAI -> buildOpenAiRequest(config, messages)
            AiProvider.ANTHROPIC -> buildAnthropicRequest(config, messages)
            AiProvider.DEEPSEEK -> buildDeepSeekRequest(config, messages)
            AiProvider.TONGYI -> buildTongyiRequest(config, messages)
            AiProvider.CUSTOM -> buildCustomRequest(config, messages)
        }
        // 发送请求并解析流式/非流式响应
    }
}
```

---

## 6. 屏幕与导航设计

### 6.1 导航结构

采用单 Activity + Compose Navigation，底部导航栏 + 全屏页面 + BottomSheet 弹窗：

```
NavHost
├── HomeScreen (startDestination)        # 首页：日期导航 + 健康摘要 + 提醒 + 状态记录 + 时间线
├── ReminderScreen                       # 提醒管理（全屏，4 Tab）
├── ProfileScreen                        # 个人信息（全屏）
├── StatsScreen                          # 统计分析（全屏）
├── AiDiagnosisScreen                    # AI 诊断（全屏）
├── CloudSyncScreen                      # 云同步（全屏）
└── DataManageScreen                     # 数据导入导出（全屏）

BottomSheet（叠加在任意页面上）
├── ActivityFormSheet                    # 活动录入/编辑
├── HealthFormSheet                      # 健康数据录入/编辑
├── SymptomFormSheet                     # 症状录入/编辑
├── ReminderFormSheet                    # 提醒录入/编辑
├── TemplateManageSheet                  # 模板管理
└── AiConfigSheet                        # AI 配置

Dialog
└── ReminderAlertDialog                  # 到点提醒弹窗
```

### 6.2 底部导航栏

```
┌──────────┬──────────┬──────────┬──────────┐
│  ＋ 记录  │ 📋 健康  │ 🩹 症状  │ 🔔 提醒  │
└──────────┴──────────┴──────────┴──────────┘
```

点击「记录」「健康」「症状」弹出对应的 BottomSheet 表单，点击「提醒」跳转到 ReminderScreen。

### 6.3 首页布局（HomeScreen）

```
┌─────────────────────────────────────┐
│ Header: "📅 今日活动记录"  [工具菜单]  │
│ ◀  2026年3月14日 星期五  ▶           │
├─────────────────────────────────────┤
│ 📋 健康数据    [查看] [记录]         │  ← 可折叠
│   ┌───────┬───────┬───────┐        │
│   │血压    │心率    │血糖   │        │
│   │120/80 │72bpm  │5.6   │        │
│   └───────┴───────┴───────┘        │
├─────────────────────────────────────┤
│ 🔔 今日提醒              [查看全部] │
│   • 08:30 💊 吃降压药               │
│   • 12:00 🍽️ 午餐                  │
├─────────────────────────────────────┤
│ 🧾 今日状态记录                      │
│   ┌─────────────────────────┐      │
│   │ 记录感受...               │      │
│   └─────────────────────────┘      │
│   [保存状态记录] [一键AI诊断]       │
├─────────────────────────────────────┤
│ 📝 时间线                [倒序显示] │
│   08:30 💊 降压药 1片               │
│   09:00 🏃 晨跑 30分钟             │
│   12:00 🍽️ 午餐                    │
│   14:00 🩺 血压 120/80 mmHg        │
│   15:30 🩹 头痛 - 太阳穴胀痛       │
└─────────────────────────────────────┘
┌──────────┬──────────┬──────────┬──────────┐
│  ＋ 记录  │ 📋 健康  │ 🩹 症状  │ 🔔 提醒  │
└──────────┴──────────┴──────────┴──────────┘
```

### 6.4 工具菜单（TopAppBar 的 OverflowMenu）

- 📊 数据统计
- 📄 数据管理（导入导出）
- ☁ 云同步
- 👤 个人信息
- 📂 示例数据
- 🗑 清空数据

---

## 7. 各功能模块实现方案

### 7.1 日期导航

| 功能 | 实现 |
|------|------|
| 前后日切换 | 两个 IconButton，修改 ViewModel 的 `selectedDate: StateFlow<LocalDate>` |
| 日历面板 | 点击日期文本弹出自定义 Compose 日历组件（月历网格） |
| 有数据标记 | 从 Room 查询所有有记录的日期集合，日历中用圆点标记 |
| 今天按钮 | 快速跳转到今日 |

### 7.2 活动记录 / 健康数据 / 症状记录

三者使用相同的 BottomSheet 表单模式：

1. 用户点击底部导航按钮 → 弹出 `ModalBottomSheet`
2. 表单使用 Compose 的 `TextField`、`ExposedDropdownMenuBox`、`TimePicker` 等组件
3. 提交时通过 ViewModel → Repository → DAO 写入 Room
4. 如果开启自动同步，同时调用 Retrofit API 上传
5. HomeScreen 通过 Room 的 `Flow` 自动刷新时间线

#### 图片处理

```kotlin
// ImagePicker 组件
@Composable
fun ImagePicker(
    currentImagePath: String?,
    onImageSelected: (Uri) -> Unit,
    onImageRemoved: () -> Unit
) {
    // 提供两个入口：
    // 1. 从相册选择 - ActivityResultContracts.PickVisualMedia
    // 2. 拍照 - ActivityResultContracts.TakePicture (使用 CameraX)
    // 图片保存到应用私有目录，存储文件路径到 Room
}
```

**与 Web 版差异：** Web 版用 Base64 Data URL 存储图片；Android 版保存到 `app/files/images/` 目录，Room 中存储文件路径，显著减少数据库体积。

### 7.3 快速模板

- `TemplateEntity` 存储在 Room 中
- 首次启动时预填 4 条默认模板
- 活动表单顶部显示模板横向滚动列表（`LazyRow`）
- 点击模板自动填充表单字段
- 模板管理通过 BottomSheet 进行 CRUD

### 7.4 时间线

```kotlin
@Composable
fun Timeline(
    activities: List<Activity>,
    healthRecords: List<HealthRecord>,
    symptomRecords: List<SymptomRecord>,
    isDescending: Boolean,
    onEditActivity: (Activity) -> Unit,
    onDeleteActivity: (Activity) -> Unit,
    // ... 其他回调
) {
    // 合并三种记录为统一的 TimelineItem 列表
    // 按时间排序（正序/倒序）
    // LazyColumn 渲染
    // 每条 Item 左侧有颜色指示条，右侧有操作按钮
}
```

时间线颜色映射：

| 类型 | 颜色 |
|------|------|
| meal | #f59e42 |
| medication | #e74c7c |
| exercise | #27ae60 |
| sleep | #6c63d4 |
| work | #2980b9 |
| other | #95a5a6 |
| health | #1a9bbb |
| symptom | #e85d5d |

### 7.5 提醒管理

#### 提醒列表（4 Tab）

使用 `TabRow` + `HorizontalPager`：
- 今日提醒：按 reminderDate = today 查询
- 即将到来：日期 > today 或 (日期 = today 且 时间 > now)
- 全部提醒：带搜索框（`SearchBar`）和筛选器（类型 + 状态下拉）
- 添加提醒：提醒表单

#### 到点通知（WorkManager）

```kotlin
class ReminderCheckWorker(
    context: Context,
    params: WorkerParameters,
    private val reminderDao: ReminderDao,
    private val notificationHelper: ReminderNotificationHelper
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val now = LocalDateTime.now()
        val dueReminders = reminderDao.getDueReminders(
            date = now.toLocalDate().toString(),
            time = now.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"))
        )
        dueReminders.forEach { reminder ->
            notificationHelper.showReminderNotification(reminder)
        }
        return Result.success()
    }
}
```

**调度策略：**
- 使用 `PeriodicWorkRequest` 每 15 分钟执行一次（WorkManager 最小间隔）
- 补充使用 `AlarmManager.setExactAndAllowWhileIdle()` 为每条提醒设置精确闹钟
- 结合 `BroadcastReceiver` 在到点时触发通知

#### 通知样式

```kotlin
class ReminderNotificationHelper(private val context: Context) {
    fun showReminderNotification(reminder: ReminderEntity) {
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(reminder.title)
            .setContentText(reminder.notes ?: "")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .addAction(R.drawable.ic_check, "完成", completePendingIntent)
            .addAction(R.drawable.ic_snooze, "延后10分钟", snoozePendingIntent)
            .setContentIntent(openAppPendingIntent)
            .build()
        notificationManager.notify(reminder.id.toInt(), notification)
    }
}
```

**通知 Channel：** 在 `Application.onCreate()` 中创建 `REMINDERS` 通知渠道。

### 7.6 今日状态记录

- `OutlinedTextField` 多行输入
- 保存到 `DailyNoteEntity`（按日期唯一约束）
- 显示上次保存时间
- 「一键 AI 诊断」按钮导航到 AiDiagnosisScreen

### 7.7 统计分析

使用 **Vico** 图表库（Compose 原生图表库，替代 Chart.js）：

```kotlin
@Composable
fun StatsScreen(viewModel: StatsViewModel = hiltViewModel()) {
    val period by viewModel.selectedPeriod.collectAsStateWithLifecycle()

    TabRow { /* 本周 | 本月 */ }

    // 运动次数趋势图 - LineChart
    CartesianChartHost(
        chart = rememberCartesianChart(
            rememberLineCartesianLayer()
        ),
        model = viewModel.exerciseCountModel
    )

    // 单次运动时长趋势图 - LineChart
    // 单日睡眠时长趋势图 - LineChart
}
```

### 7.8 AI 健康诊断

#### 全屏页面结构

```
AiDiagnosisScreen
├── AI 配置区（可折叠卡片）
│   ├── 提供商选择（Spinner）
│   ├── API 密钥输入（PasswordTextField）
│   ├── 自定义端点（条件显示）
│   ├── 模型输入
│   └── [测试连接] [保存配置]
├── 数据范围选择（RadioGroup）
│   ├── 今天 / 最近3天 / 7天 / 30天 / 90天 / 自定义
│   └── 数据预览卡片（活动数 / 健康数 / 天数）
├── 诊断选项（CheckBox 列表）
│   ├── 分析活动记录
│   ├── 分析健康数据
│   ├── 结合个人信息
│   ├── 分析用药情况
│   └── 额外关注问题（TextField）
├── [开始 AI 诊断] 按钮
├── 诊断过程（展开区域）
├── 诊断结果（Markdown 渲染 + 复制按钮）
└── 追问对话
    ├── 消息列表（LazyColumn）
    ├── 输入框 + 发送按钮
    └── 基于完整上下文的多轮对话
```

#### AI Prompt 构建

ViewModel 从 Room 聚合指定日期范围的活动、健康、症状数据，结合个人信息，构建结构化 Prompt 发送给 AI API。

### 7.9 云同步

#### 同步策略

```
本地优先 + 可选云端同步
├── 所有数据首先写入 Room
├── 登录后可手动「上传到云端」或「从云端恢复」
├── 开启自动同步后，每次本地写入自动触发上传
└── 同步状态通过 isSynced 字段跟踪
```

#### CloudSyncScreen

```
┌─────────────────────────────────────┐
│ 同步服务地址: [________________]     │
├─────────────────────────────────────┤
│ 👤 账号: [________________]         │
│ 🔒 密码: [________________] 👁      │
│ [登录（未注册自动创建）]              │
├─────────────────────────────────────┤
│ ✓ 开启自动同步                       │
│ 同步状态: 上次同步 10分钟前           │
│ [上传到云端]  [从云端恢复]            │
└─────────────────────────────────────┘
```

### 7.10 数据导入导出

| 功能 | Android 实现 |
|------|-------------|
| 导出 JSON | 使用 SAF（`ActivityResultContracts.CreateDocument`）让用户选择保存位置 |
| 导出 CSV | 同上 |
| 导入 JSON | 使用 `ActivityResultContracts.OpenDocument` 选择文件 |
| 导出范围 | 当前日期 / 日期范围 / 全部 |
| 导入策略 | 合并导入 / 替换导入 |
| 存储状态 | 显示 Room 数据库文件大小 |

### 7.11 示例数据 & 清空数据

- 示例数据：预定义数据插入 Room
- 清空数据：AlertDialog 二次确认后清空所有表

---

## 8. 原生能力详细设计

### 8.1 通知推送

```kotlin
// Application.onCreate() 中创建通知渠道
val channel = NotificationChannel(
    "reminders",
    "提醒通知",
    NotificationManager.IMPORTANCE_HIGH
).apply {
    description = "到点提醒通知"
    enableVibration(true)
    setShowBadge(true)
}
notificationManager.createNotificationChannel(channel)
```

**精确提醒实现：**
1. 创建/编辑提醒时，通过 `AlarmManager.setExactAndAllowWhileIdle()` 注册精确闹钟
2. `ReminderAlarmReceiver` (BroadcastReceiver) 接收闹钟触发，显示通知
3. 通知 Action：「完成」直接标记完成、「延后」延后 10 分钟
4. 点击通知打开应用并显示提醒详情弹窗
5. 设备重启后通过 `BOOT_COMPLETED` 广播重新注册所有闹钟

### 8.2 相机拍照

```kotlin
// 使用 CameraX 或系统相机
val takePictureLauncher = rememberLauncherForActivityResult(
    ActivityResultContracts.TakePicture()
) { success ->
    if (success) {
        // photoUri 即为拍摄的图片 URI
        onImageCaptured(photoUri)
    }
}

// 图片保存
// 1. 创建临时文件在 app 私有目录
// 2. 拍照后压缩（最大 1920px，JPEG 85%）
// 3. 存储最终路径到 Room
```

### 8.3 本地数据库（Room）

- 详见第 4 章
- Migration 策略：使用 `AutoMigration` 或手写 Migration
- 数据库加密：可选使用 SQLCipher（`net.zetetic:android-database-sqlcipher`）

### 8.4 权限声明

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
```

运行时权限在首次使用时请求（通知、相机）。

---

## 9. 主题与样式

### 9.1 配色方案

基于 Web 版 CSS 变量，适配 Material 3：

```kotlin
val LightColorScheme = lightColorScheme(
    primary = Color(0xFF4CAF50),           // --primary-color
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDFF5E4),   // --mint-color
    secondary = Color(0xFF1F7A3D),          // --forest-color
    surface = Color(0xFFFFFFFF),            // --card-bg
    background = Color(0xFFF0F4F0),         // --bg-color
    error = Color(0xFFE85D5D)
)

// 支持 DarkColorScheme
val DarkColorScheme = darkColorScheme(...)
```

### 9.2 时间线类型颜色

```kotlin
object TypeColors {
    val meal = Color(0xFFF59E42)
    val medication = Color(0xFFE74C7C)
    val exercise = Color(0xFF27AE60)
    val sleep = Color(0xFF6C63D4)
    val work = Color(0xFF2980B9)
    val other = Color(0xFF95A5A6)
    val health = Color(0xFF1A9BBB)
    val symptom = Color(0xFFE85D5D)
}
```

---

## 10. 开发分期计划

### Phase 1：核心骨架（约 2 周）

- [ ] 项目初始化（Gradle 配置、Hilt 设置、Room 数据库）
- [ ] 主题与配色
- [ ] 首页框架（日期导航 + 时间线 + 底部导航栏）
- [ ] 活动记录 CRUD（表单 + 时间线展示）
- [ ] 模板系统

### Phase 2：健康与症状（约 1 周）

- [ ] 健康数据 CRUD + 健康摘要卡片
- [ ] 健康数据校验规则
- [ ] 症状记录 CRUD
- [ ] 时间线混合展示（活动 + 健康 + 症状）

### Phase 3：提醒系统（约 1.5 周）

- [ ] 提醒 CRUD + 4 Tab 管理页面
- [ ] AlarmManager 精确闹钟
- [ ] 通知渠道与通知显示
- [ ] 到点弹窗 + 延后/完成操作
- [ ] 开机自启动重新注册闹钟

### Phase 4：辅助功能（约 1 周）

- [ ] 今日状态记录
- [ ] 个人信息
- [ ] 数据统计图表（Vico）
- [ ] 日历面板（有数据标记）

### Phase 5：AI 诊断（约 1 周）

- [ ] AI 配置管理（多提供商）
- [ ] 数据聚合与 Prompt 构建
- [ ] API 调用与结果渲染
- [ ] 追问对话

### Phase 6：数据与同步（约 1 周）

- [ ] 数据导入导出（JSON/CSV）
- [ ] 云同步（登录/注册 + 上传/恢复 + 自动同步）
- [ ] 相机拍照集成
- [ ] 图片管理（压缩、存储、显示）

### Phase 7：打磨（约 1 周）

- [ ] 暗色主题
- [ ] 示例数据 & 清空数据
- [ ] 性能优化（列表分页、图片缓存）
- [ ] 发布准备（签名、混淆、应用图标）

---

## 11. 与 Web 版的关键差异

| 方面 | Web 版 | Android 原生版 |
|------|--------|----------------|
| 图片存储 | Base64 Data URL 内嵌 | 文件系统路径，按需加载 |
| 本地存储 | IndexedDB / localStorage | Room (SQLite) |
| 通知 | 浏览器 Notification API + SW | AlarmManager + NotificationManager |
| 图表 | Chart.js | Vico (Compose) |
| UI 框架 | 原生 HTML/CSS/JS | Jetpack Compose + Material 3 |
| 离线能力 | Service Worker 缓存 | 原生离线，无需缓存层 |
| 弹窗 | CSS Modal / Bottom Sheet | Compose ModalBottomSheet / Dialog |
| AI 结果渲染 | innerHTML | Markdown Renderer |
| 导入导出 | 浏览器 File API | SAF (Storage Access Framework) |
| 相机 | HTML `<input type="file" accept="image/*">` | CameraX / 系统相机 Intent |
| 后台提醒 | 仅前台 setInterval 检查 | 后台 AlarmManager 精确触发 |

---

## 12. 构建与发布

### 12.1 签名配置

```groovy
signingConfigs {
    release {
        storeFile = file("release-keystore.jks")
        storePassword = System.getenv("KEYSTORE_PASSWORD")
        keyAlias = "healthy-life-recorder"
        keyPassword = System.getenv("KEY_PASSWORD")
    }
}
```

### 12.2 混淆规则

- 保留 Room Entity 和 Retrofit DTO 类
- 保留 Kotlinx Serialization 注解
- 保留 Hilt 注入类

### 12.3 输出物

- `app-release.apk` - 直接安装包
- `app-release.aab` - Google Play 发布包
