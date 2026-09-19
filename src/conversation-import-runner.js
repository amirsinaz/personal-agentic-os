import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

import { buildExtractionBatches, buildExtractionPrompt, parseChatGptExport, validateExtractionCandidates } from "./conversation-import.js";
import { syncPersonalData } from "./onboarding.js";
import { createKnowledgeRecord } from "./operational-memory.js";

export async function runConversationImport({configPath,sourcePath,extract,importedAt=new Date().toISOString()}){
  if(!path.isAbsolute(configPath)||!path.isAbsolute(sourcePath))throw new Error("Import paths must be absolute");
  if(typeof extract!=="function")throw new Error("A semantic extractor is required");
  const config=JSON.parse(await readFile(configPath,"utf8"));
  const initialState=await syncPersonalData(configPath);
  const conversations=parseChatGptExport(await readFile(sourcePath,"utf8"),path.basename(sourcePath));
  const ledgerPath=path.join(config.vaultPath,"00-System","conversation-imports.json");
  const ledger=JSON.parse(await readFile(ledgerPath,"utf8").catch((error)=>error?.code==="ENOENT"?"{\"conversations\":{}}":Promise.reject(error)));
  const fingerprints=Object.fromEntries(conversations.map((conversation)=>[`${conversation.source}:${conversation.id}`,createHash("sha256").update(JSON.stringify(conversation)).digest("hex")]));
  const changed=conversations.filter((conversation)=>ledger.conversations?.[`${conversation.source}:${conversation.id}`]!==fingerprints[`${conversation.source}:${conversation.id}`]);
  const batches=buildExtractionBatches(changed);
  const knownProjects=new Set(initialState.projects.map((project)=>project.id));
  const candidates=[];
  for(const batch of batches){
    const result=await extract({prompt:buildExtractionPrompt({conversations:batch,projects:initialState.projects}),batch});
    candidates.push(...validateExtractionCandidates(result?.candidates,knownProjects));
  }
  const recordsPath=path.join(config.vaultPath,"02-Global-Knowledge","records.json");
  const existing=JSON.parse(await readFile(recordsPath,"utf8").catch((error)=>error?.code==="ENOENT"?"[]":Promise.reject(error)));
  const byId=new Map(existing.map((record)=>[record.id,record]));
  for(const candidate of candidates){
    if(byId.get(candidate.id)?.verified)continue;
    byId.set(candidate.id,createKnowledgeRecord({id:candidate.id,type:candidate.type,project:candidate.project,status:"observed",content:candidate.content,sourceSession:candidate.source_session,sourcePath:candidate.source_path,confidence:candidate.confidence,verified:false,updatedAt:importedAt,tags:candidate.tags}));
  }
  await mkdir(path.dirname(recordsPath),{recursive:true});
  await writeFile(recordsPath,`${JSON.stringify([...byId.values()],null,2)}\n`,{encoding:"utf8",mode:0o600});
  await mkdir(path.dirname(ledgerPath),{recursive:true});
  await writeFile(ledgerPath,`${JSON.stringify({schemaVersion:1,conversations:{...(ledger.conversations??{}),...fingerprints},updatedAt:importedAt},null,2)}\n`,{encoding:"utf8",mode:0o600});
  const state=await syncPersonalData(configPath);
  return {conversations:conversations.length,processedConversations:changed.length,skippedConversations:conversations.length-changed.length,batches:batches.length,importedCandidates:candidates.length,state};
}
