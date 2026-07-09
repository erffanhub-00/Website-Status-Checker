// ===== تنظیمات =====
const JSON_URL = 'sites.json';
const CHECK_INTERVAL = 30000;
const TIMEOUT = 3000;

let sites = [];
let statusCache = {};
let isChecking = false;

async function loadSites() {
    try {
        const response = await fetch(JSON_URL + '?t=' + Date.now());
        if (!response.ok) throw new Error('فایل JSON پیدا نشد');
        sites = await response.json();
        await checkAllSites();
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

window.refreshAll = async function() {
    if (isChecking) return;
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('loading');
    btn.disabled = true;
    statusCache = {};
    await checkAllSites();
    btn.classList.remove('loading');
    btn.disabled = false;
};

async function checkAllSites() {
    if (!sites.length) {
        await loadSites();
        return;
    }
    isChecking = true;
    renderSites();
    updateOverallStatus();
    updateLastUpdate();
    
    const promises = sites.map(site => checkSiteFast(site));
    await Promise.allSettled(promises);
    
    renderSites();
    updateOverallStatus();
    updateLastUpdate();
    isChecking = false;
}

async function checkSiteFast(site) {
    const url = site.url;
    const key = url;
    try {
        const startTime = performance.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
        await fetch(url, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal,
            cache: 'no-cache'
        });
        clearTimeout(timeoutId);
        const responseTime = Math.round(performance.now() - startTime);
        statusCache[key] = {
            status: 'online',
            responseTime: responseTime,
            timestamp: Date.now()
        };
    } catch (error) {
        statusCache[key] = {
            status: 'offline',
            responseTime: null,
            timestamp: Date.now()
        };
    }
}

function renderSites() {
    const container = document.getElementById('sitesList');
    if (!sites.length) return;
    let html = '';
    sites.forEach(site => {
        const key = site.url;
        const data = statusCache[key];
        const isOnline = data && data.status === 'online';
        const responseTime = data ? data.responseTime : null;
        let displayUrl = site.url;
        try {
            const urlObj = new URL(site.url);
            displayUrl = urlObj.hostname;
        } catch (e) {}
        let timeColor = '#22c55e';
        if (responseTime !== null) {
            if (responseTime > 1000) timeColor = '#f59e0b';
            if (responseTime > 2000) timeColor = '#ef4444';
        }
        html += `
            <div class="site-card ${isOnline ? 'online' : 'offline'}">
                <div class="info">
                    <span class="name">${site.name}</span>
                    <span class="url">${displayUrl}</span>
                    ${responseTime !== null ? 
                        `<span class="response-time" style="color:${timeColor};">⚡ ${responseTime}ms</span>` : 
                        `<span class="response-time offline">⏱️ نامشخص</span>`
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

function updateOverallStatus() {
    if (!sites.length) return;
    const total = sites.length;
    let online = 0;
    let totalTime = 0;
    let timeCount = 0;
    sites.forEach(site => {
        const key = site.url;
        const data = statusCache[key];
        if (data && data.status === 'online') {
            online++;
            if (data.responseTime !== null) {
                totalTime += data.responseTime;
                timeCount++;
            }
        }
    });
    const container = document.getElementById('overallStatus');
    const icon = container.querySelector('.status-icon');
    const badge = container.querySelector('.status-badge');
    container.classList.remove('all-online', 'all-offline', 'partial');
    let avgTime = '';
    if (timeCount > 0) {
        const avg = Math.round(totalTime / timeCount);
        avgTime = ` | ⚡ میانگین: ${avg}ms`;
    }
    if (online === total) {
        icon.textContent = '✅';
        badge.textContent = `همه سرویس‌ها آنلاین ${avgTime}`;
        container.classList.add('all-online');
    } else if (online === 0) {
        icon.textContent = '❌';
        badge.textContent = 'همه سرویس‌ها آفلاین';
        container.classList.add('all-offline');
    } else {
        icon.textContent = '⚠️';
        badge.textContent = `${online} از ${total} سرویس آنلاین ${avgTime}`;
        container.classList.add('partial');
    }
}

function updateLastUpdate() {
    const now = new Date();
    const timeString = now.toLocaleString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('lastUpdate').textContent = `آخرین بروزرسانی: ${timeString}`;
}

document.addEventListener('DOMContentLoaded', () => {
    loadSites();
    setInterval(() => {
        if (!isChecking) {
            checkAllSites();
        }
    }, CHECK_INTERVAL);
});
