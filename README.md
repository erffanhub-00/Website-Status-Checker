# Website Status Checker

A simple static page that checks whether websites are reachable, right from the browser — no server or backend needed. The site list lives in `sites.json`, and the page re-checks it every 30 seconds.

یک صفحه استاتیک ساده برای بررسی لحظه‌ای در دسترس بودن سایت‌ها، بدون نیاز به سرور یا بک‌اند. لیست سایت‌ها در فایل `sites.json` نگه داشته می‌شود و صفحه هر ۳۰ ثانیه آن‌ها را بررسی می‌کند.

[![CI](https://github.com/erffanhub-00/Website-Status-Checker/actions/workflows/ci.yml/badge.svg)](https://github.com/erffanhub-00/Website-Status-Checker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

- Reachability checks with `HEAD` requests and a 3-second timeout
- Response time shown in milliseconds, color-coded
- Auto-refresh every 30 seconds, plus a manual refresh button
- A "checking" state for each site and for the overall status — no "all offline" flash on first load
- `sites.json` validation — invalid entries are skipped and a warning is shown
- Dark theme, right-to-left layout, fully responsive

### ویژگی‌ها

- بررسی در دسترس بودن با متد `HEAD` و تایم‌اوت ۳ ثانیه
- نمایش زمان پاسخ به میلی‌ثانیه با رنگ‌بندی
- بروزرسانی خودکار هر ۳۰ ثانیه + دکمه بروزرسانی دستی
- حالت «در حال بررسی» برای هر سایت و برای وضعیت کلی، بدون فلش «همه آفلاین» در لود اول
- اعتبارسنجی `sites.json` — ورودی‌های نامعتبر نادیده گرفته می‌شوند و هشدارشان نمایش داده می‌شود
- تم دارک، راست‌چین و کاملاً واکنش‌گرا

## Quickstart

```bash
git clone https://github.com/erffanhub-00/Website-Status-Checker.git
cd Website-Status-Checker
```

The page must be served over HTTP — opening the file directly (`file://`) does not work, because the browser blocks `fetch('sites.json')`.

```bash
# with Python
python3 -m http.server 8000

# or with npx
npx serve .
```

Then open `http://localhost:8000` in your browser.

To publish it online, enable GitHub Pages in the repository settings, on the `main` branch.

### شروع سریع

ریپو را کلون کنید و آن را با یک سرور HTTP سرو کنید (`file://` کار نمی‌کند). برای انتشار آنلاین، GitHub Pages را در تنظیمات ریپو روی شاخه `main` فعال کنید.

## Usage

For each site, the page sends a `HEAD` request with `mode: 'no-cors'`. If the server answers at the network level, the site counts as "reachable" and its response time is recorded; on a timeout or network error it counts as "unreachable".

One honest limitation: a static page cannot read the real HTTP status code of another site, because a `no-cors` response is opaque. A site returning 404 or 500 while its server is up still shows as "reachable" here. Reading real status codes needs a server or a proxy — this tool deliberately shows network-level reachability only.

### Adding a site

Edit `sites.json`. Each entry needs a name and an `http` or `https` URL:

```json
[
    { "name": "Google", "url": "https://www.google.com" },
    { "name": "GitHub", "url": "https://github.com" }
]
```

An entry without a name, with an invalid URL, or with a protocol other than `http`/`https` is skipped, and the number of skipped entries is shown above the list.

### نحوه استفاده

برای هر سایت یک درخواست `HEAD` با `mode: 'no-cors'` فرستاده می‌شود؛ اگر سرور در سطح شبکه پاسخ بدهد، سایت «در دسترس» حساب می‌شود. یک محدودیت مهم: صفحه استاتیک نمی‌تواند کد وضعیت واقعی HTTP سایت دیگر را بخواند، چون پاسخ `no-cors` مبهم است — سایتی که 404 یا 500 برمی‌گرداند ولی سرورش بالا است، اینجا «در دسترس» دیده می‌شود. برای افزودن سایت، `sites.json` را ویرایش کنید؛ ورودی بدون نام یا با آدرس نامعتبر نادیده گرفته می‌شود.

## Project structure

```
Website-Status-Checker/
├── index.html          # Main page
├── sites.json          # Site list
├── assets/
│   ├── css/
│   │   └── style.css   # Styles
│   └── js/
│       └── app.js      # Status-check logic
├── .github/
│   └── workflows/
│       └── ci.yml      # CI: validate sites.json, check JS syntax
├── LICENSE
└── README.md
```

## Development

The CI workflow (`.github/workflows/ci.yml`) runs on every push and pull request to `main`. It validates `sites.json` and checks the JavaScript syntax. You can run the same checks locally:

```bash
python3 -m json.tool sites.json > /dev/null
node --check assets/js/app.js
```

### توسعه

ورک‌فلوی CI در `.github/workflows/ci.yml` با هر پوش و پول‌ریکوئست روی `main` اجرا می‌شود: `sites.json` را اعتبارسنجی می‌کند و سینتکس جاوااسکریپت را چک می‌کند. همین دو بررسی را می‌توانید لوکال هم اجرا کنید.

## Contact

- Telegram: [t.me/erffan_hub](https://t.me/erffan_hub)
- X: [@Erffanhub_00](https://x.com/Erffanhub_00)
- GitHub: [erffanhub-00](https://github.com/erffanhub-00)

## License

MIT — see [LICENSE](LICENSE).
