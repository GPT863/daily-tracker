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
let pendingActivityImage = null;
let pendingReminderImage = null;
let pendingHealthImage = null;
let pendingSymptomImage = null;
let profile = {};
let metadata = {};
let activeReminderAlertId = null;
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
let cloudSyncBusy = false;
let cloudSyncTimer = null;
let calendarViewDate = new Date();

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
let serviceWorkerRegistration = null;
let pendingImportData = null;
let submitLocks = {
    activity: false,
    health: false,
    symptom: false,
    reminder: false,
    import: false
};

const STORAGE_SCHEMA_VERSION = 2;
const BACKUP_REMINDER_DAYS = 7;
const legacyStorageKeys = {
    activities: 'dailyTracker_activities',
    healthRecords: 'dailyTracker_healthRecords',
    symptomRecords: 'dailyTracker_symptomRecords',
    dailyNotes: 'dailyTracker_dailyNotes',
    reminders: 'dailyTracker_reminders',
    profile: 'dailyTracker_profile',
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

// 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    loadActivities();
    loadHealthRecords();
    loadSymptomRecords();
    loadReminders();
    loadProfile();
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
        profile: {},
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
        profile: getLocalStorageJSON(legacyStorageKeys.profile, {}),
        metadata: {
            ...getDefaultMetadata(),
            ...getLocalStorageJSON(legacyStorageKeys.metadata, {})
        }
    };

    try {
        await openIndexedDB();
        const keys = ['activities', 'healthRecords', 'symptomRecords', 'dailyNotes', 'reminders', 'profile', 'metadata'];
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
            profile: indexedState.profile || {},
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

    const state = {
        activities: allActivitiesData,
        healthRecords: allHealthRecordsData,
        symptomRecords: allSymptomRecordsData,
        dailyNotes: allDailyNotesData,
        reminders,
        profile,
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
        setLocalStorageJSON(legacyStorageKeys.profile, profile);
        setLocalStorageJSON(legacyStorageKeys.metadata, metadata);
    } catch (error) {
        throw new Error('STORAGE_WRITE_FAILED');
    }

    if (!options.skipAutoCloudSync) {
        scheduleCloudAutoSync();
    }
}

async function initDB() {
    const state = await initializeStorageState();
    allActivitiesData = state.activities || {};
    allHealthRecordsData = state.healthRecords || {};
    allSymptomRecordsData = state.symptomRecords || {};
    allDailyNotesData = state.dailyNotes || {};
    reminders = normalizeReminders(state.reminders || []);
    profile = state.profile || {};
    metadata = {
        ...getDefaultMetadata(),
        ...(state.metadata || {})
    };

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
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
        [getDateKey(today)]: [
            createMockActivity('a1', '07:10', 'sleep', '昨晚睡了7.5小时', '早上起床状态不错，精神比较稳定', null, createMockImageDataUri('睡眠', '#b8e6c6', '#5fae75', '月亮和叶片')),
            createMockActivity('a2', '08:00', 'meal', '早餐：全麦面包、鸡蛋、牛奶', '吃完很踏实，胃里很舒服', 20, createMockImageDataUri('早餐', '#f5d68b', '#88b56a', '燕麦与鸡蛋')),
            createMockActivity('a3', '09:00', 'medication', '维生素D 1粒', '无明显不适'),
            createMockActivity('a4', '12:20', 'meal', '午餐：糙米饭、清炒西兰花、鸡胸肉', '清爽不油腻，下午不犯困', 30, createMockImageDataUri('午餐', '#d9f0c7', '#76a95d', '糙米饭和西兰花')),
            createMockActivity('a5', '15:30', 'work', '整理本周健康记录', '复盘后更清楚自己的作息问题', 45),
            createMockActivity('a6', '19:10', 'exercise', '快走 + 拉伸', '微微出汗，腿部放松很多', 40, createMockImageDataUri('运动', '#b7ead8', '#3c8f68', '快走与拉伸')),
            createMockActivity('a7', '20:10', 'meal', '晚餐：南瓜粥和蔬菜沙拉', '晚餐轻一点，身体感觉更轻松', 25)
        ],
        [getDateKey(yesterday)]: [
            createMockActivity('b1', '07:40', 'sleep', '午休补觉30分钟', '下午精神恢复了一些', 30, createMockImageDataUri('午休', '#caefd4', '#6bb07e', '安静的靠枕')),
            createMockActivity('b2', '08:15', 'meal', '早餐：燕麦粥', '暖胃，早上状态平稳', 15),
            createMockActivity('b3', '12:05', 'medication', '降压药 1片', '饭后服用，没有明显不适'),
            createMockActivity('b4', '18:40', 'exercise', '慢跑 5 公里', '心率偏高，但整体状态不错', 35, createMockImageDataUri('慢跑', '#c8f1d1', '#419a63', '公园跑道'))
        ],
        [getDateKey(tomorrow)]: [
            createMockActivity('c1', '07:30', 'sleep', '计划早起后记录睡眠情况', ''),
            createMockActivity('c2', '19:00', 'exercise', '计划散步 30 分钟', '提前安排明天的运动节奏', 30)
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
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return {
        [getDateKey(today)]: [
            createMockHealthRecord('h1', '07:35', 'bloodPressure', '118/76', 'mmHg', '起床后静息测量', createMockImageDataUri('血压', '#d6efe0', '#6aa67f', '晨起测量记录')),
            createMockHealthRecord('h2', '07:36', 'heartRate', '68', 'bpm', '晨起心率稳定'),
            createMockHealthRecord('h3', '12:55', 'bloodSugar', '6.1', 'mmol/L', '午餐后1小时', createMockImageDataUri('血糖', '#f0d9cc', '#c98f7b', '试纸检测结果')),
            createMockHealthRecord('h4', '21:20', 'uricAcid', '356', 'umol/L', '晚间复测')
        ],
        [getDateKey(yesterday)]: [
            createMockHealthRecord('h5', '08:10', 'bloodPressure', '124/82', 'mmHg', '早餐前测量'),
            createMockHealthRecord('h6', '18:20', 'heartRate', '92', 'bpm', '慢跑后10分钟', createMockImageDataUri('心率', '#f3d2d7', '#cf7e8b', '运动后监测'))
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
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return {
        [getDateKey(today)]: [
            createMockSymptomRecord('s1', '09:40', '轻微头痛，主要在太阳穴位置', '喝温水后休息 20 分钟，症状缓解', createMockImageDataUri('症状', '#f5ddcf', '#d38665', '头痛记录')),
            createMockSymptomRecord('s2', '14:15', '午后有点反胃，胃里发胀', '暂停进食，慢走 10 分钟，喝了些温水', createMockImageDataUri('胃部不适', '#f7e6cf', '#d8a373', '胃部不适记录')),
            createMockSymptomRecord('s3', '20:50', '喉咙发干，轻微刺痛', '减少说话，喝温水并观察是否加重', null)
        ],
        [getDateKey(yesterday)]: [
            createMockSymptomRecord('s4', '21:10', '喉咙有点发紧，吞咽轻微不适', '减少说话，多喝温水，睡前观察', null)
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
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return {
        [getDateKey(today)]: {
            content: '今天总体状态平稳，午后略疲劳。晚饭后散步后感觉轻松，晚上尽量 23:00 前休息。',
            updatedAt: new Date().toISOString()
        },
        [getDateKey(yesterday)]: {
            content: '昨天午后有轻微头痛，补水和短暂休息后缓解。后续继续观察睡眠质量。',
            updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
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

async function loadDemoData() {
    const shouldReplace = confirm('这会用示例数据覆盖当前本地活动、健康、症状和提醒记录，是否继续？');
    if (!shouldReplace) return;

    allActivitiesData = createMockActivities();
    allHealthRecordsData = createMockHealthRecords();
    allSymptomRecordsData = createMockSymptomRecords();
    allDailyNotesData = createMockDailyNotes();
    reminders = normalizeReminders(createMockReminders());
    profile = createMockProfile();
    metadata.lastImportAt = new Date().toISOString();
    await persistAppState();

    loadActivities();
    loadHealthRecords();
    loadSymptomRecords();
    updateDisplay();
    updateRemindersDisplay();
    renderReminderTabs('today');
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

    // 添加按钮
    document.getElementById('addBtn').addEventListener('click', () => openModal());

    // 提醒按钮
    document.getElementById('reminderBtn').addEventListener('click', () => {
        document.getElementById('reminderModal').style.display = 'block';
        renderReminderTabs('today');
    });
    document.getElementById('healthBtn').addEventListener('click', () => openHealthModal());
    document.getElementById('symptomBtn').addEventListener('click', () => openSymptomModal());
    document.getElementById('addHealthBtnInline').addEventListener('click', () => openHealthModal());
    document.getElementById('toggleHealthSectionBtn').addEventListener('click', toggleHealthSection);

    // 导出入口
    ['exportBtn'].forEach(id => {
        document.getElementById(id).addEventListener('click', openExportModal);
    });
    document.getElementById('timelineOrderBtn').addEventListener('click', toggleTimelineOrder);
    document.getElementById('cloudSyncBtn').addEventListener('click', openCloudSyncModal);
    document.getElementById('profileBtn').addEventListener('click', openProfileModal);

    // 数据辅助入口
    document.getElementById('seedDemoBtn').addEventListener('click', loadDemoData);
    document.getElementById('resetDataBtn').addEventListener('click', resetAllData);

    // Header 汉堡菜单（移动端）
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
        document.getElementById('reminderModal').style.display = 'block';
        renderReminderTabs('today');
    });

    // 模态框关闭
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        });
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }

        const dateWrap = document.querySelector('.current-date-wrap');
        if (dateWrap && !dateWrap.contains(e.target)) {
            document.getElementById('currentDatePanel')?.classList.add('hidden');
        }
    });

    // 取消按钮
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal'));
        });
    });

    // 表单提交
    document.getElementById('activityForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('activityStartTime').addEventListener('input', updateActivityDurationField);
    document.getElementById('activityEndTime').addEventListener('input', updateActivityDurationField);
    document.getElementById('activityType').addEventListener('change', updateActivityDurationField);
    document.getElementById('activityImageUpload').addEventListener('change', handleActivityImageChange);
    document.getElementById('removeActivityImage').addEventListener('click', clearPendingActivityImage);
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
    document.getElementById('importJsonBtn').addEventListener('click', () => {
        document.getElementById('importJsonInput').click();
    });
    document.getElementById('importJsonInput').addEventListener('change', handleImportFileSelection);
    document.getElementById('confirmImportMerge').addEventListener('click', () => confirmImport('merge'));
    document.getElementById('confirmImportReplace').addEventListener('click', () => confirmImport('replace'));
    document.getElementById('snoozeMinutes').addEventListener('change', toggleCustomSnoozeField);
    document.getElementById('saveCloudConfigBtn').addEventListener('click', saveCloudSyncConfig);
    document.getElementById('cloudAuthSubmitBtn').addEventListener('click', submitCloudAuth);
    document.getElementById('cloudAuthLogoutBtn').addEventListener('click', logoutCloudSyncAccount);
    document.getElementById('toggleCloudPasswordBtn').addEventListener('click', toggleCloudPasswordVisibility);
    document.getElementById('cloudPushBtn').addEventListener('click', () => pushSnapshotToCloud(true));
    document.getElementById('cloudPullBtn').addEventListener('click', pullSnapshotFromCloud);
    document.getElementById('saveDailyNoteBtn').addEventListener('click', saveDailyNote);
    document.getElementById('quickAiDiagnosisBtn').addEventListener('click', runQuickTodayAiDiagnosis);
    document.getElementById('dailyNoteInput').addEventListener('input', () => {
        const input = document.getElementById('dailyNoteInput');
        const meta = document.getElementById('dailyNoteMeta');
        if (!input || !meta) return;
        const savedValue = input.dataset.savedValue || '';
        meta.textContent = input.value === savedValue ? '已保存' : '有未保存修改';
    });

    // 模板相关事件
    document.getElementById('saveAsTemplateBtn').addEventListener('click', saveAsTemplate);
    document.getElementById('addTemplateBtn').addEventListener('click', () => openTemplateEditModal());
    document.getElementById('createTemplateBtn').addEventListener('click', () => openTemplateEditModal());
    document.getElementById('templateForm').addEventListener('submit', handleTemplateFormSubmit);

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
}

// 更改日期
async function changeDate(days) {
    currentDate.setDate(currentDate.getDate() + days);
    loadActivities();
    loadHealthRecords();
    loadSymptomRecords();
    updateDisplay();
    await refreshActivitiesFromBackend(getDateKey(currentDate), { silent: true });
    await refreshHealthRecordsFromBackend(getDateKey(currentDate), { silent: true });
    await refreshSymptomRecordsFromBackend(getDateKey(currentDate), { silent: true });
    await refreshDailyNoteFromBackend(getDateKey(currentDate), { silent: true });
}

function openCurrentDatePicker() {
    const panel = document.getElementById('currentDatePanel');
    if (!panel) return;

    calendarViewDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    renderCalendarPanel();
    panel.classList.toggle('hidden');
}

async function selectCurrentDate(date) {
    currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    document.getElementById('currentDatePanel')?.classList.add('hidden');
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
    calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + offset, 1);
    renderCalendarPanel();
}

function clearCalendarPanel() {
    document.getElementById('currentDatePanel')?.classList.add('hidden');
}

function selectTodayFromCalendar() {
    const today = new Date();
    calendarViewDate = new Date(today.getFullYear(), today.getMonth(), 1);
    selectCurrentDate(today);
}

function handleCalendarDayClick(e) {
    const dayBtn = e.target.closest('.date-calendar-day');
    if (!dayBtn) return;

    const dateValue = dayBtn.dataset.date;
    if (!dateValue) return;

    selectCurrentDate(new Date(`${dateValue}T12:00:00`));
}

function handleCalendarPanelClick(e) {
    e.stopPropagation();

    const clearBtn = e.target.closest('#calendarClearBtn');
    if (clearBtn) {
        clearCalendarPanel();
        return;
    }

    const todayBtn = e.target.closest('#calendarTodayBtn');
    if (todayBtn) {
        selectTodayFromCalendar();
    }
}

function renderCalendarPanel() {
    const monthLabel = document.getElementById('calendarMonthLabel');
    const grid = document.getElementById('calendarDayGrid');
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
    openAiDiagnosisModal();

    const todayRange = document.querySelector('input[name="aiRange"][value="today"]');
    const customRangeInputs = document.getElementById('aiDateRangeInputs');
    if (todayRange) {
        todayRange.checked = true;
    }
    if (customRangeInputs) {
        customRangeInputs.classList.add('hidden');
    }
    updateAiDataPreview();

    await startAiDiagnosis();
}

// 更新显示
function updateDisplay() {
    updateDateDisplay();
    updateTimelineOrderButton();
    updateHealthSectionButton();
    updateHealthDisplay();
    updateTimeline();
    updateDailySummary();
    updateStats();
}

function toggleHealthSection() {
    const body = document.getElementById('healthSectionBody');
    if (!body) return;

    body.classList.toggle('hidden');
    updateHealthSectionButton();
}

function updateHealthSectionButton() {
    const body = document.getElementById('healthSectionBody');
    const button = document.getElementById('toggleHealthSectionBtn');
    if (!body || !button) return;

    button.textContent = body.classList.contains('hidden') ? '查看健康数据' : '关闭健康数据';
}

// 更新日期显示
function updateDateDisplay() {
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('currentDate').textContent = currentDate.toLocaleDateString('zh-CN', options);
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
    const modal = document.getElementById('activityModal');
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
        pendingActivityImage = activity.image || null;
    } else {
        editingId = null;
        title.textContent = '添加活动';
        pendingActivityImage = null;
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
    modal.style.display = 'block';
}

function openHealthModal(record = null) {
    const modal = document.getElementById('healthModal');
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
    modal.style.display = 'block';
}

function openSymptomModal(record = null) {
    const modal = document.getElementById('symptomModal');
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
    modal.style.display = 'block';
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
        image: pendingActivityImage,
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
        document.getElementById('activityModal').style.display = 'none';
        pendingActivityImage = null;
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
        document.getElementById('healthModal').style.display = 'none';
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
        document.getElementById('symptomModal').style.display = 'none';
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
    const container = document.getElementById('healthSummary');
    const emptyState = document.getElementById('healthEmptyState');

    if (healthRecords.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    const latestByType = Object.values(healthRecords.reduce((acc, record) => {
        const existing = acc[record.type];
        if (!existing || existing.time < record.time) {
            acc[record.type] = record;
        }
        return acc;
    }, {}));

    container.innerHTML = latestByType.map(record => `
        <div class="health-summary-card">
            <div class="health-summary-header">
                <span class="health-summary-icon">${healthTypeIcons[record.type]}</span>
                <span class="health-summary-label">${healthTypeLabels[record.type]}</span>
            </div>
            ${record.image ? `
                <div class="health-summary-image-wrap">
                    <img class="health-summary-image" src="${record.image}" alt="${escapeHtml(healthTypeLabels[record.type])}">
                </div>
            ` : ''}
            <div class="health-summary-value">${escapeHtml(record.value)}${record.unit ? ` ${escapeHtml(record.unit)}` : ''}</div>
            <div class="health-summary-meta">${record.time}${record.notes ? ` · ${escapeHtml(record.notes)}` : ''}</div>
        </div>
    `).join('');
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
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
        pendingActivityImage = await readAndCompressImage(file);
        updateActivityImagePreview();
        showToast('图片已添加');
    } catch (error) {
        console.error(error);
        showToast('图片处理失败，请重试');
    } finally {
        resetImageInputs();
    }
}

function clearPendingActivityImage() {
    pendingActivityImage = null;
    updateActivityImagePreview();
    resetImageInputs();
}

function updateActivityImagePreview() {
    const preview = document.getElementById('activityImagePreview');
    const previewImg = document.getElementById('activityImagePreviewImg');
    const hint = document.getElementById('activityImageHint');

    if (!pendingActivityImage) {
        preview.classList.add('hidden');
        previewImg.removeAttribute('src');
        hint.style.display = 'block';
        return;
    }

    preview.classList.remove('hidden');
    previewImg.src = pendingActivityImage;
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
    document.getElementById('exportModal').style.display = 'none';
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
    document.getElementById('exportModal').style.display = 'block';
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
    document.getElementById('exportModal').style.display = 'none';
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

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    await updateStorageStatus();
}

function isBackendProfileModeEnabled() {
    return isCloudSyncAuthenticated();
}

function normalizeBackendProfile(profileResponse) {
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
        healthGoals: profileResponse?.healthGoals || '',
        notes: profileResponse?.notes || ''
    };
}

async function refreshProfileFromBackend(options = {}) {
    if (!isBackendProfileModeEnabled()) {
        loadProfile();
        return profile;
    }

    try {
        const response = await cloudSyncRequest('/api/profile', { method: 'GET' });
        profile = response ? normalizeBackendProfile(response) : {};
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
    profile = profile || {};
}

async function saveProfile() {
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
        profile = normalizeBackendProfile(response);
        await persistAppState({ skipAutoCloudSync: true });
        await updateStorageStatus();
        return;
    }

    await persistAppState();
    await updateStorageStatus();
}

// 设置提醒相关事件监听
function setupReminderListeners() {
    // 标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            renderReminderTabs(tab);
        });
    });

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
}

// 渲染提醒标签
function renderReminderTabs(tab) {
    // 更新标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });

    // 隐藏所有标签内容
    document.querySelectorAll('.tab-content').forEach(content => {
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
        case 'upcoming':
            renderUpcomingReminders();
            break;
        case 'all':
            renderAllReminders();
            break;
        case 'add':
            populateReminderForm();
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
    form.reset();
    resetReminderImageInputs();
    clearPendingReminderImage();

    if (reminder) {
        editingReminderId = reminder.id;
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
    const today = getDateKey(new Date());
    const todayReminders = reminders.filter(r => {
        const reminderDate = new Date(r.date);
        const reminderDateKey = getDateKey(reminderDate);
        return reminderDateKey === today && !r.completed;
    });

    const container = document.getElementById('todayReminderList');
    container.innerHTML = todayReminders.length === 0
        ? '<p class="text-secondary">今天没有提醒</p>'
        : todayReminders.map(r => renderReminderItem(r)).join('');
}

// 渲染即将到来的提醒
function renderUpcomingReminders() {
    const now = new Date();
    const upcoming = reminders
        .filter(r => new Date(r.date + 'T' + r.time) > now && !r.completed)
        .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
        .slice(0, 10);

    const container = document.getElementById('upcomingReminderList');
    container.innerHTML = upcoming.length === 0
        ? '<p class="text-secondary">没有即将到来的提醒</p>'
        : upcoming.map(r => renderReminderItem(r)).join('');
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

// 渲染提醒历史项（包含操作历史）
function renderReminderHistoryItem(reminder) {
    const date = new Date(reminder.date + 'T' + reminder.time);
    const dateStr = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
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
                <button class="btn-action btn-edit" onclick="completeReminder('${reminder.id}')">
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
    const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    const timeStr = reminder.time;
    const isCompleted = reminder.completed;
    const isPast = date < new Date();
    const snoozeInfo = reminder.snoozeCount ? `已延后 ${reminder.snoozeCount} 次` : '';
    const repeatLabel = getReminderRepeatLabel(reminder.repeat);

    return `
        <div class="reminder-detail-item ${isCompleted ? 'completed' : ''} ${isPast && !isCompleted ? 'overdue' : ''}">
            <div class="reminder-detail-header">
                <div>
                    <span class="reminder-detail-time">${timeStr}</span>
                    ${showDate ? `<span class="reminder-detail-date">${dateStr}</span>` : ''}
                    ${repeatLabel ? `<span style="margin-left:8px;font-size:0.8rem;">🔄 ${repeatLabel}</span>` : ''}
                </div>
                <div>
                    ${typeIcons[reminder.type]}
                </div>
            </div>
            <div class="reminder-detail-title">${escapeHtml(reminder.title)}</div>
            ${reminder.image ? `
                <div class="reminder-detail-image-wrap">
                    <img class="reminder-detail-image" src="${reminder.image}" alt="${escapeHtml(reminder.title)}">
                </div>
            ` : ''}
            ${(reminder.notes || snoozeInfo || getReminderRepeatLabel(reminder.repeat)) ? `<div class="reminder-detail-notes">${escapeHtml([reminder.notes, snoozeInfo, getReminderRepeatLabel(reminder.repeat)].filter(Boolean).join(' · '))}</div>` : ''}
            <div class="reminder-detail-actions">
                ${!isCompleted ? `<button class="btn-action btn-edit" onclick="editReminder('${reminder.id}')">编辑</button>` : ''}
                <button class="btn-action btn-edit" onclick="completeReminder('${reminder.id}')">
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
    renderReminderTabs('today');
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
    const today = getDateKey(new Date());
    const todayReminders = reminders.filter(r => {
        const reminderDate = new Date(r.date);
        const reminderDateKey = getDateKey(reminderDate);
        return reminderDateKey === today && !r.completed;
    }).sort((a, b) => a.time.localeCompare(b.time));

    const container = document.getElementById('todayReminders');
    const emptyState = document.getElementById('noReminders');

    if (todayReminders.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
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
    const dueReminder = reminders.find(reminder => shouldTriggerReminder(reminder, now));

    if (!dueReminder) return;
    if (activeReminderAlertId === dueReminder.id) return;

    showNotification(dueReminder);
    openReminderAlertModal(dueReminder);
}

// 显示通知
function showNotification(reminder) {
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

function shouldTriggerReminder(reminder, now) {
    if (!reminder || reminder.completed) return false;

    const triggerTime = getReminderTriggerTime(reminder);
    if (!triggerTime) return false;

    return getDateKey(triggerTime) === getDateKey(now) && triggerTime <= now;
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
        lastSyncedAt: config.lastSyncedAt || ''
    };
}

function isCloudSyncAuthenticated(config = getCloudSyncConfig()) {
    return Boolean(config.endpoint && config.apiKey);
}

function updateCloudSyncActionState(config = getCloudSyncConfig()) {
    const pushBtn = document.getElementById('cloudPushBtn');
    const pullBtn = document.getElementById('cloudPullBtn');
    const logoutBtn = document.getElementById('cloudAuthLogoutBtn');
    const optionsSection = document.getElementById('cloudSyncOptionsSection');
    const optionsContent = document.getElementById('cloudSyncOptionsContent');
    const isReady = isCloudSyncAuthenticated(config);

    if (pushBtn) pushBtn.disabled = !isReady;
    if (pullBtn) pullBtn.disabled = !isReady;
    if (logoutBtn) logoutBtn.classList.toggle('hidden', !config.apiKey);
    if (optionsSection) optionsSection.classList.toggle('hidden', !isReady);
    if (optionsContent) optionsContent.classList.toggle('hidden', !isReady);
}

function setCloudSyncStatus(text, isError = false) {
    const status = document.getElementById('cloudSyncStatus');
    if (!status) return;
    status.textContent = text;
    status.style.color = isError ? '#d32f2f' : 'var(--text-secondary)';
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
    setCloudSyncStatus(config.lastSyncedAt ? `最近同步：${new Date(config.lastSyncedAt).toLocaleString('zh-CN')}` : '登录后可同步。');
    setCloudAuthStatus(getCloudAuthSummary(config));
    updateCloudSyncActionState(config);
}

function openCloudSyncModal() {
    hydrateCloudSyncForm();
    document.getElementById('cloudSyncModal').style.display = 'block';
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
    setCloudSyncStatus(endpoint ? '配置已保存。' : '已清空同步服务地址。');
    setCloudAuthStatus(getCloudAuthSummary(nextConfig));
    updateCloudSyncActionState(nextConfig);
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

    setCloudSyncStatus('正在测试连接...');
    try {
        await cloudSyncRequest('/health', { method: 'GET' });
        setCloudSyncStatus('连接成功，可以开始同步。');
        showToast('同步服务连接成功');
        return true;
    } catch (error) {
        if (String(error.message || '').includes('SYNC_HTTP_404')) {
            setCloudSyncStatus('连接成功（未提供 /health），可直接尝试同步。');
            showToast('服务可达，可直接同步');
            return true;
        }
        console.error(error);
        setCloudSyncStatus('连接失败，请检查服务地址或跨域配置。', true);
        showToast('连接失败');
        return false;
    }
}

async function submitCloudAuthRequest(path) {
    const endpoint = document.getElementById('cloudEnvId')?.value.trim().replace(/\/+$/, '');
    const account = document.getElementById('cloudAccount')?.value.trim() || '';
    const password = document.getElementById('cloudPassword')?.value || '';

    if (!endpoint) {
        setCloudSyncStatus('请先填写同步服务地址。', true);
        showToast('请先配置同步地址');
        return false;
    }
    if (!account || !password) {
        setCloudAuthStatus('请输入账号和密码后再操作。', true);
        showToast('请填写账号和密码');
        return false;
    }

    setCloudAuthStatus(path.endsWith('/register') ? '正在注册并登录...' : '正在登录后端...');
    try {
        const response = await fetch(`${endpoint}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account, password })
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
        setCloudSyncStatus('登录成功，可开始上传或恢复数据。');
        updateCloudSyncActionState(getCloudSyncConfig());
        document.getElementById('cloudPassword').value = '';
        await refreshActivitiesFromBackend(getDateKey(currentDate), { silent: true });
        await refreshHealthRecordsFromBackend(getDateKey(currentDate), { silent: true });
        await refreshSymptomRecordsFromBackend(getDateKey(currentDate), { silent: true });
        await refreshRemindersFromBackend({ silent: true });
        await refreshProfileFromBackend({ silent: true });
        await refreshDailyNoteFromBackend(getDateKey(currentDate), { silent: true });
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

function scheduleCloudAutoSync() {
    const config = getCloudSyncConfig();
    if (!config.autoSync || !isCloudSyncAuthenticated(config)) return;

    if (cloudSyncTimer) {
        clearTimeout(cloudSyncTimer);
    }
    cloudSyncTimer = setTimeout(() => {
        pushSnapshotToCloud(false);
    }, 4000);
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

    cloudSyncBusy = true;
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

        metadata.cloudSync = {
            ...config,
            lastSyncedAt: new Date().toISOString()
        };
        await persistAppState({ skipAutoCloudSync: true });
        setCloudSyncStatus(`上传成功：${new Date(metadata.cloudSync.lastSyncedAt).toLocaleString('zh-CN')}`);
        if (manual) showToast('已同步到云端');
        return true;
    } catch (error) {
        console.error(error);
        setCloudSyncStatus('上传失败，请检查同步服务。', true);
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
    setCloudSyncStatus('正在从云端拉取...');

    try {
        const response = await cloudSyncRequest('/snapshot', { method: 'GET' });
        const snapshot = response?.snapshot || response;
        if (!snapshot || typeof snapshot !== 'object') {
            showToast('云端暂无可恢复数据');
            setCloudSyncStatus('云端暂无数据');
            return;
        }

        const shouldRestore = confirm('将使用云端数据覆盖本地数据，是否继续？');
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
        profile = normalized.profile || {};
        metadata.lastImportAt = new Date().toISOString();
        metadata.cloudSync = {
            ...config,
            lastSyncedAt: response?.updatedAt || new Date().toISOString()
        };

        await persistAppState({ skipAutoCloudSync: true });
        loadActivities();
        loadHealthRecords();
        loadSymptomRecords();
        updateDisplay();
        updateRemindersDisplay();
        renderReminderTabs('today');
        updateStorageStatus();

        setCloudSyncStatus(`恢复成功：${new Date(metadata.cloudSync.lastSyncedAt).toLocaleString('zh-CN')}`);
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
    populateProfileForm();
    document.getElementById('profileModal').style.display = 'block';
}

function populateProfileForm() {
    const fields = [
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
        'HealthGoals',
        'Notes'
    ];

    fields.forEach(field => {
        const key = field.charAt(0).toLowerCase() + field.slice(1);
        document.getElementById(`profile${field}`).value = profile[key] || '';
    });
}

async function handleProfileSubmit(e) {
    e.preventDefault();

    profile = {
        name: document.getElementById('profileName').value.trim(),
        gender: document.getElementById('profileGender').value,
        age: document.getElementById('profileAge').value,
        height: document.getElementById('profileHeight').value,
        weight: document.getElementById('profileWeight').value,
        bloodType: document.getElementById('profileBloodType').value,
        bloodPressure: document.getElementById('profileBloodPressure').value.trim(),
        bloodSugar: document.getElementById('profileBloodSugar').value.trim(),
        chronicConditions: document.getElementById('profileChronicConditions').value.trim(),
        allergies: document.getElementById('profileAllergies').value.trim(),
        medications: document.getElementById('profileMedications').value.trim(),
        healthGoals: document.getElementById('profileHealthGoals').value.trim(),
        notes: document.getElementById('profileNotes').value.trim()
    };

    try {
        await saveProfile();
        document.getElementById('profileModal').style.display = 'none';
        showToast('个人信息已保存');
    } catch (error) {
        console.error(error);
        showToast(isBackendProfileModeEnabled() ? '保存失败，请检查后端连接或登录状态' : '个人信息保存失败');
    }
}

// 请求通知权限
function requestNotificationPermission() {
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
    document.getElementById('reminderModal').style.display = 'block';
    renderReminderTabs('today');
}

window.openReminderManagerFor = function(id) {
    document.getElementById('reminderModal').style.display = 'block';
    renderReminderTabs('today');
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

    document.getElementById('reminderModal').style.display = 'block';
    renderReminderTabs('add');
    populateReminderForm(reminder);
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
    return JSON.parse(JSON.stringify({
        schemaVersion: STORAGE_SCHEMA_VERSION,
        date: getDateKey(currentDate),
        activitiesByDate: allActivitiesData,
        healthRecordsByDate: allHealthRecordsData,
        symptomRecordsByDate: allSymptomRecordsData,
        dailyNotesByDate: allDailyNotesData,
        reminders,
        profile,
        metadata
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
            profile: parsed.profile || {},
            metadata: parsed.metadata || {}
        };
    }

    return {
        activitiesByDate: parsed.activitiesByDate || {},
        healthRecordsByDate: parsed.healthRecordsByDate || {},
        symptomRecordsByDate: parsed.symptomRecordsByDate || {},
        dailyNotesByDate: parsed.dailyNotesByDate || {},
        reminders: parsed.reminders || [],
        profile: parsed.profile || {},
        metadata: parsed.metadata || {}
    };
}

function summarizeImportPayload(payload) {
    const activityCount = Object.values(payload.activitiesByDate).reduce((sum, list) => sum + list.length, 0);
    const healthCount = Object.values(payload.healthRecordsByDate).reduce((sum, list) => sum + list.length, 0);
    const symptomCount = Object.values(payload.symptomRecordsByDate).reduce((sum, list) => sum + list.length, 0);
    const noteCount = Object.keys(payload.dailyNotesByDate || {}).length;
    const reminderCount = payload.reminders.length;
    const dates = Object.keys(payload.activitiesByDate)
        .concat(Object.keys(payload.healthRecordsByDate), Object.keys(payload.symptomRecordsByDate), Object.keys(payload.dailyNotesByDate || {}))
        .sort();
    const rangeText = dates.length ? `${dates[0]} 至 ${dates[dates.length - 1]}` : '未包含日期记录';
    return `检测到 ${activityCount} 条活动、${healthCount} 条健康数据、${symptomCount} 条症状记录、${noteCount} 条状态记录、${reminderCount} 条提醒；日期范围：${rangeText}`;
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
            profile = pendingImportData.profile || {};
        } else {
            allActivitiesData = mergeDateBuckets(allActivitiesData, pendingImportData.activitiesByDate, normalizeActivity, getActivitySortTime);
            allHealthRecordsData = mergeDateBuckets(allHealthRecordsData, pendingImportData.healthRecordsByDate, item => item, item => item.time || '00:00');
            allSymptomRecordsData = mergeDateBuckets(allSymptomRecordsData, pendingImportData.symptomRecordsByDate, item => item, item => item.time || '00:00');
            allDailyNotesData = {
                ...allDailyNotesData,
                ...(pendingImportData.dailyNotesByDate || {})
            };
            reminders = mergeReminders(reminders, pendingImportData.reminders);
            profile = {
                ...profile,
                ...(pendingImportData.profile || {})
            };
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
            <span class="template-item-type">${getTypeLabel(template.type)}</span>
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
    document.getElementById('activityEndTime').value = template.duration ? addMinutesToTime(startTime, template.duration) : startTime;
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
    }
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

function syncAiProviderFields() {
    const customGroup = document.getElementById('customApiEndpointGroup');
    if (!customGroup) return;

    if (document.getElementById('aiProvider')?.value === 'custom') {
        customGroup.classList.remove('hidden');
    } else {
        customGroup.classList.add('hidden');
    }
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
        await callAiApi('请只回复“连接成功”四个字。', { config });
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
        `纳入数据：活动 ${analysisData.activities.length} 条，健康 ${analysisData.healthRecords.length} 条，症状 ${analysisData.symptomRecords.length} 条，个人档案 ${analysisData.profile ? '已纳入' : '未纳入'}。`
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
            const customStart = document.getElementById('aiStartDate').value;
            const customEnd = document.getElementById('aiEndDate').value;
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
            `数据汇总完成：${analysisData.activities.length} 条活动，${analysisData.healthRecords.length} 条健康数据，${analysisData.symptomRecords.length} 条症状记录${analysisData.profile ? '，含个人档案' : ''}。`
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
    const data = {
        period: { start: startDate, end: endDate },
        activities: [],
        healthRecords: [],
        symptomRecords: [],
        profile: null,
        options: {
            includeActivities: document.getElementById('aiIncludeActivities').checked,
            includeHealth: document.getElementById('aiIncludeHealth').checked,
            includeProfile: document.getElementById('aiIncludeProfile').checked,
            includeMedication: document.getElementById('aiIncludeMedication').checked
        },
        customPrompt: document.getElementById('aiCustomPrompt').value.trim()
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
                        type: record.type,
                        value: record.value,
                        unit: record.unit,
                        notes: record.notes
                    });
                });
            }
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
                prompt += `- ${r.date}: ${r.value}${r.unit || ''}\n`;
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
        : [{ role: 'user', content: promptOrMessages }];

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

// 格式化AI响应
function formatAiResponse(response) {
    // 简单的Markdown格式化
    return response
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
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
