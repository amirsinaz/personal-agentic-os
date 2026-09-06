import {readFile} from "node:fs/promises";
import path from "node:path";
import {buildVerificationReport} from "./verification-report.js";

const configPath=process.argv[2];
if(!configPath||!path.isAbsolute(configPath))throw new Error("verify requires an absolute config path");
const statePath=path.join(path.dirname(configPath),"state.json");
const state=JSON.parse(await readFile(statePath,"utf8"));
process.stdout.write(`${JSON.stringify(buildVerificationReport(state),null,2)}\n`);

