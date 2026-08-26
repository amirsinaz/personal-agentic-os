# پرامپت راه‌اندازی با Claude Code

```text
## Objective
Personal Agentic OS را از `[REPOSITORY_URL]` به‌صورت محلی و Privacy-first برای من راه‌اندازی کن.

## Scope and boundaries
- ابتدا فقط محیط را بررسی کن.
- قبل از Clone، دانلود، نصب Dependency یا Skill، اجرای Installer، ساخت سرویس دائمی یا نوشتن خارج از پوشه‌ی فعلی اجازه بگیر.
- هیچ Secret، محتوای Vault، نام پروژه، Prompt، مسیر، Token یا Cost را به بیرون ارسال نکن.
- Telemetry پیش‌فرض خاموش است و فقط با رضایت صریح من فعال می‌شود.
- هیچ گزینه‌ی Permission bypass را فعال نکن.

## Execution
پس از اجازه‌ی من Repository را دریافت کن، فایل `prompts/bootstrap-codex.md` را به‌عنوان مشخصات کامل نصب بخوان و تمام مراحل آن را اجرا کن. هر اشاره به Codex را برای این اجرا Claude Code در نظر بگیر و Adapter مربوط به `CLAUDE.md` را نصب کن. Setup Wizard رسمی Repository را اجرا کن؛ منطق نصب را دوباره از روی حدس بازسازی نکن.

اگر Obsidian نصب نیست، مسیر رسمی نصب یا حالت Dashboard-only را ارائه کن. در پایان فقط با تست واقعی Sync و مشاهده‌ی تغییر داده‌ی محلی، راه‌اندازی را کامل اعلام کن.
```

🎯 Target: Claude Code، 💡 برای اجرای کنترل‌شده‌ی Setup Wizard با Permission boundary و توقف پیش از تغییرات سیستمی بهینه شده است.

این Prompt به فایل‌ها و Terminal دسترسی واقعی می‌دهد؛ مسیر Repository و مجوزها را قبل از اجرا بررسی کنید.
