export async function sendInstallSuccess({
  telemetry,
  endpoint,
  version,
  platform,
  installType,
  fetchImpl = fetch,
}) {
  if (telemetry?.enabled !== true) return { status: "disabled" };
  if (!endpoint) return { status: "unavailable" };
  const payload = {
    installId: telemetry.installId,
    version,
    platform,
    installType,
  };
  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok ? { status: "recorded" } : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
