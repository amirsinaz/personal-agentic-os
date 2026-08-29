import { createHash } from "node:crypto";
import path from "node:path";

const capabilities=new Set(["project-catalog","context-bootstrap","context-incremental","observation-capture","lifecycle-hooks"]);
const safeKey=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function unique(values,label){if(new Set(values).size!==values.length)throw new Error(`Duplicate ${label}`);}
function redact(value){return String(value??"").replace(/\b(api[_-]?key|token|password|secret)\s*[:=]\s*\S+/gi,"$1=[REDACTED]").replace(/\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}\b/g,"[REDACTED]");}
function sanitize(value){
  if(typeof value==="string")return redact(value);
  if(Array.isArray(value))return value.map(sanitize);
  if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,sanitize(item)]));
  return value;
}

export function validateConnectorManifest(input){
  if(input?.schemaVersion!==1)throw new Error("Unsupported connector schema version");
  if(!safeKey.test(input.connectorKey??""))throw new Error("Invalid connector key");
  if(!String(input.displayName??"").trim())throw new Error("Connector display name is required");
  if(!Array.isArray(input.capabilities)||!input.capabilities.length)throw new Error("Connector capabilities are required");
  unique(input.capabilities,"capability");
  if(input.capabilities.some((item)=>!capabilities.has(item)))throw new Error("Unsupported connector capability");
  const transport=input.transport??{};
  if(transport.kind==="http"){
    let endpoint; try{endpoint=new URL(transport.endpoint);}catch{throw new Error("Connector HTTP endpoint must use HTTPS");}
    if(endpoint.protocol!=="https:")throw new Error("Connector HTTP endpoint must use HTTPS");
  }else if(transport.kind==="file"){
    if(!path.isAbsolute(transport.directory??""))throw new Error("Connector file directory must be absolute");
  }else if(transport.kind==="mcp"){
    if(!safeKey.test(transport.serverName??""))throw new Error("Invalid MCP server name");
  }else if(transport.kind==="plugin"){
    if(!safeKey.test(transport.pluginId??""))throw new Error("Invalid plugin id");
  }else throw new Error("Unsupported connector transport");
  return structuredClone(input);
}

export function createConnectionRecord(input,{now=new Date().toISOString()}={}){
  const manifest=validateConnectorManifest(input);
  return {connectionId:manifest.connectorKey,connectorKey:manifest.connectorKey,displayName:manifest.displayName,connectorKind:manifest.transport.kind,capabilities:manifest.capabilities,isEnabled:false,scopes:["context:read"],allowedProjects:[],health:"unknown",installationStatus:"not_installed",lastActivityAt:null,lastErrorCode:null,lastSuccessfulRevision:null,bootstrapStatus:"not_started",updatedAt:now};
}

export function buildProjectContextEnvelope({project,context,provenance=[],generatedAt=new Date().toISOString()}){
  if(!safeKey.test(project?.id??""))throw new Error("Invalid project id");
  const body=sanitize({schemaVersion:1,projectId:project.id,projectName:project.name,classification:project.classification??"named",context,provenance});
  const revision=createHash("sha256").update(JSON.stringify(body)).digest("hex");
  return {...body,revision,generatedAt};
}
