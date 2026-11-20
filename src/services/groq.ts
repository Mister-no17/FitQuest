import type { TrainerCategory, TrainerReply } from '../domain/types'

const allowed:TrainerCategory[]=['training','recovery','nutrition','exercise_form','progress','out_of_scope']
export const TRAINER_MODEL='openai/gpt-oss-20b' as const

export function buildGroqRequest(payload:unknown){return {model:TRAINER_MODEL,temperature:0.2,max_completion_tokens:900,reasoning_effort:'low',messages:[{role:'system',content:`You are FitQuest's fitness instructor for one adult user. Only answer about exercise programming, exercise form, fitness progress, recovery, or nutrition supporting fitness. Refuse all other topics. Use only the user-selected records in this request; never claim missing facts. The deterministic FitQuest rule engine remains authoritative: do not silently alter plans, diagnose disease, or promise outcomes. For sharp/severe pain, injury warning signs, fainting, chest pain, or breathing difficulty, advise stopping and seeking appropriate medical help. Keep the answer practical and concise.`},{role:'user',content:JSON.stringify(payload)}],response_format:{type:'json_schema',json_schema:{name:'fitquest_reply',strict:true,schema:{type:'object',additionalProperties:false,properties:{category:{type:'string',enum:allowed},answer:{type:'string'},confidence:{type:'string',enum:['low','medium','high']},evidence:{type:'array',items:{type:'string'}},suggestedAction:{type:'string'}},required:['category','answer','confidence','evidence','suggestedAction']}}}}}

function validReply(value:unknown):value is TrainerReply{if(!value||typeof value!=='object')return false;const v=value as Record<string,unknown>;return allowed.includes(v.category as TrainerCategory)&&typeof v.answer==='string'&&['low','medium','high'].includes(String(v.confidence))&&Array.isArray(v.evidence)&&v.evidence.every(x=>typeof x==='string')&&typeof v.suggestedAction==='string'}

export async function askGroq(apiKey:string,payload:unknown,signal?:AbortSignal):Promise<TrainerReply>{
  const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(buildGroqRequest(payload)),signal})
  if(!response.ok){const body=await response.json().catch(()=>null) as {error?:{message?:string}}|null;throw new Error(body?.error?.message||`Groq request failed (${response.status})`)}
  const body=await response.json() as {choices?:Array<{message?:{content?:string}}>} ; const content=body.choices?.[0]?.message?.content
  if(!content)throw new Error('Groq returned an empty response.')
  const parsed:unknown=JSON.parse(content);if(!validReply(parsed))throw new Error('Groq returned an unexpected response shape.');return parsed
}
