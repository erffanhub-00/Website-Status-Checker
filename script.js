// ===== تنظیمات =====
const JSON_URL = 'sites.json';
const CHECK_INTERVAL = 60000; // 60 ثانیه

// ===== متغیرها =====
let sites = [];
let statusCache = {};
let isChecking = false;

// ===== بارگذاری سایت‌ها از JSON =====
async function loadSites() {
    try {
        const response = await fetch(JSON_URL + '?t=' + Date.now());
        if (!response.ok) throw new Error('فایل JSON پیدا نشد');
        sites = await response.json();
        
        // اگر سایت‌ها قبلاً چک نشده بودن، چک کن
        if (Object.keys(statusCache).length === 0) {
            await checkAllSites();
        } else {
            renderSites();
            updateOverallStatus();
            updateLastUpdate();
        }
    } catch (error) {
        console.error('خطا:', error);
        document.getElementById('sitesList').innerHTML = `
            <div style="grid-column:1/-1; text-align:center; color:#ef4444; padding:50px; background:rgba(239,68,68,0.05); border-radius:16px; border:1px solid rgba(239,68,68,0.2);">
                <div style="font-size:48px; margin-bottom:15px;">⚠️</div>
                <div style="font-size:18px; font-weight:600;">خطا در بارگذاری</div>
                <div style="font-size:14px; color:#8892a8; margin-top:8px;">${error.message}</div>
            </div>
        `;
    }
}

// ===== تابع بروزرسانی (همون دکمه) =====
async function refreshAll() {
    // جلوگیری از چندبار کلیک
    if (isChecking) return;
    
    const btn = document.getElementById('refreshBtn');
    
    // اضافه کردن کلاس لودینگ
    btn.classList.add('loading');
    btn.disabled = true;
    
    // چک کردن همه سایت‌ها
    await checkAllSites();
    
    // حذف کلاس لودینگ
    btn.classList.remove('loading');
    btn.disabled = false;
}

// ===== چک کردن همه سایت‌ها =====
async function checkAllSites() {
    if (!sites.length) {
        await loadSites();
        return;
    }

    isChecking = true;
    
    // اضافه کردن کلاس لودینگ به کارت‌ها
    document.querySelectorAll('.site-card').forEach(card => {
        card.classList.add('loading');
    });

    // چک کردن همه سایت‌ها به صورت موازی
    const promises = sites.map(site => checkSite(site));
    await Promise.all(promises);

    // رندر کردن نتایج
    renderSites();
    updateOverallStatus();
    updateLastUpdate();
    
    isChecking = false;
}

// ===== چک کردن یک سایت =====
async function checkSite(site) {
    const url = site.url;
    const key = url;

    try {
        const startTime = Date.now();
        
        // استفاده از روش fetch با timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(url, {
            mode: 'no-cors',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        // در mode:no-cors نمیشه وضعیت رو خوند، اما اگر خطا نده یعنی آنلاین
        statusCache[key] = {
            status: 'online',
            responseTime: responseTime,
            timestamp: Date.now()
        };
    } catch (error) {
        // اگر خطا خورد (تایم‌اوت یا شبکه) یعنی آفلاین
        statusCache[key] = {
            status: 'offline',
            responseTime: null,
            timestamp: Date.now()
        };
    }
}

// ===== رندر کردن کارت‌ها =====
function renderSites() {
    const container = document.getElementById('sitesList');
    
    if (!sites.length) return;
    
    let html = '';
    sites.forEach(site => {
        const key = site.url;
        const data = statusCache[key];
        const isOnline = data && data.status === 'online';
        const responseTime = data ? data.responseTime : null;
        
        // استخراج دامنه برای نمایش بهتر
        let displayUrl = site.url;
        try {
            const urlObj = new URL(site.url);
            displayUrl = urlObj.hostname;
        } catch (e) {}
        
        html += `
            <div class="site-card ${isOnline ? 'online' : 'offline'}">
                <div class="info">
                    <span class="name">${site.name}</span>
                    <span class="url">${displayUrl}</span>
                    ${responseTime !== null ? 
                        `<span class="response-time">⏱️ ${responseTime}ms</span>` : 
                        `<span class="response-time offline">⏱️ زمان پاسخ نامشخص</span>`
                    }
                </div>
                <div class="status">
                    <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
                    <span class="status-text ${isOnline ? 'online' : 'offline'}">
                        ${isOnline ? 'آنلاین' : 'آفلاین'}
                    </span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ===== بروزرسانی وضعیت کلی =====
function updateOverallStatus() {
    if (!sites.length) return;
    
    const total = sites.length;
    let online = 0;
    
    sites.forEach(site => {
        const key = site.url;
        if (statusCache[key] && statusCache[key].status === 'online') {
            online++;
        }
    });
    
    const container = document.getElementById('overallStatus');
    const icon = container.querySelector('.status-icon');
    const badge = container.querySelector('.status-badge');
    
    // حذف کلاس‌های قبلی
    container.classList.remove('all-online', 'all-offline', 'partial');
    
    if (online === total) {
        icon.textContent = '✅';
        badge.textContent = 'همه سرویس‌ها آنلاین';
        container.classList.add('all-online');
    } else if (online === 0) {
        icon.textContent = '❌';
        badge.textContent = 'همه سرویس‌ها آفلاین';
        container.classList.add('all-offline');
    } else {
        icon.textContent = '⚠️';
        badge.textContent = `${online} از ${total} سرویس آنلاین`;
        container.classList.add('partial');
    }
}

// ===== بروزرسانی زمان آخرین چک =====
function updateLastUpdate() {
    const now = new Date();
    const timeString = now.toLocaleString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('lastUpdate').textContent = `آخرین بروزرسانی: ${timeString}`;
}

// ===== بارگذاری اولیه =====
document.addEventListener('DOMContentLoaded', () => {
    loadSites();
    
    // چک کردن خودکار هر ۶۰ ثانیه
    setInterval(() => {
        if (!isChecking) {
            checkAllSites();
        }
    }, CHECK_INTERVAL);
});

// ===== رفرش دکمه رو به صورت گلوبال تعریف می‌کنیم =====
window.refreshAll = refreshAll;
