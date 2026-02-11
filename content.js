// لود فونت BKoodkBd
(function loadFont() {
    const fontUrl = chrome.runtime.getURL('BKoodkBd.ttf');
    const fontFace = new FontFace('BKoodakBd', `url(${fontUrl})`, {
        weight: 'bold',
        style: 'normal'
    });
    
    fontFace.load().then((loadedFont) => {
        document.fonts.add(loadedFont);
        console.log('فونت BKoodak لود شد');
    }).catch((err) => {
        console.log('خطا در لود فونت:', err);
    });
})();

// فعال کردن کلیک راست در سایت
(function enableRightClick() {
    document.addEventListener('contextmenu', function(e) {
        e.stopPropagation();
    }, true);
    
    // حذف event listener های کلیک راست قبلی
    const oldContextMenu = document.oncontextmenu;
    document.oncontextmenu = null;
    
    console.log('کلیک راست فعال شد');
})();

// تابع اعتبارسنجی ورودی
function validateInput(text, mode, subject = '', receiver = '') {
    const errors = [];

    if (!text || text.trim().length < 2) {
        errors.push('متن باید حداقل 2 کاراکتر داشته باشد');
    }

    if (text && text.length > 10000) {
        errors.push('متن نباید بیشتر از 10000 کاراکتر باشد');
    }

    if (mode === 'smart' || mode === 'grammar') {
        if (!subject || subject.trim().length < 2) {
            errors.push('موضوع نامه باید حداقل 2 کاراکتر داشته باشد');
        }
        if (!receiver || receiver.trim().length < 2) {
            errors.push('نام گیرنده باید حداقل 2 کاراکتر داشته باشد');
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// تابع تزریق دکمه‌ها
function injectAIButton() {
    if (document.getElementById('ai-btn-group')) return;

    const toolbars = document.querySelectorAll('.mce-container-body.mce-flow-layout');
    let targetToolbar = null;

    if (toolbars.length > 0) {
        targetToolbar = toolbars[toolbars.length - 1];
    } else {
        targetToolbar = document.getElementById('mceu_33-body') || 
                        document.querySelector('.mce-toolbar-grp .mce-container-body');
    }

    if (!targetToolbar) return;

    const btnGroup = document.createElement('div');
    btnGroup.id = 'ai-btn-group';
    btnGroup.className = 'mce-container mce-flow-layout-item ai-toolbar-group'; 
    
    btnGroup.innerHTML = `
        <button type="button" id="ai-grammar-btn" class="ai-btn" title="بررسی املا، نگارش، موضوع و گیرنده">
            <span class="ai-icon">📝</span>
            <span class="ai-btn-text">بررسی نگارش</span>
        </button>
        
        <div class="ai-separator"></div>

        <select id="ai-tone-select" class="ai-select" title="انتخاب لحن نامه">
            <option value="formal_out">رسمی</option>
            <option value="boss">احترام‌آمیز</option>
            <option value="colleague">همکار</option>
            <option value="subordinate">دستوری</option>
        </select>

        <button type="button" id="ai-tone-btn" class="ai-btn" title="تغییر لحن متن">
            <span class="ai-icon">🗣️</span>
            <span class="ai-btn-text">تغییر لحن</span>
        </button>

        <div class="ai-separator"></div>

        <button type="button" id="ai-smart-btn" class="ai-btn ai-btn-smart" title="بازنویسی کامل با AI">
            <span class="ai-icon">✨</span>
            <span class="ai-btn-text">بازنویسی هوشمند</span>
        </button>

        <div class="ai-separator"></div>

        <button type="button" id="ai-reply-btn" class="ai-btn ai-btn-reply" title="ساخت پاسخ رسمی به نامه">
            <span class="ai-icon">💬</span>
            <span class="ai-btn-text">پاسخ به نامه</span>
        </button>
    `;

    targetToolbar.appendChild(btnGroup);
    setTimeout(() => btnGroup.classList.add('ai-toolbar-visible'), 50);

    // رویدادها
    document.getElementById('ai-smart-btn').addEventListener('click', () => handleAIRequest('smart'));
    document.getElementById('ai-grammar-btn').addEventListener('click', () => handleAIRequest('grammar'));
    document.getElementById('ai-tone-btn').addEventListener('click', () => handleAIRequest('tone'));
    document.getElementById('ai-reply-btn').addEventListener('click', () => openReplyModal());
}

const observer = new MutationObserver(() => {
    if(!document.getElementById('ai-btn-group')) injectAIButton();
});
observer.observe(document.body, { childList: true, subtree: true });
injectAIButton();

// تابع خواندن از کلیپبورد با چند روش مختلف
async function pasteFromClipboard() {
    // روش 1: Clipboard API (مدرن)
    try {
        if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (text) return text;
        }
    } catch (err) {
        console.log('Clipboard API failed, trying fallback:', err);
    }
    
    // روش 2: execCommand (قدیمی اما سازگار)
    try {
        const textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.width = '1px';
        textarea.style.height = '1px';
        textarea.style.padding = '0';
        textarea.style.border = 'none';
        textarea.style.outline = 'none';
        textarea.style.boxShadow = 'none';
        textarea.style.background = 'transparent';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        const success = document.execCommand('paste');
        const text = textarea.value;
        document.body.removeChild(textarea);
        
        if (text && text.length > 0) {
            return text;
        }
    } catch (err) {
        console.log('execCommand paste failed:', err);
    }
    
    // اگر هیچ روشی کار نکرد
    throw new Error('لطفاً با Ctrl+V یا کلیک راست > Paste، متن را وارد کنید.');
}

// تابع باز کردن مودال پاسخ به نامه
function openReplyModal() {
    const subjectInput = document.getElementById('DocSubject');
    const receiverInput = document.getElementById('be');
    const originalSubject = subjectInput ? subjectInput.value.trim() : '';
    const originalReceiver = receiverInput ? receiverInput.value.trim() : '';

    const modal = document.createElement('div');
    modal.id = 'ai-reply-modal';
    modal.className = 'ai-modal-overlay';
    modal.innerHTML = `
        <div class="ai-modal-content">
            <div class="ai-modal-header">
                <h3>💬 ساخت پاسخ به نامه</h3>
                <button class="ai-modal-close">×</button>
            </div>
            <div class="ai-modal-body">
                <div class="ai-reply-section">
                    <label class="ai-label">📄 متن نامه اصلی:</label>
                    <div class="ai-input-with-paste">
                        <textarea id="ai-reply-original-text" class="ai-reply-textarea" placeholder="متن نامه اصلی را اینجا paste کنید..." rows="5"></textarea>
                        <button type="button" class="ai-paste-btn" id="ai-paste-original-btn" title="Paste از کلیپبورد">
                            📋 Paste
                        </button>
                    </div>
                </div>
                
                <div class="ai-reply-section">
                    <label class="ai-label">📝 گیرنده پاسخ:</label>
                    <input type="text" id="ai-reply-receiver" class="ai-reply-input" placeholder="نام گیرنده پاسخ را وارد کنید..." value="${originalReceiver || ''}">
                </div>
                
                <div class="ai-reply-row">
                    <div class="ai-reply-section ai-reply-half">
                        <label class="ai-label">🔢 شماره نامه اصلی:</label>
                        <input type="text" id="ai-reply-number" class="ai-reply-input" placeholder="مثال: 123/456">
                    </div>
                    <div class="ai-reply-section ai-reply-half">
                        <label class="ai-label">📅 تاریخ نامه اصلی:</label>
                        <input type="text" id="ai-reply-date" class="ai-reply-input" placeholder="مثال: 1403/02/15">
                    </div>
                </div>
                
                <div class="ai-reply-section">
                    <label class="ai-label">✍️ متن پاسخ شما (عامیانه):</label>
                    <textarea id="ai-reply-text" class="ai-reply-textarea" placeholder="متن پاسخ خود را به صورت عامیانه بنویسید...&#10;مثال: بله، موافقم. می‌تونیم این کار رو انجام بدیم." rows="5"></textarea>
                </div>
                
                <div class="ai-reply-section">
                    <label class="ai-label">🎯 لحن پاسخ:</label>
                    <select id="ai-reply-tone-select" class="ai-select ai-select-modal">
                        <option value="formal_out">رسمی (خارج سازمان)</option>
                        <option value="boss">احترام‌آمیز (مافوق)</option>
                        <option value="colleague">صمیمی (همکار)</option>
                        <option value="subordinate">دستوری (زیردست)</option>
                    </select>
                </div>
            </div>
            <div class="ai-modal-footer">
                <button id="ai-reply-cancel-btn" class="ai-btn-secondary">انصراف</button>
                <button id="ai-reply-generate-btn" class="ai-btn ai-btn-smart">
                    <span class="ai-icon">✨</span>
                    <span class="ai-btn-text">ساخت پاسخ</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('ai-modal-show'), 10);

    const closeBtn = modal.querySelector('.ai-modal-close');
    const cancelBtn = modal.querySelector('#ai-reply-cancel-btn');
    const generateBtn = modal.querySelector('#ai-reply-generate-btn');
    const pasteBtn = modal.querySelector('#ai-paste-original-btn');

    const closeModal = () => {
        modal.classList.remove('ai-modal-show');
        setTimeout(() => modal.remove(), 300);
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // دکمه Paste فقط برای متن نامه اصلی
    pasteBtn.addEventListener('click', async () => {
        const textArea = document.getElementById('ai-reply-original-text');
        try {
            const text = await pasteFromClipboard();
            if (text && text.trim().length > 0) {
                textArea.value = text;
                showNotification('✅ متن از کلیپبورد paste شد', 'success');
            } else {
                throw new Error('کلیپبورد خالی است');
            }
        } catch (err) {
            console.error('Paste error:', err);
            // راهنمایی برای کاربر
            textArea.focus();
            showNotification('💡 لطفاً متن را کپی کنید، سپس در کادر متن کلیک کنید و Ctrl+V را بزنید', 'info');
        }
    });

    // رویداد ساخت پاسخ
    generateBtn.addEventListener('click', async () => {
        const originalText = document.getElementById('ai-reply-original-text').value.trim();
        const replyText = document.getElementById('ai-reply-text').value.trim();
        const replyReceiver = document.getElementById('ai-reply-receiver').value.trim();
        const replyNumber = document.getElementById('ai-reply-number').value.trim();
        const replyDate = document.getElementById('ai-reply-date').value.trim();
        const replyTone = document.getElementById('ai-reply-tone-select').value;

        // اعتبارسنجی
        if (!originalText || originalText.length < 2) {
            showNotification('لطفاً متن نامه اصلی را وارد کنید', 'warning');
            return;
        }

        if (!replyText || replyText.length < 5) {
            showNotification('لطفاً متن پاسخ را وارد کنید (حداقل 5 کاراکتر)', 'warning');
            return;
        }

        if (!replyReceiver || replyReceiver.length < 2) {
            showNotification('لطفاً گیرنده پاسخ را وارد کنید', 'warning');
            return;
        }

        // غیرفعال کردن دکمه
        generateBtn.disabled = true;
        generateBtn.innerHTML = `
            <span class="ai-loading-spinner"></span>
            <span class="ai-btn-text">در حال ساخت پاسخ...</span>
        `;

        // پیدا کردن المنت ویرایشگر برای افکت
        let visualElement = document.getElementById('icanMainContainer');
        if (!visualElement) {
            const iframes = document.querySelectorAll('iframe');
            for (let iframe of iframes) {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    if (doc && (doc.body.id === 'tinymce' || doc.body.className.includes('mce-content-body'))) {
                        visualElement = doc.body;
                        break;
                    }
                } catch (e) {}
            }
        }
        
        if (visualElement) {
            visualElement.classList.add('ai-active-mode');
            createParticles(visualElement);
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: "generateReply",
                payload: {
                    originalText: originalText,
                    originalSubject: originalSubject,
                    originalReceiver: originalReceiver,
                    replyText: replyText,
                    replyReceiver: replyReceiver,
                    replyNumber: replyNumber,
                    replyDate: replyDate,
                    tone: replyTone
                }
            });

            if (response && response.success) {
                const result = response.data;
                
                // پیدا کردن المنت ویرایشگر برای قرار دادن پاسخ
                let targetElement = document.getElementById('icanMainContainer');
                if (!targetElement) {
                    const iframes = document.querySelectorAll('iframe');
                    for (let iframe of iframes) {
                        try {
                            const doc = iframe.contentDocument || iframe.contentWindow.document;
                            if (doc && (doc.body.id === 'tinymce' || doc.body.className.includes('mce-content-body'))) {
                                targetElement = doc.body;
                                break;
                            }
                        } catch (e) {}
                    }
                }

                if (targetElement) {
                    const formattedHTML = result.body.split('\n')
                        .filter(line => line.trim() !== '')
                        .map(line => `<div>${line}</div>`)
                        .join('');
                    
                    if (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT') {
                        targetElement.value = result.body;
                    } else {
                        targetElement.style.opacity = '0.3';
                        setTimeout(() => {
                            targetElement.innerHTML = formattedHTML;
                            targetElement.style.opacity = '1';
                        }, 200);
                    }
                    
                    targetElement.dispatchEvent(new Event('input', { bubbles: true }));
                    targetElement.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // آپدیت موضوع و گیرنده
                const subjectInput = document.getElementById('DocSubject');
                const receiverInput = document.getElementById('be');
                
                if (result.subject && subjectInput) {
                    subjectInput.value = result.subject;
                    subjectInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (result.receiver && receiverInput) {
                    receiverInput.value = result.receiver;
                    receiverInput.dispatchEvent(new Event('change', { bubbles: true }));
                }

                showNotification('✅ پاسخ با موفقیت ساخته شد', 'success');
                closeModal();
            } else {
                showNotification('❌ خطا: ' + (response ? response.error : 'نامشخص'), 'error');
            }
        } catch (err) {
            console.error("Reply Error:", err);
            showNotification('❌ خطا در ساخت پاسخ: ' + err.message, 'error');
        } finally {
            if (visualElement) {
                visualElement.classList.remove('ai-active-mode');
                removeParticles();
            }
            generateBtn.disabled = false;
            generateBtn.innerHTML = `
                <span class="ai-icon">✨</span>
                <span class="ai-btn-text">ساخت پاسخ</span>
            `;
        }
    });
}

// تابع اصلی ارسال درخواست
async function handleAIRequest(mode) {
    let targetElement = null;
    let visualElement = null;
    let text = "";

    // شناسایی ادیتور متن
    const mainContainer = document.getElementById('icanMainContainer');
    if (mainContainer && mainContainer.innerText.trim().length > 1) {
        targetElement = mainContainer;
        visualElement = mainContainer;
        text = mainContainer.innerText;
    }

    if (!text || text.trim().length < 1) {
        const iframes = document.querySelectorAll('iframe');
        for (let iframe of iframes) {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                if (!doc) continue;
                if (doc.body.id === 'tinymce' || doc.body.className.includes('mce-content-body') || doc.body.getAttribute('contenteditable') === 'true') {
                    if (doc.body.innerText.trim().length > 1) {
                        targetElement = doc.body;
                        visualElement = iframe.parentElement || iframe; 
                        text = doc.body.innerText;
                        break;
                    }
                }
            } catch (e) { console.log("Iframe error", e); }
        }
    }

    if (!text || text.trim().length < 2) {
        showNotification('متنی برای ویرایش پیدا نشد!', 'error');
        return;
    }

    const subjectInput = document.getElementById('DocSubject');
    const receiverInput = document.getElementById('be');
    const selectedTone = document.getElementById('ai-tone-select').value;
    const subject = subjectInput ? subjectInput.value.trim() : '';
    const receiver = receiverInput ? receiverInput.value.trim() : '';

    // اعتبارسنجی ورودی
    const validation = validateInput(text, mode, subject, receiver);
    if (!validation.isValid) {
        showNotification(validation.errors.join('\n'), 'error');
        return;
    }

    // افکت لودینگ Apple Intelligence
    if (visualElement) {
        visualElement.classList.add('ai-active-mode');
        createParticles(visualElement);
        console.log('انیمیشن Apple Intelligence فعال شد');
    } else {
        console.log('visualElement پیدا نشد');
    }
    
    let activeBtnId = 'ai-smart-btn';
    if (mode === 'grammar') activeBtnId = 'ai-grammar-btn';
    if (mode === 'tone') activeBtnId = 'ai-tone-btn';
    
    const activeBtn = document.getElementById(activeBtnId);
    if (!activeBtn) {
        showNotification('خطا در پیدا کردن دکمه فعال', 'error');
        return;
    }
    
    const originalBtnContent = activeBtn.innerHTML;
    activeBtn.classList.add('ai-btn-loading');
    activeBtn.disabled = true;
    activeBtn.innerHTML = `
        <span class="ai-loading-spinner"></span>
        <span class="ai-btn-text">در حال پردازش...</span>
    `;

    const payload = {
        mode: mode, 
        tone: selectedTone,
        text: text,
        subject: subject,
        receiver: receiver
    };

    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('زمان درخواست به پایان رسید')), 60000);
    });

    try {
        const messagePromise = chrome.runtime.sendMessage({
            action: "processText",
            payload: payload
        });

        const response = await Promise.race([messagePromise, timeoutPromise]);

        if (!response || !response.success) {
            throw new Error(response?.error || 'خطای نامشخص');
        }

        const result = response.data;

        if (result.body && result.body.trim()) {
            const formattedHTML = result.body.split('\n')
                .filter(line => line.trim() !== '')
                .map(line => `<div>${line}</div>`)
                .join('');

            if (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT') {
                targetElement.value = result.body;
            } else {
                targetElement.style.opacity = '0.3';
                setTimeout(() => {
                    targetElement.innerHTML = formattedHTML;
                    targetElement.style.opacity = '1';
                }, 200);
            }
            
            targetElement.dispatchEvent(new Event('input', { bubbles: true }));
            targetElement.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (mode === 'grammar' || mode === 'smart') {
            if (result.subject && subjectInput) {
                subjectInput.value = result.subject;
                subjectInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (result.receiver && receiverInput) {
                receiverInput.value = result.receiver;
                receiverInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
        
        showNotification('✅ ویرایش با موفقیت انجام شد', 'success');
        
    } catch (err) {
        console.error("Extension Error:", err);
        let errorMessage = err.message || 'خطای نامشخص';
        
        if (err.message && err.message.includes("Extension context invalidated")) {
            errorMessage = "افزونه آپدیت شده. لطفاً صفحه را رفرش کنید.";
        } else if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("network"))) {
            errorMessage = "خطا در اتصال به سرور.";
        }

        showNotification(errorMessage, 'error');
    } finally {
        if (visualElement) {
            visualElement.classList.remove('ai-active-mode');
            removeParticles();
        }
        activeBtn.classList.remove('ai-btn-loading');
        activeBtn.disabled = false;
        activeBtn.innerHTML = originalBtnContent;
    }
}

// سیستم نوتیفیکیشن
function showNotification(message, type = 'info') {
    const existing = document.getElementById('ai-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.id = 'ai-notification';
    notification.className = `ai-notification ai-notification-${type}`;
    notification.innerHTML = `
        <div class="ai-notification-content">
            <span class="ai-notification-text">${message}</span>
            <button class="ai-notification-close">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('ai-notification-show'), 10);
    
    notification.querySelector('.ai-notification-close').addEventListener('click', () => {
        notification.classList.remove('ai-notification-show');
        setTimeout(() => notification.remove(), 300);
    });
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.remove('ai-notification-show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// ایجاد پارتیکل‌های Apple Intelligence
function createParticles(container) {
    // حذف پارتیکل‌های قبلی (اگر وجود دارد)
    const existingParticles = container.querySelector('#ai-particles');
    if (existingParticles) existingParticles.remove();
    
    const particleContainer = document.createElement('div');
    particleContainer.className = 'ai-particles-container';
    particleContainer.id = 'ai-particles';
    
    // ایجاد 20 پارتیکل با رنگ‌های مختلف
    const colors = [
        ['#ff6b6b', '#ff8e53'],
        ['#ffa726', '#ffb74d'],
        ['#66bb6a', '#81c784'],
        ['#42a5f5', '#64b5f6'],
        ['#ab47bc', '#ba68c8'],
        ['#ec4899', '#f472b6']
    ];
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'ai-particle';
        
        const colorPair = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 2}s`;
        particle.style.animationDuration = `${2 + Math.random() * 2}s`;
        particle.style.background = `radial-gradient(circle, ${colorPair[0]}, ${colorPair[1]})`;
        particle.style.width = `${6 + Math.random() * 4}px`;
        particle.style.height = particle.style.width;
        
        particleContainer.appendChild(particle);
    }
    
    container.appendChild(particleContainer);
    console.log('پارتیکل‌های Apple Intelligence ساخته شدند');
}

function removeParticles() {
    const particles = document.querySelectorAll('.ai-particles-container');
    particles.forEach(p => p.remove());
    console.log('پارتیکل‌ها حذف شدند');
}
