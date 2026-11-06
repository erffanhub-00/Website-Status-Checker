'use strict';

(function () {
    var JSON_URL = 'sites.json';
    var CHECK_INTERVAL = 30000;
    var TIMEOUT = 3000;

    var sites = [];
    var skipped = [];
    var statusCache = {};
    var isChecking = false;

    // Small helper: build an element with an optional class and text.
    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    function hostnameOf(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return url;
        }
    }

    // Validate the parsed sites.json content. Returns
    // { valid: [...], skipped: [{ index, reason }], error: string|null }.
    // Bad entries are skipped, never fatal.
    function validateSites(data) {
        var valid = [];
        var skippedEntries = [];
        if (!Array.isArray(data)) {
            return { valid: valid, skipped: skippedEntries, error: 'ساختار sites.json باید یک آرایه باشد' };
        }
        data.forEach(function (entry, index) {
            if (!entry || typeof entry !== 'object') {
                skippedEntries.push({ index: index, reason: 'ورودی معتبر نیست' });
                return;
            }
            var name = typeof entry.name === 'string' ? entry.name.trim() : '';
            var url = typeof entry.url === 'string' ? entry.url.trim() : '';
            if (!name) {
                skippedEntries.push({ index: index, reason: 'نام خالی است' });
                return;
            }
            try {
                var parsed = new URL(url);
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                    throw new Error('protocol');
                }
            } catch (e) {
                skippedEntries.push({ index: index, reason: 'آدرس معتبر نیست: ' + url });
                return;
            }
            valid.push({ name: name, url: url });
        });
        return { valid: valid, skipped: skippedEntries, error: null };
    }

    function loadSites() {
        return fetch(JSON_URL + '?t=' + Date.now())
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('فایل sites.json پیدا نشد (کد ' + response.status + ')');
                }
                return response.json();
            })
            .then(function (data) {
                var result = validateSites(data);
                if (result.error) throw new Error(result.error);
                sites = result.valid;
                skipped = result.skipped;
                if (!sites.length) {
                    throw new Error('هیچ سایت معتبری در sites.json نیست');
                }
                renderSkippedWarning();
                return checkAllSites();
            })
            .catch(function (error) {
                console.error('loadSites failed:', error);
                showError(error && error.message ? error.message : 'خطای نامشخص');
            });
    }

    function renderSkippedWarning() {
        var box = document.getElementById('skippedWarning');
        if (!skipped.length) {
            box.hidden = true;
            box.textContent = '';
            return;
        }
        box.hidden = false;
        box.textContent = skipped.length + ' ورودی نامعتبر در sites.json نادیده گرفته شد. جزئیات در کنسول مرورگر است.';
        skipped.forEach(function (entry) {
            console.warn('sites.json: skipped entry', entry.index, '-', entry.reason);
        });
    }

    function showError(message) {
        var container = document.getElementById('sitesList');
        container.replaceChildren();
        var box = el('div', 'error-box');
        box.append(el('div', 'error-title', 'خطا در بارگذاری'));
        box.append(el('div', 'error-message', message));
        container.append(box);
        var overall = document.getElementById('overallStatus');
        overall.classList.remove('checking', 'all-online', 'all-offline', 'partial');
        overall.classList.add('all-offline');
        overall.querySelector('.status-icon').className = 'status-icon offline';
        overall.querySelector('.status-badge').textContent = 'خطا در بارگذاری لیست سایت‌ها';
    }

    function refreshAll() {
        if (isChecking) return Promise.resolve();
        var btn = document.getElementById('refreshBtn');
        btn.classList.add('loading');
        btn.disabled = true;
        statusCache = {};
        return checkAllSites().finally(function () {
            btn.classList.remove('loading');
            btn.disabled = false;
        });
    }

    function checkAllSites() {
        if (!sites.length) return loadSites();
        isChecking = true;
        renderSites();
        updateOverallStatus();
        updateLastUpdate();
        return Promise.allSettled(sites.map(checkSite)).then(function () {
            renderSites();
            updateOverallStatus();
            updateLastUpdate();
        }).finally(function () {
            isChecking = false;
        });
    }

    // A static page cannot read the real HTTP status of a cross-origin site:
    // fetch with mode 'no-cors' returns an opaque response. A response at the
    // network level (even 404/500) therefore means "reachable", not "OK".
    // That limitation is stated in the README and in the page footer.
    function checkSite(site) {
        var key = site.url;
        var controller = new AbortController();
        var timeoutId = setTimeout(function () { controller.abort(); }, TIMEOUT);
        var startTime = performance.now();
        return fetch(site.url, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal,
            cache: 'no-cache'
        }).then(function () {
            statusCache[key] = {
                status: 'reachable',
                responseTime: Math.round(performance.now() - startTime),
                timestamp: Date.now()
            };
        }).catch(function () {
            statusCache[key] = {
                status: 'unreachable',
                responseTime: null,
                timestamp: Date.now()
            };
        }).finally(function () {
            clearTimeout(timeoutId);
        });
    }

    function stateOf(site) {
        var data = statusCache[site.url];
        if (data) return data.status;
        return isChecking ? 'checking' : 'unreachable';
    }

    function stateLabel(state) {
        if (state === 'reachable') return 'در دسترس';
        if (state === 'checking') return 'در حال بررسی…';
        return 'در دسترس نیست';
    }

    function renderSites() {
        var container = document.getElementById('sitesList');
        if (!sites.length) return;
        container.replaceChildren();
        sites.forEach(function (site) {
            var data = statusCache[site.url];
            var state = stateOf(site);
            var responseTime = data ? data.responseTime : null;

            var card = el('div', 'site-card ' + state);
            var info = el('div', 'info');
            info.append(el('span', 'name', site.name));
            info.append(el('span', 'url', hostnameOf(site.url)));
            if (responseTime !== null) {
                var time = el('span', 'response-time', responseTime + 'ms');
                if (responseTime > 2000) time.style.color = '#ef4444';
                else if (responseTime > 1000) time.style.color = '#f59e0b';
                info.append(time);
            } else if (state === 'checking') {
                info.append(el('span', 'response-time checking', 'در حال بررسی…'));
            } else {
                info.append(el('span', 'response-time offline', 'نامشخص'));
            }
            card.append(info);

            var status = el('div', 'status');
            status.append(el('span', 'status-dot ' + state));
            status.append(el('span', 'status-text ' + state, stateLabel(state)));
            card.append(status);

            container.append(card);
        });
    }

    function updateOverallStatus() {
        if (!sites.length) return;
        var total = sites.length;
        var reachable = 0;
        var checked = 0;
        var totalTime = 0;
        var timeCount = 0;
        sites.forEach(function (site) {
            var data = statusCache[site.url];
            if (!data) return;
            checked++;
            if (data.status === 'reachable') {
                reachable++;
                if (data.responseTime !== null) {
                    totalTime += data.responseTime;
                    timeCount++;
                }
            }
        });

        var container = document.getElementById('overallStatus');
        var icon = container.querySelector('.status-icon');
        var badge = container.querySelector('.status-badge');
        container.classList.remove('checking', 'all-online', 'all-offline', 'partial');

        var avgTime = '';
        if (timeCount > 0) {
            avgTime = ' | میانگین: ' + Math.round(totalTime / timeCount) + 'ms';
        }

        if (isChecking && checked < total) {
            icon.className = 'status-icon checking';
            badge.textContent = 'در حال بررسی…';
            container.classList.add('checking');
        } else if (reachable === total) {
            icon.className = 'status-icon online';
            badge.textContent = 'همه سرویس‌ها در دسترس' + avgTime;
            container.classList.add('all-online');
        } else if (reachable === 0) {
            icon.className = 'status-icon offline';
            badge.textContent = 'همه سرویس‌ها در دسترس نیستند';
            container.classList.add('all-offline');
        } else {
            icon.className = 'status-icon partial';
            badge.textContent = reachable + ' از ' + total + ' سرویس در دسترس' + avgTime;
            container.classList.add('partial');
        }
    }

    function updateLastUpdate() {
        var timeString = new Date().toLocaleString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('lastUpdate').textContent = 'آخرین بروزرسانی: ' + timeString;
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('refreshBtn').addEventListener('click', refreshAll);
        loadSites();
        setInterval(function () {
            if (!isChecking) checkAllSites();
        }, CHECK_INTERVAL);
    });
})();
