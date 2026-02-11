// مدیریت وضعیت
let currentUser = null;
let isAdmin = false;
let config = null;
let users = [];

// بارگذاری اولیه
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    await loadUsers();
    checkAuth();
    setupEventListeners();
    
    // گوش دادن به تغییرات storage
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.config) {
            console.log('Config changed in storage, reloading...');
            config = changes.config.newValue;
            if (isAdmin) {
                loadAdminData();
            } else {
                loadUserData();
            }
        }
    });
});

// خواندن config از storage یا فایل
async function loadConfig() {
    try {
        // ابتدا از storage بخوان
        const stored = await chrome.storage.local.get(['config']);
        if (stored.config && stored.config.models && Array.isArray(stored.config.models) && stored.config.models.length > 0) {
            config = stored.config;
            console.log('Config loaded from storage:', config);
            return;
        }

        // اگر در storage نبود یا خالی بود، از فایل بخوان
        const response = await fetch(chrome.runtime.getURL('config.json'));
        config = await response.json();
        
        // ذخیره در storage برای استفاده بعدی
        await chrome.storage.local.set({ config: config });
        console.log('Config loaded from file and saved to storage:', config);
    } catch (error) {
        console.error('Error loading config:', error);
        showError('خطا در بارگذاری فایل config.json');
    }
}

// خواندن فایل users.txt
async function loadUsers() {
    try {
        const response = await fetch(chrome.runtime.getURL('users.txt'));
        const text = await response.text();
        users = parseUsers(text);
        console.log('Users loaded:', users.length);
    } catch (error) {
        console.error('Error loading users:', error);
        showError('خطا در بارگذاری فایل users.txt');
    }
}

// پارس کردن فایل users.txt
function parseUsers(text) {
    const lines = text.split('\n');
    const userList = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [username, password] = trimmed.split(':');
            if (username && password) {
                userList.push({
                    username: username.trim(),
                    password: password.trim()
                });
            }
        }
    }
    
    return userList;
}

// بررسی احراز هویت
async function checkAuth() {
    const result = await chrome.storage.local.get(['isAuthenticated', 'currentUser', 'isAdmin']);
    
    if (result.isAuthenticated && result.currentUser) {
        currentUser = result.currentUser;
        isAdmin = result.isAdmin || false;
        showPage(isAdmin ? 'admin' : 'user');
        if (isAdmin) {
            loadAdminData();
        } else {
            loadUserData();
        }
    } else {
        showPage('login');
    }
}

// نمایش صفحه مورد نظر
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    if (page === 'login') {
        document.getElementById('login-page').classList.add('active');
    } else if (page === 'admin') {
        document.getElementById('admin-page').classList.add('active');
    } else if (page === 'user') {
        document.getElementById('user-page').classList.add('active');
    }
}

// تنظیم Event Listeners
function setupEventListeners() {
    // Login
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('user-logout-btn')?.addEventListener('click', handleLogout);

    // Admin - Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });

    // Admin - Add Model
    document.getElementById('add-model-btn')?.addEventListener('click', addModel);

    // Admin - Save API
    document.getElementById('save-api-btn')?.addEventListener('click', saveAPISettings);

    // User - Save Model
    document.getElementById('save-model-btn')?.addEventListener('click', saveSelectedModel);
}

// ورود به سیستم
async function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        showError('لطفاً نام کاربری و رمز عبور را وارد کنید');
        return;
    }

    // بررسی کاربر
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        showError('نام کاربری یا رمز عبور اشتباه است');
        return;
    }

    // ذخیره اطلاعات احراز هویت
    isAdmin = username === config.adminUsername;
    currentUser = username;
    
    await chrome.storage.local.set({
        isAuthenticated: true,
        currentUser: username,
        isAdmin: isAdmin
    });

    // نمایش صفحه مناسب
    showPage(isAdmin ? 'admin' : 'user');
    
    if (isAdmin) {
        loadAdminData();
    } else {
        loadUserData();
    }
}

// خروج از سیستم
async function handleLogout() {
    await chrome.storage.local.remove(['isAuthenticated', 'currentUser', 'isAdmin']);
    currentUser = null;
    isAdmin = false;
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    showPage('login');
}

// تغییر تب در صفحه Admin
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-tab`).classList.add('active');
}

// بارگذاری داده‌های Admin
async function loadAdminData() {
    // ابتدا از storage بخوان
    const stored = await chrome.storage.local.get(['config']);
    if (stored.config) {
        config = stored.config;
    }
    
    if (!config) {
        await loadConfig();
    }

    // بارگذاری API Settings
    document.getElementById('api-key').value = config.apiKey || '';
    document.getElementById('default-endpoint').value = config.defaultEndpoint || '';

    // بارگذاری مدل‌ها
    loadModelsList();
}

// بارگذاری لیست مدل‌ها
function loadModelsList() {
    const modelsList = document.getElementById('models-list');
    if (!modelsList || !config || !config.models) return;

    modelsList.innerHTML = '';

    config.models.forEach((model, index) => {
        const modelItem = document.createElement('div');
        modelItem.className = `model-item ${model.isDefault ? 'default' : ''}`;
        modelItem.innerHTML = `
            <div class="model-info">
                <div class="model-name">${model.name} ${model.isDefault ? '(پیش‌فرض)' : ''}</div>
                <div class="model-endpoint">API Model: ${model.modelName || 'DeepSeek-R1-qwen-7b-awq'}</div>
                <div class="model-endpoint" style="font-size: 10px; margin-top: 4px;">${model.endpoint.substring(0, 60)}...</div>
            </div>
            <div class="model-actions">
                ${!model.isDefault ? `<button class="btn btn-small btn-default set-default-btn" data-index="${index}">تنظیم پیش‌فرض</button>` : ''}
                <button class="btn btn-small btn-danger delete-model-btn" data-index="${index}">حذف</button>
            </div>
        `;
        modelsList.appendChild(modelItem);
    });

    // اضافه کردن event listener ها
    modelsList.querySelectorAll('.set-default-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            setDefaultModel(index);
        });
    });

    modelsList.querySelectorAll('.delete-model-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            deleteModel(index);
        });
    });
}

// افزودن مدل جدید
async function addModel() {
    const name = document.getElementById('model-name').value.trim();
    const modelNameApi = document.getElementById('model-name-api').value.trim();
    const endpoint = document.getElementById('model-endpoint').value.trim();

    if (!name || !endpoint) {
        showError('لطفاً نام مدل و endpoint را وارد کنید');
        return;
    }

    // افزودن به config
    if (!config.models) {
        config.models = [];
    }

    // اطمینان از اینکه endpoint شامل /chat/completions است
    let fullEndpoint = endpoint.trim();
    if (!fullEndpoint.endsWith('/chat/completions')) {
        if (fullEndpoint.endsWith('/v1')) {
            fullEndpoint = fullEndpoint + '/chat/completions';
        } else if (!fullEndpoint.endsWith('/')) {
            fullEndpoint = fullEndpoint + '/chat/completions';
        } else {
            fullEndpoint = fullEndpoint + 'chat/completions';
        }
    }

    const newModel = {
        id: `model-${Date.now()}`,
        name: name,
        modelName: modelNameApi || 'DeepSeek-R1-qwen-7b-awq',
        endpoint: fullEndpoint,
        isDefault: config.models.length === 0
    };

    config.models.push(newModel);

    // ذخیره config
    await saveConfig();

    // پاک کردن فیلدها
    document.getElementById('model-name').value = '';
    document.getElementById('model-name-api').value = '';
    document.getElementById('model-endpoint').value = '';

    // بارگذاری مجدد لیست
    loadModelsList();
    showSuccess('مدل با موفقیت اضافه شد');
}

// تنظیم مدل پیش‌فرض
async function setDefaultModel(index) {
    if (!config.models || !config.models[index]) return;

    // حذف پیش‌فرض از همه مدل‌ها
    config.models.forEach(m => m.isDefault = false);
    
    // تنظیم پیش‌فرض جدید
    config.models[index].isDefault = true;

    await saveConfig();
    loadModelsList();
    showSuccess('مدل پیش‌فرض تغییر کرد');
}

// حذف مدل
async function deleteModel(index) {
    if (!config.models || !config.models[index]) return;

    if (config.models[index].isDefault && config.models.length > 1) {
        showError('نمی‌توانید مدل پیش‌فرض را حذف کنید. ابتدا مدل دیگری را پیش‌فرض کنید.');
        return;
    }

    if (!confirm(`آیا مطمئن هستید که می‌خواهید مدل "${config.models[index].name}" را حذف کنید؟`)) {
        return;
    }

    config.models.splice(index, 1);

    // اگر مدلی باقی ماند، اولین را پیش‌فرض کن
    if (config.models.length > 0 && !config.models.some(m => m.isDefault)) {
        config.models[0].isDefault = true;
    }

    await saveConfig();
    loadModelsList();
    showSuccess('مدل حذف شد');
}

// ذخیره تنظیمات API
async function saveAPISettings() {
    const apiKey = document.getElementById('api-key').value.trim();
    const defaultEndpoint = document.getElementById('default-endpoint').value.trim();

    if (!apiKey) {
        showError('لطفاً API Key را وارد کنید');
        return;
    }

    config.apiKey = apiKey;
    config.defaultEndpoint = defaultEndpoint;

    await saveConfig();
    showSuccess('تنظیمات API ذخیره شد');
}

// ذخیره config (ارسال به background.js)
async function saveConfig() {
    // اطمینان از اینکه config به‌روز است
    if (!config) {
        console.error('Config is null, cannot save');
        return;
    }
    
    // ذخیره در storage
    await chrome.storage.local.set({ config: config });
    console.log('Config saved to storage:', config);
    
    // اطلاع به background.js برای reload
    try {
        await chrome.runtime.sendMessage({ action: 'reloadConfig' });
        console.log('Background notified of config change');
    } catch (error) {
        console.error('Error notifying background:', error);
    }
}

// بارگذاری داده‌های کاربر
async function loadUserData() {
    // بارگذاری config از storage
    const stored = await chrome.storage.local.get(['config']);
    const userConfig = stored.config || config;

    if (!userConfig || !userConfig.models) {
        document.getElementById('model-select').innerHTML = '<option value="">مدلی یافت نشد</option>';
        return;
    }

    // پر کردن dropdown
    const select = document.getElementById('model-select');
    select.innerHTML = '';
    
    userConfig.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name + (model.isDefault ? ' (پیش‌فرض)' : '');
        if (model.isDefault) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    // نمایش مدل فعلی
    const currentModel = userConfig.models.find(m => m.isDefault) || userConfig.models[0];
    if (currentModel) {
        document.getElementById('current-model-name').textContent = currentModel.name;
        select.value = currentModel.id;
    }
}

// ذخیره مدل انتخابی کاربر
async function saveSelectedModel() {
    const selectedModelId = document.getElementById('model-select').value;
    
    if (!selectedModelId) {
        showError('لطفاً یک مدل انتخاب کنید');
        return;
    }

    // ذخیره در storage
    await chrome.storage.local.set({ selectedModelId: selectedModelId });
    
    // اطلاع به background.js
    chrome.runtime.sendMessage({ 
        action: 'modelChanged', 
        modelId: selectedModelId 
    });

    showSuccess('مدل انتخابی ذخیره شد');
}

// نمایش پیام خطا
function showError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

// نمایش پیام موفقیت
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.querySelector('.content, .tab-content.active').prepend(successDiv);
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}
