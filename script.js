// آدرس فایل JSON 
const JSON_URL = 'sites.json';

// متغیرها
let sites = [];
let statusCache = {};

// بارگذاری JSON
async function loadSites() {
    try {
        const response = await fetch(JSON_URL);
        if (!response.ok) throw new Error('فایل JSON پیدا نشد');
        sites = await response.json();
        await checkAllSites();
    } catch (error) {
        console.error('خطا در بارگذاری:', error);
        document.getElementById('sitesList').innerHTML = `
            <div style="grid-column:1/-1; text-align:center; color:#dc3545; padding:40px;">
                ❌ خطا در بارگذاری فایل JSON: ${error.message}
            </div>
        `;
    }
}

// چک کردن همه سایت‌ها
async function checkAllSites() {
    if (!sites.length) {
        await loadSites();
        return;
    }

    // غیرفعال کردن دکمه
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    btn.textContent = '🔄 در حال بررسی...';

    // برای هر سایت چک کن
    const promises = sites.map(site => checkSite(site));
    await Promise.all(promises);

    // نمایش نتیجه
    renderSites();
    updateOverallStatus();
    updateLastUpdate();

    // فعال کردن دکمه
    btn.disabled = false;
    btn.textContent = '🔄 بروزرسانی';
}

// چک کردن یک سایت
async function checkSite(site) {
    const url = site.url;
    const key = url;

    // اگر قبلاً کش شده و کمتر از 30 ثانیه گذشته، دوباره چک نکن
    if (statusCache[key] && (Date.now() - statusCache[key].timestamp < 30000)) {
        return;
    }

    try {
        const startTime = Date.now();
        const response = await fetch(url, {
            mode: 'no-cors', // برای جلوگیری از CORS Error
            signal: AbortSignal.timeout(5000) // تایم‌اوت 5 ثانیه
        });

        // چون mode:no-cors هست، نمیشه status رو خوند
        // از روش جایگزین استفاده میکنیم: اگر fetch خطا نده یعنی آنلاین
        const responseTime = Date.now() - startTime;
        
        statusCache[key] = {
            status: 'online',
            responseTime: responseTime,
            timestamp: Date.now()
        };
    } catch (error) {
        // اگر خطا خورد یعنی آفلاین
        statusCache[key] = {
            status: 'offline',
            responseTime: null,
            timestamp: Date.now()
        };
    }
}

// رندر کردن کارت‌ها
function renderSites() {
    const container = document.getElementById('sitesList');
    
    let html = '';
    sites.forEach(site => {
        const key = site.url;
        const data = statusCache[key] || { status: 'offline', responseTime: null };
        const isOnline = data.status === 'online';
        
        html += `
            <div class="site-card ${isOnline ? 'online' : 'offline'}">
                <div class="info">
                    <span class="name">${site.name}</span>
                    <span class="url">${site.url}</span>
                    ${isOnline ? `<span style="font-size:12px;color:#28a745;">⏱️ ${data.responseTime}ms</span>` : ''}
                </div>
                <div class="status">
                    <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
                    <span class="status-text ${isOnline ? 'online' : 'offline'}">
                        ${isOnline ? '✅ آنلاین' : '❌ آفلاین'}
                    </span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// بروزرسانی وضعیت کلی
function updateOverallStatus() {
    const total = sites.length;
    let online = 0;
    
    sites.forEach(site => {
        const key = site.url;
        if (statusCache[key] && statusCache[key].status === 'online') {
            online++;
        }
    });
    
    const badge = document.querySelector('.status-badge');
    const container = document.querySelector('.overall-status');
    
    if (online === total) {
        badge.textContent = '✅ همه سرویس‌ها آنلاین';
        container.style.borderRightColor = '#28a745';
    } else if (online === 0) {
        badge.textContent = '❌ همه سرویس‌ها آفلاین';
        container.style.borderRightColor = '#dc3545';
    } else {
        badge.textContent = `⚠️ ${online} از ${total} سرویس آنلاین`;
        container.style.borderRightColor = '#ffc107';
    }
}

// بروزرسانی زمان آخرین چک
function updateLastUpdate() {
    const now = new Date();
    const timeString = now.toLocaleString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('lastUpdate').textContent = `آخرین بروزرسانی: ${timeString}`;
}

// تابع refresh برای دکمه
window.checkAllSites = checkAllSites;

// بارگذاری اولیه
document.addEventListener('DOMContentLoaded', () => {
    loadSites();
    // هر 60 ثانیه یکبار چک کن
    setInterval(checkAllSites, 60000);
});
