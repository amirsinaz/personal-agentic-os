import { createKnowledgeRecord } from "./operational-memory.js";

const projectRequirements=[
  {field:"goal",type:"Goal",prompt:(name)=>`What is the current goal of ${name}?`},
  {field:"current-state",type:"Current State",prompt:(name)=>`What is the current state of ${name}?`},
  {field:"workflow",type:"Workflow",prompt:(name)=>`Which workflow does ${name} currently follow?`},
  {field:"rule",type:"Rule",prompt:(name)=>`Which operating rules must ${name} follow?`},
  {field:"routine",type:"Routine",prompt:(name)=>`Which recurring routines keep ${name} up to date?`},
];

const agentRequirements=[
  {field:"responsibility",prompt:(name)=>`What is ${name} responsible for?`,missing:(agent)=>!known(agent.responsibility)},
  {field:"tools",prompt:(name)=>`Which tools may ${name} use?`,missing:(agent)=>(agent.tools??[]).length===0},
  {field:"skills",prompt:(name)=>`Which skills does ${name} use?`,missing:(agent)=>(agent.skills??[]).length===0},
  {field:"parent-agent",prompt:(name)=>`Which primary agent owns ${name}?`,missing:(agent)=>agent.agentType==="subagent"&&!known(agent.parentAgent)},
];

const answerTypes={goal:"Goal","current-state":"Current State",workflow:"Workflow",rule:"Rule",routine:"Routine",responsibility:"Agent",tools:"Tool",skills:"Skill","parent-agent":"Agent",status:"Activity",name:"Entity"};

function known(value){return typeof value==="string"&&value.trim()&&value.trim()!=="unknown";}
function normalized(value){return String(value??"").trim();}
function stablePart(value){return normalized(value).replace(/[^\p{L}\p{N}._-]+/gu,"-").replace(/^-+|-+$/g,"")||"unknown";}

function pendingQuestion({id,scopeType,scopeId,project,field,prompt,reason="missing",detectedAt,previousValue,observedValue,observedValues,knowledgeType}){
  return {id,scopeType,scopeId,project,field,prompt,reason,status:"pending",detectedAt:detectedAt??new Date().toISOString(),provenance:"agentic-os-memory-audit",...(previousValue===undefined?{}:{previousValue}),...(observedValue===undefined?{}:{observedValue}),...(observedValues===undefined?{}:{observedValues}),...(knowledgeType===undefined?{}:{knowledgeType})};
}

export function buildMemorySnapshot({projects=[],agents=[]}){
  return {
    projects:Object.fromEntries(projects.map((project)=>[project.id,{name:normalized(project.name),status:normalized(project.status)}])),
    agents:Object.fromEntries(agents.map((agent)=>[`${agent.project}:${agent.agentId}`,{responsibility:normalized(agent.responsibility),tools:[...(agent.tools??[])].sort(),skills:[...(agent.skills??[])].sort(),parentAgent:normalized(agent.parentAgent)}])),
  };
}

export function buildClarificationQueue({projects=[],records=[],agents=[],existingQuestions=[],previousSnapshot,detectedAt}={}){
  const byId=new Map(existingQuestions.map((question)=>[question.id,question]));
  const hasRecord=(project,type)=>records.some((record)=>record.project===project&&record.type===type&&normalized(record.content));
  const add=(question)=>{if(!byId.has(question.id))byId.set(question.id,question);};

  for(const record of records.filter((item)=>!item.verified&&["observed","inferred"].includes(item.status))){
    const id=`review:record:${stablePart(record.id)}`;
    const excerpt=normalized(record.content).slice(0,180);
    add(pendingQuestion({id,scopeType:"record",scopeId:record.id,project:record.project,field:"candidate",knowledgeType:record.type,prompt:`Confirm or correct this extracted ${record.type}: “${excerpt}”`,reason:"missing",detectedAt}));
  }

  for(const project of projects){
    const name=normalized(project.name)||project.id;
    for(const requirement of projectRequirements){
      const matching=records.filter((record)=>record.project===project.id&&record.type===requirement.type&&record.status!=="superseded"&&normalized(record.content));
      const verifiedValues=[...new Set(matching.filter((record)=>record.verified).map((record)=>normalized(record.content)))];
      if(verifiedValues.length>1){
        const id=`conflict:project:${stablePart(project.id)}:${requirement.field}`;
        add(pendingQuestion({id,scopeType:"project",scopeId:project.id,project:project.id,field:requirement.field,prompt:`Which ${requirement.field} should ${name} retain?`,reason:"conflict",detectedAt,observedValues:verifiedValues}));
      }
      if(hasRecord(project.id,requirement.type))continue;
      const id=`missing:project:${stablePart(project.id)}:${requirement.field}`;
      add(pendingQuestion({id,scopeType:"project",scopeId:project.id,project:project.id,field:requirement.field,prompt:requirement.prompt(name),detectedAt}));
    }
    const previous=previousSnapshot?.projects?.[project.id];
    for(const field of ["name","status"]){
      const before=normalized(previous?.[field]);
      const after=normalized(project[field]);
      if(!before||before===after)continue;
      const id=`changed:project:${stablePart(project.id)}:${field}:${stablePart(after)}`;
      add(pendingQuestion({id,scopeType:"project",scopeId:project.id,project:project.id,field,prompt:`${name} changed ${field} from “${before}” to “${after}”. What should the operational memory retain?`,reason:"changed",detectedAt,previousValue:before,observedValue:after}));
    }
  }

  for(const agent of agents){
    const name=normalized(agent.name)||agent.agentId;
    for(const requirement of agentRequirements){
      if(!requirement.missing(agent))continue;
      const id=`missing:agent:${stablePart(agent.project)}:${stablePart(agent.agentId)}:${requirement.field}`;
      add(pendingQuestion({id,scopeType:"agent",scopeId:agent.agentId,project:agent.project,field:requirement.field,prompt:requirement.prompt(name),detectedAt}));
    }
    const previous=previousSnapshot?.agents?.[`${agent.project}:${agent.agentId}`];
    for(const [field,currentValue] of [["responsibility",normalized(agent.responsibility)],["tools",[...(agent.tools??[])].sort()],["skills",[...(agent.skills??[])].sort()],["parent-agent",normalized(agent.parentAgent)]]){
      const previousValue=field==="parent-agent"?previous?.parentAgent:previous?.[field];
      const before=Array.isArray(previousValue)?JSON.stringify(previousValue):normalized(previousValue);
      const after=Array.isArray(currentValue)?JSON.stringify(currentValue):normalized(currentValue);
      if(!before||before===after)continue;
      const id=`changed:agent:${stablePart(agent.project)}:${stablePart(agent.agentId)}:${field}:${stablePart(after)}`;
      add(pendingQuestion({id,scopeType:"agent",scopeId:agent.agentId,project:agent.project,field,prompt:`${name} changed ${field}. What should the operational memory retain?`,reason:"changed",detectedAt,previousValue:previousValue,observedValue:currentValue}));
    }
  }
  return [...byId.values()].sort((left,right)=>(left.status==="pending"?0:1)-(right.status==="pending"?0:1)||left.id.localeCompare(right.id));
}

export function applyClarificationAnswer({question,answer,records=[],answeredAt=new Date().toISOString()}){
  const content=normalized(answer);
  if(!content)throw new Error("Answer is required");
  if(content.length>4000)throw new Error("Answer is too long");
  const type=question.knowledgeType??answerTypes[question.field]??"Fact";
  const record=createKnowledgeRecord({
    id:`clarification:${question.id}`,
    type,
    project:question.project,
    status:"user-confirmed",
    content,
    sourceSession:"user-clarification",
    sourcePath:"00-System/clarifications.json",
    confidence:1,
    verified:true,
    updatedAt:answeredAt,
    tags:["clarification",question.scopeType,question.field],
  });
  return {question:{...question,status:"answered",answer:content,answeredAt},record,records:[...records.filter((item)=>item.id!==record.id),record]};
}
