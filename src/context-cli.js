import {readFile,readdir} from "node:fs/promises";
import path from "node:path";
import {searchProjectContext} from "./context-retrieval.js";

const [configPath,...queryParts]=process.argv.slice(2);
if(!configPath||!path.isAbsolute(configPath))throw new Error("context requires an absolute config path");
const query=queryParts.join(" ").trim();
if(!query)throw new Error("context requires a query");
const config=JSON.parse(await readFile(configPath,"utf8"));
if(!path.isAbsolute(config.vaultPath))throw new Error("config.vaultPath must be an absolute path");
const exportsPath=path.join(config.vaultPath,"09-Exports");
const filenames=(await readdir(exportsPath)).filter((name)=>name.endsWith(".context.md")).sort();
const documents=await Promise.all(filenames.map(async(name)=>({path:name,content:await readFile(path.join(exportsPath,name),"utf8")})));
process.stdout.write(`${JSON.stringify(searchProjectContext(query,documents),null,2)}\n`);

