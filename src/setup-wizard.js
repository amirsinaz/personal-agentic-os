import { mkdir } from "node:fs/promises";

import {
  createStarterVault,
  initializePersonalWorkspace,
  installToolAdapters,
  syncPersonalData,
} from "./onboarding.js";
import { sendInstallSuccess } from "./telemetry.js";
import {CURRENT_VERSION} from "./version.js";

const telemetryEndpoint = "https://myagenticstack.com/api/install";

export async function runSetupWizard({ ask }) {
  let installType = "full";
  const obsidianInstalled = await ask("obsidianInstalled");
  if (!obsidianInstalled) {
    const dashboardOnly = await ask("dashboardOnly");
    if (!dashboardOnly) {
      return {
        status: "needs-obsidian",
        downloadUrl: "https://obsidian.md/download",
      };
    }
    installType = "dashboard-only";
  }

  const vaultPath = await ask("vaultPath");
  const appDataPath = await ask("appDataPath");
  const projectPath = await ask("projectPath");
  const tools = await ask("tools");
  const sources = await ask("sources");
  const projectRoots = await ask("projectRoots");
  const priceBook = await ask("priceBook");
  const subscriptions = await ask("subscriptions");
  const budgets = await ask("budgets");
  const telemetryConsent = await ask("telemetryConsent");
  const shouldCreateStarterVault = await ask("createStarterVault");

  await mkdir(projectPath, { recursive: true });
  const initialized = await initializePersonalWorkspace({
    appDataPath,
    vaultPath,
    sources,
    projectRoots,
    priceBook,
    subscriptions,
    budgets,
    telemetryConsent,
    installType,
  });
  if (shouldCreateStarterVault) await createStarterVault(vaultPath);
  const adapters = await installToolAdapters({ projectPath, tools });
  const state = await syncPersonalData(initialized.configPath);
  const telemetry = await sendInstallSuccess({
    telemetry: initialized.config.telemetry,
    endpoint: telemetryEndpoint,
    version: CURRENT_VERSION,
    platform: process.platform,
    installType,
  });

  return {
    status: "ready",
    configPath: initialized.configPath,
    adapters: adapters.created,
    projects: state.projects,
    telemetryStatus: telemetry.status,
  };
}
