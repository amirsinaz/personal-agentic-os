import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { applyOptimization, previewOptimization, rollbackOptimization } from "./optimization-actions.js";

const [command, target, toolsValue = ""] = process.argv.slice(2);
const rl = createInterface({ input, output });
const yes = new Set(["بله", "yes", "y"]);

try {
  if (command === "preview" || command === "apply") {
    if (!target || !path.isAbsolute(target)) throw new Error("مسیر کامل پروژه را وارد کنید.");
    const tools = toolsValue.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    const preview = await previewOptimization({ projectPath: target, tools });
    output.write("\nبررسی تغییر پیشنهادی:\n");
    for (const change of preview.changes) output.write(`- ${change.file}: افزودن Lean context policy\n`);
    output.write("صرفه‌جویی مورد انتظار: Unavailable تا زمان مقایسه‌ی کنترل‌شده\n");
    if (command === "apply") {
      const answer = await rl.question("تغییرات بررسی‌شده اعمال شوند؟ (بله/خیر): ");
      const result = await applyOptimization({ preview, confirmed: yes.has(answer.trim().toLowerCase()) });
      output.write(`اعمال شد. برای بازگشت از این Audit استفاده کنید:\n${result.auditPath}\n`);
    }
  } else if (command === "rollback") {
    if (!target || !path.isAbsolute(target)) throw new Error("مسیر کامل Audit را وارد کنید.");
    const answer = await rl.question("فایل‌ها دقیقاً به حالت قبلی برگردند؟ (بله/خیر): ");
    await rollbackOptimization({ auditPath: target, confirmed: yes.has(answer.trim().toLowerCase()) });
    output.write("فایل‌ها به حالت قبلی برگشتند.\n");
  } else {
    throw new Error("دستور معتبر: preview، apply یا rollback");
  }
} finally {
  rl.close();
}
