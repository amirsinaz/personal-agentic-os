import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { runSetupWizard } from "./setup-wizard.js";

const prompts = {
  obsidianInstalled: "آیا Obsidian نصب است؟ (بله/خیر): ",
  dashboardOnly: "فعلاً فقط Dashboard را بدون حافظه‌ی کامل راه‌اندازی کنیم؟ (بله/خیر): ",
  vaultPath: "مسیر کامل Vault را وارد کنید: ",
  appDataPath: "مسیر کامل نگه‌داری داده‌های محلی Agentic OS: ",
  projectPath: "مسیر پروژه‌ای که فایل راهنمای Agentها در آن ساخته شود: ",
  tools: "ابزارها را با کاما جدا کنید (codex,claude,gemini): ",
  sources: "مسیر داده‌ها را به‌شکل tool=/path و با کاما جدا کنید: ",
  projectRoots: "ریشه پروژه‌ها را به‌شکل project-id=/path و با کاما جدا کنید: ",
  projectCandidates: "کاندیداهای پروژه را به‌صورت JSON وارد کنید یا [] بنویسید: ",
  syncMode: "حالت همگام‌سازی را انتخاب کنید (manual/recurring): ",
  priceBook: "Price Book تأییدشده را به‌صورت JSON وارد کنید یا [] بنویسید: ",
  subscriptions: "اشتراک‌های ماهانه تأییدشده را به‌صورت JSON وارد کنید یا [] بنویسید: ",
  budgets: "بودجه‌های ماهانه تأییدشده را به‌صورت JSON وارد کنید یا [] بنویسید: ",
  telemetryConsent: "آیا با شمارش ناشناس نصب موفق موافقید؟ (بله/خیر): ",
  createStarterVault: "آیا ساختار خالی Starter Vault ساخته شود؟ (بله/خیر): ",
  approvePlan: "آیا نقشه‌ی اتصال‌ها و پروژه‌ها برای انتقال تأیید است؟ (بله/خیر): ",
};

const yes = new Set(["بله", "yes", "y"]);
const rl = createInterface({ input, output });

try {
  const result = await runSetupWizard({
    ask: async (key, context) => {
      if (key === "approvePlan") output.write(`\nبررسی پیش از انتقال:\n${JSON.stringify(context, null, 2)}\n`);
      const answer = (await rl.question(prompts[key])).trim();
      if (["obsidianInstalled", "dashboardOnly", "telemetryConsent", "createStarterVault", "approvePlan"].includes(key)) {
        return yes.has(answer.toLowerCase());
      }
      if (key === "tools") return answer.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
      if (["sources", "projectRoots"].includes(key)) return Object.fromEntries(answer.split(",").filter(Boolean).map((item) => {
        const [provider, ...sourcePath] = item.split("=");
        return [provider.trim().toLowerCase(), sourcePath.join("=").trim()];
      }));
      if (["projectCandidates", "priceBook", "subscriptions", "budgets"].includes(key)) return JSON.parse(answer || "[]");
      return answer;
    },
  });

  if (result.status === "needs-obsidian") {
    output.write(`\nابتدا Obsidian را از منبع رسمی نصب کنید: ${result.downloadUrl}\n`);
  } else if (result.status === "review-required") {
    output.write("\nهیچ فایلی ساخته نشد. نقشه را اصلاح و دوباره تأیید کنید.\n");
  } else {
    output.write(`\nراه‌اندازی محلی کامل شد. فایل تنظیمات: ${result.configPath}\n`);
  }
} finally {
  rl.close();
}
