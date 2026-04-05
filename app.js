// 全局状态
let currentDate = new Date();
let activities = [];
let healthRecords = [];
let symptomRecords = [];
let reminders = [];
let allActivitiesData = {};
let allHealthRecordsData = {};
let allSymptomRecordsData = {};
let allDailyNotesData = {};
let editingId = null;
let timelineOrder = localStorage.getItem('dailyTracker_timelineOrder') || 'desc';
let pendingActivityImages = [];
let pendingReminderImage = null;
let pendingHealthImage = null;
let pendingSymptomImage = null;
let medicines = [];
let medicineSortOrder = 'asc';
let pendingMedicineImage = null;
let currentDetailMedicineId = null;
let profile = {};
let familyMembers = [];
let metadata = {};
let activeReminderAlertId = null;
const triggeredTodayIds = new Set(); // 当前 session 中已弹出过的提醒 ID（防止关闭后每分钟重复弹出）
let reminderCheckerDay = ''; // 记录 checker 当天日期，用于午夜重置
let currentReminderTab = 'today';
let templates = [];
let selectedTemplateIcon = '💊';
let aiConfig = {
    provider: 'openai',
    apiKey: '',
    apiEndpoint: '',
    model: '',
    verified: false,
    verifiedAt: ''
};
let aiConversationContext = null;
let aiConversationHistory = [];
let aiConversationBusy = false;
let aiPendingFiles = []; // 待发送的附件 { type: 'image'|'pdf', name, base64, mimeType }
let cloudSyncBusy = false;
let cloudSyncTimer = null;
let calendarViewDate = new Date();
let currentPage = 'home';
let pageHistory = [];
let currentRecordView = 'activity';
let aiBasisCollapsed = localStorage.getItem('dailyTracker_aiBasisCollapsed') !== 'false';

const datePickerConfigs = {
    home: {
        panelId: 'currentDatePanel',
        monthLabelId: 'calendarMonthLabel',
        dayGridId: 'calendarDayGrid',
        clearBtnId: 'calendarClearBtn',
        todayBtnId: 'calendarTodayBtn'
    },
    records: {
        panelId: 'recordsCurrentDatePanel',
        monthLabelId: 'recordsCalendarMonthLabel',
        dayGridId: 'recordsCalendarDayGrid',
        clearBtnId: 'recordsCalendarClearBtn',
        todayBtnId: 'recordsCalendarTodayBtn'
    }
};

// 获取类型标签
function getTypeLabel(type) {
    const labels = {
        meal: '用餐',
        medication: '用药',
        exercise: '运动',
        sleep: '睡眠',
        work: '工作',
        other: '其他'
    };
    return labels[type] || type;
}

// 默认模板
const defaultTemplates = [
    { id: 'tpl_1', name: '降压药', type: 'medication', content: '降压药 1片', feeling: '无不适', duration: null, icon: '💊' },
    { id: 'tpl_3', name: '晨跑', type: 'exercise', content: '慢跑', feeling: '呼吸顺畅', duration: 30, icon: '🏃' },
    { id: 'tpl_4', name: '早餐', type: 'meal', content: '燕麦粥 + 鸡蛋', feeling: '吃饱了', duration: 15, icon: '🍽️' },
    { id: 'tpl_5', name: '午休', type: 'sleep', content: '午休30分钟', feeling: '下午精神好', duration: 30, icon: '😴' }
];
let editingHealthId = null;
let editingSymptomId = null;
let editingReminderId = null;
let editingMedicineId = null;
let serviceWorkerRegistration = null;
let pendingImportData = null;
let editingFamilyMemberId = null;
let pendingProfileAvatar = null;
let pendingFamilyMemberAvatar = null;
let submitLocks = {
    activity: false,
    health: false,
    symptom: false,
    reminder: false,
    import: false,
    medicine: false
};

const STORAGE_SCHEMA_VERSION = 3;
const BACKUP_REMINDER_DAYS = 7;
const legacyStorageKeys = {
    activities: 'dailyTracker_activities',
    healthRecords: 'dailyTracker_healthRecords',
    symptomRecords: 'dailyTracker_symptomRecords',
    dailyNotes: 'dailyTracker_dailyNotes',
    reminders: 'dailyTracker_reminders',
    medicines: 'dailyTracker_medicines',
    profile: 'dailyTracker_profile',
    familyMembers: 'dailyTracker_familyMembers',
    metadata: 'dailyTracker_metadata'
};
const idbConfig = {
    dbName: 'dailyTrackerDB',
    storeName: 'appState'
};
const healthValidationRules = {
    bloodPressure: { systolic: [60, 250], diastolic: [40, 150] },
    heartRate: { min: 30, max: 220, label: '心率' },
    bloodSugar: { min: 1, max: 30, label: '血糖' },
    bloodLipid: { min: 0.5, max: 20, label: '血脂' },
    uricAcid: { min: 60, max: 1200, label: '尿酸' }
};

// 活动类型图标映射
const typeIcons = {
    meal: '🍽️',
    medication: '💊',
    exercise: '🏃',
    sleep: '😴',
    work: '💼',
    other: '📌'
};

// 类型标签映射
const typeLabels = {
    meal: '用餐',
    medication: '用药',
    exercise: '运动',
    sleep: '睡眠',
    work: '工作',
    other: '其他'
};

const healthTypeLabels = {
    bloodPressure: '血压',
    heartRate: '心率',
    bloodSugar: '血糖',
    bloodLipid: '血脂',
    uricAcid: '尿酸',
    other: '其他指标'
};

const healthTypeIcons = {
    bloodPressure: '🩺',
    heartRate: '❤️',
    bloodSugar: '🩸',
    bloodLipid: '🧪',
    uricAcid: '💧',
    other: '📋'
};

const healthTypeUnits = {
    bloodPressure: 'mmHg',
    heartRate: 'bpm',
    bloodSugar: 'mmol/L',
    bloodLipid: 'mmol/L',
    uricAcid: 'umol/L',
    other: ''
};

const profileFieldNames = [
    'Name',
    'Gender',
    'Age',
    'Height',
    'Weight',
    'BloodType',
    'BloodPressure',
    'BloodSugar',
    'ChronicConditions',
    'Allergies',
    'Medications',
    'Smoking',
    'Drinking',
    'Exercise',
    'SleepHours',
    'HealthGoals',
    'Notes'
];

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    loadActivities();
    loadHealthRecords();
    loadSymptomRecords();
    loadReminders();
    loadProfile();
    loadFamilyMembers();
    loadMedicines();
    setupEventListeners();
    setupReminderListeners();
    setupProfileListeners();
    hydrateCloudSyncForm();
    updateDisplay();
    updateRemindersDisplay();
    renderReminderTabs('today');
    updateStorageStatus();
    maybeRemindBackup();
    checkReminders();
    await refreshActivitiesFromBackend(getDateKey(currentDate), { silent: true });
    await refreshHealthRecordsFromBackend(getDateKey(currentDate), { silent: true });
    await refreshSymptomRecordsFromBackend(getDateKey(currentDate), { silent: true });
    await refreshRemindersFromBackend({ silent: true });
    await refreshProfileFromBackend({ silent: true });
    await refreshDailyNoteFromBackend(getDateKey(currentDate), { silent: true });
    setInterval(checkReminders, 60000);
    await registerServiceWorker();
    await syncRemindersToServiceWorker();
    await syncRemindersToNative();
    setupImageViewer();
    window.addEventListener('online', () => {
        resumePendingCloudSync();
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            resumePendingCloudSync();
        }
    });
    await resumePendingCloudSync();
});

function getDefaultMetadata() {
    return {
        schemaVersion: STORAGE_SCHEMA_VERSION,
        storageEngine: 'localStorage',
        lastBackupAt: '',
        lastImportAt: '',
        backupReminderDays: BACKUP_REMINDER_DAYS
    };
}

function createEmptyState() {
    return {
        activities: {},
        healthRecords: {},
        symptomRecords: {},
        dailyNotes: {},
        reminders: [],
        medicines: [],
        profile: {},
        familyMembers: [],
        metadata: getDefaultMetadata()
    };
}

function getLocalStorageJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        console.error(`Failed to parse storage key: ${key}`, error);
        return fallback;
    }
}

function setLocalStorageJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('INDEXEDDB_UNAVAILABLE'));
            return;
        }

        const request = indexedDB.open(idbConfig.dbName, 1);
        request.onerror = () => reject(request.error || new Error('INDEXEDDB_OPEN_FAILED'));
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(idbConfig.storeName)) {
                db.createObjectStore(idbConfig.storeName, { keyPath: 'key' });
            }
        };
        request.onsuccess = () => resolve(request.result);
    });
}

async function readStateFromIndexedDB(key) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(idbConfig.storeName, 'readonly');
        const store = transaction.objectStore(idbConfig.storeName);
        const request = store.get(key);
        request.onerror = () => reject(request.error || new Error('INDEXEDDB_READ_FAILED'));
        request.onsuccess = () => {
            resolve(request.result ? request.result.value : undefined);
            db.close();
        };
    });
}

async function writeStateToIndexedDB(key, value) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(idbConfig.storeName, 'readwrite');
        const store = transaction.objectStore(idbConfig.storeName);
        store.put({ key, value });
        transaction.oncomplete = () => {
            db.close();
            resolve();
        };
        transaction.onerror = () => reject(transaction.error || new Error('INDEXEDDB_WRITE_FAILED'));
    });
}

async function initializeStorageState() {
    const fallbackState = {
        activities: getLocalStorageJSON(legacyStorageKeys.activities, {}),
        healthRecords: getLocalStorageJSON(legacyStorageKeys.healthRecords, {}),
        symptomRecords: getLocalStorageJSON(legacyStorageKeys.symptomRecords, {}),
        dailyNotes: getLocalStorageJSON(legacyStorageKeys.dailyNotes, {}),
        reminders: getLocalStorageJSON(legacyStorageKeys.reminders, []),
        medicines: getLocalStorageJSON(legacyStorageKeys.medicines, []),
        profile: getLocalStorageJSON(legacyStorageKeys.profile, {}),
        familyMembers: getLocalStorageJSON(legacyStorageKeys.familyMembers, []),
        metadata: {
            ...getDefaultMetadata(),
            ...getLocalStorageJSON(legacyStorageKeys.metadata, {})
        }
    };

    try {
        await openIndexedDB();
        const keys = ['activities', 'healthRecords', 'symptomRecords', 'dailyNotes', 'reminders', 'medicines', 'profile', 'familyMembers', 'metadata'];
        const indexedState = {};

        for (const key of keys) {
            indexedState[key] = await readStateFromIndexedDB(key);
        }

        const hasIndexedData = keys.some(key => indexedState[key] !== undefined);

        if (!hasIndexedData) {
            const initialState = Object.keys(fallbackState.activities).length
                || Object.keys(fallbackState.healthRecords).length
                || Object.keys(fallbackState.symptomRecords).length
                || Object.keys(fallbackState.dailyNotes).length
                || fallbackState.reminders.length
                || Object.keys(fallbackState.profile).length
                || fallbackState.familyMembers.length
                ? fallbackState
                : createEmptyState();

            for (const key of keys) {
                await writeStateToIndexedDB(key, initialState[key]);
            }

            metadata = {
                ...getDefaultMetadata(),
                ...initialState.metadata,
                storageEngine: 'IndexedDB',
                schemaVersion: STORAGE_SCHEMA_VERSION
            };
            await writeStateToIndexedDB('metadata', metadata);
            setLocalStorageJSON(legacyStorageKeys.metadata, metadata);
            return initialState;
        }

        const normalizedState = {
            activities: indexedState.activities || {},
            healthRecords: indexedState.healthRecords || {},
            symptomRecords: indexedState.symptomRecords || {},
            dailyNotes: indexedState.dailyNotes || {},
            reminders: indexedState.reminders || [],
            medicines: indexedState.medicines || [],
            profile: indexedState.profile || {},
            familyMembers: indexedState.familyMembers || [],
            metadata: {
                ...getDefaultMetadata(),
                ...(indexedState.metadata || {}),
                storageEngine: 'IndexedDB',
                schemaVersion: STORAGE_SCHEMA_VERSION
            }
        };

        return normalizedState;
    } catch (error) {
        console.warn('IndexedDB unavailable, fallback to localStorage', error);
        fallbackState.metadata = {
            ...getDefaultMetadata(),
            ...fallbackState.metadata,
            storageEngine: 'localStorage',
            schemaVersion: STORAGE_SCHEMA_VERSION
        };
        return fallbackState;
    }
}

async function persistAppState(options = {}) {
    metadata = {
        ...getDefaultMetadata(),
        ...metadata,
        schemaVersion: STORAGE_SCHEMA_VERSION
    };

    if (!options.skipAutoCloudSync) {
        markCloudSyncPending();
    }

    const state = {
        activities: allActivitiesData,
        healthRecords: allHealthRecordsData,
        symptomRecords: allSymptomRecordsData,
        dailyNotes: allDailyNotesData,
        reminders,
        medicines,
        profile,
        familyMembers,
        metadata
    };

    try {
        if (metadata.storageEngine === 'IndexedDB') {
            for (const [key, value] of Object.entries(state)) {
                await writeStateToIndexedDB(key, value);
            }
        }
        setLocalStorageJSON(legacyStorageKeys.activities, allActivitiesData);
        setLocalStorageJSON(legacyStorageKeys.healthRecords, allHealthRecordsData);
        setLocalStorageJSON(legacyStorageKeys.symptomRecords, allSymptomRecordsData);
        setLocalStorageJSON(legacyStorageKeys.dailyNotes, allDailyNotesData);
        setLocalStorageJSON(legacyStorageKeys.reminders, reminders);
        setLocalStorageJSON(legacyStorageKeys.medicines, medicines);
        setLocalStorageJSON(legacyStorageKeys.profile, profile);
        setLocalStorageJSON(legacyStorageKeys.familyMembers, familyMembers);
        setLocalStorageJSON(legacyStorageKeys.metadata, metadata);
    } catch (error) {
        throw new Error('STORAGE_WRITE_FAILED');
    }

    if (!options.skipAutoCloudSync) {
        scheduleCloudAutoSync();
        updateCloudSyncStatusSummary(getCloudSyncConfig());
    }
}

async function initDB() {
    const state = await initializeStorageState();
    allActivitiesData = state.activities || {};
    allHealthRecordsData = state.healthRecords || {};
    allSymptomRecordsData = state.symptomRecords || {};
    allDailyNotesData = state.dailyNotes || {};
    reminders = normalizeReminders(state.reminders || []);
    medicines = state.medicines || [];
    profile = state.profile || {};
    familyMembers = normalizeFamilyMembers(state.familyMembers || []);
    metadata = {
        ...getDefaultMetadata(),
        ...(state.metadata || {})
    };

    if (shouldRefreshLegacyMockMedicines(medicines)) {
        medicines = createMockMedicines();
        await persistAppState({ skipAutoCloudSync: true });
    }

    // 加载模板
    loadTemplates();
}

// 加载模板
function loadTemplates() {
    const savedTemplates = getLocalStorageJSON('dailyTracker_templates', null);
    if (savedTemplates && savedTemplates.length > 0) {
        templates = savedTemplates.filter(template => {
            return !(template.id === 'tpl_2' || template.name === '维生素D' || template.content === '维生素D 1粒');
        });
        if (templates.length !== savedTemplates.length) {
            saveTemplates();
        }
    } else {
        // 使用默认模板
        templates = [...defaultTemplates];
        saveTemplates();
    }
}

// 保存模板
function saveTemplates() {
    setLocalStorageJSON('dailyTracker_templates', templates);
}

function createMockActivities() {
    const dateKey = (offsetDays = 0) => {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        return getDateKey(date);
    };

    return {
        [dateKey(0)]: [
            createMockActivity('a1', '06:35', 'sleep', '昨晚 23:10 入睡，睡眠约 7 小时 20 分', '起床后清醒度不错，但喉咙略干', null, createMockImageDataUri('睡眠', '#b8e6c6', '#5fae75', '夜间睡眠记录')),
            createMockActivity('a2', '07:20', 'meal', '早餐：燕麦酸奶杯 + 水煮蛋 + 蓝莓', '胃部舒服，饱腹感稳定', 20, createMockImageDataUri('早餐', '#f5d68b', '#88b56a', '高纤早餐')),
            createMockActivity('a3', '07:50', 'medication', '维生素D 1 粒 + 鱼油 1 粒', '无不适，饭后服用'),
            createMockActivity('a4', '09:30', 'work', '整理本周活动与症状关联', '发现熬夜后更容易午后乏力', 35),
            createMockActivity('a5', '12:15', 'meal', '午餐：糙米饭、清蒸鱼、时蔬', '清淡后下午更轻松', 30, createMockImageDataUri('午餐', '#d9f0c7', '#76a95d', '清淡午餐')),
            createMockActivity('a6', '14:10', 'other', '午休 18 分钟（番茄钟）', '恢复精力，头脑更清楚', 18),
            createMockActivity('a7', '18:35', 'exercise', '快走 4.2km + 拉伸 12 分钟', '微微出汗，心肺状态良好', 42, createMockImageDataUri('运动', '#b7ead8', '#3c8f68', '晚间有氧')),
            createMockActivity('a8', '19:40', 'meal', '晚餐：南瓜粥、鸡胸肉沙拉', '晚饭轻食后胃部负担小', 25),
            createMockActivity('a9', '21:10', 'medication', '益生菌 1 袋', '晚间肠胃感觉平稳'),
            createMockActivity('a10', '22:30', 'sleep', '准备睡前放松：热水泡脚 + 关屏', '计划 23:00 前入睡', 20)
        ],
        [dateKey(-1)]: [
            createMockActivity('b1', '06:50', 'sleep', '夜间醒来 1 次，总睡眠约 6 小时 50 分', '晨起略困', null),
            createMockActivity('b2', '07:35', 'meal', '早餐：全麦吐司、鸡蛋、牛奶', '血糖波动感不明显', 18),
            createMockActivity('b3', '08:10', 'work', '复盘昨天血压和饮食记录', '发现盐分摄入偏高', 25),
            createMockActivity('b4', '12:05', 'meal', '午餐：番茄牛腩 + 西兰花 + 小米饭', '饱腹感偏强', 32),
            createMockActivity('b5', '18:20', 'exercise', '慢跑 5km（配速 6\'40\"）', '后程有点累，但整体可控', 38, createMockImageDataUri('慢跑', '#c8f1d1', '#419a63', '公园跑道')),
            createMockActivity('b6', '20:05', 'meal', '晚餐：杂粮粥 + 凉拌黄瓜', '清爽，睡前不胀', 20),
            createMockActivity('b7', '21:30', 'other', '记录当天心情和压力源', '压力来自工作收尾，已拆解任务', 15)
        ],
        [dateKey(-2)]: [
            createMockActivity('c1', '07:10', 'sleep', '夜间睡眠 7 小时 45 分', '醒后精神较好'),
            createMockActivity('c2', '08:00', 'meal', '早餐：豆浆 + 玉米 + 鸡蛋', '早餐后体感稳定', 18),
            createMockActivity('c3', '12:20', 'meal', '午餐：鸡胸肉意面 + 生菜', '下午未犯困', 28),
            createMockActivity('c4', '16:30', 'medication', '感冒灵颗粒 1 袋', '咽喉轻微不适时服用'),
            createMockActivity('c5', '19:00', 'exercise', '室内骑行 30 分钟', '中等强度，心率可控', 30),
            createMockActivity('c6', '22:10', 'sleep', '提前做睡前拉伸', '入睡更快', 15)
        ],
        [dateKey(-3)]: [
            createMockActivity('d1', '07:30', 'sleep', '睡眠 6 小时 20 分', '起床偏疲劳'),
            createMockActivity('d2', '08:20', 'meal', '早餐：小米粥 + 鸡蛋', '胃部舒服', 15),
            createMockActivity('d3', '13:00', 'work', '外出办事步行较多', '下午腿部略酸', 60),
            createMockActivity('d4', '19:15', 'meal', '晚餐：清蒸鱼 + 紫甘蓝', '较清淡', 25),
            createMockActivity('d5', '21:40', 'other', '热敷颈肩 20 分钟', '肩颈放松明显', 20)
        ],
        [dateKey(-4)]: [
            createMockActivity('e1', '07:00', 'sleep', '周末睡眠 8 小时', '恢复感明显', null),
            createMockActivity('e2', '09:00', 'meal', '早餐：牛奶燕麦 + 坚果', '状态不错', 25),
            createMockActivity('e3', '10:30', 'exercise', '公园快走 50 分钟', '心情放松', 50),
            createMockActivity('e4', '12:40', 'meal', '午餐：番茄鸡蛋面', '适中', 20),
            createMockActivity('e5', '20:30', 'other', '本周计划回顾', '目标更清晰', 30)
        ],
        [dateKey(1)]: [
            createMockActivity('f1', '07:10', 'sleep', '计划早起后观察晨起心率', '明日计划'),
            createMockActivity('f2', '18:50', 'exercise', '计划快走 30 分钟', '保持连续性', 30),
            createMockActivity('f3', '21:30', 'other', '计划 22:30 前停止使用手机', '优化睡前节律', 10)
        ]
    };
}

function createMockActivity(id, time, type, content, feeling, duration = null, image = null) {
    return {
        id,
        time,
        startTime: time,
        endTime: duration ? addMinutesToTime(time, duration) : time,
        type,
        content,
        feeling,
        duration,
        image,
        createdAt: new Date().toISOString()
    };
}

function createMockImageDataUri(title, topColor, bottomColor, subtitle) {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="${topColor}"/>
                    <stop offset="100%" stop-color="${bottomColor}"/>
                </linearGradient>
            </defs>
            <rect width="1200" height="720" rx="48" fill="url(#bg)"/>
            <circle cx="950" cy="160" r="88" fill="rgba(255,255,255,0.18)"/>
            <circle cx="1015" cy="245" r="42" fill="rgba(255,255,255,0.14)"/>
            <path d="M140 560 C280 410, 470 400, 650 545 S980 690, 1110 545 L1110 720 L140 720 Z" fill="rgba(255,255,255,0.18)"/>
            <rect x="84" y="84" width="220" height="58" rx="29" fill="rgba(255,255,255,0.2)"/>
            <text x="194" y="121" text-anchor="middle" font-size="28" font-family="Segoe UI, Arial" fill="white">健康记录</text>
            <text x="96" y="325" font-size="92" font-weight="700" font-family="Segoe UI, Arial" fill="white">${title}</text>
            <text x="100" y="392" font-size="38" font-family="Segoe UI, Arial" fill="rgba(255,255,255,0.92)">${subtitle}</text>
            <text x="98" y="635" font-size="28" font-family="Segoe UI, Arial" fill="rgba(255,255,255,0.9)">示例图片 · 本地演示数据</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createMockReminders() {
    const today = getDateKey(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return [
        createMockReminder('r1', '早餐时间', 'meal', today, '08:00', 'daily', '吃得清淡一点，先补充蛋白质'),
        createMockReminder('r2', '记得服药', 'medication', today, '09:00', 'daily', '早餐后服用', createMockImageDataUri('用药', '#d7f0cf', '#78ae69', '随餐服用提醒')),
        createMockReminder('r3', '晚上活动一下', 'exercise', today, '19:00', 'weekly', '至少快走 30 分钟'),
        createMockReminder('r4', '准备睡眠', 'sleep', today, '22:30', 'daily', '睡前少看手机', createMockImageDataUri('睡眠提醒', '#cbead3', '#659f76', '放下手机准备休息')),
        createMockReminder('r5', '复查预约提醒', 'other', getDateKey(tomorrow), '15:00', 'monthly', '带上病历和检查单'),
        {
            ...createMockReminder('r6', '午间散步', 'exercise', today, '13:30', 'none', '饭后散步 15 分钟'),
            completed: true,
            completedAt: new Date().toISOString()
        }
    ];
}

function createMockReminder(id, title, type, date, time, repeat, notes, image = null) {
    return {
        id,
        title,
        type,
        date,
        time,
        repeat,
        notes,
        image,
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString()
    };
}

function createMockHealthRecords() {
    const dateKey = (offsetDays = 0) => {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        return getDateKey(date);
    };

    return {
        [dateKey(0)]: [
            createMockHealthRecord('h1', '06:45', 'bloodPressure', '116/74', 'mmHg', '起床后静息测量', createMockImageDataUri('血压', '#d6efe0', '#6aa67f', '晨起测量')),
            createMockHealthRecord('h2', '06:46', 'heartRate', '66', 'bpm', '晨起心率'),
            createMockHealthRecord('h3', '08:35', 'bloodSugar', '5.4', 'mmol/L', '早餐后 1 小时'),
            createMockHealthRecord('h4', '13:10', 'bloodSugar', '6.2', 'mmol/L', '午餐后 1 小时', createMockImageDataUri('血糖', '#f0d9cc', '#c98f7b', '试纸结果')),
            createMockHealthRecord('h5', '18:05', 'heartRate', '88', 'bpm', '运动后 8 分钟'),
            createMockHealthRecord('h6', '21:15', 'uricAcid', '349', 'umol/L', '晚间检测'),
            createMockHealthRecord('h7', '21:16', 'bloodLipid', 'TC 4.8 / TG 1.5', 'mmol/L', '家用设备参考值')
        ],
        [dateKey(-1)]: [
            createMockHealthRecord('h8', '07:10', 'bloodPressure', '123/80', 'mmHg', '睡眠不足当日'),
            createMockHealthRecord('h9', '07:12', 'heartRate', '72', 'bpm', '晨起偏高'),
            createMockHealthRecord('h10', '12:50', 'bloodSugar', '6.5', 'mmol/L', '午餐后 1 小时'),
            createMockHealthRecord('h11', '18:30', 'heartRate', '94', 'bpm', '慢跑后恢复阶段', createMockImageDataUri('心率', '#f3d2d7', '#cf7e8b', '运动监测'))
        ],
        [dateKey(-2)]: [
            createMockHealthRecord('h12', '07:00', 'bloodPressure', '119/77', 'mmHg', '晨测'),
            createMockHealthRecord('h13', '20:20', 'bloodSugar', '5.8', 'mmol/L', '晚餐后 2 小时')
        ],
        [dateKey(-3)]: [
            createMockHealthRecord('h14', '07:25', 'bloodPressure', '128/84', 'mmHg', '前一晚睡眠较差'),
            createMockHealthRecord('h15', '21:00', 'heartRate', '76', 'bpm', '静息')
        ],
        [dateKey(-4)]: [
            createMockHealthRecord('h16', '08:15', 'bloodPressure', '117/75', 'mmHg', '周末放松日'),
            createMockHealthRecord('h17', '20:45', 'bloodSugar', '5.6', 'mmol/L', '晚餐后 2 小时')
        ]
    };
}

function createMockHealthRecord(id, time, type, value, unit, notes = '', image = null) {
    return {
        id,
        time,
        type,
        value,
        unit,
        notes,
        image,
        createdAt: new Date().toISOString()
    };
}

function createMockSymptomRecords() {
    const dateKey = (offsetDays = 0) => {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        return getDateKey(date);
    };

    return {
        [dateKey(0)]: [
            createMockSymptomRecord('s1', '10:20', '轻微头痛，太阳穴胀感（2/10）', '补水 + 闭眼休息 15 分钟后缓解', createMockImageDataUri('头痛', '#f5ddcf', '#d38665', '轻度头痛')),
            createMockSymptomRecord('s2', '14:35', '午后胃部发胀、轻微反酸', '慢走 10 分钟，减少咖啡摄入，30 分钟后改善', createMockImageDataUri('胃部不适', '#f7e6cf', '#d8a373', '饭后不适')),
            createMockSymptomRecord('s3', '20:40', '咽喉偏干，吞咽时轻微刺痛', '温盐水漱口 + 温水补液，继续观察'),
            createMockSymptomRecord('s4', '22:05', '肩颈紧绷，久坐后更明显', '热敷 20 分钟 + 拉伸，疼痛从 4/10 降到 2/10')
        ],
        [dateKey(-1)]: [
            createMockSymptomRecord('s5', '09:15', '晨起鼻塞，间歇打喷嚏', '生理盐水冲洗鼻腔后缓解'),
            createMockSymptomRecord('s6', '21:10', '喉咙轻微发紧，吞咽不适', '减少说话，多喝温水，睡前观察')
        ],
        [dateKey(-2)]: [
            createMockSymptomRecord('s7', '16:40', '眼睛干涩，屏幕工作后酸胀', '20-20-20 眼保健法 + 人工泪液，症状减轻')
        ],
        [dateKey(-3)]: [
            createMockSymptomRecord('s8', '13:25', '午饭后短暂犯困伴轻微头晕', '开窗通风 + 步行 8 分钟恢复')
        ],
        [dateKey(-4)]: [
            createMockSymptomRecord('s9', '19:50', '运动后小腿酸胀', '泡沫轴放松 15 分钟，次日明显缓解')
        ]
    };
}

function createMockSymptomRecord(id, time, description, measures = '', image = null) {
    return {
        id,
        time,
        description,
        measures,
        image,
        createdAt: new Date().toISOString()
    };
}

function createMockDailyNotes() {
    const dateKey = (offsetDays = 0) => {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        return getDateKey(date);
    };

    const buildUpdatedAt = (offsetDays = 0) => {
        const date = new Date();
        date.setDate(date.getDate() + offsetDays);
        return date.toISOString();
    };

    return {
        [dateKey(0)]: {
            content: '今天整体状态中等偏好。午后胃部轻微不适与进食速度偏快有关；晚间运动后心情改善，建议继续保持晚餐清淡与 23:00 前入睡。',
            updatedAt: buildUpdatedAt(0)
        },
        [dateKey(-1)]: {
            content: '昨日晨起血压略高，和前夜睡眠不足相关性明显。减少咖啡摄入后，晚间状态恢复。',
            updatedAt: buildUpdatedAt(-1)
        },
        [dateKey(-2)]: {
            content: '饮食和活动节奏较稳定，血糖波动较小。建议继续维持午后 10-15 分钟轻活动。',
            updatedAt: buildUpdatedAt(-2)
        },
        [dateKey(-3)]: {
            content: '工作强度偏高导致肩颈紧张，热敷和拉伸有效。后续可增加每小时起身活动提醒。',
            updatedAt: buildUpdatedAt(-3)
        },
        [dateKey(-4)]: {
            content: '周末整体恢复良好，睡眠补足后精神明显提升。下周重点保持稳定作息与规律运动。',
            updatedAt: buildUpdatedAt(-4)
        }
    };
}

function createMockProfile() {
    return {
        name: '张晨',
        gender: 'female',
        age: '34',
        height: '165',
        weight: '58',
        bloodType: 'A',
        bloodPressure: '118/76',
        bloodSugar: '5.3 mmol/L',
        chronicConditions: '轻度胃炎，季节性鼻炎',
        allergies: '海鲜轻微过敏',
        medications: '维生素D 每日1粒，益生菌按需补充',
        healthGoals: '规律睡眠、每周运动4次、晚餐控制油脂',
        notes: '近期重点关注睡眠质量和饭后血糖波动'
    };
}

function createMockMedicines() {
    const today = new Date();
    const createDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const createDateOnly = (offsetDays) => {
        const date = new Date(today);
        date.setDate(date.getDate() + offsetDays);
        return getDateKey(date);
    };

    return [
        {
            id: 'med_001',
            name: '阿莫西林胶囊',
            type: 'otc',
            expirationDate: createDateOnly(420),
            productionDate: createDateOnly(-420),
            indication: '细菌感染、上呼吸道感染、扁桃体炎',
            dosage: '每日 3 次，每次 2 粒，饭后服用',
            contraindication: '青霉素过敏者禁用',
            manufacturer: '哈药集团制药总厂',
            notes: '存放于阴凉干燥处',
            createdAt: createDate,
            updatedAt: createDate
        },
        {
            id: 'med_002',
            name: '布洛芬缓释胶囊',
            type: 'otc',
            expirationDate: createDateOnly(-90),
            productionDate: createDateOnly(-720),
            indication: '缓解轻至中度疼痛、发热',
            dosage: '口服。疼痛或发热时服用，间隔 4-6 小时一次',
            contraindication: '活动性消化道出血患者禁用',
            manufacturer: '中美天津史克制药有限公司',
            notes: '饭后服用，不可超过推荐剂量',
            createdAt: createDate,
            updatedAt: createDate
        },
        {
            id: 'med_003',
            name: '氯雷他定片',
            type: 'otc',
            expirationDate: createDateOnly(540),
            productionDate: createDateOnly(-360),
            indication: '过敏性鼻炎、慢性荨麻疹',
            dosage: '每日 1 次，每次 1 片',
            contraindication: '对本品成分过敏者禁用',
            manufacturer: '西安杨森制药有限公司',
            notes: '季节性鼻炎发作时使用',
            createdAt: createDate,
            updatedAt: createDate
        },
        {
            id: 'med_004',
            name: '奥美拉唑肠溶胶囊',
            type: 'prescription',
            expirationDate: createDateOnly(75),
            productionDate: createDateOnly(-480),
            indication: '胃溃疡、十二指肠溃疡、反流性食管炎',
            dosage: '晨起空腹服用，每日 1 次，每次 1 粒',
            contraindication: '对苯并咪唑类药物过敏者禁用',
            manufacturer: '阿斯利康制药有限公司',
            notes: '整粒吞服，不可咀嚼',
            createdAt: createDate,
            updatedAt: createDate
        },
        {
            id: 'med_005',
            name: '维生素C泡腾片',
            type: 'supplement',
            expirationDate: createDateOnly(18),
            productionDate: createDateOnly(-540),
            indication: '补充维生素C，增强免疫力',
            dosage: '每日 1 片，用温水冲服',
            contraindication: '高草酸尿症患者慎用',
            manufacturer: '拜耳医药保健有限公司',
            notes: '建议随餐或餐后使用',
            createdAt: createDate,
            updatedAt: createDate
        },
        {
            id: 'med_006',
            name: '复方丹参滴丸',
            type: 'chinese',
            expirationDate: createDateOnly(150),
            productionDate: createDateOnly(-300),
            indication: '胸闷、心绞痛、冠心病',
            dosage: '一次 10 丸，一日 3 次，可舌下含服',
            contraindication: '孕妇禁用',
            manufacturer: '天士力医药集团股份有限公司',
            notes: '密封避光保存',
            createdAt: createDate,
            updatedAt: createDate
        },
        {
            id: 'med_007',
            name: '地西泮片',
            type: 'psychotropic',
            expirationDate: createDateOnly(-30),
            productionDate: createDateOnly(-840),
            indication: '焦虑、失眠、肌肉痉挛',
            dosage: '严格遵医嘱使用，不可自行加量或停药',
            contraindication: '青光眼、重症肌无力患者禁用',
            manufacturer: '天津药物研究院药业有限责任公司',
            notes: '精神类药品，需密闭保存',
            createdAt: createDate,
            updatedAt: createDate
        },
        {
            id: 'med_008',
            name: '感冒灵颗粒',
            type: 'chinese',
            expirationDate: createDateOnly(-180),
            productionDate: createDateOnly(-760),
            indication: '感冒、头痛、发热',
            dosage: '开水冲服，一次 1 袋，一日 3 次',
            contraindication: '严重肝肾功能不全者慎用',
            manufacturer: '华润三九医药股份有限公司',
            notes: '服药期间避免烟酒及辛辣食物',
            createdAt: createDate,
            updatedAt: createDate
        },
        {
            id: 'med_009',
            name: '钙尔奇D600片',
            type: 'supplement',
            expirationDate: createDateOnly(720),
            productionDate: createDateOnly(-260),
            indication: '补钙、预防骨质疏松',
            dosage: '每日 1 片，随餐服用效果更佳',
            contraindication: '高钙血症患者禁用',
            manufacturer: '惠氏制药有限公司',
            notes: '避免与含铁补剂同服',
            createdAt: createDate,
            updatedAt: createDate
        },
        {
            id: 'med_010',
            name: '头孢克肟分散片',
            type: 'prescription',
            expirationDate: createDateOnly(260),
            productionDate: createDateOnly(-620),
            indication: '支气管炎、肺炎、膀胱炎',
            dosage: '严格遵医嘱按疗程服用，不可擅自停药',
            contraindication: '对头孢类抗生素过敏者禁用',
            manufacturer: '广州白云山制药股份有限公司',
            notes: '疗程结束后继续观察症状变化',
            createdAt: createDate,
            updatedAt: createDate
        }
    ];
}

async function loadDemoData() {
    const shouldReplace = confirm('这会用示例数据覆盖当前本地活动、健康、症状和提醒记录，是否继续？');
    if (!shouldReplace) return;

    allActivitiesData = createMockActivities();
    allHealthRecordsData = createMockHealthRecords();
    allSymptomRecordsData = createMockSymptomRecords();
    allDailyNotesData = createMockDailyNotes();
    reminders = normalizeReminders(createMockReminders());
    medicines = createMockMedicines();
    profile = createMockProfile();
    metadata.lastImportAt = new Date().toISOString();
    await persistAppState();

    loadActivities();
    loadHealthRecords();
    loadSymptomRecords();
    updateDisplay();
    updateRemindersDisplay();
    renderReminderTabs('today');
    renderMedicineList();
    updateStorageStatus();
    showToast('示例数据已加载');
}

async function resetAllData() {
    const shouldClear = confirm('这会清空当前浏览器中的全部活动和提醒数据，是否继续？');
    if (!shouldClear) return;

    allActivitiesData = {};
    allHealthRecordsData = {};
    allSymptomRecordsData = {};
    allDailyNotesData = {};
    reminders = [];
    medicines = [];
    profile = {};
    metadata = {
        ...getDefaultMetadata(),
        ...metadata,
        storageEngine: metadata.storageEngine || 'localStorage'
    };
    await persistAppState();

    loadActivities();
    loadHealthRecords();
    loadSymptomRecords();
    updateDisplay();
    updateRemindersDisplay();
    renderReminderTabs('today');
    renderMedicineList();
    updateStorageStatus();
    showToast('本地数据已清空');
}

// 加载活动数据
function loadActivities() {
    const dateKey = getDateKey(currentDate);
    activities = (allActivitiesData[dateKey] || []).map(normalizeActivity);
    activities.sort((a, b) => getActivitySortTime(a).localeCompare(getActivitySortTime(b)));
}

function isBackendActivityModeEnabled() {
    return isCloudSyncAuthenticated();
}

function normalizeBackendActivityRecord(record) {
    return normalizeActivity({
        id: String(record.id),
        backendId: record.id,
        time: record.startTime || '00:00',
        startTime: record.startTime || '00:00',
        endTime: record.endTime || record.startTime || '00:00',
        type: record.type,
        content: record.content || '',
        feeling: record.feeling || '',
        duration: typeof record.durationMinutes === 'number' ? record.durationMinutes : null,
        image: record.imageUrl || null,
        source: record.source || '',
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: record.updatedAt || new Date().toISOString(),
        activityDate: record.activityDate || getDateKey(currentDate)
    });
}

function toBackendActivityPayload(activity, dateKey = getDateKey(currentDate)) {
    return {
        activityDate: dateKey,
        startTime: activity.startTime || activity.time,
        endTime: activity.endTime || activity.time,
        durationMinutes: typeof activity.duration === 'number' ? activity.duration : null,
        type: activity.type,
        content: activity.content,
        feeling: activity.feeling || '',
        imageUrl: activity.image || '',
        source: activity.source || 'web'
    };
}

async function refreshActivitiesFromBackend(dateKey = getDateKey(currentDate), options = {}) {
    if (!isBackendActivityModeEnabled()) {
        loadActivities();
        return activities;
    }

    try {
        const response = await cloudSyncRequest(`/api/activities?date=${encodeURIComponent(dateKey)}`, {
            method: 'GET'
        });
        const normalized = Array.isArray(response) ? response.map(normalizeBackendActivityRecord) : [];
        normalized.sort((a, b) => getActivitySortTime(a).localeCompare(getActivitySortTime(b)));
        allActivitiesData[dateKey] = normalized;

        if (dateKey === getDateKey(currentDate)) {
            activities = [...normalized];
            updateDisplay();
        }

        await persistAppState({ skipAutoCloudSync: true });
        await updateStorageStatus();
        return normalized;
    } catch (error) {
        console.error(error);
        if (!options.silent) {
            showToast('活动数据加载失败，请检查后端连接');
        }
        return [...(allActivitiesData[dateKey] || [])];
    }
}

function loadHealthRecords() {
    const dateKey = getDateKey(currentDate);
    healthRecords = [...(allHealthRecordsData[dateKey] || [])];
    healthRecords.sort((a, b) => a.time.localeCompare(b.time));
}

function isBackendHealthModeEnabled() {
    return isCloudSyncAuthenticated();
}

function normalizeBackendHealthRecord(record) {
    return {
        id: String(record.id),
        backendId: record.id,
        time: record.recordTime || '00:00',
        type: record.type,
        value: record.value,
        unit: record.unit || '',
        notes: record.notes || '',
        image: record.imageUrl || null,
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: record.updatedAt || new Date().toISOString(),
        recordDate: record.recordDate || getDateKey(currentDate)
    };
}

function toBackendHealthPayload(record, dateKey = getDateKey(currentDate)) {
    return {
        recordDate: dateKey,
        recordTime: record.time,
        type: record.type,
        value: record.value,
        unit: record.unit || '',
        notes: record.notes || '',
        imageUrl: record.image || ''
    };
}

async function refreshHealthRecordsFromBackend(dateKey = getDateKey(currentDate), options = {}) {
    if (!isBackendHealthModeEnabled()) {
        loadHealthRecords();
        return healthRecords;
    }

    try {
        const response = await cloudSyncRequest(`/api/health-records?date=${encodeURIComponent(dateKey)}`, {
            method: 'GET'
        });
        const normalized = Array.isArray(response) ? response.map(normalizeBackendHealthRecord) : [];
        normalized.sort((a, b) => a.time.localeCompare(b.time));
        allHealthRecordsData[dateKey] = normalized;

        if (dateKey === getDateKey(currentDate)) {
            healthRecords = [...normalized];
            updateDisplay();
        }

        await persistAppState({ skipAutoCloudSync: true });
        await updateStorageStatus();
        return normalized;
    } catch (error) {
        console.error(error);
        if (!options.silent) {
            showToast('健康数据加载失败，请检查后端连接');
        }
        return [...(allHealthRecordsData[dateKey] || [])];
    }
}

function loadSymptomRecords() {
    const dateKey = getDateKey(currentDate);
    symptomRecords = [...(allSymptomRecordsData[dateKey] || [])];
    symptomRecords.sort((a, b) => a.time.localeCompare(b.time));
}

function isBackendSymptomModeEnabled() {
    return isCloudSyncAuthenticated();
}

function normalizeBackendSymptomRecord(record) {
    return {
        id: String(record.id),
        backendId: record.id,
        time: record.recordTime || '00:00',
        description: record.description || '',
        measures: record.measures || '',
        image: record.imageUrl || null,
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: record.updatedAt || new Date().toISOString(),
        recordDate: record.recordDate || getDateKey(currentDate)
    };
}

function toBackendSymptomPayload(record, dateKey = getDateKey(currentDate)) {
    return {
        recordDate: dateKey,
        recordTime: record.time,
        description: record.description,
        measures: record.measures || '',
        imageUrl: record.image || ''
    };
}

async function refreshSymptomRecordsFromBackend(dateKey = getDateKey(currentDate), options = {}) {
    if (!isBackendSymptomModeEnabled()) {
        loadSymptomRecords();
        return symptomRecords;
    }

    try {
        const response = await cloudSyncRequest(`/api/symptom-records?date=${encodeURIComponent(dateKey)}`, {
            method: 'GET'
        });
        const normalized = Array.isArray(response) ? response.map(normalizeBackendSymptomRecord) : [];
        normalized.sort((a, b) => a.time.localeCompare(b.time));
        allSymptomRecordsData[dateKey] = normalized;

        if (dateKey === getDateKey(currentDate)) {
            symptomRecords = [...normalized];
            updateDisplay();
        }

        await persistAppState({ skipAutoCloudSync: true });
        await updateStorageStatus();
        return normalized;
    } catch (error) {
        console.error(error);
        if (!options.silent) {
            showToast('症状记录加载失败，请检查后端连接');
        }
        return [...(allSymptomRecordsData[dateKey] || [])];
    }
}

// 保存活动数据
async function saveActivities() {
    const dateKey = getDateKey(currentDate);
    allActivitiesData[dateKey] = activities.map(normalizeActivity);
    await persistAppState();
    await updateStorageStatus();
}

async function saveHealthRecords() {
    const dateKey = getDateKey(currentDate);
    allHealthRecordsData[dateKey] = [...healthRecords];
    await persistAppState();
    await updateStorageStatus();
}

async function saveSymptomRecords() {
    const dateKey = getDateKey(currentDate);
    allSymptomRecordsData[dateKey] = [...symptomRecords];
    await persistAppState();
    await updateStorageStatus();
}

// 获取日期键
function getDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// AI 模块沿用了 formatDateKey 命名，这里保持兼容，避免初始化时抛错。
function formatDateKey(date) {
    return getDateKey(date);
}

// 设置事件监听器
function setupEventListeners() {
    // 日期导航
    document.getElementById('prevDay').addEventListener('click', () => changeDate(-1));
    document.getElementById('nextDay').addEventListener('click', () => changeDate(1));
    document.getElementById('currentDate').addEventListener('click', openCurrentDatePicker);
    document.getElementById('calendarPrevMonth').addEventListener('click', () => shiftCalendarMonth(-1));
    document.getElementById('calendarNextMonth').addEventListener('click', () => shiftCalendarMonth(1));
    document.getElementById('calendarDayGrid').addEventListener('click', handleCalendarDayClick);
    document.getElementById('currentDatePanel').addEventListener('click', handleCalendarPanelClick);
    document.getElementById('recordsPrevDay')?.addEventListener('click', () => changeDate(-1));
    document.getElementById('recordsNextDay')?.addEventListener('click', () => changeDate(1));
    document.getElementById('recordsCurrentDate')?.addEventListener('click', openRecordsDatePicker);
    document.getElementById('recordsCalendarPrevMonth')?.addEventListener('click', () => shiftCalendarMonthFor('records', -1));
    document.getElementById('recordsCalendarNextMonth')?.addEventListener('click', () => shiftCalendarMonthFor('records', 1));
    document.getElementById('recordsCalendarDayGrid')?.addEventListener('click', handleRecordsCalendarDayClick);
    document.getElementById('recordsCurrentDatePanel')?.addEventListener('click', handleRecordsCalendarPanelClick);

    document.getElementById('homeBtn').addEventListener('click', () => switchPage('home'));
    document.getElementById('recordBtn').addEventListener('click', () => switchPage('records'));
    document.getElementById('recordPrimaryActionBtn').addEventListener('click', openCurrentRecordModal);
    document.querySelectorAll('.records-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => setCurrentRecordView(btn.dataset.recordView));
    });

    // 提醒按钮
    document.getElementById('reminderBtn').addEventListener('click', () => openReminderPage('today'));
    document.getElementById('myBtn').addEventListener('click', () => switchPage('my'));
    document.getElementById('viewAllHealthDataBtn')?.addEventListener('click', () => {
        setCurrentRecordView('health');
        switchPage('records');
    });
    document.getElementById('viewHealthHistoryBtn')?.addEventListener('click', () => {
        setCurrentRecordView('health');
        switchPage('records');
    });

    // 我的模块入口
    ['exportBtn'].forEach(id => {
        document.getElementById(id).addEventListener('click', openExportModal);
    });
    document.getElementById('timelineOrderBtn').addEventListener('click', toggleTimelineOrder);
    document.getElementById('timelineEmptyActionBtn').addEventListener('click', () => openModal());
    document.getElementById('cloudSyncBtn').addEventListener('click', openCloudSyncModal);
    document.getElementById('profileBtn').addEventListener('click', openProfileModal);
    document.getElementById('familyMembersBtn').addEventListener('click', openFamilyMembersModal);
    document.getElementById('aiHealthAnalysisBtn')?.addEventListener('click', () => {
        switchPage('ai');
        // 如果是从 Modal（例如小屏幕下“我的”可能是一个弹窗）触发的，则尝试关闭
        const myModal = document.getElementById('myModal');
        if (myModal && myModal.style.display === 'block') {
            closeModal(myModal);
        }
    });

    // 数据辅助入口
    document.getElementById('seedDemoBtn').addEventListener('click', loadDemoData);
    document.getElementById('resetDataBtn').addEventListener('click', resetAllData);
    document.querySelector('#myModal .my-panel')?.addEventListener('click', (e) => {
        if (currentPage !== 'my' && e.target.closest('button')) {
            closeModal(document.getElementById('myModal'));
        }
    });

    // Header 汉堡菜单（兼容旧结构）
    const headerMoreBtn = document.getElementById('headerMoreBtn');
    const headerMoreMenu = document.getElementById('headerMoreMenu');
    if (headerMoreBtn && headerMoreMenu) {
        headerMoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = headerMoreMenu.classList.toggle('dropdown-open');
            headerMoreBtn.setAttribute('aria-expanded', isOpen);
        });
        // 点击菜单内的按钮后自动关闭
        headerMoreMenu.addEventListener('click', () => {
            headerMoreMenu.classList.remove('dropdown-open');
            headerMoreBtn.setAttribute('aria-expanded', 'false');
        });
        // 点击页面其他区域关闭
        document.addEventListener('click', (e) => {
            if (!headerMoreBtn.contains(e.target) && !headerMoreMenu.contains(e.target)) {
                headerMoreMenu.classList.remove('dropdown-open');
                headerMoreBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // 查看全部提醒
    document.getElementById('viewAllReminders').addEventListener('click', () => {
        openReminderPage('all');
    });
    document.getElementById('reminderEmptyActionBtn').addEventListener('click', () => {
        openReminderPage('add');
    });

    // 大模型配置按钮
    document.getElementById('aiConfigBtn').addEventListener('click', () => switchPage('ai-config'));

    // 模态框关闭
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        });
    });
    document.querySelectorAll('.page-back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const backDest = btn.dataset.backDest;
            if (backDest) {
                switchPage(backDest);
                return;
            }
            const modalId = btn.dataset.backModal;
            if (!modalId) return;
            const modal = document.getElementById(modalId);
            // 如果是页面模式，返回到上一页
            if (modal && modal.classList.contains('page-mode')) {
                if (modalId === 'medicineEditModal') {
                    switchPage('medicine-box');
                } else if (modalId === 'medicineDetailModal') {
                    switchPage('medicine-box');
                } else if (modalId === 'activityModal' || modalId === 'healthModal' || modalId === 'symptomModal') {
                    switchPage('records');
                } else if (modalId === 'reminderFormModal') {
                    switchPage('reminders');
                } else if (modalId === 'familyMemberFormModal') {
                    switchPage('family-members');
                } else if (modalId === 'medicineBoxModal' || modalId === 'exportModal' ||
                           modalId === 'cloudSyncModal' || modalId === 'profileModal' ||
                           modalId === 'familyMembersModal' ||
                           modalId === 'aiConfigModal') {
                    switchPage('my');
                } else if (modalId === 'reminderModal') {
                    switchPage('reminders');
                }
            } else {
                closeModal(modal);
            }
        });
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') && !e.target.classList.contains('page-mode')) {
            closeModal(e.target);
        }

        document.querySelectorAll('.current-date-wrap').forEach((dateWrap) => {
            if (!dateWrap.contains(e.target)) {
                dateWrap.querySelector('.current-date-panel')?.classList.add('hidden');
            }
        });
    });

    // 取消按钮
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        });
    });

    // 通用返回按钮 (优先使用历史记录，没有时使用 data-back-dest 默认值)
    document.querySelectorAll('[data-back-dest]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const dest = btn.dataset.backDest;
            if (pageHistory.length > 0) {
                const prevPage = pageHistory.pop();
                switchPage(prevPage, true);
            } else if (dest) {
                switchPage(dest);
            } else {
                switchPage('home');
            }
        });
    });

    // 表单提交
    document.getElementById('activityForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('activityStartTime').addEventListener('input', updateActivityDurationField);
    document.getElementById('activityEndTime').addEventListener('input', updateActivityDurationField);
    document.getElementById('activityType').addEventListener('change', updateActivityDurationField);
    document.getElementById('activityImageUpload').addEventListener('change', handleActivityImageChange);
    document.getElementById('activityImagePreview').addEventListener('click', handleImageGalleryClick);
    document.getElementById('healthForm').addEventListener('submit', handleHealthFormSubmit);
    document.getElementById('healthType').addEventListener('change', syncHealthUnitField);
    document.getElementById('healthImageUpload').addEventListener('change', handleHealthImageChange);
    document.getElementById('removeHealthImage').addEventListener('click', clearPendingHealthImage);
    document.getElementById('symptomForm').addEventListener('submit', handleSymptomFormSubmit);
    document.getElementById('symptomImageUpload').addEventListener('change', handleSymptomImageChange);
    document.getElementById('removeSymptomImage').addEventListener('click', clearPendingSymptomImage);

    // 导出按钮
    document.getElementById('exportJson').addEventListener('click', exportJson);
    document.getElementById('exportCsv').addEventListener('click', exportCsv);

    // 导出范围选择
    document.querySelectorAll('input[name="exportRange"]').forEach(radio => {
        radio.addEventListener('change', updateExportPreview);
    });
    document.getElementById('exportStartDate').addEventListener('change', updateExportPreview);
    document.getElementById('exportEndDate').addEventListener('change', updateExportPreview);
    document.getElementById('snoozeMinutes').addEventListener('change', toggleCustomSnoozeField);
    document.getElementById('saveCloudConfigBtn').addEventListener('click', saveCloudSyncConfig);
    document.getElementById('cloudAuthSubmitBtn').addEventListener('click', submitCloudAuth);
    document.getElementById('cloudAuthLogoutBtn').addEventListener('click', logoutCloudSyncAccount);
    document.getElementById('toggleCloudPasswordBtn').addEventListener('click', toggleCloudPasswordVisibility);
    document.getElementById('sendSmsCodeBtn').addEventListener('click', sendSmsCode);
    document.getElementById('cloudPushBtn').addEventListener('click', () => pushSnapshotToCloud(true));
    document.getElementById('cloudPullBtn').addEventListener('click', pullSnapshotFromCloud);
    document.getElementById('saveDailyNoteBtn').addEventListener('click', saveDailyNote);
    document.getElementById('quickAiDiagnosisBtn').addEventListener('click', runQuickTodayAiDiagnosis);
    document.getElementById('dailyNoteFullscreenBtn').addEventListener('click', toggleDailyNoteFullscreen);
    
    // 登录方式切换
    document.querySelectorAll('.cloud-login-tab').forEach(tab => {
        tab.addEventListener('click', () => switchLoginType(tab.dataset.loginType));
    });
    document.getElementById('dailyNoteInput').addEventListener('input', () => {
        const input = document.getElementById('dailyNoteInput');
        const meta = document.getElementById('dailyNoteMeta');
        if (!input || !meta) return;
        const savedValue = input.dataset.savedValue || '';
        meta.textContent = input.value === savedValue ? '已保存' : '有未保存修改';
    });

    // AI页面事件
    document.getElementById('startAiPageDiagnosisBtn').addEventListener('click', startAiPageDiagnosis);
    document.getElementById('aiPageNewDiagnosisBtn').addEventListener('click', resetAiPageDiagnosis);
    document.getElementById('sendAiPageFollowupBtn').addEventListener('click', sendAiPageFollowup);

    // 高级选项折叠/展开
    const advancedToggle = document.getElementById('aiAdvancedToggle');
    const advancedContent = document.getElementById('aiAdvancedContent');
    if (advancedToggle && advancedContent) {
        advancedToggle.addEventListener('click', () => {
            const isHidden = advancedContent.classList.contains('hidden');
            advancedContent.classList.toggle('hidden', !isHidden);
            advancedToggle.classList.toggle('expanded', isHidden);
        });
    }

    // 设置按钮 - 跳转到配置页面
    document.getElementById('aiPageSettingsBtn')?.addEventListener('click', () => switchPage('ai-config'));

    // AI页面追问输入框支持Ctrl+Enter发送 + 自动高度
    const followupInput = document.getElementById('aiPageFollowupInput');
    if (followupInput) {
        const autoResize = () => {
            followupInput.style.height = 'auto';
            followupInput.style.height = Math.min(followupInput.scrollHeight, 100) + 'px';
        };
        followupInput.addEventListener('input', autoResize);

        followupInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                sendAiPageFollowup();
            }
        });
    }

    // AI页面附件上传
    const aiAttachBtn = document.getElementById('aiAttachBtn');
    const aiFileInput = document.getElementById('aiFileInput');
    if (aiAttachBtn && aiFileInput) {
        aiAttachBtn.addEventListener('click', () => aiFileInput.click());
        aiFileInput.addEventListener('change', handleAiFileSelect);
    }

    // 欢迎页附件上传（开始分析前）
    const aiWelcomeAttachBtn = document.getElementById('aiWelcomeAttachBtn');
    if (aiWelcomeAttachBtn && aiFileInput) {
        aiWelcomeAttachBtn.addEventListener('click', () => aiFileInput.click());
    }

    // AI页面数据范围选择
    document.querySelectorAll('input[name="aiPageRange"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const dateInputs = document.getElementById('aiPageDateRangeInputs');
            if (dateInputs) {
                if (radio.value === 'custom') {
                    dateInputs.classList.remove('hidden');
                } else {
                    dateInputs.classList.add('hidden');
                }
            }
            updateAiPageDataPreview();
        });
    });

    // 大模型配置页面事件
    document.getElementById('aiConfigProvider').addEventListener('change', () => syncAiProviderFields('aiConfig'));
    document.getElementById('saveAiConfigPageBtn').addEventListener('click', saveAiConfigFromPage);
    document.getElementById('testAiConfigPageBtn').addEventListener('click', testAiConfigConnectionPage);
    document.getElementById('toggleAiConfigApiKeyBtn').addEventListener('click', () => toggleAiPasswordVisibility('aiConfig'));
    document.getElementById('gotoAiAnalysisBtn').addEventListener('click', () => switchPage('ai'));

    // 模板相关事件
    document.getElementById('saveAsTemplateBtn')?.addEventListener('click', saveAsTemplate);
    document.getElementById('addTemplateBtn')?.addEventListener('click', () => openTemplateEditModal());
    document.getElementById('createTemplateBtn')?.addEventListener('click', () => openTemplateEditModal());
    document.getElementById('templateForm')?.addEventListener('submit', handleTemplateFormSubmit);

    // 模板列表点击事件（事件委托）
    document.addEventListener('click', (e) => {
        const templateItem = e.target.closest('.template-item');
        if (templateItem) {
            const templateId = templateItem.dataset.templateId;
            applyTemplate(templateId);
        }
    });

    // 模板图标选择
    document.querySelectorAll('.template-icon-option').forEach(btn => {
        btn.addEventListener('click', () => {
            selectTemplateIcon(btn.dataset.icon);
        });
    });

    // 初始化AI诊断事件
    initAiDiagnosisEvents();

    // 初始化药品管理事件
    setupMedicineEventListeners();

    // 标签页滑动手势切换
    setupSwipeNavigation();
}

// 标签页滑动手势切换
function setupSwipeNavigation() {
    // 提醒页面滑动手势
    const reminderScrollableContent = document.querySelector('#reminderModal .reminder-scrollable-content');
    if (reminderScrollableContent) {
        setupSwipeGestures(reminderScrollableContent, {
            onSwipeLeft: () => {
                // 左滑：today -> all
                if (currentReminderTab === 'today') {
                    renderReminderTabs('all');
                }
            },
            onSwipeRight: () => {
                // 右滑：all -> today
                if (currentReminderTab === 'all') {
                    renderReminderTabs('today');
                }
            }
        });
    }

    // 记录页面滑动手势
    const recordsScrollableContent = document.querySelector('#recordsModal .records-scrollable-content');
    if (recordsScrollableContent) {
        setupSwipeGestures(recordsScrollableContent, {
            onSwipeLeft: () => {
                // 左滑：activity -> health -> symptom
                const views = ['activity', 'health', 'symptom'];
                const currentIndex = views.indexOf(currentRecordView);
                if (currentIndex < views.length - 1) {
                    setCurrentRecordView(views[currentIndex + 1]);
                }
            },
            onSwipeRight: () => {
                // 右滑：symptom -> health -> activity
                const views = ['activity', 'health', 'symptom'];
                const currentIndex = views.indexOf(currentRecordView);
                if (currentIndex > 0) {
                    setCurrentRecordView(views[currentIndex - 1]);
                }
            }
        });
    }
}

// 通用滑动手势处理
function setupSwipeGestures(element, callbacks) {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    const SWIPE_THRESHOLD = 80; // 滑动阈值（像素）
    const VELOCITY_THRESHOLD = 0.3; // 速度阈值

    element.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const diffX = endX - startX;
        const diffY = endY - startY;
        const absDiffX = Math.abs(diffX);
        const absDiffY = Math.abs(diffY);

        // 只响应水平滑动，且水平位移大于垂直位移
        if (absDiffX > absDiffY && absDiffX > SWIPE_THRESHOLD) {
            if (diffX > 0 && callbacks.onSwipeRight) {
                callbacks.onSwipeRight();
            } else if (diffX < 0 && callbacks.onSwipeLeft) {
                callbacks.onSwipeLeft();
            }
        }
    }, { passive: true });
}

// 更改日期
async function changeDate(days) {
    currentDate.setDate(currentDate.getDate() + days);
    loadActivities();
    loadHealthRecords();
    loadSymptomRecords();
    updateDisplay();
    updateRemindersDisplay();
    await refreshActivitiesFromBackend(getDateKey(currentDate), { silent: true });
    await refreshHealthRecordsFromBackend(getDateKey(currentDate), { silent: true });
    await refreshSymptomRecordsFromBackend(getDateKey(currentDate), { silent: true });
    await refreshDailyNoteFromBackend(getDateKey(currentDate), { silent: true });
}

function getDatePickerConfig(target = 'home') {
    return datePickerConfigs[target] || datePickerConfigs.home;
}

function openDatePicker(target = 'home') {
    const config = getDatePickerConfig(target);
    const panel = document.getElementById(config.panelId);
    if (!panel) return;

    calendarViewDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    renderCalendarPanel(target);
    panel.classList.toggle('hidden');
}

function openCurrentDatePicker() {
    openDatePicker('home');
}

function openRecordsDatePicker() {
    openDatePicker('records');
}

async function selectCurrentDate(date) {
    currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    document.querySelectorAll('.current-date-panel').forEach(panel => panel.classList.add('hidden'));
    loadActivities();
    loadHealthRecords();
    loadSymptomRecords();
    updateDisplay();
    await refreshActivitiesFromBackend(getDateKey(currentDate), { silent: true });
    await refreshHealthRecordsFromBackend(getDateKey(currentDate), { silent: true });
    await refreshSymptomRecordsFromBackend(getDateKey(currentDate), { silent: true });
    await refreshDailyNoteFromBackend(getDateKey(currentDate), { silent: true });
}

function shiftCalendarMonth(offset) {
    shiftCalendarMonthFor('home', offset);
}

function shiftCalendarMonthFor(target, offset) {
    calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + offset, 1);
    renderCalendarPanel(target);
}

function clearCalendarPanel() {
    clearCalendarPanelFor('home');
}

function clearCalendarPanelFor(target) {
    const config = getDatePickerConfig(target);
    document.getElementById(config.panelId)?.classList.add('hidden');
}

function selectTodayFromCalendar() {
    selectTodayFromCalendarFor('home');
}

function selectTodayFromCalendarFor(target) {
    const today = new Date();
    calendarViewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    selectCurrentDate(today);
}

function handleCalendarDayClick(e) {
    handleCalendarDayClickFor('home', e);
}

function handleRecordsCalendarDayClick(e) {
    handleCalendarDayClickFor('records', e);
}

function handleCalendarDayClickFor(target, e) {
    const dayBtn = e.target.closest('.date-calendar-day');
    if (!dayBtn) return;

    const dateValue = dayBtn.dataset.date;
    if (!dateValue) return;

    selectCurrentDate(new Date(`${dateValue}T12:00:00`));
}

function handleCalendarPanelClick(e) {
    handleCalendarPanelClickFor('home', e);
}

function handleRecordsCalendarPanelClick(e) {
    handleCalendarPanelClickFor('records', e);
}

function handleCalendarPanelClickFor(target, e) {
    e.stopPropagation();
    const config = getDatePickerConfig(target);

    const clearBtn = e.target.closest(`#${config.clearBtnId}`);
    if (clearBtn) {
        clearCalendarPanelFor(target);
        return;
    }

    const todayBtn = e.target.closest(`#${config.todayBtnId}`);
    if (todayBtn) {
        selectTodayFromCalendarFor(target);
    }
}

function renderCalendarPanel(target = 'home') {
    const config = getDatePickerConfig(target);
    const monthLabel = document.getElementById(config.monthLabelId);
    const grid = document.getElementById(config.dayGridId);
    if (!monthLabel || !grid) return;

    const viewYear = calendarViewDate.getFullYear();
    const viewMonth = calendarViewDate.getMonth();
    const firstDay = new Date(viewYear, viewMonth, 1);
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    const todayKey = getDateKey(new Date());
    const selectedKey = getDateKey(currentDate);

    monthLabel.textContent = `${viewYear}年${viewMonth + 1}月`;

    const dayItems = [];

    for (let i = firstWeekday - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const date = new Date(viewYear, viewMonth - 1, day);
        dayItems.push(renderCalendarDay(date, { muted: true, todayKey, selectedKey }));
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(viewYear, viewMonth, day);
        dayItems.push(renderCalendarDay(date, { muted: false, todayKey, selectedKey }));
    }

    while (dayItems.length < 42) {
        const day = dayItems.length - (firstWeekday + daysInMonth) + 1;
        const date = new Date(viewYear, viewMonth + 1, day);
        dayItems.push(renderCalendarDay(date, { muted: true, todayKey, selectedKey }));
    }

    grid.innerHTML = dayItems.join('');
}

function renderCalendarDay(date, { muted, todayKey, selectedKey }) {
    const dateKey = getDateKey(date);
    const classes = ['date-calendar-day'];
    if (muted) classes.push('is-muted');
    if (dateKey === todayKey) classes.push('is-today');
    if (dateKey === selectedKey) classes.push('is-selected');

    return `<button type="button" class="${classes.join(' ')}" data-date="${dateKey}">${date.getDate()}</button>`;
}

async function runQuickTodayAiDiagnosis() {
    // 直接切换到AI分析页面
    switchPage('ai');

    // 设置默认为今天
    const todayRange = document.querySelector('input[name="aiPageRange"][value="today"]');
    const customRangeInputs = document.getElementById('aiPageDateRangeInputs');
    if (todayRange) todayRange.checked = true;
    if (customRangeInputs) customRangeInputs.classList.add('hidden');
    updateAiPageDataPreview();
}

// 更新AI页面数据预览
function updateAiPageDataPreview() {
    const range = document.querySelector('input[name="aiPageRange"]:checked')?.value || 'today';
    const { startDate, endDate } = getAiDateRange(range);

    // 计算天数
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dayCount = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    // 收集活动数据
    let activityCount = 0;
    Object.keys(allActivitiesData).forEach(dateKey => {
        if (dateKey >= startDate && dateKey <= endDate) {
            activityCount += allActivitiesData[dateKey].length;
        }
    });

    // 收集健康数据
    let healthCount = 0;
    Object.keys(allHealthRecordsData).forEach(dateKey => {
        if (dateKey >= startDate && dateKey <= endDate) {
            healthCount += allHealthRecordsData[dateKey].length;
        }
    });

    document.getElementById('aiPageActivityCount').textContent = activityCount;
    document.getElementById('aiPageHealthCount').textContent = healthCount;
    document.getElementById('aiPageDayCount').textContent = dayCount;
}

// 开始AI页面诊断
async function startAiPageDiagnosis() {
    const btn = document.getElementById('startAiPageDiagnosisBtn');
    const btnText = btn.querySelector('.ai-start-btn-text');
    const originalText = btnText.textContent;

    btn.disabled = true;
    btnText.textContent = '分析中...';

    const welcome = document.getElementById('aiWelcome');
    const chatMessages = document.getElementById('aiPageChatMessages');
    const pageFooter = document.getElementById('aiPageFooter');
    const newChatBtn = document.getElementById('aiPageNewDiagnosisBtn');

    try {
        // 验证API配置
        const aiConfig = getAiConfig();
        if (!aiConfig.apiKey) {
            showToast('请先在设置中配置API密钥！');
            btn.disabled = false;
            btnText.textContent = originalText;
            return;
        }

        // 隐藏欢迎卡，显示消息流和底部栏
        welcome.style.display = 'none';
        chatMessages.style.display = 'flex';
        pageFooter.style.display = 'block';
        newChatBtn.style.display = 'flex';

        // 显示思考动画
        chatMessages.innerHTML = '';
        const thinkingEl = document.createElement('div');
        thinkingEl.className = 'ai-thinking-indicator';
        thinkingEl.innerHTML = '<div class="ai-thinking-dots"><span></span><span></span><span></span></div><span>正在整理分析依据...</span>';
        chatMessages.appendChild(thinkingEl);

        // 收集数据
        const range = document.querySelector('input[name="aiPageRange"]:checked')?.value || 'today';
        const { startDate, endDate } = getAiDateRange(range);
        const analysisData = collectAnalysisData(startDate, endDate);
        const prompt = buildAnalysisPrompt(analysisData);

        // 快照并清空预上传的附件
        const startFiles = aiPendingFiles.length > 0 ? [...aiPendingFiles] : null;
        aiPendingFiles = [];
        renderAiAttachPreview();

        // 构建消息（可能含附件）
        let apiInput;
        if (startFiles && startFiles.length) {
            apiInput = [{ role: 'user', content: buildMultimodalContent(prompt, startFiles) }];
        } else {
            apiInput = prompt;
        }

        // 替换思考动画为“分析依据”数据流 + AI结论气泡
        chatMessages.innerHTML = '';
        await streamAiPageBasis(chatMessages, { startDate, endDate, analysisData });
        const aiBubble = createAiBubble('');
        chatMessages.appendChild(aiBubble);

        const contentDiv = aiBubble.querySelector('.ai-bubble-content');
        contentDiv.classList.add('streaming');

        // 调用AI API（流式）
        let rawText = '';
        await callAiApiStream(apiInput, {}, (chunk, fullText) => {
            rawText = fullText;
            contentDiv.innerHTML = formatAiResponse(fullText);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });

        contentDiv.classList.remove('streaming');

        // 保存诊断上下文
        aiConversationContext = { startDate, endDate, diagnosisResult: rawText };
        aiConversationHistory = [{ role: 'assistant', content: rawText }];

        markAiConfigVerified();

        // 添加推荐问题到底部横滑条
        addSuggestedQuestions();

        showToast('AI分析完成！');
    } catch (error) {
        console.error('AI诊断失败:', error);
        chatMessages.innerHTML = '';
        const errBubble = createAiBubble(`诊断失败：${escapeHtml(error.message)}`);
        chatMessages.appendChild(errBubble);
        showToast('诊断失败，请重试');
    } finally {
        btn.disabled = false;
        btnText.textContent = originalText;
    }
}

// 创建AI消息气泡
function createAiBubble(content) {
    const bubble = document.createElement('div');
    bubble.className = 'ai-chat-bubble ai-assistant';

    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    bubble.innerHTML = `
        <div class="ai-bubble-content">${content}</div>
        <div class="ai-bubble-footer">
            <span class="ai-bubble-time">${timeStr}</span>
            <button class="ai-bubble-copy-btn" title="复制">📋 复制</button>
            <button class="ai-bubble-play-btn" title="语音播放">🔊 播放</button>
        </div>
    `;

    const copyBtn = bubble.querySelector('.ai-bubble-copy-btn');
    const playBtn = bubble.querySelector('.ai-bubble-play-btn');
    const contentDiv = bubble.querySelector('.ai-bubble-content');

    copyBtn.onclick = () => {
        const text = contentDiv.innerText || contentDiv.textContent;
        navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = '✅ 已复制';
            if (navigator.vibrate) navigator.vibrate(50);
            setTimeout(() => { copyBtn.textContent = '📋 复制'; }, 2000);
        }).catch(() => {
            showToast('复制失败');
        });
    };

    playBtn.onclick = () => {
        const text = contentDiv.innerText || contentDiv.textContent;
        aiSpeechPlay(text, playBtn);
    };

    return bubble;
}

function createAiCollapsibleBubble(title, summary = '') {
    const bubble = createAiBubble('');
    bubble.classList.add('ai-basis-bubble');

    const contentDiv = bubble.querySelector('.ai-bubble-content');
    const footer = bubble.querySelector('.ai-bubble-footer');
    const copyBtn = bubble.querySelector('.ai-bubble-copy-btn');
    const playBtn = bubble.querySelector('.ai-bubble-play-btn');

    contentDiv.innerHTML = `
        <div class="ai-basis-header">
            <div class="ai-basis-header-row">
                <div class="ai-basis-title">${escapeHtml(title)}</div>
                <button type="button" class="ai-basis-toggle" aria-expanded="${aiBasisCollapsed ? 'false' : 'true'}">${aiBasisCollapsed ? '展开' : '收起'}</button>
            </div>
            <div class="ai-basis-summary">${escapeHtml(summary)}</div>
        </div>
        <div class="ai-basis-body"></div>
    `;

    const toggleBtn = contentDiv.querySelector('.ai-basis-toggle');
    const body = contentDiv.querySelector('.ai-basis-body');
    if (aiBasisCollapsed) {
        contentDiv.classList.add('collapsed');
    }
    const getSpeakText = () => {
        const titleText = contentDiv.querySelector('.ai-basis-title')?.innerText || '';
        const summaryText = contentDiv.querySelector('.ai-basis-summary')?.innerText || '';
        const bodyText = body?.innerText || '';
        return [titleText, summaryText, bodyText].filter(Boolean).join('\n');
    };

    toggleBtn.onclick = () => {
        const collapsed = contentDiv.classList.toggle('collapsed');
        aiBasisCollapsed = collapsed;
        localStorage.setItem('dailyTracker_aiBasisCollapsed', collapsed ? 'true' : 'false');
        toggleBtn.textContent = collapsed ? '展开' : '收起';
        toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    };

    copyBtn.onclick = () => {
        navigator.clipboard.writeText(getSpeakText()).then(() => {
            copyBtn.textContent = '✅ 已复制';
            if (navigator.vibrate) navigator.vibrate(50);
            setTimeout(() => { copyBtn.textContent = '📋 复制'; }, 2000);
        }).catch(() => {
            showToast('复制失败');
        });
    };

    playBtn.onclick = () => {
        aiSpeechPlay(getSpeakText(), playBtn);
    };

    return { bubble, body, contentDiv };
}

function formatAiPageBasisRangeLine(startDate, endDate) {
    return `分析范围：${startDate} 至 ${endDate}`;
}

function collectAiPageBasisSections(analysisData) {
    const dateKeys = new Set();
    analysisData.activities.forEach(item => dateKeys.add(item.date));
    analysisData.healthRecords.forEach(item => dateKeys.add(item.date));
    analysisData.symptomRecords.forEach(item => dateKeys.add(item.date));
    analysisData.dailyNotes.forEach(item => dateKeys.add(item.date));

    return [...dateKeys].sort().map(dateKey => ({
        date: dateKey,
        activities: analysisData.activities.filter(item => item.date === dateKey),
        healthRecords: analysisData.healthRecords.filter(item => item.date === dateKey),
        symptomRecords: analysisData.symptomRecords.filter(item => item.date === dateKey),
        dailyNote: analysisData.dailyNotes.find(item => item.date === dateKey) || null
    }));
}

function formatAiPageBasisSection(section) {
    const lines = [`### ${section.date}`];

    if (section.activities.length) {
        lines.push('活动记录');
        section.activities.forEach(item => {
            lines.push(`- ${item.time || '时间未记录'} · ${getTypeLabel(item.type)} · ${item.content || '未填写内容'}`);
            if (item.feeling) lines.push(`  反馈：${item.feeling}`);
            if (item.duration) lines.push(`  时长：${item.duration}`);
        });
    }

    if (section.healthRecords.length) {
        lines.push('健康数据');
        section.healthRecords.forEach(item => {
            lines.push(`- ${item.time || '时间未记录'} · ${healthTypeLabels[item.type] || item.type}：${item.value}${item.unit || ''}`);
            if (item.notes) lines.push(`  备注：${item.notes}`);
        });
    }

    if (section.symptomRecords.length) {
        lines.push('症状记录');
        section.symptomRecords.forEach(item => {
            lines.push(`- ${item.time || '时间未记录'} · ${item.description || '未填写症状描述'}`);
            if (item.measures) lines.push(`  处理：${item.measures}`);
        });
    }

    if (section.dailyNote?.content) {
        lines.push('状态记录');
        lines.push(`- ${section.dailyNote.content}`);
    }

    return `${lines.join('\n')}\n\n`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function streamAiPageBasis(chatMessages, { startDate, endDate, analysisData }) {
    const summary = `${startDate} 至 ${endDate} · 活动 ${analysisData.activities.length} 条 · 健康 ${analysisData.healthRecords.length} 条 · 症状 ${analysisData.symptomRecords.length} 条 · 日记 ${analysisData.dailyNotes.length} 条`;
    const { bubble: basisBubble, body, contentDiv } = createAiCollapsibleBubble('本次分析依据', summary);
    chatMessages.appendChild(basisBubble);
    contentDiv.classList.add('streaming');

    let streamedText = `${formatAiPageBasisRangeLine(startDate, endDate)}\n`;
    streamedText += `活动 ${analysisData.activities.length} 条，健康 ${analysisData.healthRecords.length} 条，症状 ${analysisData.symptomRecords.length} 条，日记 ${analysisData.dailyNotes.length} 条。\n\n`;
    body.innerHTML = formatAiResponse(streamedText);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    await sleep(350);

    const sections = collectAiPageBasisSections(analysisData);
    if (!sections.length) {
        streamedText += '当前范围内没有可供分析的记录。\n';
        body.innerHTML = formatAiResponse(streamedText);
        contentDiv.classList.remove('streaming');
        return;
    }

    for (const section of sections) {
        streamedText += formatAiPageBasisSection(section);
        body.innerHTML = formatAiResponse(streamedText);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        await sleep(240);
    }

    if (analysisData.profile) {
        const profileLines = [];
        if (analysisData.profile.age) profileLines.push(`年龄 ${analysisData.profile.age} 岁`);
        if (analysisData.profile.gender) profileLines.push(`性别 ${analysisData.profile.gender}`);
        if (analysisData.profile.height) profileLines.push(`身高 ${analysisData.profile.height} cm`);
        if (analysisData.profile.weight) profileLines.push(`体重 ${analysisData.profile.weight} kg`);
        if (analysisData.profile.bloodPressure) profileLines.push(`常见血压 ${analysisData.profile.bloodPressure}`);
        if (analysisData.profile.bloodSugar) profileLines.push(`常见血糖 ${analysisData.profile.bloodSugar}`);
        if (analysisData.profile.chronicConditions) profileLines.push(`病史 ${analysisData.profile.chronicConditions}`);
        if (analysisData.profile.medications) profileLines.push(`长期用药 ${analysisData.profile.medications}`);
        if (profileLines.length) {
            streamedText += `### 个人档案\n- ${profileLines.join('\n- ')}\n\n`;
            body.innerHTML = formatAiResponse(streamedText);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            await sleep(260);
        }
    }

    contentDiv.classList.remove('streaming');
}

// 当前语音实例
let currentSpeechUtterance = null;
let currentSpeechBtn = null;

// AI语音播放（支持暂停/继续）
function aiSpeechPlay(text, btn) {
    if (!('speechSynthesis' in window)) {
        showToast('当前浏览器不支持语音合成');
        return;
    }

    // 情况1：点击的是当前正在播放的按钮 → 暂停
    if (currentSpeechBtn === btn && speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        btn.textContent = '▶️ 继续';
        showToast('语音已暂停');
        return;
    }

    // 情况2：点击的是当前已暂停的按钮 → 继续播放
    if (currentSpeechBtn === btn && speechSynthesis.paused) {
        speechSynthesis.resume();
        btn.textContent = '⏸️ 暂停';
        showToast('语音继续播放');
        return;
    }

    // 情况3：点击的是其他按钮，或首次播放 → 停止旧的，开始新的
    if (speechSynthesis.speaking || speechSynthesis.paused) {
        speechSynthesis.cancel();
    }
    // 重置所有播放按钮
    document.querySelectorAll('.ai-bubble-play-btn').forEach(b => {
        b.textContent = '🔊 播放';
        b.classList.remove('playing');
    });

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1;
    utterance.pitch = 1;

    // 尝试选择中文语音
    const voices = speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) utterance.voice = zhVoice;

    currentSpeechUtterance = utterance;
    currentSpeechBtn = btn;
    btn.textContent = '⏸️ 暂停';
    btn.classList.add('playing');

    utterance.onend = () => {
        currentSpeechUtterance = null;
        currentSpeechBtn = null;
        btn.textContent = '🔊 播放';
        btn.classList.remove('playing');
        showToast('语音播放完毕');
    };

    utterance.onerror = (e) => {
        currentSpeechUtterance = null;
        currentSpeechBtn = null;
        btn.textContent = '🔊 播放';
        btn.classList.remove('playing');
        // canceled 不是失败，是用户主动切换导致的取消
        if (e.error !== 'canceled') {
            showToast('语音播放失败');
        }
    };

    speechSynthesis.speak(utterance);
}

// 检查当前provider是否支持multimodal（图片/文件）
function getProviderMultimodalSupport() {
    const config = getAiConfig();
    const provider = config.provider;
    const model = (config.model || '').toLowerCase();

    // OpenAI: gpt-4o / gpt-4-vision 等支持图片，不支持PDF
    if (provider === 'openai') {
        const supportsVision = model.includes('gpt-4o') || model.includes('gpt-4-vision') || model.includes('gpt-4-turbo');
        return { image: supportsVision, pdf: false, name: 'OpenAI' };
    }
    // Anthropic: Claude 3+ 支持图片和PDF
    if (provider === 'anthropic') {
        return { image: true, pdf: true, name: 'Anthropic Claude' };
    }
    // DeepSeek: 目前不支持图片
    if (provider === 'deepseek') {
        return { image: false, pdf: false, name: 'DeepSeek' };
    }
    // 通义千问: qwen-vl 系列支持图片
    if (provider === 'tongyi') {
        const supportsVision = model.includes('vl');
        return { image: supportsVision, pdf: false, name: '通义千问' };
    }
    // Custom: 默认假设支持图片（用户自选模型）
    if (provider === 'custom') {
        return { image: true, pdf: false, name: '自定义模型' };
    }
    return { image: false, pdf: false, name: provider };
}

// AI附件文件选择处理
async function handleAiFileSelect(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const support = getProviderMultimodalSupport();

    for (const file of files) {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';

        if (!isImage && !isPdf) {
            showToast('仅支持图片和PDF文件');
            continue;
        }

        // 检查provider支持
        if (isImage && !support.image) {
            showToast(`当前模型（${support.name}）不支持图片识别，请切换至支持视觉的模型`);
            continue;
        }
        if (isPdf && !support.pdf) {
            showToast(`当前模型（${support.name}）不支持PDF文件，请切换至 Anthropic Claude`);
            continue;
        }

        if (file.size > 10 * 1024 * 1024) {
            showToast(`文件 ${file.name} 超过10MB限制`);
            continue;
        }

        try {
            let base64, mimeType;
            if (isImage) {
                base64 = await readAndCompressImage(file);
                mimeType = 'image/jpeg';
            } else {
                base64 = await readFileAsBase64(file);
                mimeType = file.type;
            }

            aiPendingFiles.push({
                type: isImage ? 'image' : 'pdf',
                name: file.name,
                base64,
                mimeType
            });
        } catch (err) {
            showToast(`文件 ${file.name} 读取失败`);
        }
    }

    renderAiAttachPreview();
    // 重置file input以便重复选择同一文件
    e.target.value = '';
}

// 读取文件为base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
    });
}

// 渲染附件预览区（同时更新欢迎页和底部栏两个预览区）
function renderAiAttachPreview() {
    const containers = [
        document.getElementById('aiAttachPreview'),
        document.getElementById('aiWelcomeAttachPreview')
    ].filter(Boolean);

    containers.forEach(container => {
        container.innerHTML = '';
        aiPendingFiles.forEach((f, idx) => {
            const item = document.createElement('div');
            item.className = 'ai-attach-item' + (f.type === 'pdf' ? ' pdf' : '');

            if (f.type === 'image') {
                item.innerHTML = `<img src="${f.base64}" alt="${escapeHtml(f.name)}">`;
            } else {
                item.innerHTML = `<span class="ai-attach-pdf-icon">📄</span><span class="ai-attach-pdf-name">${escapeHtml(f.name)}</span>`;
            }

            const removeBtn = document.createElement('button');
            removeBtn.className = 'ai-attach-remove';
            removeBtn.textContent = '×';
            removeBtn.onclick = () => {
                aiPendingFiles.splice(idx, 1);
                renderAiAttachPreview();
            };
            item.appendChild(removeBtn);
            container.appendChild(item);
        });
    });
}

// 构建带附件的消息content（OpenAI Vision 格式）
function buildMultimodalContent(text, files) {
    const content = [];
    if (text) {
        content.push({ type: 'text', text });
    }
    files.forEach(f => {
        if (f.type === 'image') {
            content.push({
                type: 'image_url',
                image_url: { url: f.base64 }
            });
        } else if (f.type === 'pdf') {
            // 大多数API不直接支持PDF，将base64附带并提示AI
            content.push({
                type: 'text',
                text: `[用户上传了PDF文件: ${f.name}，请分析其内容]`
            });
            // 对于支持的provider(如Anthropic)，会在callAiApiStream中特殊处理
        }
    });
    return content;
}

// 创建用户消息气泡
function createUserBubble(content, attachments) {
    const bubble = document.createElement('div');
    bubble.className = 'ai-chat-bubble ai-user';

    let attachHtml = '';
    if (attachments && attachments.length) {
        attachHtml = '<div class="ai-bubble-attachments">';
        attachments.forEach(f => {
            if (f.type === 'image') {
                attachHtml += `<img class="ai-bubble-attach-img" src="${f.base64}" alt="${escapeHtml(f.name)}">`;
            } else {
                attachHtml += `<span class="ai-bubble-attach-pdf">📄 ${escapeHtml(f.name)}</span>`;
            }
        });
        attachHtml += '</div>';
    }

    bubble.innerHTML = `
        <div class="ai-bubble-content">${attachHtml}${content ? escapeHtml(content) : ''}</div>
    `;
    return bubble;
}

// 添加推荐问题到底部横滑条
function addSuggestedQuestions() {
    const scrollContainer = document.getElementById('aiSuggestScroll');
    if (!scrollContainer) return;

    const questions = [
        '有什么改善建议？',
        '需要关注哪些指标？',
        '饮食方面有何建议？',
        '睡眠质量如何改善？'
    ];

    scrollContainer.innerHTML = '';
    questions.forEach(q => {
        const btn = document.createElement('button');
        btn.className = 'ai-suggest-btn';
        btn.textContent = q;
        btn.onclick = () => {
            document.getElementById('aiPageFollowupInput').value = q;
            sendAiPageFollowup();
        };
        scrollContainer.appendChild(btn);
    });
}

// 重置AI页面诊断
function resetAiPageDiagnosis() {
    const welcome = document.getElementById('aiWelcome');
    const chatMessages = document.getElementById('aiPageChatMessages');
    const pageFooter = document.getElementById('aiPageFooter');
    const newChatBtn = document.getElementById('aiPageNewDiagnosisBtn');
    const suggestScroll = document.getElementById('aiSuggestScroll');

    // 显示欢迎卡，隐藏消息流和底部栏
    if (welcome) welcome.style.display = 'flex';
    if (chatMessages) {
        chatMessages.style.display = 'none';
        chatMessages.innerHTML = '';
    }
    if (pageFooter) pageFooter.style.display = 'none';
    if (newChatBtn) newChatBtn.style.display = 'none';
    if (suggestScroll) suggestScroll.innerHTML = '';

    // 重置对话上下文
    aiConversationContext = null;
    aiConversationHistory = [];

    // 清空待发送附件
    aiPendingFiles = [];
    renderAiAttachPreview();

    // 更新数据预览
    updateAiPageDataPreview();
}

// 发送AI页面追问
async function sendAiPageFollowup() {
    if (aiConversationBusy) {
        showToast('请等待当前回复完成');
        return;
    }

    const input = document.getElementById('aiPageFollowupInput');
    const question = input.value.trim();
    const hasFiles = aiPendingFiles.length > 0;

    if (!question && !hasFiles) {
        showToast('请输入内容或上传文件');
        return;
    }

    const chatMessages = document.getElementById('aiPageChatMessages');
    const sendBtn = document.getElementById('sendAiPageFollowupBtn');
    const suggestScroll = document.getElementById('aiSuggestScroll');

    // 清空推荐问题
    if (suggestScroll) suggestScroll.innerHTML = '';

    // 快照附件并清空
    const sentFiles = hasFiles ? [...aiPendingFiles] : null;
    aiPendingFiles = [];
    renderAiAttachPreview();

    // 添加用户消息气泡（带附件）
    chatMessages.appendChild(createUserBubble(question, sentFiles));

    // 清空输入框并重置高度
    input.value = '';
    input.style.height = 'auto';

    // 显示思考动画
    const thinkingEl = document.createElement('div');
    thinkingEl.className = 'ai-thinking-indicator';
    thinkingEl.innerHTML = '<div class="ai-thinking-dots"><span></span><span></span><span></span></div><span>思考中...</span>';
    chatMessages.appendChild(thinkingEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    aiConversationBusy = true;
    sendBtn.disabled = true;

    try {
        // 构建用户消息（可能含附件）
        let userMessage;
        if (sentFiles && sentFiles.length) {
            userMessage = { role: 'user', content: buildMultimodalContent(question || '请分析这些文件', sentFiles) };
        } else {
            userMessage = { role: 'user', content: question };
        }

        // 构建消息历史
        const messages = [
            {
                role: 'system',
                content: `你是一位专业的健康顾问。用户之前在${aiConversationContext.startDate}至${aiConversationContext.endDate}期间进行了健康诊断，下面是之前的诊断结果和对话历史。请基于这些信息继续回答用户的追问，保持专业友好的语气。`
            },
            ...aiConversationHistory,
            userMessage
        ];

        // 替换思考动画为AI气泡
        thinkingEl.remove();
        const aiBubble = createAiBubble('');
        chatMessages.appendChild(aiBubble);

        const contentDiv = aiBubble.querySelector('.ai-bubble-content');
        contentDiv.classList.add('streaming');

        let fullResponse = '';
        await callAiApiStream(messages, {}, (chunk, fullText) => {
            fullResponse = fullText;
            contentDiv.innerHTML = formatAiResponse(fullText);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });

        // 保存到对话历史（纯文本，避免存base64）
        const historyText = sentFiles && sentFiles.length
            ? (question || '') + sentFiles.map(f => `\n[附件: ${f.name}]`).join('')
            : question;
        aiConversationHistory.push({ role: 'user', content: historyText });
        aiConversationHistory.push({ role: 'assistant', content: fullResponse });

        contentDiv.classList.remove('streaming');

        // 重新添加推荐问题
        addSuggestedQuestions();
    } catch (error) {
        console.error('追问失败:', error);
        thinkingEl.remove();
        const errBubble = createAiBubble(`<span style="color: #d32f2f;">追问失败：${escapeHtml(error.message)}</span>`);
        chatMessages.appendChild(errBubble);
    } finally {
        aiConversationBusy = false;
        sendBtn.disabled = false;
    }
}

// HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 更新显示
function updateDisplay() {
    updateDateDisplay();
    updatePageDisplay();
    updateTimelineOrderButton();
    updateHealthSectionButton();
    updateHealthDisplay();
    updateTimeline();
    updateRecordsPage();
    if (currentPage === 'reminders') {
        renderReminderTabs(currentReminderTab);
    }
    updateDailySummary();
    updateStats();
}

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
    const fields = ['name','gender','age','height','weight','bloodType','chronicConditions','allergies','medications','smoking','drinking','exercise','sleepHours','healthGoals','notes'];
    const filled = fields.filter(f => profile[f] && String(profile[f]).trim() !== '').length;
    const completeness = Math.round(filled / fields.length * 100);

    if (!name && !profile.age && !profile.gender) {
        tagsEl.innerHTML = `<span class="my-profile-tag" onclick="document.getElementById('profileBtn')?.click()">完善个人档案 →</span>`;
    } else {
        tagsEl.innerHTML = `
            <span class="my-profile-tag">档案 ${completeness}%</span>
            <span class="my-profile-tag">今日 ${todayCount} 条</span>
        `;
    }
}

function switchPage(page, isBack = false) {
    if (!isBack && currentPage && currentPage !== page) {
        pageHistory.push(currentPage);
    }
    currentPage = page;
    updatePageDisplay();
    if (page === 'my') {
        renderMyProfileHeader();
    }
    if (page === 'records' || page === 'activity-form' || page === 'health-form' || page === 'symptom-form') {
        updateRecordsPage();
    }
    if (page === 'ai-config' || page === 'ai') {
        loadAiConfig();
    }
    if (page === 'ai') {
        updateAiPageDataPreview();
    }
}

function updatePageDisplay() {
    const homePage = document.getElementById('homePage');
    const aiConfigPage = document.getElementById('aiConfigModal');
    const aiAnalysisPage = document.getElementById('aiAnalysisModal');
    const recordsPage = document.getElementById('recordsModal');
    const reminderPage = document.getElementById('reminderModal');
    const reminderFormPage = document.getElementById('reminderFormModal');
    const myPage = document.getElementById('myModal');
    const exportPage = document.getElementById('exportModal');
    const cloudSyncPage = document.getElementById('cloudSyncModal');
    const profilePage = document.getElementById('profileModal');
    const familyMembersPage = document.getElementById('familyMembersModal');
    const familyMemberFormPage = document.getElementById('familyMemberFormModal');
    const medicineBoxPage = document.getElementById('medicineBoxModal');
    const medicineEditPage = document.getElementById('medicineEditModal');
    const medicineDetailPage = document.getElementById('medicineDetailModal');
    const activityFormPage = document.getElementById('activityModal');
    const healthFormPage = document.getElementById('healthModal');
    const symptomFormPage = document.getElementById('symptomModal');
    const homeBtn = document.getElementById('homeBtn');
    const recordBtn = document.getElementById('recordBtn');
    const reminderBtn = document.getElementById('reminderBtn');
    const myBtn = document.getElementById('myBtn');
    const bottomActions = document.querySelector('.bottom-actions');
    if (!homePage || !aiConfigPage || !aiAnalysisPage || !recordsPage || !reminderPage || !myPage || !exportPage || !cloudSyncPage || !profilePage || !homeBtn || !recordBtn || !reminderBtn || !myBtn) return;
    const isHome = currentPage === 'home';
    const isAiConfig = currentPage === 'ai-config';
    const isAi = currentPage === 'ai';
    const isRecords = currentPage === 'records';

    const isReminders = currentPage === 'reminders';
    const isReminderAdd = currentPage === 'reminder-add';
    const isMy = currentPage === 'my';
    const isExport = currentPage === 'export';
    const isCloudSync = currentPage === 'cloud-sync';
    const isProfile = currentPage === 'profile';
    const isFamilyMembers = currentPage === 'family-members';
    const isFamilyMemberForm = currentPage === 'family-member-form';
    const isMedicineBox = currentPage === 'medicine-box';
    const isMedicineEdit = currentPage === 'medicine-edit';
    const isMedicineDetail = currentPage === 'medicine-detail';
    const isActivityForm = currentPage === 'activity-form';
    const isHealthForm = currentPage === 'health-form';
    const isSymptomForm = currentPage === 'symptom-form';
    const isRecordFormPage = isActivityForm || isHealthForm || isSymptomForm;
    const isRecordFlowPage = isRecords || isActivityForm || isHealthForm || isSymptomForm;
    homePage.classList.toggle('hidden', !isHome);
    aiConfigPage.classList.toggle('page-mode', isAiConfig);
    aiConfigPage.style.display = isAiConfig ? 'block' : 'none';
    aiAnalysisPage.classList.toggle('page-mode', isAi);
    aiAnalysisPage.style.display = isAi ? 'block' : 'none';
    recordsPage.classList.toggle('page-mode', isRecords);
    recordsPage.style.display = isRecords ? 'block' : 'none';
    reminderPage.classList.toggle('page-mode', isReminders);
    reminderPage.style.display = isReminders ? 'block' : 'none';
    if (reminderFormPage) {
        reminderFormPage.classList.toggle('page-mode', isReminderAdd);
        reminderFormPage.style.display = isReminderAdd ? 'block' : 'none';
    }
    myPage.classList.toggle('page-mode', isMy);
    myPage.style.display = isMy ? 'block' : 'none';
    exportPage.classList.toggle('page-mode', isExport);
    exportPage.style.display = isExport ? 'block' : 'none';
    cloudSyncPage.classList.toggle('page-mode', isCloudSync);
    cloudSyncPage.style.display = isCloudSync ? 'block' : 'none';
    profilePage.classList.toggle('page-mode', isProfile);
    profilePage.style.display = isProfile ? 'block' : 'none';
    if (familyMembersPage) {
        familyMembersPage.classList.toggle('page-mode', isFamilyMembers);
        familyMembersPage.style.display = isFamilyMembers ? 'block' : 'none';
    }
    if (familyMemberFormPage) {
        familyMemberFormPage.classList.toggle('page-mode', isFamilyMemberForm);
        familyMemberFormPage.style.display = isFamilyMemberForm ? 'block' : 'none';
    }
    if (medicineBoxPage) {
        medicineBoxPage.classList.toggle('page-mode', isMedicineBox);
        medicineBoxPage.style.display = isMedicineBox ? 'block' : 'none';
    }
    if (medicineEditPage) {
        medicineEditPage.classList.toggle('page-mode', isMedicineEdit);
        medicineEditPage.style.display = isMedicineEdit ? 'block' : 'none';
    }
    if (medicineDetailPage) {
        medicineDetailPage.classList.toggle('page-mode', isMedicineDetail);
        medicineDetailPage.style.display = isMedicineDetail ? 'block' : 'none';
    }
    if (activityFormPage) {
        activityFormPage.classList.toggle('page-mode', isActivityForm);
        activityFormPage.style.display = isActivityForm ? 'block' : 'none';
    }
    if (healthFormPage) {
        healthFormPage.classList.toggle('page-mode', isHealthForm);
        healthFormPage.style.display = isHealthForm ? 'block' : 'none';
    }
    if (symptomFormPage) {
        symptomFormPage.classList.toggle('page-mode', isSymptomForm);
        symptomFormPage.style.display = isSymptomForm ? 'block' : 'none';
    }
    homeBtn.classList.toggle('nav-active', isHome);
    recordBtn.classList.toggle('nav-active', isRecordFlowPage);
    reminderBtn.classList.toggle('nav-active', isReminders || isReminderAdd);
    myBtn.classList.toggle('nav-active', isMy || isExport || isCloudSync || isProfile || isFamilyMembers || isFamilyMemberForm || isMedicineBox || isMedicineEdit || isMedicineDetail || isAiConfig);
    bottomActions?.classList.toggle('hidden', isRecordFormPage || isReminderAdd || isAi || isAiConfig);
}

function openReminderPage(tab = 'today') {
    if (tab === 'add') {
        openReminderFormPage();
        return;
    }
    currentReminderTab = tab;
    switchPage('reminders');
    renderReminderTabs(tab);
}

function openReminderFormPage(reminder = null) {
    populateReminderForm(reminder);
    switchPage('reminder-add');
}

function openMySubPage(page) {
    switchPage(page);
    const myModal = document.getElementById('myModal');
    if (myModal) {
        myModal.style.display = 'none';
    }
}

function showStandalonePage(modalId, pageName) {
    currentPage = pageName;
    updatePageDisplay();
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('page-mode');
        modal.style.display = 'block';
    }
    const myModal = document.getElementById('myModal');
    if (myModal) {
        myModal.style.display = 'none';
    }
}

function setCurrentRecordView(view) {
    currentRecordView = view;
    updateRecordsPage();
}

function openCurrentRecordModal() {
    if (currentRecordView === 'health') {
        openHealthModal();
        return;
    }
    if (currentRecordView === 'symptom') {
        openSymptomModal();
        return;
    }
    openModal();
}

function getActivityTypeLabel(type) {
    const typeMap = {
        meal: '用餐',
        medication: '用药',
        exercise: '运动',
        sleep: '睡眠',
        work: '工作',
        other: '其他'
    };
    return typeMap[type] || '记录';
}

function renderRecordActionButtons(editAction, deleteAction) {
    return `
        <div class="reminder-detail-actions">
            <button class="btn-action btn-edit" onclick="${editAction}">编辑</button>
            <button class="btn-action btn-delete" onclick="${deleteAction}">删除</button>
        </div>
    `;
}

function renderRecordCard({
    accentType,
    badgeText = '',
    headerMain,
    headerSide = '',
    headerSubline = '',
    title,
    notes = '',
    image = '',
    imageAlt = '',
    editAction,
    deleteAction
}) {
    return `
        <div class="reminder-detail-item record-detail-item" data-type="${accentType}">
            <div class="reminder-detail-header">
                <div class="record-detail-time-block">
                    <span class="reminder-detail-time">${headerMain}</span>
                    ${headerSide ? `<span class="reminder-detail-date">${headerSide}</span>` : ''}
                    ${headerSubline ? `<div class="record-detail-subline">${headerSubline}</div>` : ''}
                </div>
                ${badgeText ? `<div>${badgeText}</div>` : ''}
            </div>
            <div class="reminder-detail-title">${escapeHtml(title)}</div>
            ${image ? `
                <div class="reminder-detail-image-wrap">
                    <img class="reminder-detail-image" src="${image}" alt="${escapeHtml(imageAlt || title)}">
                </div>
            ` : ''}
            ${notes ? `<div class="reminder-detail-notes">${escapeHtml(notes)}</div>` : ''}
            ${renderRecordActionButtons(editAction, deleteAction)}
        </div>
    `;
}

function getCurrentRecordConfig() {
    if (currentRecordView === 'health') {
        const items = [...healthRecords]
            .sort((a, b) => sortTimeValues(a.time, b.time))
            .map(renderRecordHealthItem);
        return {
            title: '测量记录',
            subtitle: '集中查看当天的健康测量数据与备注',
            heroText: '记录当天的血压、心率、血糖等数据，便于持续观察身体变化。',
            actionLabel: '+新增',
            emptyTitle: '今天还没有测量数据',
            emptyIcon: '📊',
            emptySubtitle: '记录血压、血糖、心率等健康指标',
            emptyCtaText: '+ 去测量',
            emptyHint: '',
            items
        };
    }

    if (currentRecordView === 'symptom') {
        const items = [...symptomRecords]
            .sort((a, b) => sortTimeValues(a.time, b.time))
            .map(renderRecordSymptomItem);
        return {
            title: '症状记录',
            subtitle: '集中查看当天症状变化、处理措施与图片',
            heroText: '记录症状出现的时间、描述和处理措施，方便后续回顾与判断。',
            actionLabel: '+新增',
            emptyTitle: '今天没有症状记录',
            emptyIcon: '🩺',
            emptySubtitle: '记录身体不适，方便后续追踪',
            emptyCtaText: '+ 记录症状',
            emptyHint: '',
            items
        };
    }

    const items = [...activities]
        .map(normalizeActivity)
        .sort((a, b) => sortTimeValues(getActivitySortTime(a), getActivitySortTime(b)))
        .map(renderRecordActivityItem);
    return {
        title: '活动记录',
        subtitle: '查看当天的饮食、运动、睡眠等活动安排',
        heroText: '记录当天的饮食、运动、睡眠与用药安排，形成清晰的生活轨迹。',
        actionLabel: '+新增',
        emptyTitle: '今天还没有活动记录',
        emptyIcon: '🏃',
        emptySubtitle: '记录饮食、运动、用药等日常活动',
        emptyCtaText: '+ 添加活动',
        emptyHint: '',
        items
    };
}

function sortTimeValues(a, b) {
    return timelineOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
}

function getRecordsTopTitle(view) {
    if (view === 'health') return '<svg class="section-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> 测量管理';
    if (view === 'symptom') return '🩹 症状管理';
    return '🏃 活动管理';
}

function updateRecordsPage() {
    const topTitle = document.getElementById('recordsPageTopTitle');
    const actionBtn = document.getElementById('recordPrimaryActionBtn');
    const list = document.getElementById('recordsList');
    const emptyState = document.getElementById('recordsEmptyState');
    const appTitle = document.querySelector('.app-header h1');
    if (!topTitle || !actionBtn || !list || !emptyState) return;

    document.querySelectorAll('.records-tab-btn').forEach(btn => {
        const isActive = btn.dataset.recordView === currentRecordView;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.style.color = isActive ? 'var(--forest-color)' : 'var(--text-secondary)';
        btn.style.borderBottom = isActive ? '3px solid var(--forest-color)' : '3px solid transparent';
        btn.style.fontWeight = isActive ? '500' : '400';
        btn.style.background = isActive ? 'rgba(40, 122, 68, 0.04)' : 'transparent';
    });

    const config = getCurrentRecordConfig();
    topTitle.innerHTML = getRecordsTopTitle(currentRecordView);
    actionBtn.textContent = config.actionLabel;
    if (appTitle && currentPage === 'records') {
        appTitle.textContent = config.title;
    }

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

    emptyState.style.display = 'none';
    list.innerHTML = config.items.join('');
}

function updateHealthSectionButton() {
    // no-op: kept for updateDisplay() compatibility
}

function formatDateWithWeekday(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${year}-${month}-${day} ${weekdays[date.getDay()]}`;
}

// 更新日期显示
function updateDateDisplay() {
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateText = currentDate.toLocaleDateString('zh-CN', options);
    document.getElementById('currentDate').textContent = dateText;
    const recordsDateBtn = document.getElementById('recordsCurrentDate');
    if (recordsDateBtn) {
        recordsDateBtn.textContent = dateText;
    }
}

// 更新时间线
function updateTimeline() {
    const timeline = document.getElementById('timeline');
    const emptyState = document.getElementById('emptyState');
    const timelineEntries = [
        ...activities.map(activity => ({ kind: 'activity', time: getActivitySortTime(activity), data: normalizeActivity(activity) })),
        ...healthRecords.map(record => ({ kind: 'health', time: record.time, data: record }))
        , ...symptomRecords.map(record => ({ kind: 'symptom', time: record.time, data: record }))
    ].sort((a, b) => {
        if (a.time === b.time) {
            return a.kind.localeCompare(b.kind);
        }

        return timelineOrder === 'asc'
            ? a.time.localeCompare(b.time)
            : b.time.localeCompare(a.time);
    });

    if (timelineEntries.length === 0) {
        timeline.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    timeline.innerHTML = timelineEntries.map(entry => entry.kind === 'activity'
        ? renderActivityTimelineItem(entry.data)
        : entry.kind === 'health'
            ? renderHealthTimelineItem(entry.data)
            : renderSymptomTimelineItem(entry.data)
    ).join('');
}

function renderRecordActivityItem(activity) {
    const duration = getActivityDuration(activity);
    return renderRecordCard({
        accentType: activity.type,
        badgeText: `${typeIcons[activity.type] || '📝'} ${getActivityTypeLabel(activity.type)}`,
        headerMain: getActivityTimeRangeText(activity),
        headerSide: duration ? `${duration} 分钟` : '',
        title: activity.content,
        notes: activity.feeling || '',
        image: activity.image || '',
        imageAlt: activity.content,
        editAction: `editActivity('${activity.id}')`,
        deleteAction: `deleteActivity('${activity.id}')`
    });
}

function renderRecordHealthItem(record) {
    const valueText = `${record.value}${record.unit ? ` ${record.unit}` : ''}`;
    return renderRecordCard({
        accentType: 'health',
        badgeText: `${healthTypeIcons[record.type] || '🩺'} ${healthTypeLabels[record.type] || '健康数据'}`,
        headerMain: formatTime(record.time),
        headerSide: healthTypeLabels[record.type] || '健康数据',
        title: valueText,
        notes: record.notes || '',
        image: record.image || '',
        imageAlt: healthTypeLabels[record.type] || '健康数据',
        editAction: `editHealthRecord('${record.id}')`,
        deleteAction: `deleteHealthRecord('${record.id}')`
    });
}

function renderRecordSymptomItem(record) {
    return renderRecordCard({
        accentType: 'symptom',
        headerMain: formatTime(record.time),
        headerSide: record.image ? '附带图片' : '',
        title: record.description,
        notes: record.measures ? `处理措施：${record.measures}` : '',
        image: record.image || '',
        imageAlt: '症状图片',
        editAction: `editSymptomRecord('${record.id}')`,
        deleteAction: `deleteSymptomRecord('${record.id}')`
    });
}

function renderActivityTimelineItem(activity) {
    const duration = getActivityDuration(activity);
    return `
        <div class="timeline-item" data-id="${activity.id}" data-type="${activity.type}">
            <div class="timeline-header">
                <span class="timeline-time">${getActivityTimeRangeText(activity)}</span>
                <span class="timeline-type">${typeIcons[activity.type]}</span>
            </div>
            <div class="timeline-content">${escapeHtml(activity.content)}</div>
            ${activity.image ? `
                <div class="timeline-image-wrap">
                    <img class="timeline-image" src="${activity.image}" alt="${escapeHtml(activity.content)}">
                </div>
            ` : ''}
            ${activity.feeling ? `<div class="timeline-feeling">"${escapeHtml(activity.feeling)}"</div>` : ''}
            ${duration ? `<div class="timeline-duration">⏱️ ${duration}分钟</div>` : ''}
            <div class="timeline-actions">
                <button class="btn-action btn-edit" onclick="editActivity('${activity.id}')">编辑</button>
                <button class="btn-action btn-delete" onclick="deleteActivity('${activity.id}')">删除</button>
            </div>
        </div>
    `;
}

function renderHealthTimelineItem(record) {
    return `
        <div class="timeline-item health-timeline-item" data-id="${record.id}" data-type="health">
            <div class="timeline-header">
                <span class="timeline-time">${formatTime(record.time)}</span>
                <span class="timeline-type">${healthTypeIcons[record.type]}</span>
            </div>
            <div class="health-timeline-badge">健康数据</div>
            <div class="timeline-content">${healthTypeLabels[record.type]}：${escapeHtml(record.value)}${record.unit ? ` ${escapeHtml(record.unit)}` : ''}</div>
            ${record.image ? `
                <div class="timeline-image-wrap">
                    <img class="timeline-image" src="${record.image}" alt="${escapeHtml(healthTypeLabels[record.type])}">
                </div>
            ` : ''}
            ${record.notes ? `<div class="timeline-feeling">${escapeHtml(record.notes)}</div>` : ''}
            <div class="timeline-actions">
                <button class="btn-action btn-edit" onclick="editHealthRecord('${record.id}')">编辑</button>
                <button class="btn-action btn-delete" onclick="deleteHealthRecord('${record.id}')">删除</button>
            </div>
        </div>
    `;
}

function renderSymptomTimelineItem(record) {
    return `
        <div class="timeline-item health-timeline-item" data-id="${record.id}" data-type="symptom">
            <div class="timeline-header">
                <span class="timeline-time">${formatTime(record.time)}</span>
                <span class="timeline-type">🩹</span>
            </div>
            <div class="health-timeline-badge">症状记录</div>
            <div class="timeline-content">${escapeHtml(record.description)}</div>
            ${record.image ? `
                <div class="timeline-image-wrap">
                    <img class="timeline-image" src="${record.image}" alt="症状图片">
                </div>
            ` : ''}
            ${record.measures ? `<div class="timeline-feeling">处理措施：${escapeHtml(record.measures)}</div>` : ''}
            <div class="timeline-actions">
                <button class="btn-action btn-edit" onclick="editSymptomRecord('${record.id}')">编辑</button>
                <button class="btn-action btn-delete" onclick="deleteSymptomRecord('${record.id}')">删除</button>
            </div>
        </div>
    `;
}

function updateTimelineOrderButton() {
    const orderBtn = document.getElementById('timelineOrderBtn');
    orderBtn.textContent = timelineOrder === 'desc' ? '倒序显示' : '顺序显示';
}

function toggleTimelineOrder() {
    timelineOrder = timelineOrder === 'desc' ? 'asc' : 'desc';
    localStorage.setItem('dailyTracker_timelineOrder', timelineOrder);
    updateTimelineOrderButton();
    updateTimeline();
    updateRecordsPage();
    showToast(timelineOrder === 'desc' ? '已切换为倒序显示' : '已切换为顺序显示');
}

// 更新统计数据
function updateStats() {
    const exerciseCountElement = document.getElementById('exerciseCount');
    const exerciseTimeElement = document.getElementById('exerciseTime');
    if (!exerciseCountElement || !exerciseTimeElement) {
        return;
    }

    const exerciseCount = activities.filter(a => a.type === 'exercise').length;
    const exerciseMinutes = activities
        .filter(a => a.type === 'exercise')
        .reduce((sum, a) => sum + (getActivityDuration(a) || 0), 0);

    exerciseCountElement.textContent = exerciseCount;
    exerciseTimeElement.textContent = formatMinutesLabel(exerciseMinutes);
}

// 格式化时间
function formatTime(time) {
    if (!time) {
        return '';
    }
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
}

function addMinutesToTime(time, minutes) {
    if (!time || !Number.isFinite(minutes)) {
        return time || '';
    }

    const [hours, mins] = time.split(':').map(Number);
    const total = ((hours * 60 + mins + minutes) % 1440 + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function calculateDurationBetweenTimes(startTime, endTime, allowOvernight = false) {
    if (!startTime || !endTime) {
        return null;
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const startTotal = startHour * 60 + startMinute;
    let endTotal = endHour * 60 + endMinute;

    if (allowOvernight && endTotal < startTotal) {
        endTotal += 24 * 60;
    }

    if (endTotal < startTotal) {
        return null;
    }

    return endTotal - startTotal;
}

function normalizeActivity(activity) {
    const startTime = activity.startTime || activity.time || '';
    const endTime = activity.endTime || (
        Number.isFinite(activity.duration) && startTime
            ? addMinutesToTime(startTime, activity.duration)
            : ''
    );
    const duration = Number.isFinite(activity.duration)
        ? activity.duration
        : calculateDurationBetweenTimes(startTime, endTime, activity.type === 'sleep');

    return {
        ...activity,
        time: startTime,
        startTime,
        endTime,
        duration: duration ?? null
    };
}

function getActivitySortTime(activity) {
    return normalizeActivity(activity).startTime || '00:00';
}

function getActivityTimeRangeText(activity) {
    const normalized = normalizeActivity(activity);
    if (normalized.startTime && normalized.endTime) {
        return `${formatTime(normalized.startTime)} - ${formatTime(normalized.endTime)}`;
    }
    if (normalized.startTime) {
        return formatTime(normalized.startTime);
    }
    return '无时间';
}

function getActivityDuration(activity) {
    const normalized = normalizeActivity(activity);
    if (Number.isFinite(normalized.duration)) {
        return normalized.duration;
    }
    return calculateDurationBetweenTimes(normalized.startTime, normalized.endTime, normalized.type === 'sleep');
}

function formatMinutesLabel(totalMinutes) {
    if (!totalMinutes) {
        return '0m';
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`;
}

// 打开模态框
function openModal(activity = null) {
    const form = document.getElementById('activityForm');
    const title = document.getElementById('modalTitle');

    form.reset();
    resetImageInputs();

    if (activity) {
        const normalized = normalizeActivity(activity);
        editingId = activity.id;
        title.textContent = '编辑活动';
        document.getElementById('activityStartTime').value = normalized.startTime;
        document.getElementById('activityEndTime').value = normalized.endTime || normalized.startTime;
        document.getElementById('activityType').value = normalized.type;
        document.getElementById('activityContent').value = normalized.content;
        document.getElementById('activityFeeling').value = normalized.feeling || '';
        document.getElementById('activityDuration').value = normalized.duration || '';
        pendingActivityImages = Array.isArray(activity.images) ? [...activity.images] : (activity.image ? [activity.image] : []);
    } else {
        editingId = null;
        title.textContent = '添加活动';
        pendingActivityImages = [];
        // 设置默认时间
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        document.getElementById('activityStartTime').value = time;
        document.getElementById('activityEndTime').value = time;
        document.getElementById('activityDuration').value = '';
    }

    updateActivityDurationField();
    updateActivityImagePreview();
    renderActivityTemplates();
    switchPage('activity-form');
}

function openHealthModal(record = null) {
    const form = document.getElementById('healthForm');
    const title = document.getElementById('healthModalTitle');

    form.reset();
    resetHealthImageInputs();

    if (record) {
        editingHealthId = record.id;
        title.textContent = '编辑健康数据';
        document.getElementById('healthTime').value = record.time;
        document.getElementById('healthType').value = record.type;
        document.getElementById('healthValue').value = record.value;
        document.getElementById('healthUnit').value = record.unit || '';
        document.getElementById('healthNotes').value = record.notes || '';
        pendingHealthImage = record.image || null;
    } else {
        editingHealthId = null;
        title.textContent = '记录健康数据';
        pendingHealthImage = null;
        const now = new Date();
        document.getElementById('healthTime').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        document.getElementById('healthType').value = 'bloodPressure';
        syncHealthUnitField();
    }

    updateHealthImagePreview();
    switchPage('health-form');
}

function openSymptomModal(record = null) {
    const form = document.getElementById('symptomForm');
    const title = document.getElementById('symptomModalTitle');

    form.reset();
    resetSymptomImageInputs();

    if (record) {
        editingSymptomId = record.id;
        title.textContent = '编辑症状记录';
        document.getElementById('symptomTime').value = record.time;
        document.getElementById('symptomDescription').value = record.description;
        document.getElementById('symptomMeasures').value = record.measures || '';
        pendingSymptomImage = record.image || null;
    } else {
        editingSymptomId = null;
        title.textContent = '记录症状';
        pendingSymptomImage = null;
        const now = new Date();
        document.getElementById('symptomTime').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    updateSymptomImagePreview();
    switchPage('symptom-form');
}

function syncHealthUnitField() {
    const type = document.getElementById('healthType').value;
    document.getElementById('healthUnit').value = healthTypeUnits[type] || '';
}

function getDateTimeForKey(dateKey, time) {
    return new Date(`${dateKey}T${time}:00`);
}

function validateEntryTime(dateKey, time, label) {
    if (!time) {
        showToast(`请填写${label}时间`);
        return false;
    }

    const entryDateTime = getDateTimeForKey(dateKey, time);
    const now = new Date();

    if (entryDateTime > now) {
        showToast(`${label}时间不能晚于当前时间`);
        return false;
    }

    const diffDays = Math.abs(now - entryDateTime) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
        return confirm(`${label}时间距今天已超过 30 天，是否继续保存？`);
    }

    return true;
}

function getActivityDateTimes(dateKey, startTime, endTime, type) {
    const startDateTime = new Date(`${dateKey}T${startTime}:00`);
    const endDateTime = new Date(`${dateKey}T${endTime}:00`);

    if (type === 'sleep' && endDateTime < startDateTime) {
        startDateTime.setDate(startDateTime.getDate() - 1);
    }

    return { startDateTime, endDateTime };
}

function updateActivityDurationField() {
    const startTime = document.getElementById('activityStartTime')?.value;
    const endTime = document.getElementById('activityEndTime')?.value;
    const type = document.getElementById('activityType')?.value;
    const durationInput = document.getElementById('activityDuration');

    if (!durationInput) return;

    const duration = calculateDurationBetweenTimes(startTime, endTime, type === 'sleep');
    durationInput.value = duration ?? '';
}

function validateActivityTimeRange(dateKey, startTime, endTime, type) {
    if (!startTime || !endTime) {
        showToast('请填写开始时间和结束时间');
        return false;
    }

    const duration = calculateDurationBetweenTimes(startTime, endTime, type === 'sleep');
    if (duration === null) {
        showToast(type === 'sleep' ? '睡眠记录的结束时间需晚于开始时间，或跨天结束' : '结束时间不能早于开始时间');
        return false;
    }

    const { startDateTime, endDateTime } = getActivityDateTimes(dateKey, startTime, endTime, type);
    const now = new Date();

    if (endDateTime > now) {
        showToast('结束时间不能晚于当前时间');
        return false;
    }

    const diffDays = Math.abs(now - endDateTime) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
        return confirm('活动时间距今天已超过 30 天，是否继续保存？');
    }

    if (startDateTime > endDateTime) {
        showToast('开始时间不能晚于结束时间');
        return false;
    }

    return true;
}

function isDuplicateActivity(candidate) {
    return activities.some(item => (
        item.time === candidate.time
        && item.type === candidate.type
        && item.content === candidate.content
    ));
}

function isDuplicateHealthRecord(candidate) {
    return healthRecords.some(item => (
        item.time === candidate.time
        && item.type === candidate.type
        && item.value === candidate.value
    ));
}

function validateHealthRecord(type, value) {
    if (!value) {
        return { valid: false, needsConfirm: false, message: '请填写健康数值' };
    }

    if (type === 'bloodPressure') {
        const match = value.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
        if (!match) {
            return { valid: false, needsConfirm: false, message: '血压格式应为 收缩压/舒张压，例如 120/80' };
        }

        const systolic = parseInt(match[1], 10);
        const diastolic = parseInt(match[2], 10);
        const [minSys, maxSys] = healthValidationRules.bloodPressure.systolic;
        const [minDia, maxDia] = healthValidationRules.bloodPressure.diastolic;
        const inRange = systolic >= minSys && systolic <= maxSys && diastolic >= minDia && diastolic <= maxDia;

        return inRange
            ? { valid: true, needsConfirm: false, message: '' }
            : { valid: true, needsConfirm: true, message: '血压数值超出建议范围，确认继续保存吗？' };
    }

    if (type === 'other') {
        return { valid: true, needsConfirm: false, message: '' };
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
        return { valid: false, needsConfirm: false, message: '该健康指标需要填写数字' };
    }

    const rule = healthValidationRules[type];
    if (!rule) {
        return { valid: true, needsConfirm: false, message: '' };
    }

    const inRange = numericValue >= rule.min && numericValue <= rule.max;
    return inRange
        ? { valid: true, needsConfirm: false, message: '' }
        : { valid: true, needsConfirm: true, message: `${rule.label}超出建议范围，确认继续保存吗？` };
}

// 处理表单提交
async function handleFormSubmit(e) {
    e.preventDefault();
    if (submitLocks.activity) return;

    const startTime = document.getElementById('activityStartTime').value;
    const endTime = document.getElementById('activityEndTime').value;
    const type = document.getElementById('activityType').value;
    const content = document.getElementById('activityContent').value.trim();
    const feeling = document.getElementById('activityFeeling').value.trim();
    const duration = calculateDurationBetweenTimes(startTime, endTime, type === 'sleep');

    if (!content) {
        showToast('请填写活动内容');
        return;
    }

    if (!validateActivityTimeRange(getDateKey(currentDate), startTime, endTime, type)) {
        return;
    }

    if (!editingId && isDuplicateActivity({ time: startTime, type, content })) {
        showToast('检测到重复活动，请勿重复提交');
        return;
    }

    const activity = {
        id: editingId || Date.now().toString(),
        time: startTime,
        startTime,
        endTime,
        type,
        content,
        feeling,
        duration: duration ?? null,
        images: pendingActivityImages.length > 0 ? pendingActivityImages : undefined,
        image: pendingActivityImages.length > 0 ? pendingActivityImages[0] : undefined,
        createdAt: editingId ? activities.find(a => a.id === editingId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    submitLocks.activity = true;
    try {
        if (isBackendActivityModeEnabled()) {
            const savedActivity = await cloudSyncRequest(
                editingId ? `/api/activities/${encodeURIComponent(editingId)}` : '/api/activities',
                {
                    method: editingId ? 'PUT' : 'POST',
                    body: JSON.stringify(toBackendActivityPayload(activity))
                }
            );
            const normalized = normalizeBackendActivityRecord(savedActivity);
            const dateKey = getDateKey(currentDate);
            const currentList = [...(allActivitiesData[dateKey] || [])];
            const targetIndex = currentList.findIndex(item => item.id === normalized.id);
            if (targetIndex > -1) {
                currentList[targetIndex] = normalized;
            } else {
                currentList.push(normalized);
            }
            currentList.sort((a, b) => getActivitySortTime(a).localeCompare(getActivitySortTime(b)));
            allActivitiesData[dateKey] = currentList;
            activities = [...currentList];
            await persistAppState({ skipAutoCloudSync: true });
            await updateStorageStatus();
        } else {
            if (editingId) {
                const index = activities.findIndex(a => a.id === editingId);
                if (index > -1) {
                    activities[index] = activity;
                }
            } else {
                activities.push(activity);
            }

            activities = activities.map(normalizeActivity);
            activities.sort((a, b) => getActivitySortTime(a).localeCompare(getActivitySortTime(b)));
            await saveActivities();
        }

        updateDisplay();
        switchPage('records');
        pendingActivityImages = [];
        resetImageInputs();
        showToast(editingId ? '活动已更新！' : '活动已添加！');
    } catch (error) {
        console.error(error);
        showToast(isBackendActivityModeEnabled() ? '保存失败，请检查后端连接或登录状态' : '保存失败：图片过大或本地存储空间不足');
    } finally {
        submitLocks.activity = false;
    }
}

async function handleHealthFormSubmit(e) {
    e.preventDefault();
    if (submitLocks.health) return;

    const time = document.getElementById('healthTime').value;
    const type = document.getElementById('healthType').value;
    const value = document.getElementById('healthValue').value.trim();
    const unit = document.getElementById('healthUnit').value.trim();
    const notes = document.getElementById('healthNotes').value.trim();

    if (!validateEntryTime(getDateKey(currentDate), time, '健康数据')) {
        return;
    }

    const validationResult = validateHealthRecord(type, value);
    if (!validationResult.valid) {
        showToast(validationResult.message);
        return;
    }

    if (validationResult.needsConfirm && !confirm(validationResult.message)) {
        return;
    }

    if (!editingHealthId && isDuplicateHealthRecord({ time, type, value })) {
        showToast('检测到重复健康数据，请确认后再提交');
        return;
    }

    const record = {
        id: editingHealthId || Date.now().toString(),
        time,
        type,
        value,
        unit,
        notes,
        image: pendingHealthImage,
        createdAt: editingHealthId ? healthRecords.find(r => r.id === editingHealthId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    submitLocks.health = true;
    try {
        if (isBackendHealthModeEnabled()) {
            const savedRecord = await cloudSyncRequest(
                editingHealthId ? `/api/health-records/${encodeURIComponent(editingHealthId)}` : '/api/health-records',
                {
                    method: editingHealthId ? 'PUT' : 'POST',
                    body: JSON.stringify(toBackendHealthPayload(record))
                }
            );
            const normalized = normalizeBackendHealthRecord(savedRecord);
            const dateKey = getDateKey(currentDate);
            const currentList = [...(allHealthRecordsData[dateKey] || [])];
            const targetIndex = currentList.findIndex(item => item.id === normalized.id);
            if (targetIndex > -1) {
                currentList[targetIndex] = normalized;
            } else {
                currentList.push(normalized);
            }
            currentList.sort((a, b) => a.time.localeCompare(b.time));
            allHealthRecordsData[dateKey] = currentList;
            healthRecords = [...currentList];
            await persistAppState({ skipAutoCloudSync: true });
            await updateStorageStatus();
        } else {
            if (editingHealthId) {
                const index = healthRecords.findIndex(r => r.id === editingHealthId);
                if (index > -1) {
                    healthRecords[index] = record;
                }
            } else {
                healthRecords.push(record);
            }
            healthRecords.sort((a, b) => a.time.localeCompare(b.time));
            await saveHealthRecords();
        }

        updateDisplay();
        switchPage('records');
        pendingHealthImage = null;
        resetHealthImageInputs();
        showToast(editingHealthId ? '健康数据已更新！' : '健康数据已记录！');
    } catch (error) {
        console.error(error);
        showToast(isBackendHealthModeEnabled() ? '保存失败，请检查后端连接或登录状态' : '保存失败：图片过大或本地存储空间不足');
    } finally {
        submitLocks.health = false;
    }
}

async function handleSymptomFormSubmit(e) {
    e.preventDefault();
    if (submitLocks.symptom) return;

    const time = document.getElementById('symptomTime').value;
    const description = document.getElementById('symptomDescription').value.trim();
    const measures = document.getElementById('symptomMeasures').value.trim();

    if (!description) {
        showToast('请填写症状描述');
        return;
    }

    if (!validateEntryTime(getDateKey(currentDate), time, '症状记录')) {
        return;
    }

    const record = {
        id: editingSymptomId || `sym_${Date.now()}`,
        time,
        description,
        measures,
        image: pendingSymptomImage,
        createdAt: editingSymptomId ? symptomRecords.find(item => item.id === editingSymptomId)?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    submitLocks.symptom = true;
    try {
        if (isBackendSymptomModeEnabled()) {
            const savedRecord = await cloudSyncRequest(
                editingSymptomId ? `/api/symptom-records/${encodeURIComponent(editingSymptomId)}` : '/api/symptom-records',
                {
                    method: editingSymptomId ? 'PUT' : 'POST',
                    body: JSON.stringify(toBackendSymptomPayload(record))
                }
            );
            const normalized = normalizeBackendSymptomRecord(savedRecord);
            const dateKey = getDateKey(currentDate);
            const currentList = [...(allSymptomRecordsData[dateKey] || [])];
            const targetIndex = currentList.findIndex(item => item.id === normalized.id);
            if (targetIndex > -1) {
                currentList[targetIndex] = normalized;
            } else {
                currentList.push(normalized);
            }
            currentList.sort((a, b) => a.time.localeCompare(b.time));
            allSymptomRecordsData[dateKey] = currentList;
            symptomRecords = [...currentList];
            await persistAppState({ skipAutoCloudSync: true });
            await updateStorageStatus();
        } else {
            if (editingSymptomId) {
                const index = symptomRecords.findIndex(item => item.id === editingSymptomId);
                if (index > -1) {
                    symptomRecords[index] = record;
                }
            } else {
                symptomRecords.push(record);
            }
            symptomRecords.sort((a, b) => a.time.localeCompare(b.time));
            await saveSymptomRecords();
        }

        updateDisplay();
        switchPage('records');
        pendingSymptomImage = null;
        resetSymptomImageInputs();
        showToast(editingSymptomId ? '症状记录已更新！' : '症状记录已保存！');
    } catch (error) {
        console.error(error);
        showToast(isBackendSymptomModeEnabled() ? '保存失败，请检查后端连接或登录状态' : '保存失败：图片过大或本地存储空间不足');
    } finally {
        submitLocks.symptom = false;
    }
}

function updateHealthDisplay() {
    const container = document.getElementById('healthQuickPreview');
    const emptyState = document.getElementById('healthEmptyState');
    const emptyActionBtn = document.getElementById('healthEmptyActionBtn');
    const healthTypeOrder = ['bloodPressure', 'heartRate', 'bloodSugar', 'uricAcid', 'bloodLipid', 'other'];

    if (healthRecords.length === 0) {
        if (container) container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        // 绑定"去测量"按钮点击事件
        if (emptyActionBtn) {
            emptyActionBtn.onclick = () => openHealthModal();
        }
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const latestByType = Object.values(healthRecords.reduce((acc, record) => {
        const existing = acc[record.type];
        if (!existing || existing.time < record.time) {
            acc[record.type] = record;
        }
        return acc;
    }, {})).sort((a, b) => {
        const aIndex = healthTypeOrder.indexOf(a.type);
        const bIndex = healthTypeOrder.indexOf(b.type);
        const safeAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const safeBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
        return safeAIndex - safeBIndex;
    });

    if (container) {
        container.innerHTML = latestByType.map(record => `
            <div class="health-quick-card" data-type="${escapeHtml(record.type || 'other')}">
                <div class="health-quick-card-top">
                    <div class="health-quick-card-title">
                        <span class="health-quick-icon">${healthTypeIcons[record.type] || '🩺'}</span>
                        <span class="health-quick-label">${healthTypeLabels[record.type] || record.type}</span>
                    </div>
                    <span class="health-quick-time">${escapeHtml(record.time || '--:--')}</span>
                </div>
                <div class="health-quick-reading">
                    <span class="health-quick-value">${escapeHtml(record.value)}</span>
                    ${record.unit ? `<span class="health-quick-unit">${escapeHtml(record.unit)}</span>` : ''}
                </div>
            </div>
        `).join('');
    }
}

async function handleHealthImageChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
        pendingHealthImage = await readAndCompressImage(file);
        updateHealthImagePreview();
        showToast('健康数据图片已添加');
    } catch (error) {
        console.error(error);
        showToast('图片处理失败，请重试');
    } finally {
        resetHealthImageInputs();
    }
}

function clearPendingHealthImage() {
    pendingHealthImage = null;
    updateHealthImagePreview();
    resetHealthImageInputs();
}

function updateHealthImagePreview() {
    const preview = document.getElementById('healthImagePreview');
    const previewImg = document.getElementById('healthImagePreviewImg');
    const hint = document.getElementById('healthImageHint');

    if (!pendingHealthImage) {
        preview.classList.add('hidden');
        previewImg.removeAttribute('src');
        hint.style.display = 'block';
        return;
    }

    preview.classList.remove('hidden');
    previewImg.src = pendingHealthImage;
    hint.style.display = 'none';
}

function resetHealthImageInputs() {
    document.getElementById('healthImageUpload').value = '';
}

async function handleSymptomImageChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
        pendingSymptomImage = await readAndCompressImage(file);
        updateSymptomImagePreview();
        showToast('症状图片已添加');
    } catch (error) {
        console.error(error);
        showToast('图片处理失败，请重试');
    } finally {
        resetSymptomImageInputs();
    }
}

function clearPendingSymptomImage() {
    pendingSymptomImage = null;
    updateSymptomImagePreview();
    resetSymptomImageInputs();
}

function updateSymptomImagePreview() {
    const preview = document.getElementById('symptomImagePreview');
    const previewImg = document.getElementById('symptomImagePreviewImg');
    const hint = document.getElementById('symptomImageHint');

    if (!preview || !previewImg || !hint) return;

    if (!pendingSymptomImage) {
        preview.classList.add('hidden');
        previewImg.removeAttribute('src');
        hint.style.display = 'block';
        return;
    }

    preview.classList.remove('hidden');
    previewImg.src = pendingSymptomImage;
    hint.style.display = 'none';
}

function resetSymptomImageInputs() {
    const input = document.getElementById('symptomImageUpload');
    if (input) {
        input.value = '';
    }
}

async function handleActivityImageChange(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
        for (let i = 0; i < files.length; i++) {
            const compressedImage = await readAndCompressImage(files[i]);
            pendingActivityImages.push(compressedImage);
        }
        updateActivityImagePreview();
        showToast(`已添加 ${files.length} 张图片`);
    } catch (error) {
        console.error(error);
        showToast('图片处理失败，请重试');
    } finally {
        resetImageInputs();
    }
}

function handleImageGalleryClick(e) {
    const item = e.target.closest('.activity-image-item');
    if (!item) return;

    const removeBtn = e.target.closest('.activity-image-remove');
    if (removeBtn) {
        const index = parseInt(item.dataset.index);
        pendingActivityImages.splice(index, 1);
        updateActivityImagePreview();
        showToast('图片已删除');
        return;
    }

    const index = parseInt(item.dataset.index);
    const imageSrc = pendingActivityImages[index];
    openImageViewer(imageSrc);
}

function openImageViewer(imageSrc) {
    const modal = document.getElementById('imageViewerModal');
    const img = document.getElementById('imageViewerImg');
    const download = document.getElementById('imageViewerDownload');
    
    modal.style.display = 'block';
    img.src = imageSrc;
    download.href = imageSrc;
    download.download = `image_${Date.now()}.jpg`;
}

function clearPendingActivityImage() {
    pendingActivityImages = [];
    updateActivityImagePreview();
    resetImageInputs();
}

function updateActivityImagePreview() {
    const preview = document.getElementById('activityImagePreview');
    const hint = document.getElementById('activityImageHint');

    if (pendingActivityImages.length === 0) {
        preview.classList.add('hidden');
        preview.innerHTML = '';
        hint.style.display = 'block';
        return;
    }

    preview.classList.remove('hidden');
    preview.innerHTML = pendingActivityImages.map((img, index) => `
        <div class="activity-image-item" data-index="${index}">
            <img src="${img}" alt="图片 ${index + 1}">
            <button type="button" class="activity-image-remove" title="删除图片">×</button>
        </div>
    `).join('');
    hint.style.display = 'none';
}

function resetImageInputs() {
    document.getElementById('activityImageUpload').value = '';
}

function readAndCompressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const maxSize = 1600;
                let { width, height } = img;

                if (width > height && width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else if (height >= width && height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas not supported'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = reader.result;
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
    });
}

// 编辑活动
window.editActivity = function(id) {
    const activity = activities.find(a => a.id === id);
    if (activity) {
        openModal(activity);
    }
}

// 删除活动
window.deleteActivity = function(id) {
    if (confirm('确定要删除这个活动吗？')) {
        if (isBackendActivityModeEnabled()) {
            cloudSyncRequest(`/api/activities/${encodeURIComponent(id)}`, {
                method: 'DELETE'
            })
                .then(async () => {
                    const dateKey = getDateKey(currentDate);
                    activities = activities.filter(a => a.id !== id);
                    allActivitiesData[dateKey] = [...activities];
                    await persistAppState({ skipAutoCloudSync: true });
                    await updateStorageStatus();
                    updateDisplay();
                    showToast('活动已删除！');
                })
                .catch(() => showToast('删除失败，请检查后端连接'));
            return;
        }

        activities = activities.filter(a => a.id !== id);
        saveActivities()
            .then(() => {
                updateDisplay();
                showToast('活动已删除！');
            })
            .catch(() => showToast('删除失败，请稍后重试'));
    }
}

// 导出JSON
async function exportJson() {
    const exportRange = document.querySelector('input[name="exportRange"]:checked').value;

    let payload;
    let filename;

    if (exportRange === 'all') {
        // 全量导出
        payload = buildFullExportPayload();
        filename = `daily-tracker-backup-all-${new Date().toISOString().split('T')[0]}.json`;
    } else {
        // 部分导出
        const { activities, healthRecords, symptomRecords, dailyNotesByDate, dateRange } = getExportData();

        // 按日期组织数据
        const activitiesByDate = {};
        const healthRecordsByDate = {};
        const symptomRecordsByDate = {};

        activities.forEach(a => {
            const dateKey = a._displayDate || getDateKey(currentDate);
            if (!activitiesByDate[dateKey]) {
                activitiesByDate[dateKey] = [];
            }
            activitiesByDate[dateKey].push(a);
        });

        healthRecords.forEach(r => {
            const dateKey = r._displayDate || getDateKey(currentDate);
            if (!healthRecordsByDate[dateKey]) {
                healthRecordsByDate[dateKey] = [];
            }
            healthRecordsByDate[dateKey].push(r);
        });

        symptomRecords.forEach(r => {
            const dateKey = r._displayDate || getDateKey(currentDate);
            if (!symptomRecordsByDate[dateKey]) {
                symptomRecordsByDate[dateKey] = [];
            }
            symptomRecordsByDate[dateKey].push(r);
        });

        payload = {
            activitiesByDate,
            healthRecordsByDate,
            symptomRecordsByDate,
            dailyNotesByDate,
            reminders,
            profile,
            metadata: {
                ...metadata,
                exportedAt: new Date().toISOString(),
                exportRange: dateRange
            }
        };
        filename = `daily-tracker-${dateRange}.json`;
    }

    const data = {
        ...payload,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, filename);
    metadata.lastBackupAt = new Date().toISOString();
    await persistAppState();
    updateStorageStatus();
    if (currentPage === 'export') {
        switchPage('my');
    } else {
        document.getElementById('exportModal').style.display = 'none';
    }
    showToast('数据已导出！');
}

window.editHealthRecord = function(id) {
    const record = healthRecords.find(r => r.id === id);
    if (record) {
        openHealthModal(record);
    }
}

window.deleteHealthRecord = function(id) {
    if (confirm('确定要删除这条健康数据吗？')) {
        if (isBackendHealthModeEnabled()) {
            cloudSyncRequest(`/api/health-records/${encodeURIComponent(id)}`, {
                method: 'DELETE'
            })
                .then(async () => {
                    const dateKey = getDateKey(currentDate);
                    healthRecords = healthRecords.filter(r => r.id !== id);
                    allHealthRecordsData[dateKey] = [...healthRecords];
                    await persistAppState({ skipAutoCloudSync: true });
                    await updateStorageStatus();
                    updateDisplay();
                    showToast('健康数据已删除！');
                })
                .catch(() => showToast('删除失败，请检查后端连接'));
            return;
        }

        healthRecords = healthRecords.filter(r => r.id !== id);
        saveHealthRecords()
            .then(() => {
                updateDisplay();
                showToast('健康数据已删除！');
            })
            .catch(() => showToast('删除失败，请稍后重试'));
    }
}

window.editSymptomRecord = function(id) {
    const record = symptomRecords.find(item => item.id === id);
    if (record) {
        openSymptomModal(record);
    }
}

window.deleteSymptomRecord = function(id) {
    if (confirm('确定要删除这条症状记录吗？')) {
        if (isBackendSymptomModeEnabled()) {
            cloudSyncRequest(`/api/symptom-records/${encodeURIComponent(id)}`, {
                method: 'DELETE'
            })
                .then(async () => {
                    const dateKey = getDateKey(currentDate);
                    symptomRecords = symptomRecords.filter(item => item.id !== id);
                    allSymptomRecordsData[dateKey] = [...symptomRecords];
                    await persistAppState({ skipAutoCloudSync: true });
                    await updateStorageStatus();
                    updateDisplay();
                    showToast('症状记录已删除！');
                })
                .catch(() => showToast('删除失败，请检查后端连接'));
            return;
        }

        symptomRecords = symptomRecords.filter(item => item.id !== id);
        saveSymptomRecords()
            .then(() => {
                updateDisplay();
                showToast('症状记录已删除！');
            })
            .catch(() => showToast('删除失败，请稍后重试'));
    }
}

function openExportModal() {
    openMySubPage('export');
    updateStorageStatus();
    updateExportPreview();
}

// 更新导出预览
function updateExportPreview() {
    const exportRange = document.querySelector('input[name="exportRange"]:checked').value;
    const dateRangeInputs = document.getElementById('dateRangeInputs');
    const exportDateRangeText = document.getElementById('exportDateRangeText');

    let startDate, endDate;
    let activities = [];
    let healthRecords = [];
    let symptomRecords = [];
    let noteCount = 0;
    let reminderCount = 0;

    if (exportRange === 'current') {
        // 当前日期
        const dateKey = getDateKey(currentDate);
        activities = allActivitiesData[dateKey] || [];
        healthRecords = allHealthRecordsData[dateKey] || [];
        symptomRecords = allSymptomRecordsData[dateKey] || [];
        noteCount = allDailyNotesData[dateKey] ? 1 : 0;
        reminderCount = reminders.filter(r => r.date === dateKey).length;
        exportDateRangeText.textContent = `导出日期: ${dateKey}`;
    } else if (exportRange === 'range') {
        // 日期范围
        dateRangeInputs.classList.remove('hidden');
        startDate = document.getElementById('exportStartDate').value;
        endDate = document.getElementById('exportEndDate').value;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                const dateKey = getDateKey(date);
                if (allActivitiesData[dateKey]) {
                    activities = activities.concat(allActivitiesData[dateKey]);
                }
                if (allHealthRecordsData[dateKey]) {
                    healthRecords = healthRecords.concat(allHealthRecordsData[dateKey]);
                }
                if (allSymptomRecordsData[dateKey]) {
                    symptomRecords = symptomRecords.concat(allSymptomRecordsData[dateKey]);
                }
                if (allDailyNotesData[dateKey]) {
                    noteCount += 1;
                }
            }

            reminderCount = reminders.filter(r => {
                const reminderDate = new Date(r.date);
                return reminderDate >= start && reminderDate <= end;
            }).length;

            exportDateRangeText.textContent = `导出范围: ${startDate} 至 ${endDate}`;
        } else {
            exportDateRangeText.textContent = '请选择开始和结束日期';
        }
    } else {
        // 全部数据
        dateRangeInputs.classList.add('hidden');
        Object.keys(allActivitiesData).forEach(dateKey => {
            if (allActivitiesData[dateKey]) {
                activities = activities.concat(allActivitiesData[dateKey]);
            }
        });
        Object.keys(allHealthRecordsData).forEach(dateKey => {
            if (allHealthRecordsData[dateKey]) {
                healthRecords = healthRecords.concat(allHealthRecordsData[dateKey]);
            }
        });
        Object.keys(allSymptomRecordsData).forEach(dateKey => {
            if (allSymptomRecordsData[dateKey]) {
                symptomRecords = symptomRecords.concat(allSymptomRecordsData[dateKey]);
            }
        });
        noteCount = Object.keys(allDailyNotesData).length;
        reminderCount = reminders.length;

        const dates = Object.keys({
            ...allActivitiesData,
            ...allHealthRecordsData,
            ...allSymptomRecordsData,
            ...allDailyNotesData
        }).sort();
        if (dates.length > 0) {
            exportDateRangeText.textContent = `导出范围: ${dates[0]} 至 ${dates[dates.length - 1]} (全部数据)`;
        } else {
            exportDateRangeText.textContent = '暂无数据';
        }
    }

    // 更新预览统计
    document.getElementById('previewActivityCount').textContent = activities.length;
    document.getElementById('previewHealthCount').textContent = healthRecords.length + symptomRecords.length + noteCount;
    document.getElementById('previewReminderCount').textContent = reminderCount;
}

// 获取导出数据
function getExportData() {
    const exportRange = document.querySelector('input[name="exportRange"]:checked').value;
    let activities = [];
    let healthRecords = [];
    let symptomRecords = [];
    let dailyNotesByDate = {};
    let dateRange = '';

    if (exportRange === 'current') {
        const dateKey = getDateKey(currentDate);
        activities = (allActivitiesData[dateKey] || []).map(normalizeActivity);
        healthRecords = allHealthRecordsData[dateKey] || [];
        symptomRecords = allSymptomRecordsData[dateKey] || [];
        if (allDailyNotesData[dateKey]) {
            dailyNotesByDate[dateKey] = allDailyNotesData[dateKey];
        }
        dateRange = dateKey;
    } else if (exportRange === 'range') {
        const startDate = document.getElementById('exportStartDate').value;
        const endDate = document.getElementById('exportEndDate').value;

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);

            for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                const dateKey = getDateKey(date);
                if (allActivitiesData[dateKey]) {
                    activities = activities.concat(allActivitiesData[dateKey].map(normalizeActivity));
                }
                if (allHealthRecordsData[dateKey]) {
                    healthRecords = healthRecords.concat(allHealthRecordsData[dateKey]);
                }
                if (allSymptomRecordsData[dateKey]) {
                    symptomRecords = symptomRecords.concat(allSymptomRecordsData[dateKey]);
                }
                if (allDailyNotesData[dateKey]) {
                    dailyNotesByDate[dateKey] = allDailyNotesData[dateKey];
                }
            }
            dateRange = `${startDate}_to_${endDate}`;
        }
    } else {
        // 全部数据
        Object.keys(allActivitiesData).forEach(dateKey => {
            if (allActivitiesData[dateKey]) {
                activities = activities.concat(allActivitiesData[dateKey].map(normalizeActivity));
            }
        });
        Object.keys(allHealthRecordsData).forEach(dateKey => {
            if (allHealthRecordsData[dateKey]) {
                healthRecords = healthRecords.concat(allHealthRecordsData[dateKey]);
            }
        });
        Object.keys(allSymptomRecordsData).forEach(dateKey => {
            if (allSymptomRecordsData[dateKey]) {
                symptomRecords = symptomRecords.concat(allSymptomRecordsData[dateKey]);
            }
        });
        dailyNotesByDate = { ...allDailyNotesData };
        const dates = Object.keys({
            ...allActivitiesData,
            ...allHealthRecordsData,
            ...allSymptomRecordsData,
            ...allDailyNotesData
        }).sort();
        dateRange = dates.length > 0 ? `all_${dates[0]}_${dates[dates.length - 1]}` : 'all';
    }

    return { activities, healthRecords, symptomRecords, dailyNotesByDate, dateRange };
}

// 导出CSV
function exportCsv() {
    const { activities, healthRecords, symptomRecords, dateRange } = getExportData();
    const headers = ['日期', '记录类别', '开始时间', '结束时间', '类型', '内容/数值', '补充信息', '时长(分钟)', '单位'];
    const activityRows = activities.map(a => [
        a._displayDate || getDateKey(currentDate),
        '活动',
        a.startTime || a.time || '',
        a.endTime || '',
        typeLabels[a.type],
        a.content,
        a.feeling || '',
        getActivityDuration(a) || '',
        ''
    ]);

    const healthRows = healthRecords.map(r => [
        r._displayDate || getDateKey(currentDate),
        '健康数据',
        r.time,
        '',
        healthTypeLabels[r.type],
        r.value,
        r.notes || '',
        '',
        r.unit || ''
    ]);

    const symptomRows = symptomRecords.map(r => [
        r._displayDate || getDateKey(currentDate),
        '症状记录',
        r.time,
        '',
        '症状',
        r.description,
        r.measures || '',
        '',
        ''
    ]);

    const csv = [headers, ...activityRows, ...healthRows, ...symptomRows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `daily-tracker-${dateRange}.csv`);
    if (currentPage === 'export') {
        switchPage('my');
    } else {
        document.getElementById('exportModal').style.display = 'none';
    }
    showToast('数据已导出！');
}

// 下载文件
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 显示提示消息
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        z-index: 3000;
        animation: fadeIn 0.3s;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// 注册Service Worker（PWA支持）
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
        serviceWorkerRegistration = await navigator.serviceWorker.register('./sw.js');

        if ('sync' in serviceWorkerRegistration) {
            try {
                await serviceWorkerRegistration.sync.register('daily-tracker-sync');
            } catch (error) {
                console.warn('Background sync unavailable', error);
            }
        }
    } catch (error) {
        console.error('Service Worker registration failed', error);
    }

}

// 获取 Service Worker 缓存信息
async function getServiceWorkerCacheInfo() {
    if (!navigator.serviceWorker?.controller) {
        return { available: false };
    }

    try {
        const messageChannel = new MessageChannel();
        const promise = new Promise(resolve => {
            messageChannel.port1.onmessage = event => {
                resolve(event.data);
            };
        });

        navigator.serviceWorker.controller.postMessage({
            type: 'GET_CACHE_SIZE'
        }, [messageChannel.port2]);

        const result = await promise;
        return { available: true, ...result };
    } catch (error) {
        console.error('Failed to get cache info:', error);
        return { available: false, error: error.message };
    }
}

// 清理 Service Worker 缓存
async function clearServiceWorkerCache() {
    if (!navigator.serviceWorker?.controller) {
        showToast('Service Worker 不可用');
        return;
    }

    try {
        const messageChannel = new MessageChannel();
        const promise = new Promise(resolve => {
            messageChannel.port1.onmessage = event => {
                resolve(event.data);
            };
        });

        navigator.serviceWorker.controller.postMessage({
            type: 'CLEAR_CACHE'
        }, [messageChannel.port2]);

        await promise;
        showToast('缓存已清理');
    } catch (error) {
        console.error('Failed to clear cache:', error);
        showToast('清理缓存失败');
    }
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            closeModal(modal);
        });
    }
    if (e.key === 'n' && e.ctrlKey) {
        e.preventDefault();
        openModal();
    }
});

// ==================== 提醒功能 ====================

// 加载提醒数据
function loadReminders() {
    reminders = normalizeReminders(reminders || []);
}

function isBackendReminderModeEnabled() {
    return isCloudSyncAuthenticated();
}

function normalizeBackendReminderRecord(reminder) {
    return {
        id: String(reminder.id),
        backendId: reminder.id,
        title: reminder.title || '',
        type: reminder.type || 'other',
        date: reminder.reminderDate,
        time: reminder.reminderTime,
        repeat: normalizeReminderRepeat(reminder.repeatType),
        notes: reminder.notes || '',
        image: reminder.imageUrl || null,
        completed: Boolean(reminder.completed),
        completedAt: reminder.completedAt || null,
        snoozeUntil: reminder.snoozeUntil || null,
        snoozeCount: Number(reminder.snoozeCount || 0),
        history: [],
        createdAt: reminder.createdAt || new Date().toISOString(),
        updatedAt: reminder.updatedAt || new Date().toISOString()
    };
}

function toBackendReminderPayload(reminder) {
    return {
        title: reminder.title,
        type: reminder.type,
        reminderDate: reminder.date,
        reminderTime: reminder.time,
        repeatType: normalizeReminderRepeat(reminder.repeat),
        notes: reminder.notes || '',
        imageUrl: reminder.image || ''
    };
}

async function refreshRemindersFromBackend(options = {}) {
    if (!isBackendReminderModeEnabled()) {
        loadReminders();
        return reminders;
    }

    try {
        const response = await cloudSyncRequest('/api/reminders', { method: 'GET' });
        reminders = normalizeReminders(Array.isArray(response) ? response.map(normalizeBackendReminderRecord) : []);
        await persistAppState({ skipAutoCloudSync: true });
        await syncRemindersToServiceWorker();
        await updateStorageStatus();
        renderReminderTabs('today');
        updateRemindersDisplay();
        return reminders;
    } catch (error) {
        console.error(error);
        if (!options.silent) {
            showToast('提醒加载失败，请检查后端连接');
        }
        return reminders;
    }
}

// 保存提醒数据
async function saveReminders() {
    reminders = normalizeReminders(reminders);
    await persistAppState();
    await syncRemindersToServiceWorker();
    await syncRemindersToNative();
    await updateStorageStatus();
}

function isBackendProfileModeEnabled() {
    return isCloudSyncAuthenticated();
}

function normalizeProfileShape(profileResponse, fallback = {}) {
    return {
        name: profileResponse?.name || '',
        gender: profileResponse?.gender || '',
        age: profileResponse?.age || '',
        height: profileResponse?.height || '',
        weight: profileResponse?.weight || '',
        bloodType: profileResponse?.bloodType || '',
        bloodPressure: profileResponse?.bloodPressure || '',
        bloodSugar: profileResponse?.bloodSugar || '',
        chronicConditions: profileResponse?.chronicConditions || '',
        allergies: profileResponse?.allergies || '',
        medications: profileResponse?.medications || '',
        smoking: profileResponse?.smoking || '',
        drinking: profileResponse?.drinking || '',
        exercise: profileResponse?.exercise || '',
        sleepHours: profileResponse?.sleepHours || '',
        healthGoals: profileResponse?.healthGoals || '',
        notes: profileResponse?.notes || '',
        avatar: profileResponse?.avatar || fallback?.avatar || ''
    };
}

function normalizeBackendProfile(profileResponse) {
    return normalizeProfileShape(profileResponse, profile);
}

function normalizeFamilyMembers(list = []) {
    if (!Array.isArray(list)) return [];
    return list.map(member => ({
        id: member?.id || `family_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        createdAt: member?.createdAt || '',
        updatedAt: member?.updatedAt || '',
        ...normalizeProfileShape(member)
    }));
}

async function refreshProfileFromBackend(options = {}) {
    if (!isBackendProfileModeEnabled()) {
        loadProfile();
        return profile;
    }

    try {
        const response = await cloudSyncRequest('/api/profile', { method: 'GET' });
        profile = response ? normalizeBackendProfile(response) : normalizeProfileShape(profile);
        await persistAppState({ skipAutoCloudSync: true });
        await updateStorageStatus();
        return profile;
    } catch (error) {
        console.error(error);
        if (!options.silent) {
            showToast('个人档案加载失败，请检查后端连接');
        }
        return profile;
    }
}

function isBackendDailyNoteModeEnabled() {
    return isCloudSyncAuthenticated();
}

async function refreshDailyNoteFromBackend(dateKey = getDateKey(currentDate), options = {}) {
    if (!isBackendDailyNoteModeEnabled()) {
        updateDailySummary();
        return allDailyNotesData[dateKey] || null;
    }

    try {
        const response = await cloudSyncRequest(`/api/daily-notes/${encodeURIComponent(dateKey)}`, { method: 'GET' });
        if (!response || !response.content) {
            delete allDailyNotesData[dateKey];
        } else {
            allDailyNotesData[dateKey] = {
                content: response.content,
                updatedAt: response.updatedAt || new Date().toISOString()
            };
        }
        await persistAppState({ skipAutoCloudSync: true });
        await updateStorageStatus();
        if (dateKey === getDateKey(currentDate)) {
            updateDailySummary();
        }
        return allDailyNotesData[dateKey] || null;
    } catch (error) {
        console.error(error);
        if (!options.silent) {
            showToast('今日状态记录加载失败，请检查后端连接');
        }
        return allDailyNotesData[dateKey] || null;
    }
}

function loadProfile() {
    profile = normalizeProfileShape(profile);
}

function loadFamilyMembers() {
    familyMembers = normalizeFamilyMembers(familyMembers);
}

function loadMedicines() {
    medicines = medicines || [];
}

async function saveProfile() {
    profile = normalizeProfileShape(profile);
    if (isBackendProfileModeEnabled()) {
        const response = await cloudSyncRequest('/api/profile', {
            method: 'PUT',
            body: JSON.stringify({
                name: profile.name || '',
                gender: profile.gender || '',
                age: profile.age || '',
                height: profile.height || '',
                weight: profile.weight || '',
                bloodType: profile.bloodType || '',
                bloodPressure: profile.bloodPressure || '',
                bloodSugar: profile.bloodSugar || '',
                chronicConditions: profile.chronicConditions || '',
                allergies: profile.allergies || '',
                medications: profile.medications || '',
                healthGoals: profile.healthGoals || '',
                notes: profile.notes || ''
            })
        });
        profile = normalizeProfileShape(response, profile);
        await persistAppState({ skipAutoCloudSync: true });
        await updateStorageStatus();
        return;
    }

    await persistAppState();
    await updateStorageStatus();
}

// ==================== 药品管理 ====================

async function openMedicineBoxModal() {
    openMySubPage('medicine-box');

    // 如果列表为空，添加 mock 数据
    if (medicines.length === 0) {
        medicines = createMockMedicines();
        await persistAppState({ skipAutoCloudSync: true });
    }

    renderMedicineList();
}

function getMedicineExpiryDays(med) {
    if (!med.expirationDate) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(med.expirationDate + 'T00:00:00');
    return Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
}

function getMedicineExpiryStatus(days) {
    if (days < 0) return { label: `已过期 ${Math.abs(days)} 天`, color: '#888', className: 'expired', cardClass: 'expiry-expired' };
    if (days <= 30) return { label: `还剩 ${days} 天`, color: '#e74c3c', className: 'warn-1m', cardClass: 'expiry-1m' };
    if (days <= 90) return { label: `还剩 ${days} 天`, color: '#e67e22', className: 'warn-3m', cardClass: 'expiry-3m' };
    if (days <= 180) return { label: `还剩 ${days} 天`, color: '#f5a623', className: 'warn-6m', cardClass: 'expiry-6m' };
    return { label: `还剩 ${days} 天`, color: '#27ae60', className: 'safe', cardClass: 'expiry-safe' };
}

function getMedicineCardBadgeLabel(days) {
    if (days < 0) return '已过期';
    if (days <= 30) return '1个月后过期';
    if (days <= 90) return '3个月后过期';
    if (days <= 180) return '6个月后过期';
    if (days <= 365) return '1年后过期';
    return `${Math.ceil(days / 365)}年后过期`;
}

function getMedicineTypeLabel(type) {
    const typeMap = {
        'otc': 'OTC',
        'prescription': '处方药',
        'psychotropic': '精神类',
        'supplement': '保健品',
        'chinese': '中成药',
        'other': '其他'
    };
    return typeMap[type] || '';
}

function getMedicineTypeIconClass(type) {
    const iconMap = {
        'otc': 'type-otc',
        'prescription': 'type-rx',
        'psychotropic': 'type-psychotropic',
        'supplement': 'type-supplement',
        'chinese': 'type-chinese',
        'other': 'type-other'
    };
    return iconMap[type] || 'type-default';
}

function renderMedicineTypeIcon(type, extraClass = '') {
    const classText = ['medicine-type-icon-mark', getMedicineTypeIconClass(type), extraClass].filter(Boolean).join(' ');
    const iconContentMap = {
        otc: '<span class="medicine-type-icon-text" aria-hidden="true">OTC</span>',
        prescription: '<span class="medicine-type-icon-text icon-rx" aria-hidden="true">Rx</span>',
        psychotropic: '<span class="medicine-type-icon-text icon-psy" aria-hidden="true"><span>精神</span><span>药品</span></span>',
        supplement: '<span class="medicine-type-icon-text icon-single-cn" aria-hidden="true">健</span>',
        chinese: '<span class="medicine-type-icon-text icon-single-cn" aria-hidden="true">中</span>',
        other: '<span class="medicine-type-icon-text icon-single-cn" aria-hidden="true">药</span>'
    };
    const innerText = iconContentMap[type] || '<span class="medicine-type-icon-text icon-single-cn" aria-hidden="true">药</span>';
    return `<span class="${classText}" aria-label="${escapeHtml(getMedicineTypeLabel(type) || '药品类型')}">${innerText}</span>`;
}

function getMedicineTypeOptions() {
    return [
        { value: '', label: '请选择' },
        { value: 'otc', label: '非处方药' },
        { value: 'prescription', label: '处方药' },
        { value: 'psychotropic', label: '精神类药品' },
        { value: 'supplement', label: '保健品' },
        { value: 'chinese', label: '中成药' },
        { value: 'other', label: '其他' }
    ];
}

const legacyMockMedicineExpirationDates = {
    med_001: '2026-12-31',
    med_002: '2025-08-20',
    med_003: '2027-03-15',
    med_004: '2026-06-30',
    med_005: '2025-11-25',
    med_006: '2026-09-18',
    med_007: '2025-04-10',
    med_008: '2025-02-28',
    med_009: '2027-07-31',
    med_010: '2026-01-15'
};

function shouldRefreshLegacyMockMedicines(list) {
    if (!Array.isArray(list) || list.length !== Object.keys(legacyMockMedicineExpirationDates).length) {
        return false;
    }

    return list.every(med => legacyMockMedicineExpirationDates[med.id] === med.expirationDate);
}

function renderMedicineTypeOptionContent(value, label) {
    if (!value) {
        return `<span class="medicine-type-option-text">${escapeHtml(label)}</span>`;
    }
    return `${renderMedicineTypeIcon(value)}<span class="medicine-type-option-text">${escapeHtml(label)}</span>`;
}

function syncMedicineTypeSelectUI(value = '') {
    const select = document.getElementById('medicineType');
    const wrapper = document.getElementById('medicineTypeSelect');
    const valueEl = document.getElementById('medicineTypeValue');
    if (!select || !wrapper || !valueEl) return;

    const option = getMedicineTypeOptions().find(item => item.value === value) || getMedicineTypeOptions()[0];
    valueEl.innerHTML = renderMedicineTypeOptionContent(option.value, option.label);

    wrapper.querySelectorAll('.medicine-type-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === value);
        btn.setAttribute('aria-selected', btn.dataset.value === value ? 'true' : 'false');
    });
}

function closeMedicineTypeDropdown() {
    const wrapper = document.getElementById('medicineTypeSelect');
    const trigger = document.getElementById('medicineTypeTrigger');
    const menu = document.getElementById('medicineTypeMenu');
    if (!wrapper || !trigger || !menu) return;
    wrapper.classList.remove('open');
    menu.classList.add('hidden');
    trigger.setAttribute('aria-expanded', 'false');
}

function setupMedicineTypeCustomSelect() {
    const select = document.getElementById('medicineType');
    const wrapper = document.getElementById('medicineTypeSelect');
    const trigger = document.getElementById('medicineTypeTrigger');
    const menu = document.getElementById('medicineTypeMenu');
    if (!select || !wrapper || !trigger || !menu) return;

    menu.querySelectorAll('.medicine-type-option').forEach(btn => {
        const option = getMedicineTypeOptions().find(item => item.value === btn.dataset.value);
        if (option) {
            btn.innerHTML = renderMedicineTypeOptionContent(option.value, option.label);
        }
    });

    syncMedicineTypeSelectUI(select.value || '');

    trigger.addEventListener('click', () => {
        const isOpen = wrapper.classList.toggle('open');
        menu.classList.toggle('hidden', !isOpen);
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    menu.querySelectorAll('.medicine-type-option').forEach(btn => {
        btn.addEventListener('click', () => {
            select.value = btn.dataset.value || '';
            syncMedicineTypeSelectUI(select.value);
            closeMedicineTypeDropdown();
        });
    });

    document.addEventListener('click', (event) => {
        if (!wrapper.contains(event.target)) {
            closeMedicineTypeDropdown();
        }
    });
}

function getFilteredMedicines() {
    const searchInput = document.getElementById('medicineSearchInput');
    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

    let filtered = medicines.filter(med => {
        if (query && !med.name.toLowerCase().includes(query)) return false;
        return true;
    });

    filtered.sort((a, b) => {
        const dA = a.expirationDate || '9999-12-31';
        const dB = b.expirationDate || '9999-12-31';
        return medicineSortOrder === 'asc' ? dA.localeCompare(dB) : dB.localeCompare(dA);
    });

    return filtered;
}

function renderMedicineList() {
    const listEl = document.getElementById('medicineList');
    const emptyEl = document.getElementById('medicineEmptyState');
    const countLabel = document.getElementById('medicineCountLabel');
    const sortBtn = document.getElementById('medicineSortBtn');
    const addBtn = document.getElementById('addMedicineBtn');
    if (!listEl) return;

    const filtered = getFilteredMedicines();

    if (countLabel) countLabel.textContent = `共 ${filtered.length} 种药品`;
    if (sortBtn) sortBtn.textContent = medicineSortOrder === 'asc' ? '过期日期 ↑' : '过期日期 ↓';

    // 控制底部添加按钮的显示：列表为空时显示，有数据时隐藏
    if (addBtn) {
        if (medicines.length === 0) {
            addBtn.classList.remove('hidden');
        } else {
            addBtn.classList.add('hidden');
        }
    }

    if (filtered.length === 0) {
        listEl.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    listEl.innerHTML = filtered.map(med => {
        const days = getMedicineExpiryDays(med);
        const status = getMedicineExpiryStatus(days);
        const badgeLabel = getMedicineCardBadgeLabel(days);
        const typeIcon = renderMedicineTypeIcon(med.type, 'compact');
        const imgHtml = med.image
            ? `<img src="${med.image}" class="medicine-card-thumb" alt="${escapeHtml(med.name)}">`
            : `<div class="medicine-card-thumb-placeholder">${typeIcon}</div>`;
        const indicationHtml = med.indication
            ? `<div class="medicine-card-indication">${escapeHtml(med.indication)}</div>`
            : '<div class="medicine-card-indication medicine-card-indication-muted">暂未填写适应症说明</div>';
        const contraindicationHtml = med.contraindication
            ? `<div class="medicine-card-contraindication">禁忌：${escapeHtml(med.contraindication)}</div>`
            : '';

        return `<div class="medicine-card ${status.cardClass}" data-id="${med.id}">
            <div class="medicine-card-row">
                ${imgHtml}
                <div class="medicine-card-body">
                    <div class="medicine-card-top">
                        <div class="medicine-card-name">${escapeHtml(med.name)} ${typeIcon}</div>
                        <span class="medicine-expiry-badge ${status.className}">${badgeLabel}</span>
                    </div>
                    ${indicationHtml}
                    ${contraindicationHtml}
                </div>
            </div>
        </div>`;
    }).join('');
}

function openMedicineEditModal(med) {
    editingMedicineId = med ? med.id : null;
    pendingMedicineImage = med ? med.image || null : null;

    document.getElementById('medicineEditTitle').textContent = med ? '编辑药品' : '添加药品';
    document.getElementById('medicineId').value = med ? med.id : '';
    document.getElementById('medicineName').value = med ? med.name : '';
    document.getElementById('medicineExpirationDate').value = med ? med.expirationDate : '';
    document.getElementById('medicineType').value = med ? med.type || '' : '';
    syncMedicineTypeSelectUI(document.getElementById('medicineType').value);
    document.getElementById('medicineProductionDate').value = med ? med.productionDate || '' : '';
    document.getElementById('medicineIndication').value = med ? med.indication || '' : '';
    document.getElementById('medicineDosage').value = med ? med.dosage || '' : '';
    document.getElementById('medicineContraindication').value = med ? med.contraindication || '' : '';
    document.getElementById('medicineManufacturer').value = med ? med.manufacturer || '' : '';
    document.getElementById('medicineNotes').value = med ? med.notes || '' : '';

    const preview = document.getElementById('medicineImagePreview');
    const previewImg = document.getElementById('medicineImagePreviewImg');
    const hint = document.getElementById('medicineImageHint');
    if (pendingMedicineImage) {
        previewImg.src = pendingMedicineImage;
        preview.classList.remove('hidden');
        if (hint) hint.classList.add('hidden');
    } else {
        preview.classList.add('hidden');
        if (hint) hint.classList.remove('hidden');
    }

    switchPage('medicine-edit');
}

function openMedicineDetailModal(med) {
    if (!med) return;
    currentDetailMedicineId = med.id;

    const detailMedicineName = document.getElementById('detailMedicineName');
    if (detailMedicineName) {
        detailMedicineName.innerHTML = `${escapeHtml(med.name || '')} ${renderMedicineTypeIcon(med.type, 'compact')}`;
    }
    document.getElementById('detailExpirationDate').textContent = med.expirationDate || '';

    const days = getMedicineExpiryDays(med);
    const status = getMedicineExpiryStatus(days);
    const expiryBadge = document.getElementById('detailExpiryBadge');
    expiryBadge.textContent = status.label;
    expiryBadge.className = `medicine-expiry-badge ${status.className}`;

    const typeBadge = document.getElementById('detailTypeBadge');
    const typeLabel = getMedicineTypeLabel(med.type);
    if (typeLabel) {
        typeBadge.textContent = typeLabel;
        typeBadge.style.display = 'inline-block';
    } else {
        typeBadge.style.display = 'none';
    }

    const setDetailValue = (elementId, value) => {
        const el = document.getElementById(elementId);
        if (el) el.textContent = value || '';
    };

    setDetailValue('detailProductionDate', med.productionDate);
    setDetailValue('detailIndication', med.indication);
    const dosageValue = med.dosage || med.notes || '';
    setDetailValue('detailDosage', dosageValue);
    setDetailValue('detailContraindication', med.contraindication || '暂无禁忌说明');
    setDetailValue('detailManufacturer', med.manufacturer);
    setDetailValue('detailNotes', med.notes && med.notes !== dosageValue ? med.notes : '');

    const imgEl = document.getElementById('detailMedicineImage');
    const imgSection = document.getElementById('detailImageSection');
    const imgPlaceholder = document.getElementById('detailMedicineImagePlaceholder');
    if (med.image) {
        imgEl.src = med.image;
        imgEl.style.display = 'block';
        if (imgPlaceholder) imgPlaceholder.style.display = 'none';
        imgSection.style.display = 'flex';
    } else {
        imgEl.removeAttribute('src');
        imgEl.style.display = 'none';
        if (imgPlaceholder) {
            imgPlaceholder.innerHTML = `${renderMedicineTypeIcon(med.type)}<span>暂无药品图片</span>`;
            imgPlaceholder.style.display = 'flex';
        }
        imgSection.style.display = 'flex';
    }

    switchPage('medicine-detail');
}

async function handleMedicineFormSubmit(e) {
    e.preventDefault();
    if (submitLocks.medicine) return;
    submitLocks.medicine = true;

    try {
        const name = document.getElementById('medicineName').value.trim();
        const expirationDate = document.getElementById('medicineExpirationDate').value;
        if (!name || !expirationDate) {
            showToast('请填写药品名称和过期日期');
            return;
        }

        const now = new Date().toISOString();
        if (editingMedicineId) {
            const idx = medicines.findIndex(m => m.id === editingMedicineId);
            if (idx !== -1) {
                medicines[idx] = {
                    ...medicines[idx],
                    name,
                    expirationDate,
                    type: document.getElementById('medicineType').value || '',
                    productionDate: document.getElementById('medicineProductionDate').value || '',
                    indication: document.getElementById('medicineIndication').value.trim(),
                    dosage: document.getElementById('medicineDosage').value.trim(),
                    contraindication: document.getElementById('medicineContraindication').value.trim(),
                    manufacturer: document.getElementById('medicineManufacturer').value.trim(),
                    notes: document.getElementById('medicineNotes').value.trim(),
                    image: pendingMedicineImage,
                    updatedAt: now
                };
            }
        } else {
            medicines.push({
                id: 'med_' + Date.now(),
                name,
                expirationDate,
                type: document.getElementById('medicineType').value || '',
                productionDate: document.getElementById('medicineProductionDate').value || '',
                indication: document.getElementById('medicineIndication').value.trim(),
                dosage: document.getElementById('medicineDosage').value.trim(),
                contraindication: document.getElementById('medicineContraindication').value.trim(),
                manufacturer: document.getElementById('medicineManufacturer').value.trim(),
                notes: document.getElementById('medicineNotes').value.trim(),
                image: pendingMedicineImage,
                createdAt: now,
                updatedAt: now
            });
        }

        await persistAppState();
        switchPage('medicine-box');
        renderMedicineList();
        showToast(editingMedicineId ? '药品已更新' : '药品已添加');
        editingMedicineId = null;
        pendingMedicineImage = null;
    } finally {
        submitLocks.medicine = false;
    }
}

async function deleteMedicine(id) {
    if (!confirm('确定要删除这个药品吗？')) return;
    medicines = medicines.filter(m => m.id !== id);
    await persistAppState();
    renderMedicineList();
    showToast('药品已删除');
}

async function handleMedicineImageChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
        pendingMedicineImage = await readAndCompressImage(file);
        const preview = document.getElementById('medicineImagePreview');
        const previewImg = document.getElementById('medicineImagePreviewImg');
        const hint = document.getElementById('medicineImageHint');
        previewImg.src = pendingMedicineImage;
        preview.classList.remove('hidden');
        if (hint) hint.classList.add('hidden');
    } catch (err) {
        showToast('图片处理失败');
    }
    e.target.value = '';
}

function clearPendingMedicineImage() {
    pendingMedicineImage = null;
    const preview = document.getElementById('medicineImagePreview');
    const hint = document.getElementById('medicineImageHint');
    if (preview) preview.classList.add('hidden');
    if (hint) hint.classList.remove('hidden');
}

function toggleMedicineSortOrder() {
    medicineSortOrder = medicineSortOrder === 'asc' ? 'desc' : 'asc';
    renderMedicineList();
}

function setupMedicineEventListeners() {
    const medicineBoxBtn = document.getElementById('medicineBoxBtn');
    if (medicineBoxBtn) medicineBoxBtn.addEventListener('click', openMedicineBoxModal);

    const addMedicineBtn = document.getElementById('addMedicineBtn');
    if (addMedicineBtn) addMedicineBtn.addEventListener('click', () => openMedicineEditModal());

    const addMedicineHeaderBtn = document.getElementById('addMedicineHeaderBtn');
    if (addMedicineHeaderBtn) addMedicineHeaderBtn.addEventListener('click', () => openMedicineEditModal());

    const medicineForm = document.getElementById('medicineForm');
    if (medicineForm) medicineForm.addEventListener('submit', handleMedicineFormSubmit);

    setupMedicineTypeCustomSelect();

    // 药品表单取消按钮（右上角）
    const medicineEditCancelBtn = document.getElementById('medicineEditCancelBtn');
    if (medicineEditCancelBtn) {
        medicineEditCancelBtn.addEventListener('click', () => {
            switchPage('medicine-box');
        });
    }

    const medicineSearchInput = document.getElementById('medicineSearchInput');
    if (medicineSearchInput) {
        let searchTimer;
        medicineSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(renderMedicineList, 300);
        });
    }

    const medicineSortBtn = document.getElementById('medicineSortBtn');
    if (medicineSortBtn) medicineSortBtn.addEventListener('click', toggleMedicineSortOrder);

    const medicineImageUpload = document.getElementById('medicineImageUpload');
    if (medicineImageUpload) medicineImageUpload.addEventListener('change', handleMedicineImageChange);

    const removeMedicineImage = document.getElementById('removeMedicineImage');
    if (removeMedicineImage) removeMedicineImage.addEventListener('click', clearPendingMedicineImage);

    // 点击卡片进入详情页
    const medicineList = document.getElementById('medicineList');
    if (medicineList) {
        medicineList.addEventListener('click', (e) => {
            const card = e.target.closest('.medicine-card');
            if (card) {
                const med = medicines.find(m => m.id === card.dataset.id);
                if (med) openMedicineDetailModal(med);
            }
        });
    }

    // 详情页编辑按钮
    const detailEditBtn = document.getElementById('medicineDetailEditBtn');
    if (detailEditBtn) {
        detailEditBtn.addEventListener('click', () => {
            if (currentDetailMedicineId) {
                const med = medicines.find(m => m.id === currentDetailMedicineId);
                if (med) openMedicineEditModal(med);
            }
        });
    }

    // 详情页删除按钮
    const detailDeleteBtn = document.getElementById('medicineDetailDeleteBtn');
    if (detailDeleteBtn) {
        detailDeleteBtn.addEventListener('click', () => {
            if (currentDetailMedicineId && confirm('确定要删除这个药品吗？')) {
                deleteMedicine(currentDetailMedicineId);
                switchPage('medicine-box');
            }
        });
    }
}

// ==================== 设置提醒相关事件监听 ====================
function setupReminderListeners() {
    const reminderModal = document.getElementById('reminderModal');
    if (!reminderModal) return;

    // 标签切换
    reminderModal.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            renderReminderTabs(tab);
        });
    });
    document.getElementById('reminderHeaderAddBtn')?.addEventListener('click', () => openReminderFormPage());

    // 提醒表单提交
    document.getElementById('reminderForm').addEventListener('submit', handleReminderSubmit);
    document.getElementById('reminderImageUpload').addEventListener('change', handleReminderImageChange);
    document.getElementById('removeReminderImage').addEventListener('click', clearPendingReminderImage);
    document.getElementById('snoozeReminderBtn').addEventListener('click', snoozeActiveReminder);
    document.getElementById('completeReminderBtn').addEventListener('click', completeActiveReminder);
    document.getElementById('dismissAlertBtn').addEventListener('click', closeReminderAlertModal);

    // 全部提醒搜索和筛选
    const searchInput = document.getElementById('reminderSearchInput');
    const typeFilter = document.getElementById('reminderTypeFilter');
    const statusFilter = document.getElementById('reminderStatusFilter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(renderAllReminders, 300));
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', renderAllReminders);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', renderAllReminders);
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function setupProfileListeners() {
    document.getElementById('profileForm').addEventListener('submit', handleProfileSubmit);
    document.getElementById('familyMemberForm')?.addEventListener('submit', handleFamilyMemberSubmit);
    document.getElementById('addFamilyMemberBtn')?.addEventListener('click', () => openFamilyMemberForm());
    document.getElementById('profileAvatarUpload')?.addEventListener('change', handleProfileAvatarChange);
    document.getElementById('familyMemberAvatarUpload')?.addEventListener('change', handleFamilyMemberAvatarChange);
    document.getElementById('profileAvatarUploadBtn')?.addEventListener('click', () => {
        document.getElementById('profileAvatarUpload')?.click();
    });
    document.getElementById('profileAvatarActionBtn')?.addEventListener('click', () => {
        document.getElementById('profileAvatarUpload')?.click();
    });
    document.getElementById('familyMemberAvatarUploadBtn')?.addEventListener('click', () => {
        document.getElementById('familyMemberAvatarUpload')?.click();
    });
    document.getElementById('profileAvatarRemoveBtn')?.addEventListener('click', clearProfileAvatar);
    document.getElementById('removeFamilyMemberAvatar')?.addEventListener('click', clearFamilyMemberAvatar);
    document.getElementById('profileName')?.addEventListener('input', () => updateProfileAvatarPreview('profile', pendingProfileAvatar));
    document.getElementById('familyMemberName')?.addEventListener('input', () => updateProfileAvatarPreview('familyMember', pendingFamilyMemberAvatar));
    ['profileHeight', 'profileWeight'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => updateBmiDisplay('profile'));
    });
    ['familyMemberHeight', 'familyMemberWeight'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => updateBmiDisplay('familyMember'));
    });
    profileFieldNames.forEach(field => {
        document.getElementById(`profile${field}`)?.addEventListener('input', () => updateCompletenessIndicator('profile'));
        document.getElementById(`profile${field}`)?.addEventListener('change', () => updateCompletenessIndicator('profile'));
        document.getElementById(`familyMember${field}`)?.addEventListener('input', () => updateCompletenessIndicator('familyMember'));
        document.getElementById(`familyMember${field}`)?.addEventListener('change', () => updateCompletenessIndicator('familyMember'));
    });
    document.getElementById('familyMembersList')?.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-family-action]');
        if (!actionBtn) return;
        const memberId = actionBtn.dataset.memberId;
        if (actionBtn.dataset.familyAction === 'edit') {
            openFamilyMemberForm(memberId);
        } else if (actionBtn.dataset.familyAction === 'delete') {
            deleteFamilyMember(memberId);
        }
    });
}

// 渲染提醒标签
function renderReminderTabs(tab) {
    currentReminderTab = tab;
    const reminderModal = document.getElementById('reminderModal');
    if (!reminderModal) return;

    // 更新标签按钮状态
    reminderModal.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });

    // 隐藏所有标签内容
    reminderModal.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // 显示选中的标签内容
    const activeContent = document.getElementById(`tab-${tab}`);
    if (activeContent) {
        activeContent.classList.add('active');
    }

    // 渲染对应的内容
    switch(tab) {
        case 'today':
            renderTodayReminders();
            break;
        case 'all':
            renderAllReminders();
            break;
    }
}

// 设置默认提醒日期
function setDefaultReminderDate() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    document.getElementById('reminderDate').value = tomorrow.toISOString().split('T')[0];
    document.getElementById('reminderTime').value = '09:00';
}

function populateReminderForm(reminder = null) {
    const form = document.getElementById('reminderForm');
    const formTitle = document.getElementById('reminderFormModalTitle');
    form.reset();
    resetReminderImageInputs();
    clearPendingReminderImage();

    if (reminder) {
        editingReminderId = reminder.id;
        if (formTitle) formTitle.textContent = '编辑提醒';
        document.getElementById('reminderId').value = reminder.id;
        document.getElementById('reminderTitle').value = reminder.title;
        document.getElementById('reminderType').value = reminder.type;
        document.getElementById('reminderDate').value = reminder.date;
        document.getElementById('reminderTime').value = reminder.time;
        document.getElementById('reminderRepeat').value = normalizeReminderRepeat(reminder.repeat);
        document.getElementById('reminderNotes').value = reminder.notes || '';
        document.getElementById('reminderSubmitBtn').textContent = '保存提醒';
        pendingReminderImage = reminder.image || null;
    } else {
        editingReminderId = null;
        if (formTitle) formTitle.textContent = '添加提醒';
        document.getElementById('reminderId').value = '';
        document.getElementById('reminderSubmitBtn').textContent = '添加提醒';
        pendingReminderImage = null;
        setDefaultReminderDate();
        document.getElementById('reminderRepeat').value = 'none';
    }

    updateReminderImagePreview();
}

// 渲染今日提醒
function renderTodayReminders() {
    const todayReminders = reminders.filter(r => isReminderForToday(r));

    const container = document.getElementById('todayReminderList');
    container.innerHTML = todayReminders.length === 0
        ? `<div class="empty-state-block">
            <div class="empty-icon">🔔</div>
            <p class="empty-title">今天没有提醒</p>
            <p class="empty-subtitle">添加服药、运动等定时提醒</p>
            <button class="empty-cta" onclick="document.getElementById('reminderHeaderAddBtn')?.click()">+ 添加提醒</button>
           </div>`
        : todayReminders.map(r => renderReminderItem(r)).join('');
}

// 渲染所有提醒
function renderAllReminders() {
    const allReminders = getFilteredReminderHistory().sort((a, b) => {
        return new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time);
    });

    const container = document.getElementById('allReminderList');
    container.innerHTML = allReminders.length === 0
        ? `<div class="reminder-empty-state">
                <div class="reminder-empty-state-icon">📋</div>
                <div class="reminder-empty-state-text">没有找到符合条件的提醒</div>
                <div class="reminder-empty-state-hint">请尝试调整筛选条件或搜索关键词</div>
           </div>`
        : allReminders.map(r => renderReminderHistoryItem(r)).join('');
}

// 获取筛选后的提醒历史
function getFilteredReminderHistory() {
    const searchTerm = document.getElementById('reminderSearchInput')?.value?.toLowerCase().trim() || '';
    const typeFilter = document.getElementById('reminderTypeFilter')?.value || 'all';
    const statusFilter = document.getElementById('reminderStatusFilter')?.value || 'all';

    let filtered = [...reminders].sort((a, b) => {
        // 按时间倒序排列，最新的在前
        return new Date(b.date + 'T' + b.time) - new Date(a.date + 'T' + a.time);
    });

    // 按状态筛选
    if (statusFilter === 'completed') {
        filtered = filtered.filter(r => r.completed);
    } else if (statusFilter === 'pending') {
        filtered = filtered.filter(r => !r.completed);
    }

    // 按类型筛选
    if (typeFilter !== 'all') {
        filtered = filtered.filter(r => r.type === typeFilter);
    }

    // 按关键词搜索
    if (searchTerm) {
        filtered = filtered.filter(r => {
            const titleMatch = r.title?.toLowerCase().includes(searchTerm) || false;
            const notesMatch = r.notes?.toLowerCase().includes(searchTerm) || false;
            return titleMatch || notesMatch;
        });
    }

    return filtered;
}

function formatReminderFullDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${year}-${month}-${day} ${weekDays[date.getDay()]}`;
}

// 渲染提醒历史项（包含操作历史）
function renderReminderHistoryItem(reminder) {
    const date = new Date(reminder.date + 'T' + reminder.time);
    const dateStr = formatReminderFullDate(date);
    const timeStr = reminder.time;
    const isCompleted = reminder.completed;
    const completedAt = reminder.completedAt ? new Date(reminder.completedAt) : null;
    const completedAtStr = completedAt ? completedAt.toLocaleString('zh-CN') : '';
    const repeatLabel = getReminderRepeatLabel(reminder.repeat);

    // 获取类型标签
    const typeLabels = {
        meal: '🍽️ 用餐',
        medication: '💊 用药',
        exercise: '🏃 运动',
        sleep: '😴 睡眠',
        other: '📌 其他'
    };

    // 构建操作历史HTML
    let historyHtml = '';
    if (reminder.history && reminder.history.length > 0) {
        const actionLabels = {
            completed: '已完成',
            reopened: '恢复未完成',
            snoozed: '延后提醒'
        };

        historyHtml = `
            <div class="reminder-history-actions-list">
                <div class="reminder-history-actions-list-title">操作记录</div>
                ${reminder.history.map(h => `
                    <div class="reminder-history-action-item">
                        <span>${actionLabels[h.action] || h.action}</span>
                        ${h.minutes ? `<span>(${h.minutes}分钟)</span>` : ''}
                        <span class="action-time">${new Date(h.at).toLocaleString('zh-CN')}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class="reminder-detail-item ${isCompleted ? 'completed' : ''}">
            <div class="reminder-detail-header">
                <div>
                    <span class="reminder-detail-time">${timeStr}</span>
                    <span class="reminder-detail-date">${dateStr}</span>
                    ${repeatLabel ? `<span style="margin-left:8px;font-size:0.8rem;">🔄 ${repeatLabel}</span>` : ''}
                </div>
                <div>
                    ${typeLabels[reminder.type] || typeIcons[reminder.type]}
                </div>
            </div>
            <div class="reminder-detail-title">${escapeHtml(reminder.title)}</div>
            ${reminder.image ? `
                <div class="reminder-detail-image-wrap">
                    <img class="reminder-detail-image" src="${reminder.image}" alt="${escapeHtml(reminder.title)}">
                </div>
            ` : ''}
            ${reminder.notes ? `<div class="reminder-detail-notes">${escapeHtml(reminder.notes)}</div>` : ''}

            <div class="reminder-history-meta">
                ${isCompleted ? `
                    <div class="reminder-history-meta-item">
                        <span>✓</span>
                        <span>完成于 ${completedAtStr}</span>
                    </div>
                ` : `
                    <div class="reminder-history-meta-item">
                        <span>⏳</span>
                        <span>未完成</span>
                    </div>
                `}
                ${reminder.snoozeCount ? `
                    <div class="reminder-history-meta-item">
                        <span>⏰</span>
                        <span>延后 ${reminder.snoozeCount} 次</span>
                    </div>
                ` : ''}
            </div>

            ${historyHtml}

            <div class="reminder-detail-actions">
                ${!isCompleted ? `<button class="btn-action btn-edit" onclick="editReminder('${reminder.id}')">编辑</button>` : ''}
                <button class="btn-action btn-complete" onclick="completeReminder('${reminder.id}')">
                    ${isCompleted ? '恢复未完成' : '标记完成'}
                </button>
                <button class="btn-action btn-delete" onclick="deleteReminder('${reminder.id}')">删除</button>
            </div>
        </div>
    `;
}

// 渲染单个提醒项
function renderReminderItem(reminder, showDate = false) {
    const date = new Date(reminder.date + 'T' + reminder.time);
    const dateStr = formatReminderFullDate(date);
    const timeStr = reminder.time;
    const isCompleted = reminder.completed;
    const isPast = date < new Date();
    const snoozeInfo = reminder.snoozeCount ? `已延后 ${reminder.snoozeCount} 次` : '';
    const repeatLabel = getReminderRepeatLabel(reminder.repeat);

    return `
        <div class="reminder-detail-item ${isCompleted ? 'completed' : ''} ${isPast && !isCompleted ? 'overdue' : ''}">
            <div class="reminder-detail-header" style="display:flex;align-items:flex-start;gap:10px;">
                <div style="flex:1;min-width:0;">
                    <div>
                        <span class="reminder-detail-time">${timeStr}</span>
                        <span class="reminder-detail-date">${dateStr}</span>
                        ${repeatLabel ? `<span style="margin-left:8px;font-size:0.8rem;">🔄 ${repeatLabel}</span>` : ''}
                    </div>
                    <div class="reminder-detail-title">${escapeHtml(reminder.title)}</div>
                    ${(reminder.notes || snoozeInfo || getReminderRepeatLabel(reminder.repeat)) ? `<div class="reminder-detail-notes">${escapeHtml([reminder.notes, snoozeInfo, getReminderRepeatLabel(reminder.repeat)].filter(Boolean).join(' · '))}</div>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
                    <span style="font-size:20px;">${typeIcons[reminder.type] || ''}</span>
                    ${reminder.image ? `<img src="${reminder.image}" alt="" style="width:56px;height:56px;border-radius:8px;object-fit:cover;">` : ''}
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
}

// 处理提醒表单提交
async function handleReminderSubmit(e) {
    e.preventDefault();
    if (submitLocks.reminder) return;

    const title = document.getElementById('reminderTitle').value.trim();
    const date = document.getElementById('reminderDate').value;
    const time = document.getElementById('reminderTime').value;
    const type = document.getElementById('reminderType').value;
    const repeat = normalizeReminderRepeat(document.getElementById('reminderRepeat').value);
    const notes = document.getElementById('reminderNotes').value.trim();

    if (!title || !date || !time) {
        showToast('请完整填写提醒内容、日期和时间');
        return;
    }

    if (!editingReminderId && reminders.some(item => item.title === title && item.date === date && item.time === time && item.type === type && !item.completed)) {
        showToast('检测到重复提醒，请勿重复提交');
        return;
    }

    submitLocks.reminder = true;
    const wasEditing = Boolean(editingReminderId);
    const existingReminder = editingReminderId ? reminders.find(item => item.id === editingReminderId) : null;

    const reminder = {
        id: editingReminderId || Date.now().toString(),
        title,
        type,
        date,
        time,
        repeat,
        notes,
        image: pendingReminderImage,
        completed: existingReminder?.completed || false,
        completedAt: existingReminder?.completedAt || null,
        snoozeUntil: existingReminder?.snoozeUntil || null,
        snoozeCount: existingReminder?.snoozeCount || 0,
        history: existingReminder?.history || [],
        createdAt: existingReminder?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        if (isBackendReminderModeEnabled()) {
            const savedReminder = await cloudSyncRequest(
                editingReminderId ? `/api/reminders/${encodeURIComponent(editingReminderId)}` : '/api/reminders',
                {
                    method: editingReminderId ? 'PUT' : 'POST',
                    body: JSON.stringify(toBackendReminderPayload(reminder))
                }
            );
            const normalized = normalizeBackendReminderRecord(savedReminder);
            const currentList = [...reminders];
            const targetIndex = currentList.findIndex(item => item.id === normalized.id);
            if (targetIndex > -1) {
                currentList[targetIndex] = normalized;
            } else {
                currentList.push(normalized);
            }
            reminders = normalizeReminders(currentList);
            await persistAppState({ skipAutoCloudSync: true });
            await syncRemindersToServiceWorker();
            await updateStorageStatus();
        } else {
            if (editingReminderId) {
                reminders = reminders.map(item => item.id === editingReminderId ? reminder : item);
            } else {
                reminders.push(reminder);
            }
            reminders = normalizeReminders(reminders);
            await saveReminders();
        }
    } catch (error) {
        console.error(error);
        showToast(isBackendReminderModeEnabled() ? '保存失败，请检查后端连接或登录状态' : '保存失败：图片过大或本地存储空间不足');
        submitLocks.reminder = false;
        return;
    }

    populateReminderForm();
    requestNotificationPermission();
    showToast(wasEditing ? '提醒已更新！' : '提醒已添加！');
    submitLocks.reminder = false;
    switchPage('reminders');
    renderReminderTabs('all');
    updateRemindersDisplay();
}

async function handleReminderImageChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
        pendingReminderImage = await readAndCompressImage(file);
        updateReminderImagePreview();
        showToast('提醒图片已添加');
    } catch (error) {
        console.error(error);
        showToast('图片处理失败，请重试');
    } finally {
        resetReminderImageInputs();
    }
}

function clearPendingReminderImage() {
    pendingReminderImage = null;
    updateReminderImagePreview();
    resetReminderImageInputs();
}

function updateReminderImagePreview() {
    const preview = document.getElementById('reminderImagePreview');
    const previewImg = document.getElementById('reminderImagePreviewImg');
    const hint = document.getElementById('reminderImageHint');

    if (!pendingReminderImage) {
        preview.classList.add('hidden');
        previewImg.removeAttribute('src');
        hint.style.display = 'block';
        return;
    }

    preview.classList.remove('hidden');
    previewImg.src = pendingReminderImage;
    hint.style.display = 'none';
}

function resetReminderImageInputs() {
    document.getElementById('reminderImageUpload').value = '';
}

// 完成提醒
window.completeReminder = function(id) {
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
        if (isBackendReminderModeEnabled()) {
            const actionPath = reminder.completed ? 'reopen' : 'complete';
            const createNextPromise = (!reminder.completed && isRepeatingReminder(reminder.repeat))
                ? cloudSyncRequest('/api/reminders', {
                    method: 'POST',
                    body: JSON.stringify(toBackendReminderPayload({
                        ...reminder,
                        date: getNextReminderDate(reminder.date, reminder.repeat),
                        completed: false,
                        completedAt: null,
                        snoozeUntil: null,
                        snoozeCount: 0
                    }))
                }).catch(error => {
                    console.error(error);
                    return null;
                })
                : Promise.resolve(null);

            cloudSyncRequest(`/api/reminders/${encodeURIComponent(id)}/${actionPath}`, {
                method: 'POST'
            })
                .then(async updatedReminder => {
                    const normalized = normalizeBackendReminderRecord(updatedReminder);
                    reminders = normalizeReminders(reminders.map(item => item.id === id ? normalized : item));
                    const nextReminder = await createNextPromise;
                    if (nextReminder) {
                        reminders.push(normalizeBackendReminderRecord(nextReminder));
                        reminders = normalizeReminders(reminders);
                    }
                    await persistAppState({ skipAutoCloudSync: true });
                    await syncRemindersToServiceWorker();
                    await updateStorageStatus();
                    renderReminderTabs('today');
                    updateRemindersDisplay();
                    if (activeReminderAlertId === id) {
                        closeReminderAlertModal();
                    }
                    showToast(normalized.completed ? '提醒已完成！' : '提醒已恢复');
                })
                .catch(() => showToast('操作失败，请检查后端连接'));
            return;
        }

        reminder.completed = !reminder.completed;
        reminder.completedAt = reminder.completed ? new Date().toISOString() : null;
        reminder.snoozeUntil = reminder.completed ? null : reminder.snoozeUntil;
        reminder.history = reminder.history || [];
        reminder.history.push({
            action: reminder.completed ? 'completed' : 'reopened',
            at: new Date().toISOString()
        });
        reminder.updatedAt = new Date().toISOString();

        // 如果是重复提醒且已完成，创建下一次提醒
        if (isRepeatingReminder(reminder.repeat) && reminder.completed) {
            const nextDate = getNextReminderDate(reminder.date, reminder.repeat);

            const newReminder = {
                ...reminder,
                id: Date.now().toString(),
                date: nextDate,
                snoozeUntil: null,
                snoozeCount: 0,
                history: [],
                completed: false,
                completedAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            reminders.push(newReminder);
        }

        saveReminders().then(() => {
            renderReminderTabs('today');
            updateRemindersDisplay();
            if (activeReminderAlertId === id) {
                closeReminderAlertModal();
            }
            showToast(reminder.completed ? '提醒已完成！' : '提醒已恢复');
        });
    }
}

// 删除提醒
window.deleteReminder = function(id) {
    if (confirm('确定要删除这个提醒吗？')) {
        if (isBackendReminderModeEnabled()) {
            cloudSyncRequest(`/api/reminders/${encodeURIComponent(id)}`, {
                method: 'DELETE'
            }).then(async () => {
                reminders = reminders.filter(r => r.id !== id);
                await persistAppState({ skipAutoCloudSync: true });
                await syncRemindersToServiceWorker();
                await updateStorageStatus();
                renderReminderTabs('today');
                updateRemindersDisplay();
                showToast('提醒已删除');
            }).catch(() => showToast('删除失败，请检查后端连接'));
            return;
        }

        reminders = reminders.filter(r => r.id !== id);
        saveReminders().then(() => {
            renderReminderTabs('today');
            updateRemindersDisplay();
            showToast('提醒已删除');
        });
    }
}

// 更新主页提醒显示
function updateRemindersDisplay() {
    const selectedDateKey = getDateKey(currentDate);
    const todayReminders = reminders.filter(r => {
        if (r.completed) return false;
        const reminderDateKey = r.date;
        // 精确匹配选中日期
        if (reminderDateKey === selectedDateKey) return true;
        // 如果提醒日期在选中日期之后，不显示
        if (reminderDateKey > selectedDateKey) return false;
        // 非重复提醒，不显示
        if (!isRepeatingReminder(r.repeat)) return false;
        // 重复提醒计算是否在选中日期显示
        const repeat = normalizeReminderRepeat(r.repeat);
        const originDate = new Date(r.date + 'T00:00:00');
        const selectedDate = new Date(selectedDateKey + 'T00:00:00');
        const daysDiff = Math.round((selectedDate - originDate) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 0) return false;
        switch (repeat) {
            case 'daily': return true;
            case 'weekly': return daysDiff % 7 === 0;
            case 'biweekly': return daysDiff % 14 === 0;
            case 'monthly': return originDate.getDate() === selectedDate.getDate();
            default: return false;
        }
    }).sort((a, b) => a.time.localeCompare(b.time));

    const container = document.getElementById('todayReminders');
    const emptyState = document.getElementById('todayRemindersEmptyState');

    if (todayReminders.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    } else {
        if (emptyState) emptyState.style.display = 'none';
        container.innerHTML = todayReminders.slice(0, 3).map(r => `
            <div class="reminder-item" onclick="openReminderManagerFor('${r.id}')">
                ${r.image ? `
                    <div class="reminder-thumb-wrap">
                        <img class="reminder-thumb" src="${r.image}" alt="${escapeHtml(r.title)}">
                    </div>
                ` : `<span class="reminder-icon">${typeIcons[r.type]}</span>`}
                <div class="reminder-content">
                    <div class="reminder-title">${escapeHtml(r.title)}</div>
                    <div class="reminder-type">${r.time}${getReminderRepeatLabel(r.repeat) ? ` • ${getReminderRepeatLabel(r.repeat)}` : ''}</div>
                </div>
                <span class="reminder-time">${r.time}</span>
            </div>
        `).join('');
    }

    updateDailySummary();
}

function updateDailySummary() {
    const input = document.getElementById('dailyNoteInput');
    const meta = document.getElementById('dailyNoteMeta');
    if (!input || !meta) {
        return;
    }

    const currentDateKey = getDateKey(currentDate);
    const noteRecord = allDailyNotesData[currentDateKey];
    const content = typeof noteRecord === 'string' ? noteRecord : (noteRecord?.content || '');
    const updatedAt = typeof noteRecord === 'string' ? '' : (noteRecord?.updatedAt || '');
    input.value = content;
    input.dataset.savedValue = content;
    meta.textContent = updatedAt ? `已保存：${new Date(updatedAt).toLocaleString('zh-CN')}` : '尚未保存';
}

function toggleDailyNoteFullscreen() {
    const card = document.getElementById('dailySummaryCard');
    const btn = document.getElementById('dailyNoteFullscreenBtn');
    if (!card || !btn) return;

    card.classList.toggle('fullscreen');
    const isFullscreen = card.classList.contains('fullscreen');

    // 按 ESC 退出全屏
    if (isFullscreen) {
        btn.textContent = '⛶';
        btn.title = '退出全屏';

        const handleEscape = (e) => {
            if (e.key === 'Escape' && card.classList.contains('fullscreen')) {
                toggleDailyNoteFullscreen();
            }
        };
        document.addEventListener('keydown', handleEscape);

        // 保存引用以便清理
        card._escapeHandler = handleEscape;
    } else {
        btn.textContent = '⛶';
        btn.title = '全屏编辑';

        if (card._escapeHandler) {
            document.removeEventListener('keydown', card._escapeHandler);
            delete card._escapeHandler;
        }
    }
}

async function saveDailyNote() {
    const input = document.getElementById('dailyNoteInput');
    const meta = document.getElementById('dailyNoteMeta');
    if (!input || !meta) return;

    const dateKey = getDateKey(currentDate);
    const content = input.value.trim();

    if (!content) {
        delete allDailyNotesData[dateKey];
    } else {
        allDailyNotesData[dateKey] = {
            content,
            updatedAt: new Date().toISOString()
        };
    }

    try {
        if (isBackendDailyNoteModeEnabled()) {
            if (!content) {
                await cloudSyncRequest(`/api/daily-notes/${encodeURIComponent(dateKey)}`, {
                    method: 'DELETE'
                }).catch(error => {
                    if (!String(error.message || '').includes('SYNC_HTTP_404')) {
                        throw error;
                    }
                });
            } else {
                const response = await cloudSyncRequest(`/api/daily-notes/${encodeURIComponent(dateKey)}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        noteDate: dateKey,
                        content
                    })
                });
                allDailyNotesData[dateKey] = {
                    content: response?.content || content,
                    updatedAt: response?.updatedAt || new Date().toISOString()
                };
            }
            await persistAppState({ skipAutoCloudSync: true });
            await updateStorageStatus();
        } else {
            await persistAppState();
            await updateStorageStatus();
        }
        updateDailySummary();
        showToast('今日状态记录已保存');
    } catch (error) {
        console.error(error);
        showToast(isBackendDailyNoteModeEnabled() ? '保存失败，请检查后端连接或登录状态' : '保存失败：本地存储空间不足');
    }
}

// 检查提醒（每分钟调用）
function checkReminders() {
    const now = new Date();
    const today = getDateKey(now);

    // 午夜跨日：重置已触发集合，让新一天的提醒可以正常弹出
    if (reminderCheckerDay && reminderCheckerDay !== today) {
        triggeredTodayIds.clear();
    }
    reminderCheckerDay = today;

    const dueReminder = reminders.find(reminder => shouldTriggerReminder(reminder, now));
    if (!dueReminder) return;
    if (activeReminderAlertId === dueReminder.id) return;

    // 标记已触发（防止 dismiss 后每分钟重弹）
    triggeredTodayIds.add(dueReminder.id);

    // 贪睡时间到期后清除 snoozeUntil，避免页面刷新后再次触发
    if (dueReminder.snoozeUntil) {
        dueReminder.snoozeUntil = null;
        saveReminders().catch(() => {});
    }

    showNotification(dueReminder);
    openReminderAlertModal(dueReminder);
}

// 显示通知
function showNotification(reminder) {
    if (isAndroidReminderBridgeAvailable()) {
        return;
    }

    if ('Notification' in window && Notification.permission === 'granted' && serviceWorkerRegistration?.showNotification) {
        serviceWorkerRegistration.showNotification(`${typeIcons[reminder.type]} ${reminder.title}`, {
            body: reminder.notes || reminder.time,
            icon: reminder.image || './icons/app-icon.svg',
            image: reminder.image || undefined,
            tag: reminder.id,
            requireInteraction: true,
            data: { reminderId: reminder.id }
        });
    } else {
        // 浏览器不支持通知或权限未授予，显示Toast
        showToast(`🔔 ${reminder.title} - ${reminder.time}`);
    }
}

// 判断提醒是否应该在今天显示（含重复提醒的跨天逻辑）
function isReminderForToday(reminder) {
    if (!reminder || reminder.completed) return false;
    const today = getDateKey(new Date());
    const reminderDateKey = reminder.date;
    if (reminderDateKey === today) return true;
    if (reminderDateKey > today) return false;
    if (!isRepeatingReminder(reminder.repeat)) return false;
    const repeat = normalizeReminderRepeat(reminder.repeat);
    const originDate = new Date(reminder.date + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    const daysDiff = Math.round((todayDate - originDate) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 0) return false;
    switch (repeat) {
        case 'daily': return true;
        case 'weekly': return daysDiff % 7 === 0;
        case 'biweekly': return daysDiff % 14 === 0;
        case 'monthly': return originDate.getDate() === todayDate.getDate();
        default: return false;
    }
}

function shouldTriggerReminder(reminder, now) {
    if (!reminder || reminder.completed) return false;
    if (!isReminderForToday(reminder)) return false;
    const today = getDateKey(now);

    // 贪睡优先：贪睡时间到了就触发（不受 triggeredTodayIds 限制）
    if (reminder.snoozeUntil) {
        const snoozeTime = new Date(reminder.snoozeUntil);
        return getDateKey(snoozeTime) === today && snoozeTime <= now;
    }

    // 本 session 内已触发过（用户关闭弹窗后不再重复弹出）
    if (triggeredTodayIds.has(reminder.id)) return false;

    const triggerTime = new Date(`${today}T${reminder.time}`);
    return triggerTime <= now;
}

function getReminderTriggerTime(reminder) {
    if (reminder.snoozeUntil) {
        return new Date(reminder.snoozeUntil);
    }

    return new Date(`${reminder.date}T${reminder.time}`);
}

function openReminderAlertModal(reminder) {
    activeReminderAlertId = reminder.id;

    const badge = document.getElementById('alertReminderBadge');
    const title = document.getElementById('alertReminderTitle');
    const meta = document.getElementById('alertReminderMeta');
    const notes = document.getElementById('alertReminderNotes');
    const imageWrap = document.getElementById('alertReminderImageWrap');
    const image = document.getElementById('alertReminderImage');

    badge.textContent = `${typeIcons[reminder.type]} ${typeLabels[reminder.type] || '提醒'}`;
    title.textContent = reminder.title;
    meta.textContent = `${reminder.time}${getReminderRepeatLabel(reminder.repeat) ? ` · ${getReminderRepeatLabel(reminder.repeat)}` : ''}`;
    notes.textContent = reminder.notes || '请及时处理这条提醒。';

    if (reminder.image) {
        image.src = reminder.image;
        imageWrap.classList.remove('hidden');
    } else {
        image.removeAttribute('src');
        imageWrap.classList.add('hidden');
    }

    document.getElementById('snoozeMinutes').value = '10';
    document.getElementById('customSnoozeMinutes').value = '';
    toggleCustomSnoozeField();
    updateSnoozeMeta(reminder);
    document.getElementById('reminderAlertModal').style.display = 'block';
}

function closeReminderAlertModal() {
    activeReminderAlertId = null;
    document.getElementById('reminderAlertModal').style.display = 'none';
}

function closeModal(modal) {
    if (!modal) return;

    // 如果关闭的是统计模态框，销毁图表
    if (modal.id === 'statsModal') {
        destroyAllCharts();
    }

    if (modal.id === 'reminderAlertModal') {
        closeReminderAlertModal();
        return;
    }

    if (modal.id === 'recordsModal' && currentPage === 'records') {
        switchPage('home');
        return;
    }

    if (modal.id === 'reminderModal' && currentPage === 'reminders') {
        switchPage('home');
        return;
    }

    if (modal.id === 'reminderFormModal' && currentPage === 'reminder-add') {
        switchPage('reminders');
        return;
    }

    if (modal.id === 'myModal' && currentPage === 'my') {
        switchPage('home');
        return;
    }

    if ((modal.id === 'exportModal' && currentPage === 'export')
        || (modal.id === 'cloudSyncModal' && currentPage === 'cloud-sync')
        || (modal.id === 'profileModal' && currentPage === 'profile')
        || (modal.id === 'familyMembersModal' && currentPage === 'family-members')
        || (modal.id === 'familyMemberFormModal' && currentPage === 'family-member-form')
        || (modal.id === 'medicineBoxModal' && currentPage === 'medicine-box')) {
        switchPage('my');
        return;
    }

    if ((modal.id === 'activityModal' && currentPage === 'activity-form')
        || (modal.id === 'healthModal' && currentPage === 'health-form')
        || (modal.id === 'symptomModal' && currentPage === 'symptom-form')) {
        switchPage('records');
        return;
    }

    modal.style.display = 'none';
}

function snoozeActiveReminder() {
    if (!activeReminderAlertId) return;

    const reminder = reminders.find(r => r.id === activeReminderAlertId);
    if (!reminder) return;

    const minutes = getSelectedSnoozeMinutes();
    if (!minutes) {
        showToast('请输入有效的延后分钟数');
        return;
    }

    if ((reminder.snoozeCount || 0) >= 3) {
        showToast('该提醒最多只能延后 3 次');
        return;
    }

    if (isBackendReminderModeEnabled()) {
        cloudSyncRequest(`/api/reminders/${encodeURIComponent(reminder.id)}/snooze`, {
            method: 'POST',
            body: JSON.stringify({ minutes })
        }).then(async updatedReminder => {
            const normalized = normalizeBackendReminderRecord(updatedReminder);
            reminders = normalizeReminders(reminders.map(item => item.id === normalized.id ? normalized : item));
            await persistAppState({ skipAutoCloudSync: true });
            await syncRemindersToServiceWorker();
            await updateStorageStatus();
            updateRemindersDisplay();
            renderReminderTabs('today');
            closeReminderAlertModal();
            showToast(`提醒已延后 ${minutes} 分钟`);
        }).catch(() => showToast('延后失败，请检查后端连接'));
        return;
    }

    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + minutes);
    reminder.snoozeUntil = snoozeUntil.toISOString();
    reminder.snoozeCount = (reminder.snoozeCount || 0) + 1;
    reminder.history = reminder.history || [];
    reminder.history.push({
        action: 'snoozed',
        at: new Date().toISOString(),
        minutes
    });
    reminder.updatedAt = new Date().toISOString();

    saveReminders().then(() => {
        updateRemindersDisplay();
        renderReminderTabs('today');
        closeReminderAlertModal();
        showToast(`提醒已延后 ${minutes} 分钟`);
    });
}

function completeActiveReminder() {
    if (!activeReminderAlertId) return;
    const reminderId = activeReminderAlertId;
    closeReminderAlertModal();
    window.completeReminder(reminderId);
}

function getCloudSyncConfig() {
    const config = metadata?.cloudSync || {};
    return {
        endpoint: config.endpoint || 'http://170.106.101.55:8081',
        apiKey: config.apiKey || '',
        account: config.account || '',
        user: config.user || null,
        autoSync: Boolean(config.autoSync),
        lastSyncedAt: config.lastSyncedAt || '',
        pendingUpload: Boolean(config.pendingUpload),
        pendingUploadSince: config.pendingUploadSince || '',
        lastSyncError: config.lastSyncError || '',
        retryCount: Number.isFinite(config.retryCount) ? config.retryCount : 0
    };
}

function isCloudSyncAuthenticated(config = getCloudSyncConfig()) {
    return Boolean(config.endpoint && config.apiKey);
}

function updateCloudSyncActionState(config = getCloudSyncConfig()) {
    const pushBtn = document.getElementById('cloudPushBtn');
    const pullBtn = document.getElementById('cloudPullBtn');
    const logoutBtn = document.getElementById('cloudAuthLogoutBtn');
    const loginSection = document.getElementById('cloudAuthLoginSection');
    const optionsSection = document.getElementById('cloudSyncOptionsSection');
    const optionsContent = document.getElementById('cloudSyncOptionsContent');
    const isReady = isCloudSyncAuthenticated(config);

    if (pushBtn) pushBtn.disabled = !isReady;
    if (pullBtn) pullBtn.disabled = !isReady;
    if (logoutBtn) logoutBtn.classList.toggle('hidden', !config.apiKey);
    if (loginSection) loginSection.classList.toggle('hidden', isReady);
    if (optionsSection) optionsSection.classList.toggle('hidden', !isReady);
    if (optionsContent) optionsContent.classList.toggle('hidden', !isReady);
}

function updateCloudSyncStatusSummary(config = getCloudSyncConfig()) {
    if (!config.endpoint) {
        setCloudSyncState('idle', '未配置同步地址');
        setCloudSyncStatus('请先填写同步服务地址并登录后端账号。');
        return;
    }
    if (!isCloudSyncAuthenticated(config)) {
        setCloudSyncState('idle', '等待登录后启用');
        setCloudSyncStatus('登录后可同步。');
        return;
    }
    if (config.pendingUpload) {
        if (config.lastSyncError) {
            setCloudSyncState('error', '保留未同步改动');
            setCloudSyncStatus(`本地有未同步改动，最近上传失败：${config.lastSyncError}`, true);
            return;
        }
        setCloudSyncState('pending', config.pendingUploadSince ? `变更开始于 ${new Date(config.pendingUploadSince).toLocaleString('zh-CN')}` : '检测到本地改动');
        setCloudSyncStatus('本地有待同步改动，条件满足时会自动上传。');
        return;
    }
    if (config.lastSyncedAt) {
        setCloudSyncState('synced', new Date(config.lastSyncedAt).toLocaleString('zh-CN'));
        setCloudSyncStatus(`最近同步：${new Date(config.lastSyncedAt).toLocaleString('zh-CN')}`);
        return;
    }
    setCloudSyncState('idle', '尚未完成首次同步');
    setCloudSyncStatus('登录后可同步。');
}

function markCloudSyncPending() {
    const prev = metadata.cloudSync || {};
    metadata.cloudSync = {
        ...prev,
        pendingUpload: true,
        pendingUploadSince: prev.pendingUploadSince || new Date().toISOString(),
        lastSyncError: '',
        retryCount: prev.retryCount || 0
    };
}

function clearCloudSyncPending(lastSyncedAt = new Date().toISOString()) {
    const prev = metadata.cloudSync || {};
    metadata.cloudSync = {
        ...prev,
        lastSyncedAt,
        pendingUpload: false,
        pendingUploadSince: '',
        lastSyncError: '',
        retryCount: 0
    };
}

function markCloudSyncFailure(message) {
    const prev = metadata.cloudSync || {};
    metadata.cloudSync = {
        ...prev,
        pendingUpload: true,
        pendingUploadSince: prev.pendingUploadSince || new Date().toISOString(),
        lastSyncError: message,
        retryCount: (prev.retryCount || 0) + 1
    };
}

function getCloudSyncRetryDelay(config = getCloudSyncConfig()) {
    const retryCount = Math.max(0, config.retryCount || 0);
    return Math.min(60000, 4000 * (2 ** retryCount));
}

async function resumePendingCloudSync() {
    const config = getCloudSyncConfig();
    if (!config.pendingUpload) return;
    if (!navigator.onLine) return;
    if (!config.autoSync || !isCloudSyncAuthenticated(config)) {
        updateCloudSyncStatusSummary(config);
        return;
    }
    scheduleCloudAutoSync(1200);
}

function setCloudSyncStatus(text, isError = false) {
    const status = document.getElementById('cloudSyncStatus');
    if (!status) return;
    status.textContent = text;
    status.style.color = isError ? '#d32f2f' : 'var(--text-secondary)';
}

function setCloudSyncState(state, metaText = '') {
    const badge = document.getElementById('cloudSyncStateBadge');
    const meta = document.getElementById('cloudSyncStateMeta');
    if (!badge || !meta) return;

    const states = {
        idle: { label: '未就绪', className: 'cloud-sync-state-idle' },
        pending: { label: '待同步', className: 'cloud-sync-state-pending' },
        uploading: { label: '上传中', className: 'cloud-sync-state-uploading' },
        restoring: { label: '恢复中', className: 'cloud-sync-state-restoring' },
        synced: { label: '已同步', className: 'cloud-sync-state-synced' },
        error: { label: '异常', className: 'cloud-sync-state-error' }
    };

    const current = states[state] || states.idle;
    badge.className = `cloud-sync-state-badge ${current.className}`;
    badge.textContent = current.label;
    meta.textContent = metaText;
}

function setCloudAuthStatus(text, isError = false) {
    const status = document.getElementById('cloudAuthStatus');
    if (!status) return;
    status.textContent = text;
    status.style.color = isError ? '#d32f2f' : 'var(--text-secondary)';
}

function getCloudAuthSummary(config = getCloudSyncConfig()) {
    if (config.user?.nickname) {
        return `已登录：${config.user.nickname}（${config.account || config.user.account || '云端账号'}）`;
    }
    if (config.account && config.apiKey) {
        return `已登录：${config.account}`;
    }
    return '未登录，无法进行数据同步';
}

function hydrateCloudSyncForm() {
    const envInput = document.getElementById('cloudEnvId');
    const accountInput = document.getElementById('cloudAccount');
    const passwordInput = document.getElementById('cloudPassword');
    const autoSync = document.getElementById('cloudAutoSync');
    if (!envInput || !accountInput || !passwordInput || !autoSync) return;

    const config = getCloudSyncConfig();
    envInput.value = config.endpoint;
    accountInput.value = '';
    passwordInput.value = '';
    autoSync.checked = config.autoSync;
    setCloudAuthStatus(getCloudAuthSummary(config));
    updateCloudSyncActionState(config);
    updateCloudSyncStatusSummary(config);
}

function openCloudSyncModal() {
    hydrateCloudSyncForm();
    openMySubPage('cloud-sync');
}

async function saveCloudSyncConfig() {
    const endpointInput = document.getElementById('cloudEnvId');
    const accountInput = document.getElementById('cloudAccount');
    const autoSync = document.getElementById('cloudAutoSync');
    if (!endpointInput || !accountInput || !autoSync) return;

    const prev = getCloudSyncConfig();
    const endpoint = endpointInput.value.trim().replace(/\/+$/, '');
    const account = accountInput.value.trim();
    metadata.cloudSync = {
        ...prev,
        endpoint,
        account,
        autoSync: autoSync.checked
    };

    await persistAppState({ skipAutoCloudSync: true });
    const nextConfig = getCloudSyncConfig();
    setCloudAuthStatus(getCloudAuthSummary(nextConfig));
    updateCloudSyncActionState(nextConfig);
    if (endpoint) {
        updateCloudSyncStatusSummary(nextConfig);
        resumePendingCloudSync();
    } else {
        setCloudSyncStatus('已清空同步服务地址。');
    }
    showToast('云同步配置已保存');
}

function getCloudSyncHeaders() {
    const config = getCloudSyncConfig();
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`;
    }
    return headers;
}

async function cloudSyncRequest(path, init = {}) {
    const config = getCloudSyncConfig();
    const endpoint = (config.endpoint || '').replace(/\/+$/, '');
    if (!endpoint) {
        throw new Error('SYNC_ENDPOINT_MISSING');
    }

    const url = `${endpoint}/${path.replace(/^\/+/, '')}`;
    const response = await fetch(url, {
        ...init,
        headers: {
            ...getCloudSyncHeaders(),
            ...(init.headers || {})
        }
    });

    if (!response.ok) {
        throw new Error(`SYNC_HTTP_${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        return null;
    }
    return await response.json();
}

async function ensureCloudSyncLogin() {
    const config = getCloudSyncConfig();
    if (!config.endpoint) {
        showToast('请先填写同步服务地址');
        setCloudSyncStatus('未配置同步服务地址', true);
        return false;
    }

    setCloudSyncState('uploading', '正在检查服务可达性');
    setCloudSyncStatus('正在测试连接...');
    try {
        await cloudSyncRequest('/health', { method: 'GET' });
        setCloudSyncState('synced', '服务连接正常');
        setCloudSyncStatus('连接成功，可以开始同步。');
        showToast('同步服务连接成功');
        return true;
    } catch (error) {
        if (String(error.message || '').includes('SYNC_HTTP_404')) {
            setCloudSyncState('synced', '服务可达');
            setCloudSyncStatus('连接成功（未提供 /health），可直接尝试同步。');
            showToast('服务可达，可直接同步');
            return true;
        }
        console.error(error);
        setCloudSyncState('error', '服务连接失败');
        setCloudSyncStatus('连接失败，请检查服务地址或跨域配置。', true);
        showToast('连接失败');
        return false;
    }
}

async function submitCloudAuthRequest(path) {
    const endpoint = document.getElementById('cloudEnvId')?.value.trim().replace(/\/+$/, '');
    const account = document.getElementById('cloudAccount')?.value.trim() || '';
    
    // 根据登录类型获取不同的凭证
    let credentials = {};
    if (currentLoginType === 'password') {
        const password = document.getElementById('cloudPassword')?.value || '';
        if (!password) {
            setCloudAuthStatus('请输入密码后再操作。', true);
            showToast('请填写密码');
            return false;
        }
        credentials = { account, password };
    } else {
        const smsCode = document.getElementById('cloudSmsCode')?.value || '';
        if (!smsCode) {
            setCloudAuthStatus('请输入验证码后再操作。', true);
            showToast('请填写验证码');
            return false;
        }
        credentials = { account, smsCode };
        // 短信登录使用不同的API路径
        path = '/api/auth/login-sms';
    }

    if (!endpoint) {
        setCloudSyncStatus('请先填写同步服务地址。', true);
        showToast('请先配置同步地址');
        return false;
    }
    if (!account) {
        setCloudAuthStatus('请输入账号后再操作。', true);
        showToast('请填写账号');
        return false;
    }

    setCloudAuthStatus(path.endsWith('/register') ? '正在注册并登录...' : '正在登录后端...');
    try {
        const response = await fetch(`${endpoint}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('AUTH_INVALID_CREDENTIALS');
            }
            if (response.status === 409) {
                throw new Error('AUTH_ACCOUNT_EXISTS');
            }
            throw new Error(`AUTH_HTTP_${response.status}`);
        }

        const data = await response.json();
        const prev = getCloudSyncConfig();
        metadata.cloudSync = {
            ...prev,
            endpoint,
            account,
            apiKey: data?.token || '',
            user: data?.user || null
        };
        await persistAppState({ skipAutoCloudSync: true });

        const summary = getCloudAuthSummary(getCloudSyncConfig());
        setCloudAuthStatus(summary);
        updateCloudSyncActionState(getCloudSyncConfig());
        updateCloudSyncStatusSummary(getCloudSyncConfig());
        document.getElementById('cloudPassword').value = '';
        await refreshActivitiesFromBackend(getDateKey(currentDate), { silent: true });
        await refreshHealthRecordsFromBackend(getDateKey(currentDate), { silent: true });
        await refreshSymptomRecordsFromBackend(getDateKey(currentDate), { silent: true });
        await refreshRemindersFromBackend({ silent: true });
        await refreshProfileFromBackend({ silent: true });
        await refreshDailyNoteFromBackend(getDateKey(currentDate), { silent: true });
        await resumePendingCloudSync();
        showToast(path.endsWith('/register') ? '已注册并登录' : '后端登录成功');
        return true;
    } catch (error) {
        console.error(error);
        if (String(error.message || '').includes('AUTH_INVALID_CREDENTIALS')) {
            setCloudAuthStatus('登录失败，账号或密码不正确。', true);
            showToast('账号或密码错误');
            return false;
        }
        if (String(error.message || '').includes('AUTH_ACCOUNT_EXISTS')) {
            setCloudAuthStatus('该账号已存在，请直接登录。', true);
            showToast('账号已存在');
            return false;
        }
        setCloudAuthStatus('登录失败，请检查服务地址、跨域或后端状态。', true);
        showToast('后端登录失败');
        return false;
    }
}

async function submitCloudAuth() {
    // 短信登录直接调用登录接口，不需要注册流程
    if (currentLoginType === 'sms') {
        const loginOk = await submitCloudAuthRequest('/api/auth/login-sms');
        return loginOk;
    }
    
    // 密码登录：先尝试登录，失败则注册
    const loginOk = await submitCloudAuthRequest('/api/auth/login');
    if (loginOk) {
        return true;
    }

    const authStatus = document.getElementById('cloudAuthStatus')?.textContent || '';
    if (!authStatus.includes('账号或密码不正确')) {
        return false;
    }

    const registerOk = await submitCloudAuthRequest('/api/auth/register');
    if (registerOk) {
        setCloudAuthStatus('已创建账号并登录。');
        showToast('已自动创建账号并登录');
        return true;
    }

    return false;
}

function toggleCloudPasswordVisibility() {
    const passwordInput = document.getElementById('cloudPassword');
    const toggleBtn = document.getElementById('toggleCloudPasswordBtn');
    if (!passwordInput || !toggleBtn) return;

    const nextType = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = nextType;
    toggleBtn.textContent = nextType === 'password' ? '👁' : '🙈';
}

async function logoutCloudSyncAccount() {
    const prev = getCloudSyncConfig();
    if (cloudSyncTimer) {
        clearTimeout(cloudSyncTimer);
        cloudSyncTimer = null;
    }
    metadata.cloudSync = {
        ...prev,
        apiKey: '',
        user: null
    };
    await persistAppState({ skipAutoCloudSync: true });
    const passwordInput = document.getElementById('cloudPassword');
    if (passwordInput) {
        passwordInput.value = '';
    }
    setCloudAuthStatus('已退出登录。');
    setCloudSyncStatus(prev.endpoint ? '已保留同步地址，请重新登录后再同步数据。' : '请先填写同步服务地址并登录后端账号。');
    updateCloudSyncActionState(getCloudSyncConfig());
    loadActivities();
    loadHealthRecords();
    loadSymptomRecords();
    loadReminders();
    loadProfile();
    renderReminderTabs('today');
    updateRemindersDisplay();
    updateDisplay();
    showToast('已退出云端账号');
}

function scheduleCloudAutoSync(delayMs = 4000) {
    const config = getCloudSyncConfig();
    if (!config.pendingUpload || !config.autoSync || !isCloudSyncAuthenticated(config)) return;

    if (cloudSyncTimer) {
        clearTimeout(cloudSyncTimer);
    }
    cloudSyncTimer = setTimeout(() => {
        pushSnapshotToCloud(false);
    }, delayMs);
}

async function pushSnapshotToCloud(manual = false) {
    const config = getCloudSyncConfig();
    if (!config.endpoint) {
        if (manual) showToast('请先配置同步服务地址');
        return false;
    }
    if (!isCloudSyncAuthenticated(config)) {
        setCloudSyncStatus('请先登录后再上传云端数据。', true);
        if (manual) showToast('请先登录后再同步');
        return false;
    }
    if (cloudSyncBusy) return false;
    if (!navigator.onLine) {
        const offlineMessage = '当前网络不可用，已保留待同步改动。';
        markCloudSyncFailure(offlineMessage);
        await persistAppState({ skipAutoCloudSync: true });
        setCloudSyncStatus(offlineMessage, true);
        if (manual) showToast('当前离线，无法上传');
        return false;
    }

    cloudSyncBusy = true;
    setCloudSyncState('uploading', '正在写入云端快照');
    setCloudSyncStatus('正在上传到云端...');

    try {
        const payload = {
            snapshot: buildFullExportPayload(),
            updatedAt: new Date().toISOString(),
            schemaVersion: STORAGE_SCHEMA_VERSION
        };
        await cloudSyncRequest('/snapshot', {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        clearCloudSyncPending(new Date().toISOString());
        await persistAppState({ skipAutoCloudSync: true });
        updateCloudSyncStatusSummary(getCloudSyncConfig());
        if (manual) showToast('已同步到云端');
        return true;
    } catch (error) {
        console.error(error);
        const message = '上传失败，请检查同步服务。';
        markCloudSyncFailure(message);
        await persistAppState({ skipAutoCloudSync: true });
        setCloudSyncStatus(message, true);
        scheduleCloudAutoSync(getCloudSyncRetryDelay(getCloudSyncConfig()));
        if (manual) showToast('上传失败');
        return false;
    } finally {
        cloudSyncBusy = false;
    }
}

async function pullSnapshotFromCloud() {
    const config = getCloudSyncConfig();
    if (!config.endpoint) {
        showToast('请先配置同步服务地址');
        return;
    }
    if (!isCloudSyncAuthenticated(config)) {
        setCloudSyncStatus('请先登录后再恢复云端数据。', true);
        showToast('请先登录后再同步');
        return;
    }
    if (cloudSyncBusy) return;

    cloudSyncBusy = true;
    setCloudSyncState('restoring', '正在读取云端快照');
    setCloudSyncStatus('正在从云端拉取...');

    try {
        const response = await cloudSyncRequest('/snapshot', { method: 'GET' });
        const snapshot = response?.snapshot || response;
        if (!snapshot || typeof snapshot !== 'object') {
            showToast('云端暂无可恢复数据');
            setCloudSyncStatus('云端暂无数据');
            return;
        }

        const localConfig = getCloudSyncConfig();
        const shouldRestore = confirm(
            localConfig.pendingUpload
                ? '本地还有未上传到云端的改动，继续恢复会覆盖本地数据。是否仍然继续？'
                : '将使用云端数据覆盖本地数据，是否继续？'
        );
        if (!shouldRestore) {
            setCloudSyncStatus('已取消恢复');
            return;
        }

        const normalized = normalizeImportPayload(snapshot);
        allActivitiesData = normalized.activitiesByDate || {};
        allHealthRecordsData = normalized.healthRecordsByDate || {};
        allSymptomRecordsData = normalized.symptomRecordsByDate || {};
        allDailyNotesData = normalized.dailyNotesByDate || {};
        reminders = normalizeReminders(normalized.reminders || []);
        medicines = normalized.medicines || [];
        profile = normalized.profile || {};
        metadata.lastImportAt = new Date().toISOString();
        clearCloudSyncPending(response?.updatedAt || new Date().toISOString());

        await persistAppState({ skipAutoCloudSync: true });
        loadActivities();
        loadHealthRecords();
        loadSymptomRecords();
        updateDisplay();
        updateRemindersDisplay();
        renderReminderTabs('today');
        renderFamilyMembers();
        updateStorageStatus();

        updateCloudSyncStatusSummary(getCloudSyncConfig());
        showToast('已从云端恢复');
    } catch (error) {
        console.error(error);
        setCloudSyncStatus('恢复失败，请检查同步服务。', true);
        showToast('从云端恢复失败');
    } finally {
        cloudSyncBusy = false;
    }
}

function openProfileModal() {
    pendingProfileAvatar = profile?.avatar || '';
    populateProfileForm('profile', profile);
    showStandalonePage('profileModal', 'profile');
}

function updateCompletenessIndicator(prefix) {
    const idPrefix = prefix === 'profile' ? 'profile' : 'familyMember';
    const fill = document.getElementById(`${idPrefix}CompletenessFill`);
    const text = document.getElementById(`${idPrefix}CompletenessText`);
    if (!fill || !text) return;
    const total = profileFieldNames.length;
    const filled = profileFieldNames.filter(field => {
        const el = document.getElementById(`${prefix}${field}`);
        return el && el.value.trim() !== '';
    }).length;
    const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
    fill.style.width = `${pct}%`;
    text.textContent = `${filled} / ${total} 项`;
}

function calculateBmi(height, weight) {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w || h <= 0 || w <= 0) return null;
    return w / ((h / 100) ** 2);
}

function updateBmiDisplay(prefix) {
    const bmiRow = document.getElementById(`${prefix}BmiDisplay`);
    const bmiValue = document.getElementById(`${prefix}BmiValue`);
    const bmiLabel = document.getElementById(`${prefix}BmiLabel`);
    if (!bmiRow || !bmiValue || !bmiLabel) return;

    const h = document.getElementById(`${prefix}Height`)?.value;
    const w = document.getElementById(`${prefix}Weight`)?.value;
    const bmi = calculateBmi(h, w);

    if (bmi === null) {
        bmiRow.hidden = true;
        return;
    }

    bmiRow.hidden = false;
    bmiValue.textContent = bmi.toFixed(1);
    bmiLabel.className = 'profile-bmi-badge';
    if (bmi < 18.5) {
        bmiLabel.textContent = '偏轻';
        bmiLabel.classList.add('bmi-underweight');
    } else if (bmi < 24) {
        bmiLabel.textContent = '正常';
        bmiLabel.classList.add('bmi-normal');
    } else if (bmi < 28) {
        bmiLabel.textContent = '超重';
        bmiLabel.classList.add('bmi-overweight');
    } else {
        bmiLabel.textContent = '肥胖';
        bmiLabel.classList.add('bmi-obese');
    }
}

function populateProfileForm(prefix, profileData = {}) {
    const normalized = normalizeProfileShape(profileData);
    profileFieldNames.forEach(field => {
        const key = field.charAt(0).toLowerCase() + field.slice(1);
        const input = document.getElementById(`${prefix}${field}`);
        if (input) {
            input.value = normalized[key] || '';
        }
    });
    updateProfileAvatarPreview(prefix, normalized.avatar || '');
    updateBmiDisplay(prefix);
    updateCompletenessIndicator(prefix);
}

function buildProfilePayload(prefix, avatar = '') {
    const payload = {};
    profileFieldNames.forEach(field => {
        const key = field.charAt(0).toLowerCase() + field.slice(1);
        const input = document.getElementById(`${prefix}${field}`);
        payload[key] = input ? input.value.trim() : '';
    });
    payload.avatar = avatar || '';
    return normalizeProfileShape(payload);
}

function updateProfileAvatarPreview(prefix, avatar = '') {
    const img = document.getElementById(`${prefix}AvatarImg`);
    const fallback = document.getElementById(`${prefix}AvatarFallback`);
    const nameInput = document.getElementById(`${prefix}Name`);
    if (!img || !fallback) return;

    const displayName = nameInput?.value?.trim() || '';
    const initial = displayName ? displayName.slice(0, 1) : '';
    fallback.textContent = initial;

    if (prefix === 'profile') {
        const circle = document.getElementById('profileAvatarUploadBtn');
        if (!circle) return;

        if (avatar) {
            img.src = avatar;
            circle.classList.add('has-image');
            circle.classList.remove('has-name');
        } else {
            img.removeAttribute('src');
            circle.classList.remove('has-image');
            circle.classList.toggle('has-name', !!initial);
        }
        return;
    }

    // familyMember prefix
    const circle = document.getElementById('familyMemberAvatarUploadBtn');
    if (!circle) return;
    if (avatar) {
        img.src = avatar;
        circle.classList.add('has-image');
        circle.classList.remove('has-name');
    } else {
        img.removeAttribute('src');
        circle.classList.remove('has-image');
        circle.classList.toggle('has-name', !!initial);
    }
}

async function handleAvatarFileChange(file, target) {
    if (!file) return;
    const loadingEl = document.getElementById(target === 'profile' ? 'profileAvatarLoading' : 'familyMemberAvatarLoading');
    if (loadingEl) loadingEl.classList.remove('hidden');
    try {
        const base64 = await readAndCompressImage(file);
        if (target === 'profile') {
            pendingProfileAvatar = base64;
        } else {
            pendingFamilyMemberAvatar = base64;
        }
        updateProfileAvatarPreview(target, base64);
    } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
    }
}

async function handleProfileAvatarChange(e) {
    const file = e.target.files && e.target.files[0];
    try {
        await handleAvatarFileChange(file, 'profile');
    } catch (error) {
        console.error(error);
        showToast('头像处理失败');
    } finally {
        e.target.value = '';
    }
}

async function handleFamilyMemberAvatarChange(e) {
    const file = e.target.files && e.target.files[0];
    try {
        await handleAvatarFileChange(file, 'familyMember');
    } catch (error) {
        console.error(error);
        showToast('头像处理失败');
    } finally {
        e.target.value = '';
    }
}

function clearProfileAvatar() {
    pendingProfileAvatar = '';
    updateProfileAvatarPreview('profile', '');
}

function clearFamilyMemberAvatar() {
    pendingFamilyMemberAvatar = '';
    updateProfileAvatarPreview('familyMember', '');
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    profile = buildProfilePayload('profile', pendingProfileAvatar);

    try {
        await saveProfile();
        if (currentPage === 'profile') {
            switchPage('my');
        } else {
            document.getElementById('profileModal').style.display = 'none';
        }
        showToast('个人信息已保存');
    } catch (error) {
        console.error(error);
        showToast(isBackendProfileModeEnabled() ? '保存失败，请检查后端连接或登录状态' : '个人信息保存失败');
    }
}

function openFamilyMembersModal() {
    renderFamilyMembers();
    showStandalonePage('familyMembersModal', 'family-members');
}

function openFamilyMemberForm(memberId = null) {
    editingFamilyMemberId = memberId;
    const member = memberId ? familyMembers.find(item => item.id === memberId) : null;
    pendingFamilyMemberAvatar = member?.avatar || '';
    document.getElementById('familyMemberFormTitle').textContent = member ? '编辑家庭成员' : '添加家庭成员';
    populateProfileForm('familyMember', member || {});
    showStandalonePage('familyMemberFormModal', 'family-member-form');
}

function renderFamilyMembers() {
    const list = document.getElementById('familyMembersList');
    const emptyState = document.getElementById('familyMembersEmptyState');
    if (!list || !emptyState) return;

    familyMembers = normalizeFamilyMembers(familyMembers);
    if (familyMembers.length === 0) {
        emptyState.classList.remove('hidden');
        list.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    list.innerHTML = familyMembers.map(member => {
        const summary = [
            member.gender === 'male' ? '男' : member.gender === 'female' ? '女' : member.gender === 'other' ? '其他' : '',
            member.age ? `${member.age}岁` : '',
            member.bloodType ? `${member.bloodType}型` : ''
        ].filter(Boolean).join(' · ');
        const healthSummary = [
            member.chronicConditions ? `病史：${escapeHtml(member.chronicConditions)}` : '',
            member.medications ? `用药：${escapeHtml(member.medications)}` : '',
            member.healthGoals ? `目标：${escapeHtml(member.healthGoals)}` : ''
        ].filter(Boolean).join(' / ');

        return `
            <article class="family-member-card">
                <div class="family-member-main">
                    <div class="family-member-avatar ${member.avatar ? '' : 'empty'}">
                        ${member.avatar ? `<img src="${member.avatar}" alt="${escapeHtml(member.name || '家庭成员')}">` : `<span>${escapeHtml((member.name || '成员').slice(0, 1))}</span>`}
                    </div>
                    <div class="family-member-content">
                        <div class="family-member-header">
                            <h3>${escapeHtml(member.name || '未命名成员')}</h3>
                            ${summary ? `<span class="family-member-meta">${escapeHtml(summary)}</span>` : ''}
                        </div>
                        <div class="family-member-info">
                            ${member.bloodPressure ? `<span>常见血压 ${escapeHtml(member.bloodPressure)}</span>` : ''}
                            ${member.bloodSugar ? `<span>常见血糖 ${escapeHtml(member.bloodSugar)}</span>` : ''}
                            ${member.allergies ? `<span>过敏史 ${escapeHtml(member.allergies)}</span>` : ''}
                        </div>
                        ${healthSummary ? `<p class="family-member-summary">${healthSummary}</p>` : '<p class="family-member-summary">可继续补充病史、过敏史、长期用药等信息。</p>'}
                    </div>
                </div>
                <div class="family-member-actions">
                    <button type="button" class="btn-action btn-edit" data-family-action="edit" data-member-id="${member.id}">编辑</button>
                    <button type="button" class="btn-action btn-delete" data-family-action="delete" data-member-id="${member.id}">删除</button>
                </div>
            </article>
        `;
    }).join('');
}

async function handleFamilyMemberSubmit(e) {
    e.preventDefault();
    const payload = buildProfilePayload('familyMember', pendingFamilyMemberAvatar);
    const now = new Date().toISOString();

    if (editingFamilyMemberId) {
        familyMembers = familyMembers.map(member => member.id === editingFamilyMemberId ? {
            ...member,
            ...payload,
            updatedAt: now
        } : member);
    } else {
        familyMembers.unshift({
            id: `family_${Date.now()}`,
            createdAt: now,
            updatedAt: now,
            ...payload
        });
    }

    familyMembers = normalizeFamilyMembers(familyMembers);
    await persistAppState({ skipAutoCloudSync: true });
    await updateStorageStatus();
    renderFamilyMembers();
    switchPage('family-members');
    showToast(editingFamilyMemberId ? '家庭成员已更新' : '家庭成员已添加');
    editingFamilyMemberId = null;
}

async function deleteFamilyMember(memberId) {
    if (!confirm('确定要删除这个家庭成员吗？')) return;
    familyMembers = familyMembers.filter(member => member.id !== memberId);
    await persistAppState({ skipAutoCloudSync: true });
    await updateStorageStatus();
    renderFamilyMembers();
    showToast('家庭成员已删除');
}

// 请求通知权限
function requestNotificationPermission() {
    if (typeof window !== 'undefined'
        && window.AndroidReminders
        && typeof window.AndroidReminders.requestNotificationPermission === 'function') {
        try {
            window.AndroidReminders.requestNotificationPermission();
        } catch (error) {
            console.error('Failed to request Android notification permission:', error);
        }
    }

    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showToast('通知权限已授予');
            }
        });
    }
}

// 打开提醒模态框（从主页提醒卡片）
window.openReminderModal = function() {
    openReminderPage('today');
}

window.openReminderManagerFor = function(id) {
    openReminderPage('today');
    if (id) {
        const reminder = reminders.find(item => item.id === id);
        if (reminder) {
            openReminderAlertModal(reminder);
        }
    }
}

window.editReminder = function(id) {
    const reminder = reminders.find(item => item.id === id);
    if (!reminder) return;
    if (reminder.completed) {
        showToast('已完成提醒不支持编辑');
        return;
    }

    openReminderFormPage(reminder);
}

function normalizeReminders(source) {
    return (source || []).map(reminder => ({
        snoozeUntil: null,
        snoozeCount: 0,
        history: [],
        updatedAt: reminder.createdAt || new Date().toISOString(),
        repeat: normalizeReminderRepeat(reminder.repeat),
        ...reminder
    })).map(reminder => ({
        ...reminder,
        repeat: normalizeReminderRepeat(reminder.repeat)
    }));
}

function normalizeReminderRepeat(repeat) {
    if (repeat === true) return 'daily';
    if (repeat === false || repeat === null || repeat === undefined || repeat === '') return 'none';

    const allowed = ['none', 'daily', 'weekly', 'biweekly', 'monthly'];
    return allowed.includes(repeat) ? repeat : 'none';
}

function isRepeatingReminder(repeat) {
    return normalizeReminderRepeat(repeat) !== 'none';
}

function getReminderRepeatLabel(repeat) {
    const labels = {
        daily: '每天',
        weekly: '每周',
        biweekly: '每2周',
        monthly: '每月'
    };
    return labels[normalizeReminderRepeat(repeat)] || '';
}

function getNextReminderDate(dateKey, repeat) {
    const normalizedRepeat = normalizeReminderRepeat(repeat);
    const nextDate = new Date(`${dateKey}T00:00:00`);

    switch (normalizedRepeat) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case 'biweekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        default:
            return dateKey;
    }

    return getDateKey(nextDate);
}

function toggleCustomSnoozeField() {
    const select = document.getElementById('snoozeMinutes');
    const input = document.getElementById('customSnoozeMinutes');
    input.classList.toggle('hidden', select.value !== 'custom');
}

function getSelectedSnoozeMinutes() {
    const selectValue = document.getElementById('snoozeMinutes').value;
    if (selectValue === 'custom') {
        const custom = parseInt(document.getElementById('customSnoozeMinutes').value, 10);
        if (Number.isNaN(custom) || custom < 1 || custom > 240) return null;
        return custom;
    }

    const preset = parseInt(selectValue, 10);
    return Number.isNaN(preset) ? null : preset;
}

function updateSnoozeMeta(reminder) {
    const meta = document.getElementById('snoozeMetaText');
    const count = reminder?.snoozeCount || 0;
    meta.textContent = count > 0 ? `已延后 ${count}/3 次` : '本次最多可延后 3 次';
}

function buildFullExportPayload() {
    const metadataForExport = JSON.parse(JSON.stringify(metadata || {}));
    if (metadataForExport.cloudSync) {
        metadataForExport.cloudSync.apiKey = '';
        metadataForExport.cloudSync.user = null;
    }

    return JSON.parse(JSON.stringify({
        schemaVersion: STORAGE_SCHEMA_VERSION,
        date: getDateKey(currentDate),
        activitiesByDate: allActivitiesData,
        healthRecordsByDate: allHealthRecordsData,
        symptomRecordsByDate: allSymptomRecordsData,
        dailyNotesByDate: allDailyNotesData,
        reminders,
        medicines,
        profile,
        familyMembers,
        metadata: metadataForExport
    }));
}

async function handleImportFileSelection(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        pendingImportData = normalizeImportPayload(parsed);
        const preview = summarizeImportPayload(pendingImportData);
        document.getElementById('importPreviewText').textContent = preview;
        document.getElementById('importPreview').classList.remove('hidden');
    } catch (error) {
        console.error(error);
        showToast('导入文件解析失败，请检查 JSON 格式');
    } finally {
        e.target.value = '';
    }
}

function normalizeImportPayload(parsed) {
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('INVALID_IMPORT_PAYLOAD');
    }

    if (parsed.activities && parsed.healthRecords && !parsed.activitiesByDate && !parsed.healthRecordsByDate) {
        const dateKey = parsed.date || getDateKey(currentDate);
        return {
            activitiesByDate: { [dateKey]: parsed.activities || [] },
            healthRecordsByDate: { [dateKey]: parsed.healthRecords || [] },
            symptomRecordsByDate: { [dateKey]: parsed.symptomRecords || [] },
            dailyNotesByDate: parsed.dailyNotesByDate || {},
            reminders: parsed.reminders || [],
            medicines: parsed.medicines || [],
            profile: parsed.profile || {},
            familyMembers: parsed.familyMembers || [],
            metadata: parsed.metadata || {}
        };
    }

    return {
        activitiesByDate: parsed.activitiesByDate || {},
        healthRecordsByDate: parsed.healthRecordsByDate || {},
        symptomRecordsByDate: parsed.symptomRecordsByDate || {},
        dailyNotesByDate: parsed.dailyNotesByDate || {},
        reminders: parsed.reminders || [],
        medicines: parsed.medicines || [],
        profile: parsed.profile || {},
        familyMembers: parsed.familyMembers || [],
        metadata: parsed.metadata || {}
    };
}

function summarizeImportPayload(payload) {
    const activityCount = Object.values(payload.activitiesByDate).reduce((sum, list) => sum + list.length, 0);
    const healthCount = Object.values(payload.healthRecordsByDate).reduce((sum, list) => sum + list.length, 0);
    const symptomCount = Object.values(payload.symptomRecordsByDate).reduce((sum, list) => sum + list.length, 0);
    const noteCount = Object.keys(payload.dailyNotesByDate || {}).length;
    const reminderCount = payload.reminders.length;
    const medicineCount = (payload.medicines || []).length;
    const familyCount = (payload.familyMembers || []).length;
    const dates = Object.keys(payload.activitiesByDate)
        .concat(Object.keys(payload.healthRecordsByDate), Object.keys(payload.symptomRecordsByDate), Object.keys(payload.dailyNotesByDate || {}))
        .sort();
    const rangeText = dates.length ? `${dates[0]} 至 ${dates[dates.length - 1]}` : '未包含日期记录';
    return `检测到 ${activityCount} 条活动、${healthCount} 条健康数据、${symptomCount} 条症状记录、${noteCount} 条状态记录、${reminderCount} 条提醒、${medicineCount} 种药品、${familyCount} 位家庭成员；日期范围：${rangeText}`;
}

async function confirmImport(strategy) {
    if (!pendingImportData || submitLocks.import) return;
    submitLocks.import = true;
    const previousState = buildFullExportPayload();

    try {
        if (strategy === 'replace') {
            allActivitiesData = pendingImportData.activitiesByDate;
            allHealthRecordsData = pendingImportData.healthRecordsByDate;
            allSymptomRecordsData = pendingImportData.symptomRecordsByDate;
            allDailyNotesData = pendingImportData.dailyNotesByDate || {};
            reminders = normalizeReminders(pendingImportData.reminders);
            medicines = pendingImportData.medicines || [];
            profile = normalizeProfileShape(pendingImportData.profile || {});
            familyMembers = normalizeFamilyMembers(pendingImportData.familyMembers || []);
        } else {
            allActivitiesData = mergeDateBuckets(allActivitiesData, pendingImportData.activitiesByDate, normalizeActivity, getActivitySortTime);
            allHealthRecordsData = mergeDateBuckets(allHealthRecordsData, pendingImportData.healthRecordsByDate, item => item, item => item.time || '00:00');
            allSymptomRecordsData = mergeDateBuckets(allSymptomRecordsData, pendingImportData.symptomRecordsByDate, item => item, item => item.time || '00:00');
            allDailyNotesData = {
                ...allDailyNotesData,
                ...(pendingImportData.dailyNotesByDate || {})
            };
            reminders = mergeReminders(reminders, pendingImportData.reminders);
            // 合并药品：按 id 去重
            const importedMeds = pendingImportData.medicines || [];
            const existingIds = new Set(medicines.map(m => m.id));
            medicines = [...medicines, ...importedMeds.filter(m => !existingIds.has(m.id))];
            profile = normalizeProfileShape({
                ...profile,
                ...(pendingImportData.profile || {})
            });
            const importedMembers = normalizeFamilyMembers(pendingImportData.familyMembers || []);
            const existingMemberIds = new Set(familyMembers.map(member => member.id));
            familyMembers = [...familyMembers, ...importedMembers.filter(member => !existingMemberIds.has(member.id))];
        }

        metadata.lastImportAt = new Date().toISOString();
        await persistAppState();
        loadActivities();
        loadHealthRecords();
        loadSymptomRecords();
        updateDisplay();
        updateRemindersDisplay();
        renderReminderTabs('today');
        updateStorageStatus();
        document.getElementById('importPreview').classList.add('hidden');
        pendingImportData = null;
        showToast(strategy === 'replace' ? '数据已替换导入' : '数据已合并导入');
    } catch (error) {
        console.error(error);
        allActivitiesData = previousState.activitiesByDate;
        allHealthRecordsData = previousState.healthRecordsByDate;
        allSymptomRecordsData = previousState.symptomRecordsByDate || {};
        allDailyNotesData = previousState.dailyNotesByDate || {};
        reminders = previousState.reminders;
        profile = previousState.profile;
        familyMembers = previousState.familyMembers || [];
        metadata = {
            ...metadata,
            ...(previousState.metadata || {})
        };
        showToast('导入失败，已保留原始数据');
    } finally {
        submitLocks.import = false;
    }
}

function mergeDateBuckets(existing, incoming, normalizeItem = item => item, getSortValue = item => item.time || '00:00') {
    const merged = { ...existing };
    Object.entries(incoming || {}).forEach(([dateKey, list]) => {
        const normalizedList = list.map(normalizeItem);
        merged[dateKey] = [...(merged[dateKey] || []).filter(item => !normalizedList.some(incomingItem => incomingItem.id === item.id)), ...normalizedList];
        merged[dateKey].sort((a, b) => getSortValue(a).localeCompare(getSortValue(b)));
    });
    return merged;
}

function mergeReminders(existing, incoming) {
    const base = normalizeReminders(existing);
    const incomingNormalized = normalizeReminders(incoming);
    const map = new Map(base.map(item => [item.id, item]));
    incomingNormalized.forEach(item => map.set(item.id, item));
    return [...map.values()];
}

async function updateStorageStatus() {
    const usageText = document.getElementById('storageUsageText');
    const usageBar = document.getElementById('storageUsageBar');
    const engineBadge = document.getElementById('storageEngineBadge');
    const backupText = document.getElementById('backupReminderText');

    if (!usageText || !usageBar || !engineBadge || !backupText) return;

    const bytesUsed = new Blob([JSON.stringify(buildFullExportPayload())]).size;
    let quotaBytes = 0;

    if (navigator.storage?.estimate) {
        try {
            const estimate = await navigator.storage.estimate();
            quotaBytes = estimate.quota || 0;
        } catch (error) {
            console.warn('Unable to estimate storage quota', error);
        }
    }

    const ratio = quotaBytes ? Math.min(bytesUsed / quotaBytes, 1) : 0;
    usageText.textContent = quotaBytes
        ? `已用 ${(bytesUsed / 1024 / 1024).toFixed(2)} MB / ${(quotaBytes / 1024 / 1024).toFixed(2)} MB`
        : `当前数据约 ${(bytesUsed / 1024).toFixed(1)} KB`;
    usageBar.style.width = `${Math.max(ratio * 100, 6)}%`;
    usageBar.classList.toggle('warn', ratio >= 0.8);
    engineBadge.textContent = metadata.storageEngine === 'IndexedDB' ? 'IndexedDB' : 'LocalStorage';
    backupText.textContent = getBackupReminderText();
}

function getBackupReminderText() {
    if (!metadata.lastBackupAt) {
        return '尚未导出备份，建议尽快执行一次 JSON 备份。';
    }

    const diffDays = Math.floor((Date.now() - new Date(metadata.lastBackupAt).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= BACKUP_REMINDER_DAYS
        ? `距离上次备份已超过 ${BACKUP_REMINDER_DAYS} 天，建议立即备份。`
        : `最近一次备份时间：${new Date(metadata.lastBackupAt).toLocaleString('zh-CN')}`;
}

function maybeRemindBackup() {
    const hasAnyData = Object.keys(allActivitiesData).length
        || Object.keys(allHealthRecordsData).length
        || Object.keys(allSymptomRecordsData).length
        || Object.keys(allDailyNotesData).length
        || reminders.length
        || Object.keys(profile).length;
    if (!hasAnyData) return;

    const backupText = getBackupReminderText();
    if (backupText.includes('建议')) {
        showToast('请留意数据备份，避免本地数据丢失');
    }
}

async function syncRemindersToServiceWorker() {
    if (!navigator.serviceWorker?.controller && !serviceWorkerRegistration?.active) return;
    const target = navigator.serviceWorker.controller || serviceWorkerRegistration.active;
    if (!target) return;

    target.postMessage({
        type: 'SYNC_REMINDERS',
        reminders
    });
}

function isAndroidReminderBridgeAvailable() {
    return typeof window !== 'undefined'
        && window.AndroidReminders
        && typeof window.AndroidReminders.syncReminders === 'function';
}

function buildNativeReminderPayload(reminder) {
    return {
        id: String(reminder.id || ''),
        title: reminder.title || '',
        type: reminder.type || 'other',
        date: reminder.date || '',
        time: reminder.time || '',
        repeat: normalizeReminderRepeat(reminder.repeat),
        notes: reminder.notes || '',
        completed: Boolean(reminder.completed),
        snoozeUntil: reminder.snoozeUntil || null
    };
}

async function syncRemindersToNative() {
    if (!isAndroidReminderBridgeAvailable()) return;

    try {
        const payload = reminders.map(buildNativeReminderPayload);
        window.AndroidReminders.syncReminders(JSON.stringify(payload));
    } catch (error) {
        console.error('Failed to sync reminders to Android:', error);
    }
}

// ==================== 统计功能 ====================

let currentStatsPeriod = 'week';

// 打开统计模态框
function openStatsModal() {
    document.getElementById('statsModal').style.display = 'block';
    setupStatsTabs();
    renderStats();
}

// 设置统计标签页事件
function setupStatsTabs() {
    const tabs = document.querySelectorAll('.stats-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentStatsPeriod = tab.dataset.period;
            renderStats();
        });
    });
}

// 渲染统计数据
function renderStats() {
    const { startDate, endDate } = getDateRangeForPeriod(currentStatsPeriod);
    // 渲染图表
    renderCharts(startDate, endDate);

    // 检查空状态
    checkStatsEmptyState(startDate, endDate);
}

// 图表实例
let activityTrendChart = null;
let exerciseTrendChart = null;
let sleepTrendChart = null;

// 渲染所有图表
function renderCharts(startDate, endDate) {
    renderActivityTrendChart(startDate, endDate);
    renderExerciseTrendChart(startDate, endDate);
    renderSleepTrendChart(startDate, endDate);
}

// 销毁所有图表
function destroyAllCharts() {
    if (activityTrendChart) {
        activityTrendChart.destroy();
        activityTrendChart = null;
    }
    if (exerciseTrendChart) {
        exerciseTrendChart.destroy();
        exerciseTrendChart = null;
    }
    if (sleepTrendChart) {
        sleepTrendChart.destroy();
        sleepTrendChart = null;
    }
}

// 渲染运动次数趋势图
function renderActivityTrendChart(startDate, endDate) {
    const ctx = document.getElementById('activityTrendChart');
    if (!ctx) return;

    const labels = [];
    const exerciseData = [];

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateKey = getDateKey(date);
        const dayActivities = (allActivitiesData[dateKey] || []).map(normalizeActivity);

        labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        exerciseData.push(dayActivities.filter(a => a.type === 'exercise').length);
    }

    if (activityTrendChart) {
        activityTrendChart.destroy();
    }

    activityTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '运动次数',
                data: exerciseData,
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.12)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        padding: 8,
                        font: { size: 11 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// 渲染单次运动时长趋势图
function renderExerciseTrendChart(startDate, endDate) {
    const ctx = document.getElementById('exerciseTrendChart');
    if (!ctx) return;

    const labels = [];
    const data = [];

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateKey = getDateKey(date);
        const dayActivities = (allActivitiesData[dateKey] || []).map(normalizeActivity);
        const exerciseActivities = dayActivities.filter(a => a.type === 'exercise');

        const totalMinutes = exerciseActivities.reduce((sum, a) => sum + (getActivityDuration(a) || 0), 0);
        const averageMinutes = exerciseActivities.length > 0
            ? Number((totalMinutes / exerciseActivities.length).toFixed(1))
            : 0;

        labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        data.push(averageMinutes);
    }

    if (exerciseTrendChart) {
        exerciseTrendChart.destroy();
    }

    exerciseTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '单次运动时长（分钟/次）',
                data: data,
                backgroundColor: 'rgba(33, 150, 243, 0.7)',
                borderColor: '#2196F3',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return `${value}m`;
                        }
                    }
                }
            }
        }
    });
}

function renderSleepTrendChart(startDate, endDate) {
    const ctx = document.getElementById('sleepTrendChart');
    if (!ctx) return;

    const labels = [];
    const data = [];

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateKey = getDateKey(date);
        const dayActivities = (allActivitiesData[dateKey] || []).map(normalizeActivity);
        const sleepActivities = dayActivities.filter(a => a.type === 'sleep');
        const totalMinutes = sleepActivities.reduce((sum, a) => sum + (getActivityDuration(a) || 0), 0);

        labels.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
        data.push(Number((totalMinutes / 60).toFixed(1)));
    }

    if (sleepTrendChart) {
        sleepTrendChart.destroy();
    }

    sleepTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: '睡眠时长（小时）',
                data,
                backgroundColor: 'rgba(95, 132, 219, 0.72)',
                borderColor: '#5f84db',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return `${value}h`;
                        }
                    }
                }
            }
        }
    });
}

// 获取日期范围
function getDateRangeForPeriod(period) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'week') {
        // 本周：从周一到今天
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        return { startDate: monday, endDate: today };
    } else {
        // 本月：从1号到今天
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: firstDay, endDate: today };
    }
}

// 检查统计空状态
function checkStatsEmptyState(startDate, endDate) {
    const emptyState = document.getElementById('statsEmptyState');
    if (!emptyState) return;

    let hasData = false;
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateKey = getDateKey(date);
        const dayActivities = (allActivitiesData[dateKey] || []).map(normalizeActivity);
        if (dayActivities.some(activity => activity.type === 'exercise' || activity.type === 'sleep')) {
            hasData = true;
            break;
        }
    }

    if (hasData) {
        emptyState.classList.add('hidden');
    } else {
        emptyState.classList.remove('hidden');
    }
}

// 将统计模态框暴露到全局
window.openStatsModal = openStatsModal;

// 暴露全局函数
window.updateExportPreview = updateExportPreview;
window.openStatsModal = openStatsModal;
window.destroyAllCharts = destroyAllCharts;
window.renderCharts = renderCharts;

// ==================== 快速模板功能 ====================

// 渲染活动表单中的模板列表
function renderActivityTemplates() {
    const container = document.getElementById('templateList');
    if (!container) return;

    if (templates.length === 0) {
        container.innerHTML = '<p class="text-secondary" style="font-size:0.9rem;">暂无模板，点击下方按钮创建</p>';
        return;
    }

    container.innerHTML = templates.map(template => `
        <div class="template-item" data-template-id="${template.id}">
            <span class="template-item-icon">${template.icon}</span>
            <span class="template-item-name">${escapeHtml(template.name)}</span>
        </div>
    `).join('');
}

// 应用模板到活动表单
function applyTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // 填充表单
    const startTime = document.getElementById('activityStartTime').value || `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    document.getElementById('activityType').value = template.type;
    document.getElementById('activityContent').value = template.content;
    document.getElementById('activityFeeling').value = template.feeling || '';
    document.getElementById('activityStartTime').value = startTime;
    const candidateEndTime = template.duration ? addMinutesToTime(startTime, template.duration) : startTime;
    // Cap end time at current time for today's records to avoid future-time validation failure
    const now = new Date();
    const isToday = currentDate.toDateString() === now.toDateString();
    if (isToday) {
        const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        document.getElementById('activityEndTime').value = (candidateEndTime > nowHM) ? nowHM : candidateEndTime;
    } else {
        document.getElementById('activityEndTime').value = candidateEndTime;
    }
    updateActivityDurationField();

    // 高亮选中的模板
    document.querySelectorAll('.template-item').forEach(item => {
        item.classList.remove('active');
    });
    const selectedItem = document.querySelector(`.template-item[data-template-id="${templateId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }

    showToast(`已应用模板：${template.name}`);
}

// 保存当前表单为模板
function saveAsTemplate() {
    const type = document.getElementById('activityType').value;
    const content = document.getElementById('activityContent').value.trim();
    const feeling = document.getElementById('activityFeeling').value.trim();
    const duration = document.getElementById('activityDuration').value;

    if (!content) {
        showToast('请先填写活动内容');
        return;
    }

    const templateName = prompt('请输入模板名称：', content);
    if (!templateName) return;

    // 获取对应类型的默认图标
    const typeIcons = {
        meal: '🍽️',
        medication: '💊',
        exercise: '🏃',
        sleep: '😴',
        work: '💼',
        other: '📌'
    };

    const newTemplate = {
        id: 'tpl_' + Date.now(),
        name: templateName,
        type: type,
        content: content,
        feeling: feeling,
        duration: duration ? parseInt(duration, 10) : null,
        icon: typeIcons[type] || '📌'
    };

    templates.push(newTemplate);
    saveTemplates();
    renderActivityTemplates();
    showToast('模板已保存！');
}

// 打开模板管理模态框
function openTemplateManager() {
    document.getElementById('templateModal').style.display = 'block';
    renderTemplateManagerList();
}

// 渲染模板管理列表
function renderTemplateManagerList() {
    const container = document.getElementById('templateManagerList');
    const emptyState = document.getElementById('templateEmptyState');
    const createBtn = document.getElementById('createTemplateBtn');

    if (!container) return;

    if (templates.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        createBtn.textContent = '创建第一个模板';
        return;
    }

    emptyState.classList.add('hidden');
    createBtn.textContent = '创建新模板';

    container.innerHTML = templates.map(template => `
        <div class="template-manager-item">
            <div class="template-manager-info">
                <span class="template-manager-icon">${template.icon}</span>
                <div class="template-manager-details">
                    <div class="template-manager-name">${escapeHtml(template.name)}</div>
                    <div class="template-manager-meta">
                        ${getTypeLabel(template.type)} · ${escapeHtml(template.content)}
                        ${template.duration ? ` · ${template.duration}分钟` : ''}
                    </div>
                </div>
            </div>
            <div class="template-manager-actions">
                <button class="template-action-btn" onclick="editTemplate('${template.id}')">编辑</button>
                <button class="template-action-btn delete" onclick="deleteTemplate('${template.id}')">删除</button>
            </div>
        </div>
    `).join('');
}

// 打开创建/编辑模板模态框
function openTemplateEditModal(templateId = null) {
    const modal = document.getElementById('templateEditModal');
    const form = document.getElementById('templateForm');
    const title = document.getElementById('templateEditTitle');

    form.reset();

    if (templateId) {
        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        title.textContent = '编辑模板';
        document.getElementById('templateId').value = template.id;
        document.getElementById('templateName').value = template.name;
        document.getElementById('templateType').value = template.type;
        document.getElementById('templateContent').value = template.content;
        document.getElementById('templateFeeling').value = template.feeling || '';
        document.getElementById('templateDuration').value = template.duration || '';
        document.getElementById('templateIcon').value = template.icon;
        selectTemplateIcon(template.icon);
    } else {
        title.textContent = '创建模板';
        document.getElementById('templateId').value = '';
        selectTemplateIcon('💊');
    }

    document.getElementById('templateModal').style.display = 'none';
    modal.style.display = 'block';
}

// 编辑模板
function editTemplate(templateId) {
    openTemplateEditModal(templateId);
}

// 删除模板
function deleteTemplate(templateId) {
    if (!confirm('确定要删除这个模板吗？')) return;

    templates = templates.filter(t => t.id !== templateId);
    saveTemplates();
    renderActivityTemplates();
    renderTemplateManagerList();
    showToast('模板已删除');
}

// 选择模板图标
function selectTemplateIcon(icon) {
    selectedTemplateIcon = icon;
    document.getElementById('templateIcon').value = icon;

    document.querySelectorAll('.template-icon-option').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.icon === icon) {
            btn.classList.add('selected');
        }
    });
}

// 处理模板表单提交
function handleTemplateFormSubmit(e) {
    e.preventDefault();

    const templateId = document.getElementById('templateId').value;
    const name = document.getElementById('templateName').value.trim();
    const type = document.getElementById('templateType').value;
    const content = document.getElementById('templateContent').value.trim();
    const feeling = document.getElementById('templateFeeling').value.trim();
    const duration = document.getElementById('templateDuration').value;
    const icon = document.getElementById('templateIcon').value;

    if (templateId) {
        // 编辑现有模板
        const index = templates.findIndex(t => t.id === templateId);
        if (index > -1) {
            templates[index] = {
                ...templates[index],
                name,
                type,
                content,
                feeling,
                duration: duration ? parseInt(duration, 10) : null,
                icon
            };
        }
        showToast('模板已更新！');
    } else {
        // 创建新模板
        const newTemplate = {
            id: 'tpl_' + Date.now(),
            name,
            type,
            content,
            feeling,
            duration: duration ? parseInt(duration, 10) : null,
            icon
        };
        templates.push(newTemplate);
        showToast('模板已创建！');
    }

    saveTemplates();
    renderActivityTemplates();
    renderTemplateManagerList();
    document.getElementById('templateEditModal').style.display = 'none';

    // 如果是从活动表单保存的，重新打开活动表单
    if (!templateId) {
        openTemplateManager();
    }
}

// 暴露全局函数
window.applyTemplate = applyTemplate;
window.saveAsTemplate = saveAsTemplate;
window.openTemplateManager = openTemplateManager;
window.editTemplate = editTemplate;
window.deleteTemplate = deleteTemplate;
window.selectTemplateIcon = selectTemplateIcon;
window.openTemplateEditModal = openTemplateEditModal;

// ==================== AI诊断功能 ====================

// 加载AI配置
function loadAiConfig() {
    const saved = localStorage.getItem('dailyTracker_aiConfig');
    if (saved) {
        try {
            const parsedConfig = JSON.parse(saved);
            const isLegacyVerifiedConfig = !Object.prototype.hasOwnProperty.call(parsedConfig, 'verified')
                && !!parsedConfig.apiKey
                && (parsedConfig.provider !== 'custom' || !!parsedConfig.apiEndpoint);

            aiConfig = {
                provider: 'openai',
                apiKey: '',
                apiEndpoint: '',
                model: '',
                verified: false,
                verifiedAt: '',
                ...parsedConfig
            };
            if (isLegacyVerifiedConfig) {
                aiConfig.verified = true;
                localStorage.setItem('dailyTracker_aiConfig', JSON.stringify(aiConfig));
            }
            document.getElementById('aiProvider').value = aiConfig.provider || 'openai';
            document.getElementById('aiApiKey').value = aiConfig.apiKey || '';
            document.getElementById('aiModel').value = aiConfig.model || '';
            if (aiConfig.apiEndpoint) {
                document.getElementById('customApiEndpoint').value = aiConfig.apiEndpoint;
            }
            syncAiProviderFields();
            // 同步到大模型配置页面
            document.getElementById('aiConfigProvider').value = aiConfig.provider || 'openai';
            document.getElementById('aiConfigApiKey').value = aiConfig.apiKey || '';
            document.getElementById('aiConfigModel').value = aiConfig.model || '';
            if (aiConfig.apiEndpoint) {
                document.getElementById('aiConfigCustomApiEndpoint').value = aiConfig.apiEndpoint;
            }
            syncAiProviderFields('aiConfig');
            updateAiConfigPageSection();
        } catch (e) {
            console.error('加载AI配置失败:', e);
        }
    } else {
        aiConfig = {
            provider: 'openai',
            apiKey: '',
            apiEndpoint: '',
            model: '',
            verified: false,
            verifiedAt: ''
        };
        syncAiProviderFields();
        syncAiProviderFields('aiConfig');
    }
}

// 获取已保存的AI配置
function getAiConfig() {
    return aiConfig;
}

// 保存AI配置
function getAiConfigFromForm() {
    const provider = document.getElementById('aiProvider').value;
    const apiKey = document.getElementById('aiApiKey').value.trim();
    const model = document.getElementById('aiModel').value.trim();
    let apiEndpoint = '';

    if (provider === 'custom') {
        apiEndpoint = document.getElementById('customApiEndpoint').value.trim();
    }

    return {
        provider,
        apiKey,
        model,
        apiEndpoint,
        verified: false,
        verifiedAt: ''
    };
}

function saveAiConfig() {
    aiConfig = getAiConfigFromForm();
    localStorage.setItem('dailyTracker_aiConfig', JSON.stringify(aiConfig));
    updateAiConfigSection();
    showToast('AI配置已保存！');
}

function syncAiProviderFields(prefix = 'ai') {
    const providerElem = document.getElementById(`${prefix}Provider`);
    const customGroup = document.getElementById(`${prefix}CustomApiEndpointGroup`);
    const modelInput = document.getElementById(`${prefix}Model`);
    if (!providerElem || !customGroup) return;

    if (providerElem.value === 'custom') {
        customGroup.classList.remove('hidden');
    } else {
        customGroup.classList.add('hidden');
    }

    // 根据提供商更新模型输入框的 placeholder
    if (modelInput) {
        const provider = providerElem.value;
        let placeholder = '留空使用默认模型';
        let hint = '';

        switch (provider) {
            case 'openai':
                hint = '例如: gpt-4o, gpt-4o-mini, gpt-3.5-turbo';
                break;
            case 'anthropic':
                hint = '例如: claude-3-5-sonnet-20241022, claude-3-opus-20240229';
                break;
            case 'deepseek':
                hint = '例如: deepseek-chat, deepseek-reasoner';
                break;
            case 'moonshot':
                hint = '例如: moonshot-v1-8k, moonshot-v1-32k';
                break;
            case 'tongyi':
                hint = '例如: qwen-plus, qwen-max, qwen-turbo, qwen2.5-72b-instruct';
                break;
            case 'custom':
                hint = '例如: gpt-4, claude-3-opus-20240229';
                break;
            default:
                hint = '例如: gpt-4, claude-3-opus-20240229';
        }

        modelInput.placeholder = placeholder;
        const hintElem = modelInput.nextElementSibling;
        if (hintElem && hintElem.classList.contains('form-hint')) {
            hintElem.textContent = hint;
        }
    }
}

// 从大模型配置页面保存配置
function saveAiConfigFromPage() {
    aiConfig = {
        provider: document.getElementById('aiConfigProvider').value,
        apiKey: document.getElementById('aiConfigApiKey').value.trim(),
        model: document.getElementById('aiConfigModel').value.trim(),
        apiEndpoint: document.getElementById('aiConfigCustomApiEndpoint').value.trim(),
        verified: false,
        verifiedAt: ''
    };
    localStorage.setItem('dailyTracker_aiConfig', JSON.stringify(aiConfig));
    updateAiConfigPageSection();
    showToast('AI配置已保存！');
}

// 更新大模型配置页面显示
function updateAiConfigPageSection() {
    const summary = document.getElementById('aiConfigPageSummary');
    if (!summary) return;

    if (aiConfig.verified) {
        summary.classList.remove('hidden');
        summary.textContent = `已配置：${getProviderLabel(aiConfig.provider)}${aiConfig.model ? ` (${aiConfig.model})` : ''}`;
        summary.style.color = 'var(--forest-color)';
    } else {
        summary.classList.add('hidden');
    }
}

function getProviderLabel(provider) {
    const labels = {
        openai: 'OpenAI',
        anthropic: 'Anthropic',
        deepseek: 'DeepSeek',
        moonshot: 'Moonshot',
        tongyi: '通义千问',
        custom: '自定义'
    };
    return labels[provider] || provider;
}

function hasUsableAiConfig() {
    if (!aiConfig?.apiKey) return false;
    if (aiConfig.provider === 'custom' && !aiConfig.apiEndpoint) return false;
    return true;
}

function getAiProviderLabel(provider) {
    const labels = {
        openai: 'OpenAI',
        anthropic: 'Anthropic',
        deepseek: 'DeepSeek',
        tongyi: '通义千问',
        custom: '自定义API'
    };
    return labels[provider] || provider || '未配置';
}

function buildAiConfigSummary() {
    const parts = [`<strong>${aiConfig.verified ? '已连接' : '已配置'}</strong> ${getAiProviderLabel(aiConfig.provider)}`];
    if (aiConfig.model) {
        parts.push(`模型：${aiConfig.model}`);
    } else {
        parts.push('模型：默认');
    }
    if (aiConfig.verifiedAt) {
        const verifiedDate = new Date(aiConfig.verifiedAt);
        if (!Number.isNaN(verifiedDate.getTime())) {
            parts.push(`最近验证：${verifiedDate.toLocaleString('zh-CN')}`);
        }
    }
    return parts.join(' · ');
}

function updateAiConfigSection(forceExpanded = null) {
    const formWrap = document.getElementById('aiConfigFormWrap');
    const summary = document.getElementById('aiConfigSummary');
    const editBtn = document.getElementById('editAiConfigBtn');
    if (!formWrap || !summary || !editBtn) return;

    const shouldCollapse = forceExpanded === null
        ? hasUsableAiConfig()
        : !forceExpanded;

    if (shouldCollapse) {
        formWrap.classList.add('hidden');
        summary.innerHTML = buildAiConfigSummary();
        summary.classList.remove('hidden');
        editBtn.classList.remove('hidden');
    } else {
        formWrap.classList.remove('hidden');
        if (hasUsableAiConfig()) {
            summary.innerHTML = buildAiConfigSummary();
            summary.classList.remove('hidden');
        } else {
            summary.classList.add('hidden');
            summary.innerHTML = '';
        }
        editBtn.classList.toggle('hidden', !hasUsableAiConfig());
    }
}

function markAiConfigVerified() {
    if (!hasUsableAiConfig()) return;
    aiConfig.verified = true;
    aiConfig.verifiedAt = new Date().toISOString();
    localStorage.setItem('dailyTracker_aiConfig', JSON.stringify(aiConfig));
    updateAiConfigSection();
}

function setAiApiKeyVisibility(visible) {
    const input = document.getElementById('aiApiKey');
    const toggleBtn = document.getElementById('toggleAiApiKeyBtn');
    if (!input || !toggleBtn) return;

    input.type = visible ? 'text' : 'password';
    toggleBtn.dataset.visible = visible ? 'true' : 'false';
    toggleBtn.textContent = visible ? '🙈' : '👁';
    toggleBtn.setAttribute('aria-label', visible ? '隐藏API密钥' : '显示API密钥');
    toggleBtn.title = visible ? '隐藏API密钥' : '显示API密钥';
}

function toggleAiPasswordVisibility(prefix) {
    const input = document.getElementById(`${prefix}ApiKey`);
    const toggleBtn = document.getElementById(`toggle${prefix.charAt(0).toUpperCase() + prefix.slice(1)}ApiKeyBtn`);
    if (!input || !toggleBtn) return;

    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    toggleBtn.textContent = isVisible ? '👁' : '🙈';
    toggleBtn.setAttribute('aria-label', isVisible ? '显示API密钥' : '隐藏API密钥');
    toggleBtn.title = isVisible ? '显示API密钥' : '隐藏API密钥';
}

function setAiConfigTestStatus(message = '', type = '') {
    const status = document.getElementById('aiConfigTestStatus');
    if (!status) return;

    if (!message) {
        status.textContent = '';
        status.classList.add('hidden');
        status.classList.remove('success', 'error');
        return;
    }

    status.textContent = message;
    status.classList.remove('hidden');
    status.classList.toggle('success', type === 'success');
    status.classList.toggle('error', type === 'error');
}

function setAiConfigPageTestStatus(message = '', type = '') {
    const status = document.getElementById('aiConfigPageTestStatus');
    if (!status) return;

    if (!message) {
        status.textContent = '';
        status.classList.add('hidden');
        status.classList.remove('success', 'error');
        return;
    }

    status.textContent = message;
    status.classList.remove('hidden');
    status.classList.toggle('success', type === 'success');
    status.classList.toggle('error', type === 'error');
}

async function testAiConfigConnection() {
    const testBtn = document.getElementById('testAiConfigBtn');
    if (!testBtn) return;

    const config = getAiConfigFromForm();
    if (!config.apiKey) {
        setAiConfigTestStatus('请先填写 API 密钥', 'error');
        showToast('请先填写API密钥');
        return;
    }
    if (config.provider === 'custom' && !config.apiEndpoint) {
        setAiConfigTestStatus('自定义 API 需要填写接口地址', 'error');
        showToast('请先填写自定义API端点');
        return;
    }

    const originalText = testBtn.textContent;
    testBtn.disabled = true;
    setAiConfigTestStatus('正在测试连接，请稍候...', '');
    testBtn.textContent = '测试中...';

    try {
        await callAiApi('请只回复”连接成功”四个字。', { config });
        aiConfig = {
            ...config,
            verified: true,
            verifiedAt: new Date().toISOString()
        };
        localStorage.setItem('dailyTracker_aiConfig', JSON.stringify(aiConfig));
        updateAiConfigSection(true);
        setAiConfigTestStatus('连接成功，可以正常访问大模型', 'success');
        showToast('大模型连接成功');
    } catch (error) {
        console.error('测试AI连接失败:', error);
        setAiConfigTestStatus(`连接失败：${error.message}`, 'error');
        showToast('大模型连接失败');
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = originalText;
    }
}

async function testAiConfigConnectionPage() {
    const testBtn = document.getElementById('testAiConfigPageBtn');
    if (!testBtn) return;

    const config = {
        provider: document.getElementById('aiConfigProvider').value,
        apiKey: document.getElementById('aiConfigApiKey').value.trim(),
        model: document.getElementById('aiConfigModel').value.trim(),
        apiEndpoint: document.getElementById('aiConfigCustomApiEndpoint').value.trim()
    };

    if (!config.apiKey) {
        setAiConfigPageTestStatus('请先填写 API 密钥', 'error');
        showToast('请先填写API密钥');
        return;
    }
    if (config.provider === 'custom' && !config.apiEndpoint) {
        setAiConfigPageTestStatus('自定义 API 需要填写接口地址', 'error');
        showToast('请先填写自定义API端点');
        return;
    }

    const originalText = testBtn.textContent;
    testBtn.disabled = true;
    setAiConfigPageTestStatus('正在测试连接，请稍候...', '');
    testBtn.textContent = '测试中...';

    try {
        await callAiApi('请只回复”连接成功”四个字。', { config });
        aiConfig = {
            ...config,
            verified: true,
            verifiedAt: new Date().toISOString()
        };
        localStorage.setItem('dailyTracker_aiConfig', JSON.stringify(aiConfig));
        updateAiConfigPageSection();
        setAiConfigPageTestStatus('连接成功，可以正常访问大模型', 'success');
        showToast('大模型连接成功');
    } catch (error) {
        console.error('测试AI连接失败:', error);
        setAiConfigPageTestStatus(`连接失败：${error.message}`, 'error');
        showToast('大模型连接失败');
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = originalText;
    }
}

// 打开AI诊断模态框
function openAiDiagnosisModal() {
    loadAiConfig();
    updateAiDataPreview();
    resetAiProcess();
    setAiConfigTestStatus();
    setAiApiKeyVisibility(false);
    updateAiConfigSection();
    document.getElementById('aiDiagnosisModal').style.display = 'block';
    renderAiConversation();
}

function resetAiProcess() {
    const section = document.getElementById('aiTraceSection');
    const output = document.getElementById('aiTraceOutput');
    if (!section || !output) return;

    section.classList.add('hidden');
    output.value = '';
}

function renderAiBasis({ startDate, endDate, analysisData }) {
    const options = [];
    if (analysisData.options.includeActivities) options.push('活动记录');
    if (analysisData.options.includeHealth) options.push('健康数据');
    if (analysisData.options.includeProfile) options.push('个人档案');
    if (analysisData.options.includeMedication) options.push('用药分析');

    appendAiProcess('success', `分析范围：${startDate} 至 ${endDate}。`);
    appendAiProcess(
        'success',
        `纳入数据：活动 ${analysisData.activities.length} 条，健康 ${analysisData.healthRecords.length} 条，症状 ${analysisData.symptomRecords.length} 条，日记 ${analysisData.dailyNotes.length} 条，个人档案 ${analysisData.profile ? '已纳入' : '未纳入'}。`
    );
    appendAiProcess('success', `分析选项：${options.join('、') || '无'}。`);
    appendAiProcess('success', `额外问题：${analysisData.customPrompt || '无'}。`);
}

function appendAiProcess(status, message) {
    const section = document.getElementById('aiTraceSection');
    const output = document.getElementById('aiTraceOutput');
    if (!section || !output) return;

    section.classList.remove('hidden');
    const timeText = new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const statusMap = {
        running: '进行中',
        success: '完成',
        error: '失败'
    };
    const line = `[${timeText}] [${statusMap[status] || '信息'}] ${message}`;
    output.value = output.value ? `${output.value}\n\n${line}` : line;
    output.scrollTop = output.scrollHeight;
}

function resetAiConversation() {
    aiConversationContext = null;
    aiConversationHistory = [];
    aiConversationBusy = false;
    const input = document.getElementById('aiFollowupInput');
    if (input) input.value = '';
    renderAiConversation();
}

function renderAiConversation() {
    const section = document.getElementById('aiChatSection');
    const container = document.getElementById('aiChatMessages');
    const sendBtn = document.getElementById('sendAiFollowupBtn');
    const input = document.getElementById('aiFollowupInput');
    if (!section || !container || !sendBtn || !input) return;

    if (!aiConversationContext) {
        section.classList.add('hidden');
        container.innerHTML = '';
        sendBtn.disabled = false;
        input.disabled = false;
        return;
    }

    section.classList.remove('hidden');
    const introMessage = `
        <div class="ai-chat-message assistant">
            <span class="ai-chat-role">AI 助手</span>
            <div class="ai-chat-content">已载入本次诊断结果上下文，你可以继续追问更具体的问题。</div>
        </div>
    `;

    container.innerHTML = introMessage + aiConversationHistory.map(message => `
        <div class="ai-chat-message ${message.role}">
            <span class="ai-chat-role">${message.role === 'user' ? '我' : 'AI 助手'}</span>
            <div class="ai-chat-content">${formatAiResponse(message.content)}</div>
        </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
    sendBtn.disabled = aiConversationBusy;
    input.disabled = aiConversationBusy;
}

// 更新AI数据预览
function updateAiDataPreview() {
    const range = document.querySelector('input[name="aiRange"]:checked').value;
    const { startDate, endDate } = getAiDateRange(range);

    let activityCount = 0;
    let healthCount = 0;
    let symptomCount = 0;
    let dayCount = 0;

    for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
        const dateKey = formatDateKey(d);
        if (allActivitiesData[dateKey]) {
            activityCount += allActivitiesData[dateKey].length;
        }
        if (allHealthRecordsData[dateKey]) {
            healthCount += allHealthRecordsData[dateKey].length;
        }
        if (allSymptomRecordsData[dateKey]) {
            symptomCount += allSymptomRecordsData[dateKey].length;
        }
        if (allActivitiesData[dateKey] || allHealthRecordsData[dateKey] || allSymptomRecordsData[dateKey]) {
            dayCount++;
        }
    }

    document.getElementById('aiActivityCount').textContent = activityCount;
    document.getElementById('aiHealthCount').textContent = healthCount + symptomCount;
    document.getElementById('aiDayCount').textContent = dayCount;
}

// 获取AI分析日期范围
function getAiDateRange(range) {
    const endDate = new Date();
    let startDate = new Date();

    switch (range) {
        case 'today':
            break;
        case '3days':
            startDate.setDate(endDate.getDate() - 2);
            break;
        case 'week':
            startDate.setDate(endDate.getDate() - 6);
            break;
        case 'month':
            startDate.setDate(endDate.getDate() - 29);
            break;
        case 'quarter':
            startDate.setDate(endDate.getDate() - 89);
            break;
        case 'custom':
            const isAiPage = currentPage === 'ai';
            const prefix = isAiPage ? 'aiPage' : 'ai';
            const customStart = document.getElementById(`${prefix}StartDate`)?.value;
            const customEnd = document.getElementById(`${prefix}EndDate`)?.value;
            if (customStart && customEnd) {
                return { startDate: customStart, endDate: customEnd };
            }
            // 自定义范围未填写完整时，回退到今天
            break;
        default:
            break;
    }

    return {
        startDate: formatDateKey(startDate),
        endDate: formatDateKey(endDate)
    };
}

// 开始AI诊断
async function startAiDiagnosis() {
    const btn = document.getElementById('startAiDiagnosisBtn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    const resultSection = document.getElementById('aiResultSection');
    const resultContent = document.getElementById('aiResultContent');

    resetAiProcess();
    resetAiConversation();
    appendAiProcess('running', '开始诊断，正在检查配置。');

    // 验证API配置
    if (!aiConfig.apiKey) {
        appendAiProcess('error', '未检测到 API 密钥，请先保存 AI 配置。');
        showToast('请先配置API密钥！');
        return;
    }

    // 显示加载状态
    btn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');
    resultSection.classList.add('hidden');
    resultContent.innerHTML = '';

    try {
        appendAiProcess('success', 'AI 配置检查通过。');

        // 收集数据
        const range = document.querySelector('input[name="aiRange"]:checked').value;
        const { startDate, endDate } = getAiDateRange(range);
        appendAiProcess('running', `正在汇总 ${startDate} 至 ${endDate} 的活动、健康和档案数据。`);
        const analysisData = collectAnalysisData(startDate, endDate);
        appendAiProcess(
            'success',
            `数据汇总完成：${analysisData.activities.length} 条活动，${analysisData.healthRecords.length} 条健康数据，${analysisData.symptomRecords.length} 条症状记录，${analysisData.dailyNotes.length} 条日记${analysisData.profile ? '，含个人档案' : ''}。`
        );

        // 构建提示词
        const prompt = buildAnalysisPrompt(analysisData);
        renderAiBasis({
            startDate,
            endDate,
            analysisData
        });

        // 调用AI API
        appendAiProcess('running', '正在请求 AI 服务，请稍候。');
        const response = await callAiApi(prompt);
        markAiConfigVerified();
        appendAiProcess('success', 'AI 服务已返回结果，正在整理展示内容。');

        // 显示结果
        resultContent.innerHTML = formatAiResponse(response);
        resultSection.classList.remove('hidden');
        appendAiProcess('success', '诊断结果已生成并显示。');
        aiConversationContext = {
            diagnosisResult: response,
            startDate,
            endDate
        };
        aiConversationHistory = [];
        renderAiConversation();

        showToast('AI诊断完成！');
    } catch (error) {
        console.error('AI诊断失败:', error);
        appendAiProcess('error', `诊断失败：${error.message}`);
        resultContent.innerHTML = `<div class="ai-error">
            <strong>诊断失败：</strong>
            <p>${error.message}</p>
            <p>请检查您的API配置和网络连接，然后重试。</p>
        </div>`;
        resultSection.classList.remove('hidden');
        showToast('诊断失败，请重试');
    } finally {
        // 恢复按钮状态
        btn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

async function sendAiFollowup() {
    if (aiConversationBusy) return;
    if (!aiConversationContext?.diagnosisResult) {
        showToast('请先完成一次 AI 诊断');
        return;
    }

    const input = document.getElementById('aiFollowupInput');
    const question = input.value.trim();
    if (!question) {
        showToast('请输入追问内容');
        return;
    }

    aiConversationHistory.push({ role: 'user', content: question });
    input.value = '';
    aiConversationBusy = true;
    renderAiConversation();
    appendAiProcess('running', '正在处理追问。');

    try {
        const messages = [
            {
                role: 'user',
                content: `以下是你刚刚已经完成的一份健康诊断结果，请在此基础上继续回答用户追问。\n分析范围：${aiConversationContext.startDate} 至 ${aiConversationContext.endDate}`
            },
            {
                role: 'assistant',
                content: aiConversationContext.diagnosisResult
            },
            ...aiConversationHistory
        ];

	        const response = await callAiApi(messages, {
	            systemPrompt: '你是一位专业、友好的健康顾问。请基于已有诊断结果继续回答用户追问，避免重复整份报告；保持中文表达清晰简洁；不要做医疗诊断结论，对于明显异常情况建议咨询专业医生。'
	        });
            markAiConfigVerified();

	        aiConversationHistory.push({ role: 'assistant', content: response });
        appendAiProcess('success', '追问回答已生成。');
    } catch (error) {
        console.error('AI追问失败:', error);
        aiConversationHistory.push({
            role: 'assistant',
            content: `追问失败：${error.message}\n请检查 API 配置或网络连接后重试。`
        });
        appendAiProcess('error', `追问失败：${error.message}`);
    } finally {
        aiConversationBusy = false;
        renderAiConversation();
    }
}

// 收集分析数据
function collectAnalysisData(startDate, endDate) {
    const isAiPage = currentPage === 'ai';
    const prefix = isAiPage ? 'aiPage' : 'ai';

    const data = {
        period: { start: startDate, end: endDate },
        activities: [],
        healthRecords: [],
        symptomRecords: [],
        dailyNotes: [],
        profile: null,
        options: {
            includeActivities: document.getElementById(`${prefix}IncludeActivities`)?.checked ?? true,
            includeHealth: document.getElementById(`${prefix}IncludeHealth`)?.checked ?? true,
            includeProfile: document.getElementById(`${prefix}IncludeProfile`)?.checked ?? true,
            includeMedication: document.getElementById(`${prefix}IncludeMedication`)?.checked ?? true
        },
        customPrompt: document.getElementById(`${prefix}CustomPrompt`)?.value.trim() || ''
    };

    // 收集活动数据
    if (data.options.includeActivities) {
        for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
            const dateKey = formatDateKey(d);
            if (allActivitiesData[dateKey]) {
                allActivitiesData[dateKey].map(normalizeActivity).forEach(activity => {
                    data.activities.push({
                        date: dateKey,
                        time: getActivityTimeRangeText(activity),
                        type: activity.type,
                        content: activity.content,
                        feeling: activity.feeling,
                        duration: getActivityDuration(activity)
                    });
                });
            }
        }
    }

    // 收集健康数据
    if (data.options.includeHealth) {
        for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
            const dateKey = formatDateKey(d);
            if (allHealthRecordsData[dateKey]) {
                allHealthRecordsData[dateKey].forEach(record => {
                    data.healthRecords.push({
                        date: dateKey,
                        time: record.time || record.recordTime || '',
                        type: record.type,
                        value: record.value,
                        unit: record.unit,
                        notes: record.notes
                    });
                });
            }
        }
    }

    for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
        const dateKey = formatDateKey(d);
        if (allDailyNotesData[dateKey]?.content) {
            data.dailyNotes.push({
                date: dateKey,
                content: allDailyNotesData[dateKey].content,
                updatedAt: allDailyNotesData[dateKey].updatedAt || ''
            });
        }
    }

    if (data.options.includeHealth) {
        for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
            const dateKey = formatDateKey(d);
            if (allSymptomRecordsData[dateKey]) {
                allSymptomRecordsData[dateKey].forEach(record => {
                    data.symptomRecords.push({
                        date: dateKey,
                        time: record.time,
                        description: record.description,
                        measures: record.measures
                    });
                });
            }
        }
    }

    // 收集个人信息
    if (data.options.includeProfile && Object.keys(profile).length > 0) {
        data.profile = {
            name: profile.name || '',
            gender: profile.gender || '',
            age: profile.age || '',
            height: profile.height || '',
            weight: profile.weight || '',
            bloodType: profile.bloodType || '',
            bloodPressure: profile.bloodPressure || '',
            bloodSugar: profile.bloodSugar || '',
            chronicConditions: profile.chronicConditions || '',
            allergies: profile.allergies || '',
            medications: profile.medications || '',
            healthGoals: profile.healthGoals || ''
        };
    }

    return data;
}

// 构建分析提示词
function buildAnalysisPrompt(data) {
    let prompt = `你是一位专业的健康顾问。请根据以下健康记录数据，为用户提供健康状况评估和建议。

【分析时间范围】${data.period.start} 至 ${data.period.end}
【数据说明】这是一份日常健康记录，包含活动记录、健康指标和症状记录数据。

`;

    // 添加个人信息
    if (data.profile) {
        prompt += `【个人基础信息】\n`;
        if (data.profile.age) prompt += `- 年龄：${data.profile.age}岁\n`;
        if (data.profile.gender) prompt += `- 性别：${data.profile.gender === 'male' ? '男' : data.profile.gender === 'female' ? '女' : '其他'}\n`;
        if (data.profile.height) prompt += `- 身高：${data.profile.height}cm\n`;
        if (data.profile.weight) prompt += `- 体重：${data.profile.weight}kg\n`;
        if (data.profile.bloodType) prompt += `- 血型：${data.profile.bloodType}型\n`;
        if (data.profile.bloodPressure) prompt += `- 常见血压：${data.profile.bloodPressure}\n`;
        if (data.profile.bloodSugar) prompt += `- 常见血糖：${data.profile.bloodSugar}\n`;
        if (data.profile.chronicConditions) prompt += `- 慢性病/病史：${data.profile.chronicConditions}\n`;
        if (data.profile.allergies) prompt += `- 过敏史：${data.profile.allergies}\n`;
        if (data.profile.medications) prompt += `- 长期用药：${data.profile.medications}\n`;
        if (data.profile.healthGoals) prompt += `- 健康目标：${data.profile.healthGoals}\n`;
        prompt += `\n`;
    }

    // 添加活动数据摘要
    if (data.activities.length > 0) {
        prompt += `【活动记录摘要】共${data.activities.length}条\n`;

        // 按类型统计
        const typeStats = {};
        const medicationList = [];
        data.activities.forEach(a => {
            typeStats[a.type] = (typeStats[a.type] || 0) + 1;
            if (a.type === 'medication') {
                medicationList.push(`${a.date} ${a.time}: ${a.content}`);
            }
        });

        prompt += `活动类型分布：\n`;
        Object.entries(typeStats).forEach(([type, count]) => {
            const label = typeLabels[type] || type;
            prompt += `- ${label}：${count}次\n`;
        });

        // 用药记录
        if (data.options.includeMedication && medicationList.length > 0) {
            prompt += `\n用药记录（部分）：\n`;
            medicationList.slice(0, 10).forEach(m => {
                prompt += `- ${m}\n`;
            });
            if (medicationList.length > 10) {
                prompt += `...（共${medicationList.length}条用药记录）\n`;
            }
        }

        // 运动统计
        const exerciseRecords = data.activities.filter(a => a.type === 'exercise' && getActivityDuration(a));
        if (exerciseRecords.length > 0) {
            const totalDuration = exerciseRecords.reduce((sum, r) => sum + (getActivityDuration(r) || 0), 0);
            prompt += `\n运动统计：共${exerciseRecords.length}次运动，总计${totalDuration}分钟\n`;
        }

        prompt += `\n`;
    }

    // 添加健康数据
    if (data.healthRecords.length > 0) {
        prompt += `【健康指标数据】共${data.healthRecords.length}条\n`;

        // 按类型分组
        const healthByType = {};
        data.healthRecords.forEach(r => {
            if (!healthByType[r.type]) healthByType[r.type] = [];
            healthByType[r.type].push(r);
        });

        Object.entries(healthByType).forEach(([type, records]) => {
            const label = healthTypeLabels[type] || type;
            prompt += `\n${label}记录（${records.length}条）：\n`;
            records.slice(-5).forEach(r => {
                prompt += `- ${r.date} ${r.time || ''}: ${r.value}${r.unit || ''}${r.notes ? `（${r.notes}）` : ''}\n`;
            });
        });

        prompt += `\n`;
    }

    if (data.symptomRecords.length > 0) {
        prompt += `【症状记录】共${data.symptomRecords.length}条\n`;
        data.symptomRecords.slice(-10).forEach(record => {
            prompt += `- ${record.date} ${record.time}：${record.description}`;
            if (record.measures) {
                prompt += `；处理措施：${record.measures}`;
            }
            prompt += `\n`;
        });
        prompt += `\n`;
    }

    if (data.dailyNotes.length > 0) {
        prompt += `【每日状态记录】共${data.dailyNotes.length}条\n`;
        data.dailyNotes.slice(-10).forEach(note => {
            prompt += `- ${note.date}：${note.content}\n`;
        });
        prompt += `\n`;
    }

    // 添加用户自定义问题
    if (data.customPrompt) {
        prompt += `【用户关注的问题】\n${data.customPrompt}\n\n`;
    }

    prompt += `【分析要求】
请基于以上数据，提供一份专业、友好的健康分析报告，包括：

1. **健康状况概述**：总结用户最近一段时间的整体健康状况
2. **数据分析**：
   - 活动规律性分析（饮食、运动、睡眠等）
   - 健康指标趋势分析（血压、心率、血糖等）
   - 用药情况分析（如果相关）
3. **风险识别**：指出可能存在的健康风险或需要关注的方面
4. **改善建议**：提供3-5条具体、可操作的健康改善建议
5. **下次关注点**：建议下次应该重点关注的指标或习惯

注意事项：
- 回复要用中文，语气专业且友好
- 如果数据不足，请明确指出，并给出建议如何完善记录
- 不要做出诊断性结论，只基于数据给出分析和建议
- 对于异常指标，请建议咨询专业医生
- 建议要具体可行，符合用户的生活背景

请开始您的分析：`;

    return prompt;
}

// 调用AI API
async function callAiApi(promptOrMessages, options = {}) {
    const config = options.config || aiConfig;
    const { provider, apiKey, model, apiEndpoint } = config;
    const systemPrompt = options.systemPrompt || '你是一位专业的健康顾问，擅长分析健康数据并提供个性化建议。';
    const messages = Array.isArray(promptOrMessages)
        ? promptOrMessages
        : typeof promptOrMessages === 'string'
            ? [{ role: 'user', content: promptOrMessages }]
            : [promptOrMessages];

    let apiUrl = '';
    let headers = {
        'Content-Type': 'application/json'
    };
    let body = {};

    switch (provider) {
        case 'openai':
            apiUrl = 'https://api.openai.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 2000
            };
            break;

        case 'anthropic':
            apiUrl = 'https://api.anthropic.com/v1/messages';
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            body = {
                model: model || 'claude-3-haiku-20240307',
                system: systemPrompt,
                max_tokens: 2000,
                messages: messages.map(message => ({
                    role: message.role === 'assistant' ? 'assistant' : 'user',
                    content: message.content
                }))
            };
            break;

        case 'deepseek':
            apiUrl = 'https://api.deepseek.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model || 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 2000
            };
            break;

        case 'tongyi':
            apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model || 'qwen-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 2000
            };
            break;

        case 'custom':
            apiUrl = apiEndpoint;
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model || 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 2000
            };
            break;

        default:
            throw new Error('不支持的AI服务提供商');
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API请求失败 (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();

    // 根据不同提供商解析响应
    if (provider === 'anthropic') {
        return result.content[0].text;
    } else {
        return result.choices[0].message.content;
    }
}

// 转换multimodal content为Anthropic格式
function convertToAnthropicContent(content) {
    // 纯字符串直接返回
    if (typeof content === 'string') return content;
    // 数组格式（multimodal）→ 转换为 Anthropic content blocks
    if (!Array.isArray(content)) return content;

    return content.map(block => {
        if (block.type === 'text') {
            return { type: 'text', text: block.text };
        }
        if (block.type === 'image_url' && block.image_url?.url) {
            // data:image/jpeg;base64,xxxx → 提取 media_type 和 data
            const match = block.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                return {
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: match[1],
                        data: match[2]
                    }
                };
            }
            // URL格式
            return {
                type: 'image',
                source: { type: 'url', url: block.image_url.url }
            };
        }
        return block;
    });
}

// 调用AI API（流式输出）
async function callAiApiStream(promptOrMessages, options = {}, onChunk) {
    const config = options.config || aiConfig;
    const { provider, apiKey, model, apiEndpoint } = config;
    const systemPrompt = options.systemPrompt || '你是一位专业的健康顾问，擅长分析健康数据并提供个性化建议。';
    const messages = Array.isArray(promptOrMessages)
        ? promptOrMessages
        : typeof promptOrMessages === 'string'
            ? [{ role: 'user', content: promptOrMessages }]
            : [promptOrMessages];

    let apiUrl = '';
    let headers = {
        'Content-Type': 'application/json'
    };
    let body = {};

    switch (provider) {
        case 'openai':
            apiUrl = 'https://api.openai.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 2000,
                stream: true
            };
            break;

        case 'anthropic':
            apiUrl = 'https://api.anthropic.com/v1/messages';
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
            body = {
                model: model || 'claude-3-haiku-20240307',
                system: systemPrompt,
                max_tokens: 2000,
                stream: true,
                messages: messages.map(message => ({
                    role: message.role === 'assistant' ? 'assistant' : 'user',
                    content: convertToAnthropicContent(message.content)
                }))
            };
            break;

        case 'deepseek':
            apiUrl = 'https://api.deepseek.com/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model || 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 2000,
                stream: true
            };
            break;

        case 'tongyi':
            apiUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model || 'qwen-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 2000,
                stream: true
            };
            break;

        case 'custom':
            apiUrl = apiEndpoint;
            headers['Authorization'] = `Bearer ${apiKey}`;
            body = {
                model: model || 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 2000,
                stream: true
            };
            break;

        default:
            throw new Error('不支持的AI服务提供商');
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API请求失败 (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);

                    // 根据不同提供商提取文本
                    let content = '';
                    if (provider === 'anthropic') {
                        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                            content = parsed.delta.text;
                        }
                    } else {
                        // OpenAI-compatible
                        if (parsed.choices?.[0]?.delta?.content) {
                            content = parsed.choices[0].delta.content;
                        }
                    }

                    if (content) {
                        fullText += content;
                        if (onChunk) onChunk(content, fullText);
                    }
                } catch (e) {
                    // 忽略解析错误
                }
            }
        }
    }

    return fullText;
}

// 格式化AI响应
function formatAiResponse(response) {
    let html = response;

    // 代码块（```...```）— 先提取保护
    const codeBlocks = [];
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        codeBlocks.push(`<pre><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`);
        return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
    });

    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 分隔线（---、***、___）→ 移除
    html = html.replace(/^[-*_]{3,}\s*$/gm, '');

    // 标题（行首 #，从多到少匹配）
    html = html.replace(/^#{5,}\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#\s+(.+)$/gm, '<h3>$1</h3>');

    // 加粗、斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 无序列表（- 或 *）
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');

    // 有序列表（1. 2. ...）
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // 将连续 <li> 包裹为 <ul>
    html = html.replace(/((?:<li>[\s\S]*?<\/li>\s*)+)/g, '<ul>$1</ul>');

    // 段落处理：连续两个换行 → 段落分隔
    html = html.replace(/\n{2,}/g, '</p><p>');
    // 单个换行 → <br>
    html = html.replace(/\n/g, '<br>');
    // 包裹首尾 <p>
    html = '<p>' + html + '</p>';

    // 清理：移除包裹了块级元素的 <p> 标签
    html = html.replace(/<p>\s*(<h[34]>)/g, '$1');
    html = html.replace(/(<\/h[34]>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)\s*<\/p>/g, '$1');
    // 清理空 <p> 和仅含 <br> 的 <p>
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>(<br>)+<\/p>/g, '');
    // 清理标题前后多余 <br>
    html = html.replace(/<br>\s*(<h[34]>)/g, '$1');
    html = html.replace(/(<\/h[34]>)\s*<br>/g, '$1');
    // 清理 <ul> 前后多余 <br>
    html = html.replace(/<br>\s*(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)\s*<br>/g, '$1');
    // 清理 <ul> 内多余 <br>
    html = html.replace(/<ul><br>/g, '<ul>');
    html = html.replace(/<br><\/ul>/g, '</ul>');
    html = html.replace(/<\/li><br><li>/g, '</li><li>');
    html = html.replace(/<\/li><br>/g, '</li>');
    // 清理开头结尾多余 <br>
    html = html.replace(/^<p><br>/g, '<p>');
    html = html.replace(/<br><\/p>$/g, '</p>');

    // 恢复代码块
    codeBlocks.forEach((block, i) => {
        html = html.replace(`%%CODEBLOCK_${i}%%`, block);
    });

    return html;
}

// 复制AI结果
function copyAiResult() {
    const resultContent = document.getElementById('aiResultContent');
    const text = resultContent.innerText || resultContent.textContent;

    navigator.clipboard.writeText(text).then(() => {
        showToast('已复制到剪贴板');
    }).catch(() => {
        showToast('复制失败');
    });
}

// AI诊断相关事件监听
function initAiDiagnosisEvents() {
    try {
        // 保存AI配置
        const saveBtn = document.getElementById('saveAiConfigBtn');
        if (saveBtn) saveBtn.addEventListener('click', saveAiConfig);

        const testBtn = document.getElementById('testAiConfigBtn');
        if (testBtn) testBtn.addEventListener('click', testAiConfigConnection);

        // 提供商切换
        const provider = document.getElementById('aiProvider');
        if (provider) {
            provider.addEventListener('change', () => {
                syncAiProviderFields();
            });
        }

        const editAiConfigBtn = document.getElementById('editAiConfigBtn');
        if (editAiConfigBtn) {
            editAiConfigBtn.addEventListener('click', () => {
                updateAiConfigSection(true);
            });
        }

        const toggleAiApiKeyBtn = document.getElementById('toggleAiApiKeyBtn');
        if (toggleAiApiKeyBtn) {
            toggleAiApiKeyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const isVisible = toggleAiApiKeyBtn.dataset.visible === 'true';
                setAiApiKeyVisibility(!isVisible);
            });
        }

        // 数据范围选择
        document.querySelectorAll('input[name="aiRange"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const dateInputs = document.getElementById('aiDateRangeInputs');
                if (dateInputs) {
                    if (radio.value === 'custom') {
                        dateInputs.classList.remove('hidden');
                    } else {
                        dateInputs.classList.add('hidden');
                    }
                }
                updateAiDataPreview();
            });
        });

        // 自定义日期变化
        const startDate = document.getElementById('aiStartDate');
        const endDate = document.getElementById('aiEndDate');
        if (startDate) startDate.addEventListener('change', updateAiDataPreview);
        if (endDate) endDate.addEventListener('change', updateAiDataPreview);

        // 开始诊断
        const startBtn = document.getElementById('startAiDiagnosisBtn');
        if (startBtn) startBtn.addEventListener('click', startAiDiagnosis);

        const followupBtn = document.getElementById('sendAiFollowupBtn');
        if (followupBtn) followupBtn.addEventListener('click', sendAiFollowup);

        const followupInput = document.getElementById('aiFollowupInput');
        if (followupInput) {
            followupInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    sendAiFollowup();
                }
            });
        }

        // 复制结果
        const copyBtn = document.getElementById('copyAiResultBtn');
        if (copyBtn) copyBtn.addEventListener('click', copyAiResult);
    } catch (error) {
        console.error('初始化AI诊断事件失败:', error);
    }
}
window.handleTemplateFormSubmit = handleTemplateFormSubmit;


function setupImageViewer() {
    const modal = document.getElementById('imageViewerModal');
    const closeBtn = document.querySelector('.image-viewer-close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
}


let currentLoginType = 'password';
let smsCodeCountdown = 0;
let smsCodeTimer = null;

function switchLoginType(type) {
    currentLoginType = type;
    
    // 更新标签状态
    document.querySelectorAll('.cloud-login-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.loginType === type);
    });
    
    // 更新账号标签和输入框提示
    const accountLabel = document.querySelector('label[for="cloudAccount"]');
    const accountInput = document.getElementById('cloudAccount');
    
    if (type === 'password') {
        if (accountLabel) accountLabel.textContent = '账号';
        if (accountInput) accountInput.placeholder = '请输入电子邮件或手机号码';
    } else {
        if (accountLabel) accountLabel.textContent = '手机号';
        if (accountInput) accountInput.placeholder = '请输入手机号码';
    }
    
    // 切换表单显示
    const passwordForm = document.getElementById('passwordLoginForm');
    const smsForm = document.getElementById('smsLoginForm');
    
    if (type === 'password') {
        passwordForm.classList.remove('hidden');
        smsForm.classList.add('hidden');
    } else {
        passwordForm.classList.add('hidden');
        smsForm.classList.remove('hidden');
    }
}

async function sendSmsCode() {
    const account = document.getElementById('cloudAccount').value.trim();
    const envId = document.getElementById('cloudEnvId').value.trim();
    const sendBtn = document.getElementById('sendSmsCodeBtn');
    
    if (!account) {
        showToast('请输入手机号码');
        return;
    }
    
    // 简单验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(account)) {
        showToast('请输入有效的手机号码');
        return;
    }
    
    if (!envId) {
        showToast('请输入同步服务地址');
        return;
    }
    
    try {
        sendBtn.disabled = true;
        
        const response = await fetch(`${envId}/api/auth/send-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: account })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '发送验证码失败');
        }
        
        showToast('验证码已发送');
        startSmsCountdown();
        
    } catch (error) {
        console.error('发送验证码失败:', error);
        showToast(error.message || '发送验证码失败，请检查网络连接');
        sendBtn.disabled = false;
    }
}

function startSmsCountdown() {
    const sendBtn = document.getElementById('sendSmsCodeBtn');
    smsCodeCountdown = 60;
    
    if (smsCodeTimer) {
        clearInterval(smsCodeTimer);
    }
    
    updateSmsButtonText();
    
    smsCodeTimer = setInterval(() => {
        smsCodeCountdown--;
        
        if (smsCodeCountdown <= 0) {
            clearInterval(smsCodeTimer);
            smsCodeTimer = null;
            sendBtn.disabled = false;
            sendBtn.textContent = '发送验证码';
        } else {
            updateSmsButtonText();
        }
    }, 1000);
}

function updateSmsButtonText() {
    const sendBtn = document.getElementById('sendSmsCodeBtn');
    sendBtn.textContent = `${smsCodeCountdown}秒后重试`;
}
