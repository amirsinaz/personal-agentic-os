import {readFile,writeFile} from "node:fs/promises";
import path from "node:path";

function parts(version){return String(version).split(".").map(value=>Number.parseInt(value,10)||0);}
export function isNewerVersion(candidate,current){
  const next=parts(candidate),installed=parts(current);
  for(let index=0;index<3;index+=1){if(next[index]!==installed[index])return next[index]>installed[index];}
  return false;
}

export async function checkForUpdate({configPath,currentVersion,platform,manifestUrl,telemetryEndpoint,fetchImpl=fetch}){
  const config=JSON.parse(await readFile(configPath,"utf8"));
  const response=await fetchImpl(manifestUrl);
  if(!response.ok)throw new Error("Release manifest unavailable");
  const manifest=await response.json();
  const result={checkedAt:new Date().toISOString(),currentVersion,latestVersion:manifest.version,releaseUrl:manifest.releaseUrl,updateAvailable:isNewerVersion(manifest.version,currentVersion)};
  await writeFile(path.join(path.dirname(configPath),"update-status.json"),`${JSON.stringify(result,null,2)}\n`,{encoding:"utf8",mode:0o600});
  if(config.telemetry?.enabled===true){
    await fetchImpl(telemetryEndpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({installId:config.telemetry.installId,version:currentVersion,platform,installType:config.installType??"full"})}).catch(()=>null);
  }
  return result;
}
