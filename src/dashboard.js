function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderDashboard(state,release={}) {
  const projects = state.projects ?? [];
  const usage = state.usage ?? [];
  const usageByProject = state.usageByProject ?? [];
  const costs = state.costs;
  const budgets = state.budgetStatus ?? [];
  const recommendations = state.recommendations ?? [];
  const agents = state.agents ?? [];
  const connections = state.connections ?? [];
  const canonicalProjects = state.canonicalProjects ?? [];
  const lastSync = state.lastSync;
  const contextPacks=state.contextPacks??[];
  const memoryHealth=state.memoryHealth;
  const pendingClarifications=(state.clarifications??[]).filter((item)=>item.status==="pending");
  const memoryExtraction=state.memoryExtraction??{enabled:false,conversationSources:[]};
  const memoryStatus=memoryHealth?.status==="healthy"?"سالم":memoryHealth?.status==="needs-review"?"نیازمند بررسی":"هنوز بررسی نشده";
  const releaseNotice=release.requiredUpdate?`<aside class="release-notice release-required" role="alert"><div><strong>به‌روزرسانی ضروری</strong><p>${escapeHtml(release.message||`نسخه‌ی ${release.latestVersion} یک اصلاح ضروری دارد.`)}</p></div><a href="${escapeHtml(release.releaseUrl)}" rel="noreferrer">ادامه پس از به‌روزرسانی ↗</a></aside>`:release.updateAvailable?`<aside class="release-notice"><div><strong>نسخه‌ی ${escapeHtml(release.latestVersion)} آماده است</strong><p>تغییرات را ببینید و پس از بررسی، نسخه را به‌روزرسانی کنید.</p></div><a href="${escapeHtml(release.releaseUrl)}" rel="noreferrer">دیدن نسخه‌ی جدید ↗</a></aside>`:"";
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
  const connectionNames = connections.length ? connections.map((item)=>providerNames[item.id] ?? escapeHtml(item.id)).join("، ") : "بدون اتصال";
  const sharedProjectCount = canonicalProjects.filter((project)=>project.shared).length;
  const changedProjects = lastSync ? [...(lastSync.changes?.created ?? []),...(lastSync.changes?.updated ?? []),...(lastSync.changes?.removed ?? [])] : [];
  const syncSummary = lastSync ? `${escapeHtml(lastSync.status)} · ${escapeHtml(lastSync.at)}${changedProjects.length ? ` · ${changedProjects.map(escapeHtml).join("، ")}` : ""}` : "هنوز اجرا نشده";
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
      const saving=item.expectedSaving?.measurement === "actual" ? escapeHtml(item.expectedSaving.value) : "داده‌ی کافی برای محاسبه وجود ندارد";
      return `<article class="recommendation"><div class="recommendation-copy"><strong>${recommendationTitles[item.id] ?? escapeHtml(item.id)}</strong><p>${evidence}</p></div><div class="recommendation-meta"><span class="status status-review">نیاز به بررسی</span><small>صرفه‌جویی</small><strong>${saving}</strong></div></article>`;
    }).join("")
    : `<p class="muted">پیشنهاد قابل‌اثباتی وجود ندارد.</p>`;
  const agentRows = agents.length
    ? agents.map((agent) => `<article class="agent-card"><div><span>${escapeHtml(agent.agentType)}</span><strong>${escapeHtml(agent.name)}</strong><p>${escapeHtml(agent.project)} · ${escapeHtml(agent.responsibility)}</p></div><div><code>${Number(agent.observationCount).toLocaleString("fa-IR")} مشاهده</code><small>${escapeHtml(agent.tools.join(", ") || "ابزار: unknown")}</small><small>${escapeHtml(agent.skills.join(", ") || "Skill: unknown")}</small></div></article>`).join("")
    : `<p class="muted">هنوز Observation تأییدشده‌ای برای Agentها ثبت نشده است.</p>`;
  const clarificationRows=pendingClarifications.length
    ? pendingClarifications.slice(0,10).map((item)=>`<article class="clarification-card"><div><span>${escapeHtml(item.project)} · ${escapeHtml(item.scopeType)} · ${escapeHtml(item.reason)}</span><strong>${escapeHtml(item.prompt)}</strong></div><form method="post" action="/clarifications"><input type="hidden" name="questionId" value="${escapeHtml(item.id)}"><label>Answer<textarea name="answer" required maxlength="4000" placeholder="Add the current, authoritative answer"></textarea></label><button type="submit">Save as confirmed memory</button></form></article>`).join("")
    : `<p class="muted">No clarification is currently required.</p>`;
  const memorySourceNames=(memoryExtraction.conversationSources??[]).map((item)=>escapeHtml(String(item).split(/[\\/]/).at(-1))).join(", ")||"No file connected";

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Personal Agentic OS</title>
  <style>
    :root{--ink:#eef3ff;--muted:#b7c2d9;--panel:#121a2b;--line:#52627f;--mint:#72dfbd;--blue:#79a8ff;--bg:#080d1c}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0,#172747 0,var(--bg) 38%);color:var(--ink);font-family:Vazirmatn,Tahoma,sans-serif;min-height:100vh}
    main{width:min(1040px,calc(100% - 40px));margin:auto;padding:64px 0 80px}
    header{display:grid;grid-template-columns:1fr auto;gap:32px;align-items:end;border-bottom:1px solid var(--line);padding-bottom:32px}
    .eyebrow{direction:ltr;text-align:left;color:var(--mint);font:700 13px/1.4 ui-monospace,monospace;letter-spacing:2px}
    h1{font-size:clamp(38px,7vw,72px);line-height:1.25;margin:8px 0 0;max-width:760px}
    .source{direction:ltr;text-align:left;color:var(--muted);font:600 13px/1.7 ui-monospace,monospace}
    .system-status{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;margin-top:28px;background:var(--line);border:1px solid var(--line)}.system-status article{background:var(--panel);padding:17px}.system-status span{display:block;color:var(--muted);font-size:12px;margin-bottom:7px}.system-status strong{font-size:15px;line-height:1.7}.system-status article:last-child strong{font:600 12px/1.7 ui-monospace,monospace;overflow-wrap:anywhere}
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
    .recommendations{margin-top:42px}.optimization-summary{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:18px}.optimization-summary h2{margin:0}.status-help{position:relative}.status-help summary{cursor:pointer;color:var(--blue);border:1px solid #46618f;border-radius:999px;padding:7px 12px;list-style:none}.status-help p{position:absolute;z-index:2;left:0;width:min(320px,80vw);margin:8px 0 0;padding:14px;background:#172138;border:1px solid var(--line);border-radius:12px;color:var(--muted);line-height:1.8}.recommendation-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.recommendation{display:grid;grid-template-columns:minmax(0,1fr) minmax(160px,.6fr);gap:24px;align-items:start;background:var(--panel);border:1px solid #35435f;padding:20px;border-radius:14px;min-width:0}.recommendation-copy{min-width:0}.recommendation p{color:var(--muted);margin:8px 0 0;overflow-wrap:anywhere}.recommendation-meta{display:grid;align-content:start;gap:7px;min-width:0}.recommendation-meta small{color:var(--muted)}.recommendation-meta strong{font-size:14px;line-height:1.7;overflow-wrap:anywhere}.status{width:max-content;border-radius:999px;padding:6px 10px;font-size:12px}.status-review{color:#ffb4aa;border:1px solid #8f4c4c;background:#361c20}
    .agents-registry{margin-top:42px}.agent-card{display:flex;justify-content:space-between;gap:24px;padding:20px 0;border-bottom:1px solid #293650}.agent-card>div{display:grid;gap:7px}.agent-card span,.agent-card small{color:var(--muted);font-size:12px}.agent-card p{margin:0;color:var(--muted)}.agent-card code{direction:ltr;color:var(--mint)}
    .clarifications{direction:ltr;text-align:left;margin-top:42px;padding:24px;border:1px solid #a77732;border-radius:16px;background:#171a24}.clarifications>header{display:flex;align-items:end;justify-content:space-between;padding:0 0 18px;border:0}.clarifications h2{margin:0}.clarifications>header p{max-width:620px;margin:0;color:var(--muted);line-height:1.6}.clarification-list{display:grid;gap:12px}.clarification-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.8fr);gap:24px;padding:18px;border:1px solid #4b5368;border-radius:12px;background:var(--panel)}.clarification-card>div{display:grid;align-content:start;gap:8px}.clarification-card span{color:#ffd58c;font:700 11px ui-monospace,monospace;text-transform:uppercase}.clarification-card strong{font-size:16px;line-height:1.5}.clarification-card form,.clarification-card label{display:grid;gap:8px}.clarification-card label{color:var(--muted);font-size:12px}.clarification-card textarea{width:100%;min-height:76px;padding:10px;border:1px solid var(--line);border-radius:8px;background:#080d1c;color:var(--ink);resize:vertical}.clarification-card button{min-height:44px;border:1px solid var(--blue);border-radius:8px;background:#1d3158;color:var(--ink);font-weight:700;cursor:pointer}
    .memory-sources{direction:ltr;text-align:left;margin-top:42px;padding:24px;border:1px solid #35435f;border-radius:16px;background:var(--panel)}.memory-sources>header{display:flex;align-items:end;justify-content:space-between;padding:0 0 20px;border:0}.memory-sources h2{margin:0}.memory-sources header p{max-width:620px;margin:0;color:var(--muted);line-height:1.6}.memory-source-status{display:flex;align-items:center;gap:10px;margin-bottom:18px;padding:12px;border-radius:10px;background:#0b1222}.memory-source-status strong{color:var(--mint)}.memory-source-status span{color:var(--muted);overflow-wrap:anywhere}.memory-source-form{display:grid;grid-template-columns:minmax(260px,1fr) auto auto;align-items:end;gap:12px}.memory-source-form label{display:grid;gap:7px;color:var(--muted);font-size:12px}.memory-source-form input[type="file"]{min-height:44px;padding:9px;border:1px solid var(--line);border-radius:8px;background:#080d1c;color:var(--ink)}.memory-source-toggle{display:flex!important;min-height:44px;grid-auto-flow:column!important;align-items:center;gap:8px!important;padding:0 12px;border:1px solid var(--line);border-radius:8px;color:var(--ink)!important}.memory-source-form button{min-height:44px;padding:0 18px;border:1px solid var(--blue);border-radius:8px;background:#1d3158;color:var(--ink);font-weight:700;cursor:pointer}.memory-source-help{margin:12px 0 0;color:var(--muted);font-size:12px;line-height:1.6}
    .release-notice{display:flex;align-items:center;justify-content:space-between;gap:24px;margin:0 0 32px;padding:20px 24px;border:1px solid #a77732;background:#30240f;color:var(--ink)}.release-notice strong{font-size:18px}.release-notice p{margin:7px 0 0;color:#e5d0a5}.release-notice a{color:#ffd58c;white-space:nowrap}
    .release-required{border-color:#ff735e;background:#3a1717}.release-required p{color:#ffd2cc}.release-required a{color:#fff;background:#d84c39;padding:10px 14px;border-radius:8px}
    @media(max-width:700px){main{padding-top:36px}.source{display:none}.system-status{grid-template-columns:1fr}.spine{grid-template-columns:1fr}aside{border-left:0;border-bottom:1px solid var(--line);padding:0 0 24px}.content{padding:28px 0 0}.project{align-items:flex-start}.usage-grid,.costs,.budget-grid,.recommendation-grid{grid-template-columns:1fr}.optimization-summary,.clarifications>header,.memory-sources>header{align-items:flex-start;flex-direction:column}.recommendation,.clarification-card,.memory-source-form{grid-template-columns:1fr}.recommendation-meta{border-top:1px solid #293650;padding-top:14px}.release-notice{align-items:flex-start;flex-direction:column}}
  </style>
</head>
<body><main>${releaseNotice}
  <header><div><div class="eyebrow">LOCAL OPERATIONAL MEMORY</div><h1>وضعیت واقعی پروژه‌های شما</h1></div><div class="source">VAULT → SYNC → DASHBOARD</div></header>
  <section class="system-status"><article><span>ابزارهای متصل</span><strong>${connectionNames}</strong></article><article><span>پروژه‌ی مشترک</span><strong>${sharedProjectCount.toLocaleString("fa-IR")}</strong></article><article><span>بسته‌ی انتقال‌پذیر</span><strong>${contextPacks.length.toLocaleString("fa-IR")}</strong></article><article><span>سلامت حافظه</span><strong>${memoryStatus}</strong></article><article><span>آخرین همگام‌سازی</span><strong>${syncSummary}</strong></article></section>
  <section class="spine"><aside><strong>${projects.length}</strong><span>پروژه در حافظه‌ی محلی</span><p class="live">● LOCAL DATA</p></aside><div class="content"><h2>پروژه‌ها</h2>${projectRows}</div></section>
  <section class="usage"><h2>مصرف ثبت‌شده بر اساس ابزار</h2><div class="usage-grid">${usageRows}</div></section>
  <section class="allocation"><h2>مصرف براساس پروژه</h2>${projectUsageRows}</section>
  <section class="costs"><article class="cost-card"><span>هزینه‌ی واقعی API</span><strong>${meteredCost}</strong></article><article class="cost-card"><span>اشتراک ماهانه</span><strong>${subscriptionCost}</strong></article></section>
  <section class="budgets"><h2>بودجه‌ی ماهانه</h2><div class="budget-grid">${budgetRows}</div></section>
  <section class="recommendations"><div class="optimization-summary"><h2>پیشنهادهای بهینه‌سازی</h2><details class="status-help"><summary>راهنمای وضعیت پیشنهاد</summary><p><strong>نیاز به بررسی:</strong> شواهد یک مسئله را نشان می‌دهند، اما هیچ تغییری بدون بررسی و تأیید شما اعمال نمی‌شود.</p></details></div><div class="recommendation-grid">${recommendationRows}</div></section>
  <section class="agents-registry"><h2>Personal Agent Registry</h2>${agentRows}</section>
  <section class="memory-sources" id="memory-sources"><header><div><div class="eyebrow">MEMORY INGESTION</div><h2>Memory Sources</h2></div><p>Connect a ChatGPT export once. Future Sync runs process only new or changed conversations and keep every extracted item pending until you confirm it.</p></header><div class="memory-source-status"><strong>${memoryExtraction.enabled?"Continuous extraction on":"Continuous extraction off"}</strong><span>${memorySourceNames}</span></div><form class="memory-source-form" method="post" action="/memory-sources" enctype="multipart/form-data"><label>ChatGPT export<input type="file" name="conversationFile" accept=".json,.js,application/json,text/javascript"></label><label class="memory-source-toggle"><input type="checkbox" name="enabled" value="on" ${memoryExtraction.enabled?"checked":""}> Continuous memory extraction</label><button type="submit">Save and import</button></form><p class="memory-source-help">Supported: <code>conversations.json</code> and JavaScript export wrappers. The first import may take several minutes; keep this page open until it returns.</p></section>
  <section class="clarifications" id="memory-questions"><header><div><div class="eyebrow">MEMORY INTELLIGENCE</div><h2>Memory questions</h2></div><p>Answer only what is missing or changed. Your response is stored as verified, user-confirmed project memory and included in the next Context Pack.</p></header><div class="clarification-list">${clarificationRows}</div></section>
</main></body></html>`;
}
