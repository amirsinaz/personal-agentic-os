const allowedTypes=new Set(["Fact","Assumption","Decision","Rule","Goal","Open Question","Entity","Activity","Agent","Subagent","Routine","Tool","Skill"]);

function clean(value){return String(value??"").replace(/[\r\n]+/g," ").trim();}

export function redactOperationalContent(value){
  return clean(String(value??"")
    .replace(/<private>[\s\S]*?<\/private>/gi,"[REDACTED]")
    .replace(/<private>[\s\S]*$/gi,"[REDACTED]"))
    .replace(/\b(api[_-]?key|token|password|secret)\s*[:=]\s*\S+/gi,"$1=[REDACTED]")
    .replace(/\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}\b/g,"[REDACTED]");
}

const redact=redactOperationalContent;

export function createKnowledgeRecord(input){
  if(!allowedTypes.has(input.type))throw new Error(`Unsupported knowledge type: ${input.type}`);
  if(!clean(input.id)||!clean(input.project))throw new Error("Knowledge records require id and project");
  return {
    id:clean(input.id),type:input.type,project:clean(input.project),status:clean(input.status||"active"),
    content:redact(input.content),source_session:clean(input.sourceSession),source_path:clean(input.sourcePath),
    created_at:input.createdAt||input.updatedAt,updated_at:input.updatedAt,confidence:Number.isFinite(input.confidence)?input.confidence:null,
    verified:input.type==="Assumption"?false:Boolean(input.verified),tags:[...new Set(input.tags??[])].map(clean).filter(Boolean),
  };
}

export function buildPortableContextPack({project,records=[],generatedAt=new Date().toISOString()}){
  const selected=records.filter((record)=>record.project===project.id).map((record)=>({...record,content:redact(record.content)}));
  const lines=[`# ${clean(project.name||project.id)}`,"",`Generated: ${generatedAt}`,"",...selected.flatMap((record)=>[
    `## ${record.type}: ${record.id}`,"",record.content||"Unavailable","",`Verified: ${Boolean(record.verified)}`,`Source session: ${record.source_session||"Unavailable"}`,"",
  ])];
  return {schemaVersion:1,generatedAt,project:{id:clean(project.id),name:clean(project.name||project.id)},records:selected,markdown:`${lines.join("\n")}\n`};
}

export function auditOperationalMemory({projects=[],records=[],packs=[],checkedAt=new Date().toISOString()}){
  const packed=new Set(packs.map((pack)=>pack.project?.id));
  const missingContextPacks=projects.map((project)=>project.id).filter((id)=>!packed.has(id)).sort();
  const needsReview=records.filter((record)=>!record.verified).map((record)=>record.id).sort();
  return {checkedAt,status:missingContextPacks.length||needsReview.length?"needs-review":"healthy",missingContextPacks,needsReview};
}
