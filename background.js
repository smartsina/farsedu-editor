// مدیریت Config و API Settings
let currentConfig = null;
let currentAPIKey = null;
let currentEndpoint = null;
let currentModelName = null;

// بارگذاری اولیه Config
async function loadConfig() {
    try {
        // ابتدا از storage بخوان
        const stored = await chrome.storage.local.get(['config']);
        if (stored.config && stored.config.models && stored.config.models.length > 0) {
            currentConfig = stored.config;
            console.log('Config loaded from storage:', currentConfig);
            updateAPISettings();
            return;
        }

        // اگر در storage نبود یا خالی بود، از فایل بخوان
        const response = await fetch(chrome.runtime.getURL('config.json'));
        currentConfig = await response.json();
        
        // ذخیره در storage
        await chrome.storage.local.set({ config: currentConfig });
        console.log('Config loaded from file and saved to storage:', currentConfig);
        updateAPISettings();
    } catch (error) {
        console.error('Error loading config:', error);
        // Fallback به مقادیر پیش‌فرض
        currentConfig = {
            apiKey: 'apikey 7b2d8295-3f2d-5259-9b6c-3272d8821bd3',
            defaultEndpoint: 'https://arvancloudai.ir/gateway/models/Qwen3-30B-A3B/gdRq_HXqUyVGOQVf3BUAV6SkcL6JUMJ1VSaeb7iaZnefE6NtadvjvsjfHDu7hXWY2eHDHhuZAk8CyqEDlO1PMi-tO6dmFYaGYxoMLuxommubKPNclFfnfGX2yE_NhjeCQCEmf_8MM5s_RFPVGOfgpvjJTVWkSpcqAUl0EJzIc31xEx3I7fp8ndH41fGfUp8NaSyMZoz16D-xZ-h6B0rsj2cmEKbtJzfpeyHvpe4xi4SXFAHbUBrl_DjFWITe1l_b/v1/chat/completions',
            models: [{
                id: 'qwen3-30b',
                name: 'Qwen3-30B-A3B',
                modelName: 'DeepSeek-R1-qwen-7b-awq',
                endpoint: 'https://arvancloudai.ir/gateway/models/Qwen3-30B-A3B/gdRq_HXqUyVGOQVf3BUAV6SkcL6JUMJ1VSaeb7iaZnefE6NtadvjvsjfHDu7hXWY2eHDHhuZAk8CyqEDlO1PMi-tO6dmFYaGYxoMLuxommubKPNclFfnfGX2yE_NhjeCQCEmf_8MM5s_RFPVGOfgpvjJTVWkSpcqAUl0EJzIc31xEx3I7fp8ndH41fGfUp8NaSyMZoz16D-xZ-h6B0rsj2cmEKbtJzfpeyHvpe4xi4SXFAHbUBrl_DjFWITe1l_b/v1/chat/completions',
                isDefault: true
            }]
        };
        updateAPISettings();
    }
}

// به‌روزرسانی تنظیمات API بر اساس config و مدل انتخابی
async function updateAPISettings() {
    if (!currentConfig) return;

    // دریافت مدل انتخابی کاربر
    const stored = await chrome.storage.local.get(['selectedModelId']);
    const selectedModelId = stored.selectedModelId;

    // پیدا کردن مدل انتخابی یا پیش‌فرض
    let selectedModel = null;
    if (selectedModelId && currentConfig.models) {
        selectedModel = currentConfig.models.find(m => m.id === selectedModelId);
    }
    
    if (!selectedModel && currentConfig.models) {
        selectedModel = currentConfig.models.find(m => m.isDefault) || currentConfig.models[0];
    }

    // تنظیم API Key و Endpoint
    currentAPIKey = currentConfig.apiKey || 'apikey 7b2d8295-3f2d-5259-9b6c-3272d8821bd3';
    currentEndpoint = selectedModel ? selectedModel.endpoint : (currentConfig.defaultEndpoint || 'https://arvancloudai.ir/gateway/models/Qwen3-30B-A3B/gdRq_HXqUyVGOQVf3BUAV6SkcL6JUMJ1VSaeb7iaZnefE6NtadvjvsjfHDu7hXWY2eHDHhuZAk8CyqEDlO1PMi-tO6dmFYaGYxoMLuxommubKPNclFfnfGX2yE_NhjeCQCEmf_8MM5s_RFPVGOfgpvjJTVWkSpcqAUl0EJzIc31xEx3I7fp8ndH41fGfUp8NaSyMZoz16D-xZ-h6B0rsj2cmEKbtJzfpeyHvpe4xi4SXFAHbUBrl_DjFWITe1l_b/v1/chat/completions');
    
    // تنظیم modelName برای استفاده در request
    currentModelName = selectedModel ? (selectedModel.modelName || 'DeepSeek-R1-qwen-7b-awq') : 'DeepSeek-R1-qwen-7b-awq';
    
    // اطمینان از اینکه endpoint شامل /chat/completions است
    if (currentEndpoint && !currentEndpoint.endsWith('/chat/completions')) {
        if (currentEndpoint.endsWith('/v1')) {
            currentEndpoint = currentEndpoint + '/chat/completions';
        } else if (!currentEndpoint.endsWith('/')) {
            currentEndpoint = currentEndpoint + '/chat/completions';
        } else {
            currentEndpoint = currentEndpoint + 'chat/completions';
        }
    }

    console.log('API Settings updated:', {
        apiKey: currentAPIKey.substring(0, 20) + '...',
        endpoint: currentEndpoint.substring(0, 50) + '...',
        model: selectedModel ? selectedModel.name : 'default',
        modelName: currentModelName
    });
}

// بارگذاری اولیه
loadConfig();

// گوش دادن به تغییرات storage برای reload خودکار config
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.config) {
        console.log('Config changed in storage, reloading...');
        loadConfig();
    }
});

// اعتبارسنجی payload
function validatePayload(payload) {
    if (!payload) {
        throw new Error('داده‌ای ارسال نشده است');
    }

    if (!payload.mode || !['grammar', 'tone', 'smart', 'reply'].includes(payload.mode)) {
        throw new Error('حالت پردازش نامعتبر است');
    }

    if (!payload.text || typeof payload.text !== 'string' || payload.text.trim().length < 2) {
        throw new Error('متن باید حداقل 2 کاراکتر داشته باشد');
    }

    if (payload.text.length > 10000) {
        throw new Error('متن نباید بیشتر از 10000 کاراکتر باشد');
    }

    if (payload.mode === 'smart' || payload.mode === 'grammar') {
        if (!payload.subject || payload.subject.trim().length < 2) {
            throw new Error('موضوع نامه باید حداقل 2 کاراکتر داشته باشد');
        }
        if (!payload.receiver || payload.receiver.trim().length < 2) {
            throw new Error('نام گیرنده باید حداقل 2 کاراکتر داشته باشد');
        }
    }

    if (payload.mode === 'reply') {
        if (!payload.replyText || payload.replyText.trim().length < 5) {
            throw new Error('متن پاسخ باید حداقل 5 کاراکتر داشته باشد');
        }
    }

    return true;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // بررسی احراز هویت
    if (request.action === "checkAuth") {
        (async () => {
            try {
                const result = await chrome.storage.local.get(['isAuthenticated', 'currentUser', 'isAdmin']);
                const isAuth = result.isAuthenticated && result.currentUser;
                sendResponse({ 
                    success: true, 
                    authenticated: isAuth,
                    user: result.currentUser || null,
                    isAdmin: result.isAdmin || false
                });
            } catch (error) {
                console.error('Auth check error:', error);
                sendResponse({ 
                    success: false, 
                    authenticated: false, 
                    error: error.message 
                });
            }
        })();
        return true; // برای async response
    }

    // مدیریت reload config
    if (request.action === "reloadConfig") {
        // خواندن مستقیم از storage
        chrome.storage.local.get(['config']).then((result) => {
            if (result.config) {
                currentConfig = result.config;
                updateAPISettings();
                console.log('Config reloaded from storage:', currentConfig);
                sendResponse({ success: true, message: 'Config reloaded' });
            } else {
                // اگر در storage نبود، از فایل بخوان
                loadConfig().then(() => {
                    sendResponse({ success: true, message: 'Config reloaded from file' });
                }).catch(err => {
                    sendResponse({ success: false, error: err.message });
                });
            }
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }

    // مدیریت تغییر مدل
    if (request.action === "modelChanged") {
        updateAPISettings().then(() => {
            sendResponse({ success: true, message: 'Model changed' });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }

    if (request.action === "processText") {
        // اعتبارسنجی اولیه
        try {
            validatePayload(request.payload);
        } catch (validationError) {
            sendResponse({ success: false, error: validationError.message });
            return false;
        }

        // پردازش با timeout (افزایش به 120 ثانیه)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('زمان درخواست به پایان رسید (120 ثانیه)')), 120000);
        });

        console.log('Starting processText request:', {
            mode: request.payload.mode,
            textLength: request.payload.text?.length,
            timestamp: new Date().toISOString()
        });

        Promise.race([
            processWithArvan(request.payload),
            timeoutPromise
        ])
        .then(result => {
            console.log('processText success:', result);
            sendResponse({ success: true, data: result });
        })
        .catch(err => {
            console.error("Background Error:", err);
            console.error("Error stack:", err.stack);
            const errorMessage = getErrorMessage(err);
            sendResponse({ success: false, error: errorMessage });
        });

        return true;
    }

    if (request.action === "generateReply") {
        // اعتبارسنجی اولیه
        try {
            if (!request.payload || !request.payload.originalText || !request.payload.replyText) {
                throw new Error('داده‌های لازم ارسال نشده است');
            }
            if (request.payload.originalText.trim().length < 2) {
                throw new Error('متن نامه اصلی باید حداقل 2 کاراکتر داشته باشد');
            }
            if (request.payload.replyText.trim().length < 5) {
                throw new Error('متن پاسخ باید حداقل 5 کاراکتر داشته باشد');
            }
        } catch (validationError) {
            sendResponse({ success: false, error: validationError.message });
            return false;
        }

        // ساخت پاسخ با timeout (افزایش به 120 ثانیه)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('زمان درخواست به پایان رسید (120 ثانیه)')), 120000);
        });

        console.log('Starting generateReply request:', {
            originalTextLength: request.payload.originalText?.length,
            replyTextLength: request.payload.replyText?.length,
            timestamp: new Date().toISOString()
        });

        Promise.race([
            generateReply(request.payload),
            timeoutPromise
        ])
        .then(result => {
            console.log('generateReply success:', result);
            sendResponse({ success: true, data: result });
        })
        .catch(err => {
            console.error("Reply Generation Error:", err);
            console.error("Error stack:", err.stack);
            const errorMessage = getErrorMessage(err);
            sendResponse({ success: false, error: errorMessage });
        });

        return true;
    }
});

// تابع تبدیل خطا به پیام قابل فهم
function getErrorMessage(error) {
    if (!error) {
        return 'خطای نامشخص رخ داد';
    }

    if (typeof error === 'string') {
        return error;
    }

    if (error.message) {
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.';
        }
        
        if (message.includes('timeout')) {
            return 'زمان درخواست به پایان رسید. لطفاً دوباره تلاش کنید.';
        }
        
        if (message.includes('401') || message.includes('unauthorized')) {
            return 'خطا در احراز هویت. لطفاً با پشتیبانی تماس بگیرید.';
        }
        
        if (message.includes('429') || message.includes('rate limit')) {
            return 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.';
        }
        
        if (message.includes('500') || message.includes('server')) {
            return 'خطا در سرور. لطفاً بعداً تلاش کنید.';
        }
        
        return error.message;
    }

    return 'خطای نامشخص در پردازش';
}

async function processWithArvan(payload) {
    let systemInstruction = "";
    
    // تعریف لحن‌ها
    const tones = {
        'formal_out': "بسیار رسمی، خشک و اداری (مناسب برای سازمان‌های خارج از اداره کل آموزش و پرورش فارس).",
        'boss': "رسمی اما با نهایت احترام، فروتنی و ادبیات فاخر (مناسب برای مقام مافوق).",
        'colleague': "اداری، حرفه‌ای اما صمیمی و روان (مناسب همکار هم‌تراز).",
        'subordinate': "رسمی، قاطع، صریح و دستوری (مناسب زیردست)."
    };

    const selectedToneDesc = tones[payload.tone] || tones['formal_out'];

    // سناریو ۱: بررسی نگارش (شامل موضوع و گیرنده)
    if (payload.mode === 'grammar') {
        systemInstruction = `
        شما یک ویراستار دقیق و حرفه‌ای نامه‌های اداری هستید.
        وظیفه: بررسی و اصلاح املا، نگارش، موضوع و گیرنده نامه.
        
        قوانین:
        1. فقط غلط‌های املایی، علایم نگارشی، ویرگول‌گذاری و ایرادات دستوری واضح را اصلاح کن وتحت هیچ شرایطی اسم و فامیا ها رو تغییر نده.
        2. به هیچ وجه کلمات را تغییر نده، لحن را عوض نکن و جملات را بازنویسی نکن و فاصله و نیم فاصله رو رعایت کن و علامت گذاری نگارشی استاندارد هم رعایت کن .
        3. ساختار و محتوای متن باید حفظ شود.
        4. موضوع را کوتاه، دقیق و اداری کن (حداکثر 10 کلمه).
        5. گیرنده را اصلاح کن: اگر نامه به خارج سازمان است → "نام فرد - سمت - نام سازمان"، اگر درون سازمان است → "نام اداره یا سمت".
        
        فرمت خروجی الزامی:
        ---SUBJECT---
        (موضوع اصلاح شده)
        ---RECEIVER---
        (گیرنده اصلاح شده)
        ---BODY---
        (متن اصلاح شده بدون تغییر لحن)
        `;
    }
    // سناریو ۲: تغییر لحن (فقط متن بدنه)
    else if (payload.mode === 'tone') {
        systemInstruction = `
        شما یک نویسنده ماهر مکاتبات اداری در اداره کل آموزش و پرورش استان فارس هستید.
        وظیفه: بازنویسی متن با لحن مشخص شده.
        
        لحن مورد نظر: ${selectedToneDesc}
        
        قوانین:
        1.  معنی و مفهوم متن نباید تغییر کند اسم ها و فامیل ها تحت هیچ شرایطی تغییر نکند .
        2. فقط لحن و ادبیات جملات را تغییر بده.
        3. املا و نگارش را رعایت کن و فاصله و نیم فاصله رو رعایت کن و علامت گذاری نگارشی استاندارد هم رعایت کن.
        4. تاریخ‌ها و مبالغ را بدون دستکاری نگه دار.
        5. خروجی فقط متن بازنویسی شده باشد (بدون تیتر یا مقدمه).
        `;
    }
    // سناریو ۳: بازنویسی هوشمند کامل (متن + موضوع + گیرنده + لحن)
    else {
        systemInstruction = `
        شما مسئول بازنویسی و بهینه‌سازی نامه‌های دبیرخانه اداره کل آموزش و پرورش فارس هستید.
        وظیفه: بازنویسی کامل نامه با اعمال لحن، بهبود موضوع و اصلاح گیرنده.
        
        لحن مورد نظر: ${selectedToneDesc}
        
        قوانین:
        1. متن را کاملاً حرفه‌ای، رسمی، اداری و سلیس بازنویسی کن.
        2. لحن انتخابی را به طور کامل در متن اعمال کن.
        3. موضوع (Subject) را کوتاه، دقیق و اداری کن (حداکثر 10 کلمه).
        4. گیرنده (Receiver) را اصلاح کن:
           - نامه به خارج سازمان: "نام فرد - سمت - نام سازمان"
           - نامه به داخل سازمان: "نام اداره یا سمت"
        5. املا و نگارش فارسی را رعایت کن وفاصله و نیم فاصله رو رعایت کن و علامت گذاری نگارشی استاندارد هم رعایت کن و اسم ها و فامیل ها تحت هیچ شرایطی تغییر نکند.
        6. تاریخ‌ها و مبالغ را بدون دستکاری نگه دار.
        7. اگر دعوت‌نامه است، تاریخ، ساعت و مکان جلسه را حتماً بنویس (اگر نبود در آکولاد به کاربر اطلاع بده).
       
8. برای امضا و نام نویسنده در انتها نیازی به نوشتن نیست.
        
        فرمت خروجی الزامی (دقیقاً رعایت شود):
        ---SUBJECT---
        (موضوع بهینه شده)
        ---RECEIVER---
        (گیرنده اصلاح شده)
        ---BODY---
        (متن نامه بازنویسی شده با لحن مناسب - بدون توضیح اضافه)
        `;
    }

    // ساخت ورودی کاربر
    let userContent = `متن اصلی:\n${payload.text}`;
    if (payload.mode === 'grammar' || payload.mode === 'smart') {
        userContent = `موضوع فعلی: ${payload.subject || 'ندارد'}\nگیرنده فعلی: ${payload.receiver || 'ندارد'}\nمتن اصلی:\n${payload.text}`;
    }

    // اطمینان از اینکه API settings به‌روز هستند
    await updateAPISettings();
    
    if (!currentAPIKey || !currentEndpoint) {
        throw new Error('تنظیمات API یافت نشد. لطفاً در popup تنظیمات را بررسی کنید.');
    }

    console.log('API Request Details:', {
        endpoint: currentEndpoint.substring(0, 80) + '...',
        apiKey: currentAPIKey.substring(0, 20) + '...',
        modelName: currentModelName,
        mode: payload.mode,
        textLength: payload.text?.length
    });

    const requestBody = {
        model: currentModelName || "DeepSeek-R1-qwen-7b-awq",
        messages: [
            {"role": "system", "content": systemInstruction},
            {"role": "user", "content": userContent}
        ],
        temperature: payload.mode === 'grammar' ? 0.1 : (payload.mode === 'smart' ? 0.6 : 0.5),
        max_tokens: 3000
    };

    console.log('Request body:', {
        model: requestBody.model,
        messagesCount: requestBody.messages.length,
        systemLength: requestBody.messages[0].content.length,
        userLength: requestBody.messages[1].content.length,
        temperature: requestBody.temperature,
        max_tokens: requestBody.max_tokens
    });

    const startTime = Date.now();
    try {
        console.log('Sending fetch request to:', currentEndpoint);
        
        // استفاده از AbortController برای timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 ثانیه
        
        const response = await fetch(currentEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': currentAPIKey, 
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const fetchTime = Date.now() - startTime;
        console.log(`Fetch completed in ${fetchTime}ms, status: ${response.status}`);

        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
                console.error('API Error Response:', errorText);
            } catch (e) {
                console.error('Could not read error response');
            }
            const statusText = response.statusText || 'خطای نامشخص';
            throw new Error(`خطای سرور (${response.status}): ${statusText}. ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        console.log('API Response received:', {
            hasChoices: !!data.choices,
            choicesLength: data.choices?.length,
            hasMessage: !!data.choices?.[0]?.message,
            hasContent: !!data.choices?.[0]?.message?.content
        });
        
        if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
            console.error('Invalid API response:', JSON.stringify(data).substring(0, 500));
            throw new Error('پاسخ معتبری از سرور دریافت نشد. لطفاً endpoint و API key را بررسی کنید.');
        }

        const rawContent = data.choices[0]?.message?.content;
        
        if (!rawContent || rawContent.trim().length === 0) {
            console.error('Empty content in response:', data);
            throw new Error('متن بازنویسی شده خالی است');
        }
        
        console.log('Content received, length:', rawContent.length);
        
        // اگر حالت نگارش یا هوشمند بود، باید پارس شود
        if (payload.mode === 'grammar' || payload.mode === 'smart') {
            return parseResponse(rawContent, payload);
        } else {
            // برای حالت تغییر لحن، فقط متن را برمی‌گردانیم
            return { body: rawContent.trim() }; 
        }
    } catch (error) {
        console.error("ArvanCloud Error:", error);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        
        // اگر خطا از نوع AbortError باشد (timeout)
        if (error.name === 'AbortError') {
            throw new Error('زمان درخواست به پایان رسید (120 ثانیه). لطفاً دوباره تلاش کنید یا endpoint را بررسی کنید.');
        }
        
        // اگر خطا از نوع fetch باشد (مشکل شبکه)
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.');
        }
        
        // اگر خطا از قبل پردازش شده باشد، آن را دوباره throw کن
        if (error.message) {
            throw error;
        }
        
        // در غیر این صورت خطای عمومی
        throw new Error('خطا در ارتباط با سرویس هوش مصنوعی');
    }
}

// تابع ساخت پاسخ به نامه
async function generateReply(payload) {
    const tones = {
        'formal_out': "بسیار رسمی، خشک و اداری (مناسب برای سازمان‌های خارج از اداره کل آموزش و پرورش فارس).",
        'boss': "رسمی اما با نهایت احترام، فروتنی و ادبیات فاخر (مناسب برای مقام مافوق).",
        'colleague': "اداری، حرفه‌ای اما صمیمی و روان (مناسب همکار هم‌تراز).",
        'subordinate': "رسمی، قاطع، صریح و دستوری (مناسب زیردست)."
    };

    const selectedToneDesc = tones[payload.tone] || tones['formal_out'];

    // ساخت متن مرجع برای نامه اصلی
    let referenceText = '';
    if (payload.replyNumber && payload.replyDate) {
        referenceText = `در پاسخ به نامه شماره ${payload.replyNumber} مورخ ${payload.replyDate}`;
    } else if (payload.replyNumber) {
        referenceText = `در پاسخ به نامه شماره ${payload.replyNumber}`;
    } else if (payload.replyDate) {
        referenceText = `در پاسخ به نامه مورخ ${payload.replyDate}`;
    } else {
        referenceText = `پیرو نامه دریافتی`;
    }

    const systemInstruction = `
    شما یک نویسنده حرفه‌ای مکاتبات اداری در اداره کل آموزش و پرورش استان فارس هستید.
    وظیفه: ساخت یک پاسخ رسمی و اداری به نامه دریافتی بر اساس متن عامیانه‌ای که کاربر ارائه داده است.
    
    نامه اصلی:
    موضوع: ${payload.originalSubject || 'ندارد'}
    گیرنده: ${payload.originalReceiver || 'ندارد'}
    متن: ${payload.originalText}
    
    متن پاسخ عامیانه کاربر: ${payload.replyText}
    گیرنده پاسخ: ${payload.replyReceiver || payload.originalReceiver || 'ندارد'}
    ${payload.replyNumber ? `شماره نامه اصلی: ${payload.replyNumber}` : ''}
    ${payload.replyDate ? `تاریخ نامه اصلی: ${payload.replyDate}` : ''}
    
    لحن مورد نظر: ${selectedToneDesc}
    
    قوانین:
    1. متن عامیانه کاربر را به یک پاسخ رسمی و اداری تبدیل کن.
    2. لحن انتخابی را به طور کامل در پاسخ اعمال کن.
    3. پاسخ باید مناسب و مرتبط با نامه اصلی باشد.
    4. در ابتدای پاسخ حتماً بنویس: "${referenceText}" یا "پیرو نامه شماره [شماره] مورخ [تاریخ]" (اگر شماره و تاریخ موجود باشد).
    5. موضوع پاسخ را کوتاه و اداری کن (حداکثر 10 کلمه) - معمولاً "پاسخ به: [موضوع نامه اصلی]" یا "در پاسخ به نامه شماره..."
    6. گیرنده پاسخ: ${payload.replyReceiver || 'همان فرستنده نامه اصلی'}
    7. املا و نگارش فارسی را رعایت کن و فاصله و نیم فاصله رو رعایت کن و علامت گذاری نگارشی استاندارد هم رعایت کن.
    8. اسم‌ها و فامیل‌ها را تحت هیچ شرایطی تغییر نده.
    9. تاریخ‌ها و مبالغ را بدون دستکاری نگه دار.
    10. برای امضا و نام نویسنده در انتها نیازی به نوشتن نیست.
    
    فرمت خروجی الزامی (دقیقاً رعایت شود):
    ---SUBJECT---
    (موضوع پاسخ)
    ---RECEIVER---
    (گیرنده پاسخ)
    ---BODY---
    (متن پاسخ رسمی و اداری که با "${referenceText}" شروع می‌شود)
    `;

    const userContent = `لطفاً یک پاسخ رسمی و اداری به نامه بالا بر اساس متن عامیانه زیر بساز:\n${payload.replyText}`;

    // اطمینان از اینکه API settings به‌روز هستند
    await updateAPISettings();
    
    if (!currentAPIKey || !currentEndpoint) {
        throw new Error('تنظیمات API یافت نشد. لطفاً در popup تنظیمات را بررسی کنید.');
    }

    console.log('GenerateReply API Request Details:', {
        endpoint: currentEndpoint.substring(0, 80) + '...',
        apiKey: currentAPIKey.substring(0, 20) + '...',
        modelName: currentModelName,
        originalTextLength: payload.originalText?.length,
        replyTextLength: payload.replyText?.length
    });

    const requestBody = {
        model: currentModelName || "DeepSeek-R1-qwen-7b-awq",
        messages: [
            {"role": "system", "content": systemInstruction},
            {"role": "user", "content": userContent}
        ],
        temperature: 0.6,
        max_tokens: 3000
    };

    const startTime = Date.now();
    try {
        console.log('Sending generateReply fetch request to:', currentEndpoint);
        
        // استفاده از AbortController برای timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 ثانیه
        
        const response = await fetch(currentEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': currentAPIKey, 
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const fetchTime = Date.now() - startTime;
        console.log(`GenerateReply fetch completed in ${fetchTime}ms, status: ${response.status}`);

        if (!response.ok) {
            let errorText = '';
            try {
                errorText = await response.text();
                console.error('GenerateReply API Error Response:', errorText);
            } catch (e) {
                console.error('Could not read error response');
            }
            const statusText = response.statusText || 'خطای نامشخص';
            throw new Error(`خطای سرور (${response.status}): ${statusText}. ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        console.log('GenerateReply API Response received:', {
            hasChoices: !!data.choices,
            choicesLength: data.choices?.length,
            hasMessage: !!data.choices?.[0]?.message,
            hasContent: !!data.choices?.[0]?.message?.content
        });
        
        if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
            console.error('Invalid GenerateReply API response:', JSON.stringify(data).substring(0, 500));
            throw new Error('پاسخ معتبری از سرور دریافت نشد. لطفاً endpoint و API key را بررسی کنید.');
        }

        const rawContent = data.choices[0]?.message?.content;
        
        if (!rawContent || rawContent.trim().length === 0) {
            console.error('Empty content in generateReply response:', data);
            throw new Error('متن بازنویسی شده خالی است');
        }
        
        console.log('GenerateReply content received, length:', rawContent.length);
        
        if (!rawContent || rawContent.trim().length === 0) {
            throw new Error('پاسخ ساخته شده خالی است');
        }

        return parseResponse(rawContent, {
            subject: payload.originalSubject || '',
            receiver: payload.originalReceiver || '',
            body: ''
        });
    } catch (error) {
        console.error("Reply Generation Error:", error);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        
        // اگر خطا از نوع AbortError باشد (timeout)
        if (error.name === 'AbortError') {
            throw new Error('زمان درخواست به پایان رسید (120 ثانیه). لطفاً دوباره تلاش کنید یا endpoint را بررسی کنید.');
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.');
        }
        
        if (error.message) {
            throw error;
        }
        
        throw new Error('خطا در ساخت پاسخ');
    }
}

function parseResponse(rawText, originalPayload) {
    const result = {
        subject: originalPayload.subject || '',
        receiver: originalPayload.receiver || '',
        body: rawText.trim()
    };

    if (rawText.includes('---BODY---')) {
        const subjectMatch = rawText.match(/---SUBJECT---\s*([\s\S]*?)\s*---RECEIVER---/);
        const receiverMatch = rawText.match(/---RECEIVER---\s*([\s\S]*?)\s*---BODY---/);
        const bodyParts = rawText.split('---BODY---');
        
        if (bodyParts.length > 1) {
            result.body = bodyParts[1].trim();
        }

        if (subjectMatch && subjectMatch[1]) {
            result.subject = subjectMatch[1].trim();
        }

        if (receiverMatch && receiverMatch[1]) {
            result.receiver = receiverMatch[1].trim();
        }
    }

    // اعتبارسنجی نتیجه
    if (!result.body || result.body.length < 2) {
        throw new Error('متن بازنویسی شده معتبر نیست');
    }

    return result;
}
