import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

const schema={type:"object",additionalProperties:false,required:["candidates"],properties:{candidates:{type:"array",items:{type:"object",additionalProperties:false,required:["id","type","project","content","confidence","sourceConversation"],properties:{id:{type:"string"},type:{type:"string"},project:{type:"string"},content:{type:"string"},confidence:{type:"number",minimum:0,maximum:1},sourceConversation:{type:"string"}}}}}};

export async function extractWithCodex({prompt}){
  const directory=await mkdtemp(path.join(os.tmpdir(),"agentic-os-extract-"));
  const schemaPath=path.join(directory,"schema.json");const outputPath=path.join(directory,"output.json");
  await writeFile(schemaPath,JSON.stringify(schema));
  try{
    await new Promise((resolve,reject)=>{
      const child=spawn("codex",["exec","--ephemeral","--skip-git-repo-check","--ignore-rules","--sandbox","read-only","--color","never","-C",directory,"--output-schema",schemaPath,"--output-last-message",outputPath,"-"],{stdio:["pipe","ignore","pipe"]});
      let errors="";child.stderr.on("data",(chunk)=>{errors+=chunk;});child.on("error",reject);child.on("close",(code)=>code===0?resolve():reject(new Error(`Codex extraction failed (${code}): ${errors.slice(-1000)}`)));child.stdin.end(prompt);
    });
    return JSON.parse(await readFile(outputPath,"utf8"));
  }finally{await rm(directory,{recursive:true,force:true});}
}
