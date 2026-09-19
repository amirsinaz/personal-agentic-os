import path from "node:path";
import { extractWithCodex } from "./codex-memory-extractor.js";
import { runConversationImport } from "./conversation-import-runner.js";

const [configPath,sourcePath]=process.argv.slice(2);
if(!configPath||!sourcePath||!path.isAbsolute(configPath)||!path.isAbsolute(sourcePath))throw new Error("Usage: memory-import /absolute/path/config.json /absolute/path/conversations.json");
const result=await runConversationImport({configPath,sourcePath,extract:extractWithCodex});
process.stdout.write(`${JSON.stringify({conversations:result.conversations,processedConversations:result.processedConversations,skippedConversations:result.skippedConversations,batches:result.batches,importedCandidates:result.importedCandidates,pendingQuestions:result.state.clarifications.filter((item)=>item.status==="pending").length},null,2)}\n`);
