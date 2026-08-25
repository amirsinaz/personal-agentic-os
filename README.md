# Personal Agenting OS

یک ساختار Local-first برای مدیریت چند پروژه و حفظ حافظه‌ی کاری مشترک میان Codex، Claude Code و Gemini CLI با استفاده از Obsidian.

این Repository هیچ پروژه، مسیر، Prompt، هزینه یا داده‌ی نمونه‌ای از سازنده ندارد. Dashboard پس از نصب فقط با اطلاعاتی که خود کاربر انتخاب می‌کند به‌روز می‌شود.

## چه چیزی دریافت می‌کنید؟

- Starter Vault خالی برای Obsidian
- Adapterهای محلی برای `AGENTS.md`، `CLAUDE.md` و `GEMINI.md`
- Sync مصرف Token از منابع محلی و قابل‌تأیید
- تخصیص مصرف به پروژه‌های تأییدشده یا `Unassigned`
- محاسبه‌ی هزینه فقط با Price Book تأییدشده‌ی کاربر
- Budget و Forecast با برچسب‌های `actual`، `estimated` و `unavailable`
- پیشنهادهای بهینه‌سازی و جریان «بررسی → اعمال → بازگشت به حالت قبلی»

## راه‌اندازی پیشنهادی

1. فایل [`prompts/master-install.md`](prompts/master-install.md) را باز کنید.
2. Prompt را در Codex، Claude Code یا Gemini CLI اجرا کنید.
3. Agent ابتدا سیستم و وجود Obsidian را بررسی می‌کند و قبل از نصب یا تغییرات سیستمی اجازه می‌گیرد.

برای اجرای مستقیم Setup پس از دریافت Repository:

```bash
npm install
npm run setup
npm run dashboard -- /absolute/path/to/config.json
```

## اگر Obsidian نصب نیست

Setup شما را به صفحه‌ی رسمی `https://obsidian.md/download` هدایت می‌کند. می‌توانید ابتدا Obsidian را نصب کنید یا حالت Dashboard-only را انتخاب کنید؛ در حالت دوم حافظه‌ی مشترک کامل فعال نیست.

## حریم خصوصی و شمارش نصب

Telemetry به‌صورت پیش‌فرض خاموش است. اگر کاربر صریحاً موافقت کند، تنها این اطلاعات برای شمارش یک نصب موفق مجازند:

- شناسه‌ی تصادفی نصب
- نسخه‌ی برنامه
- سیستم‌عامل
- نوع نصب: Full یا Dashboard-only
- زمان ثبت‌شده توسط Server

نام پروژه، مسیر فایل، محتوای Vault، Prompt، متن گفتگو، Token، Cost و Credential هرگز بخشی از این Payload نیستند.

## بررسی و بازگشت به حالت قبلی

```bash
npm run optimize -- preview /absolute/project/path codex,claude,gemini
npm run optimize -- apply /absolute/project/path codex,claude,gemini
npm run optimize -- rollback /absolute/project/path/.agenting-os/changes/AUDIT_ID.json
```

## وضعیت اندازه‌گیری

- `actual`: مستقیماً از داده‌ی قابل‌تأیید محاسبه شده است.
- `estimated`: Forecast است و به‌عنوان عدد واقعی گزارش نمی‌شود.
- `unavailable`: داده یا قیمت کافی وجود ندارد؛ سیستم عدد جایگزین نمی‌سازد.

## توسعه

```bash
npm test
```

این پروژه با MIT License منتشر می‌شود.
