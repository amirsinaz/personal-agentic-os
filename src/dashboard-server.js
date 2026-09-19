import http from "node:http";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderDashboard } from "./dashboard.js";
import { answerClarification, syncPersonalData } from "./onboarding.js";
import { runConversationImport } from "./conversation-import-runner.js";
import { extractWithCodex } from "./codex-memory-extractor.js";

async function readForm(request){
  const chunks=[];let size=0;
  for await(const chunk of request){size+=chunk.length;if(size>65536)throw new Error("Request is too large");chunks.push(chunk);}
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

async function readBody(request,maxBytes=512*1024*1024){const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;if(size>maxBytes)throw new Error("Uploaded file is too large");chunks.push(chunk);}return Buffer.concat(chunks);}

function parseMultipart(buffer,contentType){
  const boundary=contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)?.slice(1).find(Boolean);
  if(!boundary)throw new Error("Invalid file upload");
  const fields={};let file;
  for(const raw of buffer.toString("utf8").split(`--${boundary}`).slice(1,-1)){
    const split=raw.indexOf("\r\n\r\n");if(split<0)continue;
    const headers=raw.slice(0,split);const value=raw.slice(split+4).replace(/\r\n$/,"");
    const name=headers.match(/name="([^"]+)"/)?.[1];const filename=headers.match(/filename="([^"]*)"/)?.[1];
    if(filename)file={name,filename:path.basename(filename),content:value};else if(name)fields[name]=value;
  }
  return {fields,file};
}

function isLocalSameOrigin(request){
  const origin=request.headers.origin;const host=request.headers.host;
  if(!origin||!host)return false;
  try{
    const parsed=new URL(origin);
    return parsed.protocol==="http:"&&["127.0.0.1","localhost","[::1]"].includes(parsed.hostname)&&parsed.host===host;
  }catch{return false;}
}

export function createDashboardServer(configPath,{extract=extractWithCodex}={}) {
  return http.createServer(async (request, response) => {
    if(request.method==="POST"&&!isLocalSameOrigin(request)){
      response.writeHead(403,{"content-type":"text/plain; charset=utf-8"});response.end("Forbidden");return;
    }
    if(request.method==="POST"&&request.url==="/clarifications"){
      try{
        const form=await readForm(request);
        await answerClarification(configPath,{questionId:form.get("questionId"),answer:form.get("answer")});
        response.writeHead(303,{location:"/#memory-questions"});response.end();
      }catch(error){response.writeHead(400,{"content-type":"text/plain; charset=utf-8"});response.end(error.message);}
      return;
    }
    if(request.method==="POST"&&request.url==="/memory-sources"){
      try{
        const {fields,file}=parseMultipart(await readBody(request),request.headers["content-type"]??"");
        const config=JSON.parse(await readFile(configPath,"utf8"));const previous=config.memoryExtraction?.conversationSources??[];
        let sourcePath=previous[0];
        if(file){
          const extension=path.extname(file.filename).toLowerCase();if(![".json",".js"].includes(extension))throw new Error("Choose a .json or .js ChatGPT export");
          const importDirectory=path.join(path.dirname(configPath),"imports");await mkdir(importDirectory,{recursive:true});sourcePath=path.join(importDirectory,`chatgpt-conversations${extension}`);await writeFile(sourcePath,file.content,{encoding:"utf8",mode:0o600});
        }
        const enabled=fields.enabled==="on";if(enabled&&!sourcePath)throw new Error("Choose a ChatGPT export before enabling continuous extraction");
        config.memoryExtraction={enabled,conversationSources:sourcePath?[sourcePath]:[]};await writeFile(configPath,`${JSON.stringify(config,null,2)}\n`,{encoding:"utf8",mode:0o600});
        if(sourcePath)await runConversationImport({configPath,sourcePath,extract});else await syncPersonalData(configPath);
        response.writeHead(303,{location:"/#memory-sources"});response.end();
      }catch(error){response.writeHead(400,{"content-type":"text/plain; charset=utf-8"});response.end(error.message);}
      return;
    }
    if (request.method!=="GET"||request.url !== "/") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    try {
      const release=JSON.parse(await readFile(path.join(path.dirname(configPath),"update-status.json"),"utf8").catch(()=>"{}"));
      const state=release.requiredUpdate===true
        ? JSON.parse(await readFile(path.join(path.dirname(configPath),"state.json"),"utf8").catch(()=>"{\"projects\":[]}"))
        : await syncPersonalData(configPath);
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "no-referrer",
      });
      response.end(renderDashboard(state,release));
    } catch {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Dashboard sync failed. Check the local terminal for details.");
    }
  });
}
