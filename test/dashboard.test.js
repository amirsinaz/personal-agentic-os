import assert from "node:assert/strict";
import test from "node:test";

import { renderDashboard } from "../src/dashboard.js";

test("renders an instructive empty state without example metrics", () => {
  const html = renderDashboard({ projects: [] });

  assert.match(html, /هنوز پروژه‌ای در Vault ثبت نشده/);
  assert.match(html, /Templates\/Project\.md/);
  assert.doesNotMatch(html, /Sample|۱۲۳|\$[0-9]/);
});

test("renders only projects found in the user's local state", () => {
  const html = renderDashboard({
    projects: [
      { id: "launch", name: "راه‌اندازی محصول", status: "active" },
      { id: "research", name: "تحقیق بازار", status: "paused" },
    ],
  });

  assert.match(html, /راه‌اندازی محصول/);
  assert.match(html, /تحقیق بازار/);
  assert.match(html, /active/);
  assert.match(html, /paused/);
  assert.doesNotMatch(html, /AdLab|Mazbar/);
});

test("escapes project text read from local files", () => {
  const html = renderDashboard({
    projects: [{ id: "unsafe", name: "<script>alert(1)</script>", status: "active" }],
  });

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("shows actual provider usage and keeps missing measurements unavailable", () => {
  const html = renderDashboard({
    projects: [],
    usage: [
      { provider: "codex", measurement: "actual", files: 2, totalTokens: 1250 },
      { provider: "claude", measurement: "unavailable", files: 1 },
    ],
  });

  assert.match(html, /Codex/);
  assert.match(html, /1,250/);
  assert.match(html, /Claude/);
  assert.match(html, /Unavailable/);
});

test("shows project attribution including an explicit Unassigned bucket", () => {
  const html = renderDashboard({
    projects: [],
    usageByProject: [
      { project: "launch", totalTokens: 900 },
      { project: "Unassigned", totalTokens: 200 },
    ],
  });

  assert.match(html, /launch/);
  assert.match(html, /900/);
  assert.match(html, /Unassigned/);
  assert.match(html, /200/);
});

test("shows metered API and fixed subscription costs separately", () => {
  const html = renderDashboard({
    projects: [],
    costs: {
      metered: { measurement: "actual", currency: "USD", total: 4.25, byProject: [] },
      subscriptions: { measurement: "actual", currency: "USD", monthlyTotal: 20, items: [] },
    },
  });

  assert.match(html, /API/);
  assert.match(html, /4\.25 USD/);
  assert.match(html, /اشتراک ماهانه/);
  assert.match(html, /20\.00 USD/);
});

test("shows actual budget use and keeps forecast explicitly estimated", () => {
  const html = renderDashboard({
    projects: [],
    budgetStatus: [
      { scope: "all", measurement: "actual", currency: "USD", budget: 100, actualSpend: 10, usedPercent: 10, forecast: 28, forecastMeasurement: "estimated", status: "on-track" },
      { scope: "project", project: "launch", measurement: "unavailable" },
    ],
  });

  assert.match(html, /بودجه‌ی ماهانه/);
  assert.match(html, /10\.00 \/ 100\.00 USD/);
  assert.match(html, /برآورد پایان ماه: 28\.00 USD/);
  assert.match(html, /estimated/);
  assert.match(html, /launch/);
  assert.match(html, /Unavailable/);
});

test("shows recommendations as advisory with unavailable savings", () => {
  const html = renderDashboard({
    projects: [],
    recommendations: [{
      id: "complete-project-attribution",
      kind: "configuration",
      measurement: "actual",
      evidence: { unassignedTokens: 1000, totalTokens: 1500 },
      expectedSaving: { measurement: "unavailable" },
      action: "review",
    }],
  });

  assert.match(html, /پیشنهادهای بهینه‌سازی/);
  assert.match(html, /تخصیص مصرف به پروژه‌ها را کامل کنید/);
  assert.match(html, /1,000/);
  assert.match(html, /صرفه‌جویی/);
  assert.match(html, /بررسی/);
  assert.match(html, /نیاز به بررسی/);
  assert.match(html, /راهنمای وضعیت پیشنهاد/);
  assert.match(html, /داده‌ی کافی برای محاسبه وجود ندارد/);
});

test("uses a compact responsive optimization summary",()=>{
  const html=renderDashboard({projects:[],recommendations:[]});
  assert.match(html,/optimization-summary/);
  assert.match(html,/recommendation-grid/);
  assert.match(html,/@media\(max-width:700px\)/);
});

test("shows evidence-backed agents and explicit unknown fields",()=>{
  const html=renderDashboard({projects:[],agents:[{agentId:"codex",name:"Codex",agentType:"primary-agent",project:"launch",responsibility:"unknown",tools:["Codex desktop"],skills:[],observationCount:2,lastActivity:"2026-08-24T10:00:00Z",latestSourceSession:"s2",latestSourcePath:"logs/two",status:"observed"}]});
  assert.match(html,/Agent Registry/);
  assert.match(html,/Codex/);
  assert.match(html,/launch/);
  assert.match(html,/unknown/);
  assert.match(html,/۲ مشاهده/);
  assert.doesNotMatch(html,/Admin|Owner|Team/);
});

test("shows a safe release notice when a newer version is available",()=>{
  const html=renderDashboard({projects:[]},{currentVersion:"0.2.0",latestVersion:"0.3.0",updateAvailable:true,releaseUrl:"https://github.com/amirsinaz/personal-agentic-os/releases/tag/v0.3.0"});
  assert.match(html,/نسخه‌ی 0\.3\.0 آماده است/);
  assert.match(html,/releases\/tag\/v0\.3\.0/);
});

test("shows connected tools, shared projects, and the latest incremental sync",()=>{
  const html=renderDashboard({
    projects:[],
    connections:[{id:"codex",status:"configured"},{id:"gemini",status:"configured"}],
    canonicalProjects:[{id:"site",name:"Site",tools:["codex","gemini"],shared:true}],
    lastSync:{at:"2026-08-29T11:00:00.000Z",status:"completed",changes:{created:[],updated:["site"],unchanged:[],removed:[]}},
  });
  assert.match(html,/ابزارهای متصل/);
  assert.match(html,/Codex/);
  assert.match(html,/Gemini/);
  assert.match(html,/پروژه‌ی مشترک/);
  assert.match(html,/آخرین همگام‌سازی/);
  assert.match(html,/site/);
});
