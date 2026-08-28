import path from "node:path";
import {checkForUpdate} from "./update-check.js";
import {CURRENT_VERSION,RELEASE_MANIFEST_URL,VERSION_TELEMETRY_URL} from "./version.js";

const configPath=process.argv[2];
if(!configPath||!path.isAbsolute(configPath))throw new Error("Pass the absolute config path");
const result=await checkForUpdate({configPath,currentVersion:CURRENT_VERSION,platform:process.platform,manifestUrl:RELEASE_MANIFEST_URL,telemetryEndpoint:VERSION_TELEMETRY_URL});
process.stdout.write(result.updateAvailable?`Personal Agentic OS ${result.latestVersion} is available: ${result.releaseUrl}\n`:`Personal Agentic OS is current (${result.currentVersion}).\n`);
