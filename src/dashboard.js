function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderDashboard(state) {
  const projects = state.projects ?? [];
  const usage = state.usage ?? [];
  const usageByProject = state.usageByProject ?? [];
  const costs = state.costs;
  const budgets = state.budgetStatus ?? [];
  const recommendations = state.recommendations ?? [];
  const projectRows = projects.length
    ? projects.map((project) => `
      <article class="project">
        <div><span class="dot"></span><strong>${escapeHtml(project.name)}</strong></div>
        <code>${escapeHtml(project.status)}</code>
      </article>`).join("")
    : `<section class="empty">
        <strong>هنوز پروژه‌ای در Vault ثبت نشده</strong>
        <p>از قالب <code>Templates/Project.md</code> استفاده کنید و پروژه را در پوشه‌ی <code>01-Projects</code> قرار دهید.</p>
      </section>`;
  const providerNames = { codex: "Codex", claude: "Claude", gemini: "Gemini" };
  const usageRows = usage.length
    ? usage.map((item) => `<article class="usage-row"><strong>${providerNames[item.provider] ?? escapeHtml(item.provider)}</strong><span>${item.measurement === "actual" ? Number(item.totalTokens).toLocaleString("en-US") : "Unavailable"}</span><small>${item.measurement}</small></article>`).join("")
    : `<p class="muted">هنوز منبع مصرفی متصل نشده است.</p>`;
  const projectUsageRows = usageByProject.length
    ? usageByProject.map((item) => `<article class="allocation-row"><strong>${escapeHtml(item.project)}</strong><span>${Number(item.totalTokens).toLocaleString("en-US")}</span></article>`).join("")
    : `<p class="muted">هنوز مصرف قابل‌تخصیصی ثبت نشده است.</p>`;
  const meteredCost = costs?.metered?.measurement === "actual"
    ? `${Number(costs.metered.total).toFixed(2)} ${escapeHtml(costs.metered.currency)}`
    : "Unavailable";
  const subscriptionCost = costs?.subscriptions?.measurement === "actual"
    ? `${Number(costs.subscriptions.monthlyTotal).toFixed(2)} ${escapeHtml(costs.subscriptions.currency)}`
    : "Unavailable";
  const budgetRows = budgets.length
    ? budgets.map((item) => {
      const label = item.scope === "project" ? `پروژه: ${escapeHtml(item.project)}` : "کل ابزارها";
      if (item.measurement !== "actual") return `<article class="budget-card"><span>${label}</span><strong>Unavailable</strong><small>actual: unavailable</small></article>`;
      return `<article class="budget-card"><span>${label}</span><strong>${Number(item.actualSpend).toFixed(2)} / ${Number(item.budget).toFixed(2)} ${escapeHtml(item.currency)}</strong><small>برآورد پایان ماه: ${Number(item.forecast).toFixed(2)} ${escapeHtml(item.currency)} · ${escapeHtml(item.forecastMeasurement)}</small></article>`;
    }).join("")
    : `<p class="muted">بودجه‌ای ثبت نشده است.</p>`;
  const recommendationTitles = {
    "complete-project-attribution": "تخصیص مصرف به پروژه‌ها را کامل کنید",
    "complete-price-book": "Price Book مدل‌ها را تکمیل کنید",
  };
  const recommendationRows = recommendations.length
    ? recommendations.map((item) => {
      const evidence = item.id === "complete-project-attribution"
        ? `${Number(item.evidence.unassignedTokens).toLocaleString("en-US")} Token بدون پروژه`
        : `${Number(item.evidence.actualUsageRecords).toLocaleString("en-US")} رکورد مصرف واقعی، هزینه Unavailable`;
      return `<article class="recommendation"><div><strong>${recommendationTitles[item.id] ?? escapeHtml(item.id)}</strong><p>${evidence}</p></div><div class="recommendation-meta"><small>صرفه‌جویی: ${item.expectedSaving?.measurement === "actual" ? escapeHtml(item.expectedSaving.value) : "Unavailable"}</small><span>بررسی</span></div></article>`;
    }).join("")
    : `<p class="muted">پیشنهاد قابل‌اثباتی وجود ندارد.</p>`;

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Personal Agenting OS</title>
  <style>
    :root{--ink:#eef3ff;--muted:#b7c2d9;--panel:#121a2b;--line:#52627f;--mint:#72dfbd;--blue:#79a8ff;--bg:#080d1c}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0,#172747 0,var(--bg) 38%);color:var(--ink);font-family:Vazirmatn,Tahoma,sans-serif;min-height:100vh}
    main{width:min(1040px,calc(100% - 40px));margin:auto;padding:64px 0 80px}
    header{display:grid;grid-template-columns:1fr auto;gap:32px;align-items:end;border-bottom:1px solid var(--line);padding-bottom:32px}
    .eyebrow{direction:ltr;text-align:left;color:var(--mint);font:700 13px/1.4 ui-monospace,monospace;letter-spacing:2px}
    h1{font-size:clamp(38px,7vw,72px);line-height:1.25;margin:8px 0 0;max-width:760px}
    .source{direction:ltr;text-align:left;color:var(--muted);font:600 13px/1.7 ui-monospace,monospace}
    .spine{display:grid;grid-template-columns:190px 1fr;margin-top:44px;min-height:460px}
    aside{border-left:1px solid var(--line);padding-left:28px;color:var(--muted)}
    aside strong{display:block;color:var(--ink);font-size:28px;margin-bottom:8px}.live{color:var(--mint);font:700 12px ui-monospace,monospace}
    .content{padding-right:36px}.content h2{margin:0 0 20px;font-size:20px;color:var(--muted);font-weight:500}
    .project{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:22px 0;border-bottom:1px solid #293650}
    .project div{display:flex;align-items:center;gap:14px}.project strong{font-size:21px}.project code{direction:ltr;color:var(--mint);background:#0c1424;border:1px solid #344563;padding:7px 11px;border-radius:999px}
    .dot{width:9px;height:9px;border-radius:50%;background:var(--mint);box-shadow:0 0 0 5px #72dfbd18}
    .empty{border:1px dashed var(--line);background:#10192a;padding:34px;border-radius:18px}.empty strong{font-size:22px}.empty p{color:var(--muted);line-height:2;margin:12px 0 0}.empty code{direction:ltr;color:var(--blue)}
    .usage{margin-top:52px;border-top:1px solid var(--line);padding-top:28px}.usage h2{font-size:20px;color:var(--muted);font-weight:500}.usage-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;direction:ltr}.usage-row{background:var(--panel);border:1px solid #35435f;padding:20px;border-radius:14px;display:grid;gap:8px}.usage-row strong{font-size:18px}.usage-row span{font:700 27px ui-monospace,monospace}.usage-row small{color:var(--muted);font:600 11px ui-monospace,monospace;text-transform:uppercase}.muted{color:var(--muted)}
    .allocation{margin-top:42px}.allocation h2{font-size:20px;color:var(--muted);font-weight:500}.allocation-row{display:flex;direction:ltr;justify-content:space-between;border-bottom:1px solid #293650;padding:16px 0}.allocation-row span{font:700 17px ui-monospace,monospace;color:var(--blue)}
    .costs{margin-top:42px;display:grid;grid-template-columns:1fr 1fr;gap:12px;direction:ltr}.cost-card{background:#10192a;border:1px solid #35435f;padding:22px;border-radius:14px}.cost-card span{display:block;color:var(--muted);margin-bottom:12px}.cost-card strong{font:700 27px ui-monospace,monospace}
    .budgets{margin-top:42px}.budget-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.budget-card{background:var(--panel);border:1px solid #35435f;padding:20px;border-radius:14px}.budget-card span,.budget-card small{display:block;color:var(--muted)}.budget-card strong{display:block;direction:ltr;text-align:right;font:700 22px ui-monospace,monospace;margin:10px 0}.budget-card small{direction:ltr;text-align:right}
    .recommendations{margin-top:42px}.recommendation{display:flex;justify-content:space-between;gap:24px;padding:20px 0;border-bottom:1px solid #293650}.recommendation p{color:var(--muted);margin:8px 0 0}.recommendation-meta{display:grid;justify-items:end;gap:10px;white-space:nowrap}.recommendation-meta small{color:var(--muted);direction:ltr}.recommendation-meta span{color:var(--blue);border:1px solid #46618f;border-radius:999px;padding:6px 12px}
    @media(max-width:700px){main{padding-top:36px}.source{display:none}.spine{grid-template-columns:1fr}aside{border-left:0;border-bottom:1px solid var(--line);padding:0 0 24px}.content{padding:28px 0 0}.project{align-items:flex-start}.usage-grid,.costs,.budget-grid{grid-template-columns:1fr}}
  </style>
</head>
<body><main>
  <header><div><div class="eyebrow">LOCAL OPERATIONAL MEMORY</div><h1>وضعیت واقعی پروژه‌های شما</h1></div><div class="source">VAULT → SYNC → DASHBOARD</div></header>
  <section class="spine"><aside><strong>${projects.length}</strong><span>پروژه در حافظه‌ی محلی</span><p class="live">● LOCAL DATA</p></aside><div class="content"><h2>پروژه‌ها</h2>${projectRows}</div></section>
  <section class="usage"><h2>مصرف ثبت‌شده بر اساس ابزار</h2><div class="usage-grid">${usageRows}</div></section>
  <section class="allocation"><h2>مصرف براساس پروژه</h2>${projectUsageRows}</section>
  <section class="costs"><article class="cost-card"><span>هزینه‌ی واقعی API</span><strong>${meteredCost}</strong></article><article class="cost-card"><span>اشتراک ماهانه</span><strong>${subscriptionCost}</strong></article></section>
  <section class="budgets"><h2>بودجه‌ی ماهانه</h2><div class="budget-grid">${budgetRows}</div></section>
  <section class="recommendations"><h2>پیشنهادهای بهینه‌سازی</h2>${recommendationRows}</section>
</main></body></html>`;
}
