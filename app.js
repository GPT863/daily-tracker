// 全局状态
let currentDate = new Date();
let activities = [];
let reminders = [];
let editingId = null;
let timelineOrder = localStorage.getItem('dailyTracker_timelineOrder') || 'desc';
let pendingActivityImage = null;
let pendingReminderImage = null;

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

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    initDB();
    loadActivities();
    loadReminders();
    setupEventListeners();
    setupReminderListeners();
    updateDisplay();
    updateRemindersDisplay();
    checkReminders();
    setInterval(checkReminders, 60000); // 每分钟检查一次
    registerServiceWorker();
});

// 初始化数据库（使用LocalStorage模拟）
function initDB() {
    if (!localStorage.getItem('dailyTracker_activities')) {
        localStorage.setItem('dailyTracker_activities', JSON.stringify(createMockActivities()));
    }
    if (!localStorage.getItem('dailyTracker_reminders')) {
        localStorage.setItem('dailyTracker_reminders', JSON.stringify(createMockReminders()));
    }
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
        createMockReminder('r1', '早餐时间', 'meal', today, '08:00', true, '吃得清淡一点，先补充蛋白质'),
        createMockReminder('r2', '记得服药', 'medication', today, '09:00', true, '早餐后服用', createMockImageDataUri('用药', '#d7f0cf', '#78ae69', '随餐服用提醒')),
        createMockReminder('r3', '晚上活动一下', 'exercise', today, '19:00', true, '至少快走 30 分钟'),
        createMockReminder('r4', '准备睡眠', 'sleep', today, '22:30', true, '睡前少看手机', createMockImageDataUri('睡眠提醒', '#cbead3', '#659f76', '放下手机准备休息')),
        createMockReminder('r5', '复查预约提醒', 'other', getDateKey(tomorrow), '15:00', false, '带上病历和检查单'),
        {
            ...createMockReminder('r6', '午间散步', 'exercise', today, '13:30', false, '饭后散步 15 分钟'),
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

function loadDemoData() {
    const shouldReplace = confirm('这会用示例数据覆盖当前本地活动和提醒，是否继续？');
    if (!shouldReplace) return;

    localStorage.setItem('dailyTracker_activities', JSON.stringify(createMockActivities()));
    localStorage.setItem('dailyTracker_reminders', JSON.stringify(createMockReminders()));

    loadActivities();
    loadReminders();
    updateDisplay();
    updateRemindersDisplay();
    showToast('示例数据已加载');
}

function resetAllData() {
    const shouldClear = confirm('这会清空当前浏览器中的全部活动和提醒数据，是否继续？');
    if (!shouldClear) return;

    localStorage.setItem('dailyTracker_activities', JSON.stringify({}));
    localStorage.setItem('dailyTracker_reminders', JSON.stringify([]));

    loadActivities();
    loadReminders();
    updateDisplay();
    updateRemindersDisplay();
    showToast('本地数据已清空');
}

// 加载活动数据
function loadActivities() {
    const dateKey = getDateKey(currentDate);
    const allData = JSON.parse(localStorage.getItem('dailyTracker_activities'));
    activities = allData[dateKey] || [];
    activities.sort((a, b) => a.time.localeCompare(b.time));
}

// 保存活动数据
function saveActivities() {
    const dateKey = getDateKey(currentDate);
    const allData = JSON.parse(localStorage.getItem('dailyTracker_activities'));
    allData[dateKey] = activities;

    try {
        localStorage.setItem('dailyTracker_activities', JSON.stringify(allData));
    } catch (error) {
        throw new Error('LOCAL_STORAGE_QUOTA_EXCEEDED');
    }
}

// 获取日期键
function getDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 设置事件监听器
function setupEventListeners() {
    // 日期导航
    document.getElementById('prevDay').addEventListener('click', () => changeDate(-1));
    document.getElementById('nextDay').addEventListener('click', () => changeDate(1));

    // 添加按钮
    document.getElementById('addBtn').addEventListener('click', () => openModal());

    // 提醒按钮
    document.getElementById('reminderBtn').addEventListener('click', () => {
        document.getElementById('reminderModal').style.display = 'block';
        renderReminderTabs('today');
    });

    // 导出入口
    ['exportBtn', 'timelineExportBtn', 'quickExportBtn'].forEach(id => {
        document.getElementById(id).addEventListener('click', openExportModal);
    });
    document.getElementById('timelineOrderBtn').addEventListener('click', toggleTimelineOrder);

    // 数据辅助入口
    document.getElementById('seedDemoBtn').addEventListener('click', loadDemoData);
    document.getElementById('resetDataBtn').addEventListener('click', resetAllData);

    // 查看全部提醒
    document.getElementById('viewAllReminders').addEventListener('click', () => {
        document.getElementById('reminderModal').style.display = 'block';
        renderReminderTabs('today');
    });

    // 模态框关闭
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // 取消按钮
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    // 表单提交
    document.getElementById('activityForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('activityImageUpload').addEventListener('change', handleActivityImageChange);
    document.getElementById('activityImageCamera').addEventListener('change', handleActivityImageChange);
    document.getElementById('removeActivityImage').addEventListener('click', clearPendingActivityImage);

    // 导出按钮
    document.getElementById('exportJson').addEventListener('click', exportJson);
    document.getElementById('exportCsv').addEventListener('click', exportCsv);
}

// 更改日期
function changeDate(days) {
    currentDate.setDate(currentDate.getDate() + days);
    loadActivities();
    updateDisplay();
}

// 更新显示
function updateDisplay() {
    updateDateDisplay();
    updateTimelineOrderButton();
    updateTimeline();
    updateStats();
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
    const displayActivities = [...activities].sort((a, b) => {
        return timelineOrder === 'asc'
            ? a.time.localeCompare(b.time)
            : b.time.localeCompare(a.time);
    });

    if (displayActivities.length === 0) {
        timeline.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    timeline.innerHTML = displayActivities.map(activity => `
        <div class="timeline-item" data-id="${activity.id}">
            <div class="timeline-header">
                <span class="timeline-time">${formatTime(activity.time)}</span>
                <span class="timeline-type">${typeIcons[activity.type]}</span>
            </div>
            <div class="timeline-content">${escapeHtml(activity.content)}</div>
            ${activity.image ? `
                <div class="timeline-image-wrap">
                    <img class="timeline-image" src="${activity.image}" alt="${escapeHtml(activity.content)}">
                </div>
            ` : ''}
            ${activity.feeling ? `<div class="timeline-feeling">"${escapeHtml(activity.feeling)}"</div>` : ''}
            ${activity.duration ? `<div class="timeline-duration">⏱️ ${activity.duration}分钟</div>` : ''}
            <div class="timeline-actions">
                <button class="btn-action btn-edit" onclick="editActivity('${activity.id}')">编辑</button>
                <button class="btn-action btn-delete" onclick="deleteActivity('${activity.id}')">删除</button>
            </div>
        </div>
    `).join('');
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
    const mealCount = activities.filter(a => a.type === 'meal').length;
    const medCount = activities.filter(a => a.type === 'medication').length;
    const exerciseCount = activities.filter(a => a.type === 'exercise').length;
    const exerciseMinutes = activities
        .filter(a => a.type === 'exercise')
        .reduce((sum, a) => sum + (a.duration || 0), 0);

    document.getElementById('mealCount').textContent = mealCount;
    document.getElementById('medCount').textContent = medCount;
    document.getElementById('exerciseCount').textContent = exerciseCount;

    const hours = Math.floor(exerciseMinutes / 60);
    const minutes = exerciseMinutes % 60;
    if (hours > 0) {
        document.getElementById('exerciseTime').textContent = `${hours}h${minutes}m`;
    } else {
        document.getElementById('exerciseTime').textContent = `${minutes}m`;
    }
}

// 格式化时间
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
}

// 打开模态框
function openModal(activity = null) {
    const modal = document.getElementById('activityModal');
    const form = document.getElementById('activityForm');
    const title = document.getElementById('modalTitle');

    form.reset();
    resetImageInputs();

    if (activity) {
        editingId = activity.id;
        title.textContent = '编辑活动';
        document.getElementById('activityTime').value = activity.time;
        document.getElementById('activityType').value = activity.type;
        document.getElementById('activityContent').value = activity.content;
        document.getElementById('activityFeeling').value = activity.feeling || '';
        document.getElementById('activityDuration').value = activity.duration || '';
        pendingActivityImage = activity.image || null;
    } else {
        editingId = null;
        title.textContent = '添加活动';
        pendingActivityImage = null;
        // 设置默认时间
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        document.getElementById('activityTime').value = time;
    }

    updateActivityImagePreview();
    modal.style.display = 'block';
}

// 处理表单提交
async function handleFormSubmit(e) {
    e.preventDefault();

    const activity = {
        id: editingId || Date.now().toString(),
        time: document.getElementById('activityTime').value,
        type: document.getElementById('activityType').value,
        content: document.getElementById('activityContent').value,
        feeling: document.getElementById('activityFeeling').value,
        duration: parseInt(document.getElementById('activityDuration').value) || null,
        image: pendingActivityImage,
        createdAt: editingId ? activities.find(a => a.id === editingId)?.createdAt : new Date().toISOString()
    };

    if (editingId) {
        const index = activities.findIndex(a => a.id === editingId);
        if (index > -1) {
            activities[index] = activity;
        }
    } else {
        activities.push(activity);
    }

    activities.sort((a, b) => a.time.localeCompare(b.time));

    try {
        saveActivities();
        updateDisplay();
        document.getElementById('activityModal').style.display = 'none';
        pendingActivityImage = null;
        resetImageInputs();
        showToast(editingId ? '活动已更新！' : '活动已添加！');
    } catch (error) {
        console.error(error);
        showToast('保存失败：图片过大或本地存储空间不足');
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
    document.getElementById('activityImageCamera').value = '';
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
        activities = activities.filter(a => a.id !== id);
        saveActivities();
        updateDisplay();
        showToast('活动已删除！');
    }
}

// 导出JSON
function exportJson() {
    const dateKey = getDateKey(currentDate);
    const data = {
        date: dateKey,
        activities: activities,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, `daily-tracker-${dateKey}.json`);
    document.getElementById('exportModal').style.display = 'none';
    showToast('数据已导出！');
}

function openExportModal() {
    document.getElementById('exportModal').style.display = 'block';
}

// 导出CSV
function exportCsv() {
    const headers = ['时间', '类型', '内容', '感受', '时长(分钟)'];
    const rows = activities.map(a => [
        a.time,
        typeLabels[a.type],
        a.content,
        a.feeling || '',
        a.duration || ''
    ]);

    const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const dateKey = getDateKey(currentDate);
    downloadFile(blob, `daily-tracker-${dateKey}.csv`);
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
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        // Service Worker注册代码将在后续添加
        console.log('Service Worker support detected');
    }
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
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
    reminders = JSON.parse(localStorage.getItem('dailyTracker_reminders')) || [];
}

// 保存提醒数据
function saveReminders() {
    try {
        localStorage.setItem('dailyTracker_reminders', JSON.stringify(reminders));
    } catch (error) {
        throw new Error('LOCAL_STORAGE_QUOTA_EXCEEDED');
    }
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
    document.getElementById('reminderImageCamera').addEventListener('change', handleReminderImageChange);
    document.getElementById('removeReminderImage').addEventListener('click', clearPendingReminderImage);
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
            setDefaultReminderDate();
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
    const allReminders = [...reminders].sort((a, b) => {
        return new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time);
    });

    const container = document.getElementById('allReminderList');
    container.innerHTML = allReminders.length === 0
        ? '<p class="text-secondary">还没有任何提醒</p>'
        : allReminders.map(r => renderReminderItem(r, true)).join('');
}

// 渲染单个提醒项
function renderReminderItem(reminder, showDate = false) {
    const date = new Date(reminder.date + 'T' + reminder.time);
    const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    const timeStr = reminder.time;
    const isCompleted = reminder.completed;
    const isPast = date < new Date();

    return `
        <div class="reminder-detail-item ${isCompleted ? 'completed' : ''} ${isPast && !isCompleted ? 'overdue' : ''}">
            <div class="reminder-detail-header">
                <div>
                    <span class="reminder-detail-time">${timeStr}</span>
                    ${showDate ? `<span class="reminder-detail-date">${dateStr}</span>` : ''}
                    ${reminder.repeat ? '<span style="margin-left:8px;font-size:0.8rem;">🔄</span>' : ''}
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
            ${reminder.notes ? `<div class="reminder-detail-notes">${escapeHtml(reminder.notes)}</div>` : ''}
            <div class="reminder-detail-actions">
                <button class="btn-action btn-edit" onclick="completeReminder('${reminder.id}')">
                    ${isCompleted ? '✓ 已完成' : '标记完成'}
                </button>
                <button class="btn-action btn-delete" onclick="deleteReminder('${reminder.id}')">删除</button>
            </div>
        </div>
    `;
}

// 处理提醒表单提交
function handleReminderSubmit(e) {
    e.preventDefault();

    const reminder = {
        id: Date.now().toString(),
        title: document.getElementById('reminderTitle').value,
        type: document.getElementById('reminderType').value,
        date: document.getElementById('reminderDate').value,
        time: document.getElementById('reminderTime').value,
        repeat: document.getElementById('reminderRepeat').checked,
        notes: document.getElementById('reminderNotes').value,
        image: pendingReminderImage,
        completed: false,
        createdAt: new Date().toISOString()
    };

    reminders.push(reminder);
    try {
        saveReminders();
    } catch (error) {
        reminders.pop();
        console.error(error);
        showToast('保存失败：图片过大或本地存储空间不足');
        return;
    }

    // 清空表单
    document.getElementById('reminderForm').reset();
    pendingReminderImage = null;
    updateReminderImagePreview();
    resetReminderImageInputs();

    // 请求通知权限
    requestNotificationPermission();

    // 显示成功消息
    showToast('提醒已添加！');

    // 切换到"今日提醒"标签
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
    document.getElementById('reminderImageCamera').value = '';
}

// 完成提醒
window.completeReminder = function(id) {
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
        reminder.completed = !reminder.completed;
        reminder.completedAt = reminder.completed ? new Date().toISOString() : null;

        // 如果是重复提醒且已完成，创建明天的提醒
        if (reminder.repeat && reminder.completed) {
            const tomorrow = new Date(reminder.date);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const newReminder = {
                ...reminder,
                id: Date.now().toString(),
                date: tomorrow.toISOString().split('T')[0],
                completed: false,
                completedAt: null,
                createdAt: new Date().toISOString()
            };

            reminders.push(newReminder);
        }

        saveReminders();
        renderReminderTabs('today');
        updateRemindersDisplay();
        showToast(reminder.completed ? '提醒已完成！' : '提醒已恢复');
    }
}

// 删除提醒
window.deleteReminder = function(id) {
    if (confirm('确定要删除这个提醒吗？')) {
        reminders = reminders.filter(r => r.id !== id);
        saveReminders();
        renderReminderTabs('today');
        updateRemindersDisplay();
        showToast('提醒已删除');
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
            <div class="reminder-item" onclick="openReminderModal()">
                <span class="reminder-icon">${typeIcons[r.type]}</span>
                <div class="reminder-content">
                    <div class="reminder-title">${escapeHtml(r.title)}</div>
                    <div class="reminder-type">${r.time} ${r.repeat ? '• 每日' : ''}</div>
                </div>
                <span class="reminder-time">${r.time}</span>
            </div>
        `).join('');
    }
}

// 检查提醒（每分钟调用）
function checkReminders() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const today = getDateKey(now);

    reminders.forEach(reminder => {
        if (reminder.completed) return;

        const reminderDate = new Date(reminder.date + 'T' + reminder.time);
        const reminderDateKey = getDateKey(reminderDate);

        // 检查是否在提醒时间（1分钟内）
        if (reminderDateKey === today && reminder.time === currentTime) {
            showNotification(reminder);
        }
    });
}

// 显示通知
function showNotification(reminder) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(`${typeIcons[reminder.type]} ${reminder.title}`, {
            body: reminder.notes || reminder.time,
            icon: '🔔',
            tag: reminder.id,
            requireInteraction: true
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    } else {
        // 浏览器不支持通知或权限未授予，显示Toast
        showToast(`🔔 ${reminder.title} - ${reminder.time}`);
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
