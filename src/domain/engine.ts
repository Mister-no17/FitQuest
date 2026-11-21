import { addDays } from './dates'
import { campaignSessions, completeCampaignSessions, exerciseById, substitutionPools } from './catalog'
import type { ActualSet, CheckIn, Muscle, PlannedSession, PlanVersion, Workout } from './types'

export interface EngineInput { today:string; current:PlanVersion; workouts:Workout[]; checkIns:CheckIn[]; nowIso:string }
export interface ReadinessResult { score:number|null; confidence:'none'|'low'|'medium'|'high'; label:'Not checked in'|'Limited data'|'Ready'|'Adjust'|'Recover'|'Safety first'; volumeMultiplier:number; targetRir:number; reasons:string[] }
export interface LoadSuggestion { loadKg:number|null; confidence:'calibrate'|'low'|'medium'|'high'; action:'start'|'increase'|'hold'|'reduce'|'stop'; reason:string; evidence:string[]; estimatedMaxKg:number|null; targetRir:number }
export interface SetDecision { action:'increase'|'hold'|'reduce'|'end'|'stop'; loadKg:number|null; continueExercise:boolean; reason:string }

const cloneSessions=(sessions:PlannedSession[])=>sessions.map(s=>({...s,prescriptions:s.prescriptions.map(p=>({...p})),rationale:[...s.rationale],muscles:[...s.muscles]}))
const workingSets=(sets:ActualSet[])=>sets.filter(s=>s.completed&&(s.setKind??'working')!=='warmup'&&(s.setKind??'working')!=='calibration')
const median=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2}
const daysBetween=(a:string,b:string)=>Math.round((Date.parse(`${b}T12:00:00Z`)-Date.parse(`${a}T12:00:00Z`))/86400000)
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n))

export const initialPlan=(nowIso:string):PlanVersion=>({id:'plan-gym-v4',createdAt:nowIso,trigger:'gym_equipment_v4',sessions:cloneSessions(campaignSessions),explanations:['Complete 30-day plan using only equipment confirmed at your gym','Loads are learned from calibration and actual performance, then snapped to equipment you can actually select']})

export function readiness(check?:CheckIn,recent:CheckIn[]=[]):ReadinessResult{
  if(!check)return {score:null,confidence:'none',label:'Not checked in',volumeMultiplier:1,targetRir:3,reasons:['Readiness is unknown until you check in']}
  if(check.pain)return {score:15,confidence:'high',label:'Safety first',volumeMultiplier:.5,targetRir:4,reasons:['Pain was reported; movements loading the affected area must be removed','Pain overrides performance goals']}
  const observations:{name:string;score:number;reason?:string}[]=[]
  if(check.sleepHours!==null)observations.push({name:'sleep',score:clamp((check.sleepHours-4)/4*100,0,100),reason:check.sleepHours<6?`Sleep was ${check.sleepHours} hours`:undefined})
  if(check.energy!==null)observations.push({name:'energy',score:(check.energy-1)/4*100,reason:check.energy<=2?'Energy is low':undefined})
  if(check.fatigue!==null)observations.push({name:'fatigue',score:(5-check.fatigue)/4*100,reason:check.fatigue>=4?'Fatigue is high':undefined})
  const soreness=Object.values(check.soreness).filter((v):v is number=>typeof v==='number')
  if(soreness.length){const max=Math.max(...soreness);observations.push({name:'soreness',score:clamp(100-(max-1)*25,0,100),reason:max>=4?'Severe soreness was reported':max===3?'Moderate soreness was reported':undefined})}
  if(!observations.length)return {score:null,confidence:'low',label:'Limited data',volumeMultiplier:1,targetRir:3,reasons:['No readiness ratings were supplied']}
  const weights:Record<string,number>={sleep:.25,energy:.3,fatigue:.3,soreness:.15},total=observations.reduce((n,o)=>n+weights[o.name],0)
  let score=Math.round(observations.reduce((n,o)=>n+o.score*weights[o.name],0)/total)
  const recentLow=recent.filter(c=>c.localDate<check.localDate).slice(-3).filter(c=>(c.energy!==null&&c.energy<=2)||(c.fatigue!==null&&c.fatigue>=4)).length
  if(recentLow>=2)score=Math.max(0,score-8)
  const redFlags=observations.filter(o=>o.score<=30).length
  const label:ReadinessResult['label']=score>=72&&redFlags===0?'Ready':score>=42&&redFlags<2?'Adjust':'Recover'
  const volumeMultiplier=label==='Ready'?1:label==='Adjust'?0.7:0.4
  const targetRir=label==='Ready'?2:label==='Adjust'?3:4
  const reasons=observations.flatMap(o=>o.reason?[o.reason]:[])
  if(recentLow>=2)reasons.push('Low recovery signals have repeated across recent check-ins')
  if(!reasons.length)reasons.push('Available recovery signals support the planned session')
  reasons.push(label==='Ready'?'Normal training volume is reasonable':label==='Adjust'?'Use fewer sets and keep more repetitions in reserve':'Recovery or technique-only work is preferable')
  return {score,confidence:observations.length>=4?'high':observations.length>=2?'medium':'low',label,volumeMultiplier,targetRir,reasons}
}

function actualMuscles(workout:Workout):Set<Muscle>{const out=new Set<Muscle>();workingSets(workout.actualSets).forEach(s=>{const e=exerciseById[s.exerciseId];e?.primary.forEach(m=>out.add(m));e?.secondary.forEach(m=>out.add(m))});return out}
function recentMuscleSets(workouts:Workout[],muscle:Muscle,from:string,to:string){return workouts.filter(w=>w.localDate>=from&&w.localDate<=to).flatMap(w=>workingSets(w.actualSets)).reduce((n,s)=>{const e=exerciseById[s.exerciseId];return n+(e?.primary.includes(muscle)?1:e?.secondary.includes(muscle)?.5:0)},0)}

export function adaptPlan(input:EngineInput):PlanVersion{
  const sessions=cloneSessions(completeCampaignSessions(input.current.sessions)),explanations:string[]=[]
  input.workouts.forEach(workout=>{const planned=sessions.find(s=>s.id===workout.planSessionId);if(planned)planned.state=workout.state})
  const check=input.checkIns.find(c=>c.localDate===input.today),todaySession=sessions.find(s=>s.localDate===input.today),todayWorkout=input.workouts.find(w=>w.localDate===input.today)
  if(todaySession&&todayWorkout?.state==='in_progress')return input.current
  const ready=readiness(check,input.checkIns.filter(c=>c.localDate<input.today).sort((a,b)=>a.localDate.localeCompare(b.localDate)))

  if(todaySession&&check){
    if(check.unavailableReason){todaySession.kind='recovery';todaySession.prescriptions=[];todaySession.durationMin=0;todaySession.state='active_recovery';todaySession.cardio=check.unavailableReason==='illness'?'No activity required; prioritize recovery':'Optional gentle movement only if it fits';todaySession.rationale.push(`Training removed because ${check.unavailableReason} was reported`);explanations.push(`Converted today to recovery for reported ${check.unavailableReason}`)}
    if(check.pain&&todaySession.kind==='strength'){const affected=new Set(check.painMuscles),before=todaySession.prescriptions.length;todaySession.prescriptions=todaySession.prescriptions.filter(p=>{const e=exerciseById[p.exerciseId];return !e?.primary.some(m=>affected.has(m))&&!e?.secondary.some(m=>affected.has(m))});if(todaySession.prescriptions.length<before){todaySession.durationMin=Math.min(todaySession.durationMin,30);todaySession.rationale.push('Removed every movement directly or indirectly loading a painful area');explanations.push('Pain overrode the planned loading')}}
    if(todaySession.kind==='strength'&&ready.label==='Recover'&&!check.pain){todaySession.kind='recovery';todaySession.prescriptions=[];todaySession.durationMin=20;todaySession.state='active_recovery';todaySession.cardio='Optional easy movement or mobility only; no performance target';todaySession.rationale.push('Multiple recovery signals were below the training threshold');explanations.push('Low readiness converted strength work to recovery')}
    else if(todaySession.kind==='strength'&&ready.label==='Adjust'){todaySession.prescriptions=todaySession.prescriptions.map((p,i)=>({...p,sets:i<2?Math.max(1,Math.round(p.sets*ready.volumeMultiplier)):1,restSec:Math.round(p.restSec*1.15)}));todaySession.durationMin=Math.min(todaySession.durationMin,45);todaySession.rationale.push(`Readiness ${ready.score}%: reduced volume and increased rest`);explanations.push('Recovery signals reduced working volume without forcing inactivity')}
    if(check.availableMinutes&&check.availableMinutes<todaySession.durationMin&&todaySession.kind==='strength'){const keep=Math.max(1,Math.floor((check.availableMinutes-7)/7));todaySession.prescriptions=todaySession.prescriptions.slice(0,keep);todaySession.durationMin=check.availableMinutes;todaySession.rationale.push(`Shortened to ${check.availableMinutes} minutes; priority exercises retained in original order`);explanations.push('Lower-priority accessories were removed for available time')}
  }

  if(todaySession?.kind==='strength'){
    const yesterday=addDays(input.today,-1),recent=input.workouts.filter(w=>w.localDate>=addDays(input.today,-2)&&w.localDate<input.today),recentlyLoaded=new Set(recent.flatMap(w=>[...actualMuscles(w)])),overlap=todaySession.muscles.filter(m=>recentlyLoaded.has(m))
    const occupied=new Set(todaySession.prescriptions.map(p=>p.exerciseId)),recentExerciseIds=new Set(recent.flatMap(w=>workingSets(w.actualSets).map(s=>s.exerciseId)))
    todaySession.prescriptions=todaySession.prescriptions.map(p=>{
      const history=input.workouts.filter(w=>w.state!=='in_progress').sort((a,b)=>a.localDate.localeCompare(b.localDate)).flatMap(w=>workingSets(w.actualSets).filter(s=>s.exerciseId===p.exerciseId)),latest=history.at(-1),recentBreakdowns=history.slice(-2).filter(s=>s.feedback==='form_broke').length
      const trigger=latest?.feedback==='pain'?'pain was reported':recentBreakdowns>=2?'form broke on two recent exposures':p.role==='rotation'&&progressionAdvice(p.exerciseId,input.workouts).action==='deload'?'the rotating movement stalled across four exposures':null
      if(!trigger)return p
      const replacement=(substitutionPools[p.exerciseId]||[]).find(id=>!occupied.has(id)&&!recentExerciseIds.has(id)&&exerciseById[id])
      if(!replacement)return p
      occupied.delete(p.exerciseId);occupied.add(replacement);explanations.push(`Replaced ${exerciseById[p.exerciseId]?.name} with ${exerciseById[replacement].name} because ${trigger}`)
      return {...p,exerciseId:replacement,targetReps:exerciseById[replacement].targetReps,restSec:exerciseById[replacement].restSec,loadKg:null,loadBasis:exerciseById[replacement].equipment==='Bodyweight'?'bodyweight':null,role:'rotation',selectionReason:`Substituted because ${trigger}; calibration starts the new movement`}
    })
    if(overlap.length){todaySession.prescriptions=todaySession.prescriptions.map(p=>exerciseById[p.exerciseId]?.primary.some(m=>overlap.includes(m))?{...p,sets:Math.min(1,p.sets)}:p);todaySession.rationale.push(`Reduced repeat loading for ${overlap.join(', ')} trained in the last 48 hours`);explanations.push('Recent muscle exposure limited repeat volume')}
    todaySession.prescriptions=todaySession.prescriptions.map(p=>{const advice=suggestLoad(p.exerciseId,input.workouts,p.targetReps,[],input.today,ready.targetRir);return {...p,loadKg:advice.action==='stop'?null:advice.loadKg,loadBasis:advice.loadKg===null?p.loadBasis:(input.workouts.flatMap(w=>w.actualSets).filter(s=>s.exerciseId===p.exerciseId&&s.loadBasis).at(-1)?.loadBasis??p.loadBasis)}})
    const overloaded=todaySession.muscles.filter(m=>recentMuscleSets(input.workouts,m,addDays(input.today,-6),yesterday)>=10)
    if(overloaded.length){todaySession.prescriptions=todaySession.prescriptions.map(p=>exerciseById[p.exerciseId]?.primary.some(m=>overloaded.includes(m))?{...p,sets:1}:p);todaySession.rationale.push(`Weekly volume cap protected: ${overloaded.join(', ')}`);explanations.push('Recent completed volume prevented unnecessary extra sets')}
  }

  const yesterday=addDays(input.today,-1),missed=sessions.find(s=>s.localDate===yesterday&&s.state==='missed'&&s.kind==='strength')
  if(missed&&todaySession&&(todaySession.kind==='recovery'||todaySession.kind==='cardio')){const loadedYesterday=input.workouts.filter(w=>w.localDate===yesterday).some(w=>actualMuscles(w).size>0),painConflict=check?.painMuscles.some(m=>missed.muscles.includes(m));if(!loadedYesterday&&!painConflict&&ready.label!=='Recover'){const priorTitle=todaySession.title;todaySession.title=missed.title;todaySession.kind='strength';todaySession.muscles=[...missed.muscles];todaySession.prescriptions=missed.prescriptions.map(p=>({...p}));todaySession.durationMin=Math.min(missed.durationMin,check?.availableMinutes||missed.durationMin);todaySession.state='planned';todaySession.rationale=[`Moved from ${missed.localDate} after a confirmed miss`,`Replaced ${priorTitle}; no double session was added`];explanations.push(`Moved ${missed.title} to the next suitable slot and preserved recovery`)}}
  return {id:`plan-${input.nowIso}`,createdAt:input.nowIso,trigger:'rule_engine_v2',previousId:input.current.id,sessions,explanations:explanations.length?explanations:['No safety, recovery, scheduling, or progression change was needed']}
}

function exerciseHistory(exerciseId:string,workouts:Workout[]){return workouts.filter(w=>w.state!=='in_progress').sort((a,b)=>a.localDate.localeCompare(b.localDate)).map(w=>({date:w.localDate,sets:workingSets(w.actualSets).filter(s=>s.exerciseId===exerciseId&&s.loadKg!==null)})).filter(x=>x.sets.length)}
function availableLoad(value:number,loads:number[]|undefined,direction:'nearest'|'lower'|'higher'='nearest'){
  if(!loads?.length)return Math.max(.5,Math.round(value*2)/2)
  const sorted=[...loads].sort((a,b)=>a-b)
  if(direction==='lower')return [...sorted].reverse().find(x=>x<value)??sorted[0]
  if(direction==='higher')return sorted.find(x=>x>value)??sorted.at(-1)!
  return sorted.reduce((best,x)=>Math.abs(x-value)<Math.abs(best-value)?x:best)
}

export function suggestLoad(exerciseId:string,workouts:Workout[],targetReps:number,currentSets:ActualSet[]=[],asOfDate?:string,targetRir=2):LoadSuggestion{
  const exercise=exerciseById[exerciseId]
  if(!exercise||exercise.defaultLoadBasis==='bodyweight'||exercise.equipment==='Bodyweight')return {loadKg:null,confidence:'high',action:'hold',reason:'Use a controlled bodyweight variation that leaves clean repetitions available.',evidence:['Bodyweight movement'],estimatedMaxKg:null,targetRir}
  const live=currentSets.filter(s=>s.exerciseId===exerciseId&&s.completed).at(-1),history=exerciseHistory(exerciseId,workouts),historicalSets=history.flatMap(x=>x.sets),source=live?.loadKg?live:historicalSets.at(-1)
  if(!source?.loadKg)return {loadKg:null,confidence:'calibrate',action:'start',reason:'No reliable same-exercise history exists. Use one conservative calibration set rather than guessing from body weight or another exercise.',evidence:['0 comparable working sets'],estimatedMaxKg:null,targetRir}
  if(source.feedback==='pain')return {loadKg:null,confidence:'high',action:'stop',reason:'Pain was reported. Stop this movement; changing the load is not an adequate safety response.',evidence:['Pain feedback'],estimatedMaxKg:null,targetRir:4}
  const lower=(_factor:number)=>availableLoad(source.loadKg!,exercise.availableLoadsKg,'lower'),higher=(_factor:number)=>availableLoad(source.loadKg!,exercise.availableLoadsKg,'higher')
  if(source.feedback==='form_broke')return {loadKg:lower(.9),confidence:'high',action:'reduce',reason:'Technique broke down. Reduce roughly 10% and only continue with a clean range of motion.',evidence:['Form breakdown on latest set'],estimatedMaxKg:null,targetRir:3}
  if(source.feedback==='hard'||(source.rir!==null&&source.rir<=1))return {loadKg:lower(.95),confidence:historicalSets.length>=3?'medium':'low',action:'reduce',reason:'The latest set was too close to failure for the current target. Use the next lower practical load.',evidence:[`${source.reps??'Unknown'} reps`,`${source.rir??'Unknown'} RIR`],estimatedMaxKg:null,targetRir}
  if(source.feedback==='too_easy'||(source.rir!==null&&source.rir>=4))return {loadKg:higher(1.075),confidence:live?'medium':historicalSets.length>=3?'medium':'low',action:'increase',reason:'The latest comparable set left at least four repetitions available. Try one practical increment.',evidence:[`${source.reps??'Unknown'} reps`,`${source.rir??'4+'} RIR`],estimatedMaxKg:null,targetRir}
  const valid=historicalSets.filter(s=>s.loadKg&&s.reps&&s.reps>=3&&s.reps<=20&&s.feedback!=='form_broke'&&s.feedback!=='pain'),maxes=valid.slice(-8).map(s=>s.loadKg!*(1+((s.reps||targetReps)+(s.rir??2))/30)),estimatedMax=maxes.length?median(maxes):source.loadKg*(1+((source.reps||targetReps)+(source.rir??2))/30)
  let suggested=availableLoad(estimatedMax/(1+(targetReps+targetRir)/30),exercise.availableLoadsKg),confidence:LoadSuggestion['confidence']=history.length>=4&&valid.filter(s=>s.rir!==null).length>=4?'high':history.length>=2?'medium':'low'
  const evidence=[`${history.length} comparable exposure${history.length===1?'':'s'}`,`${valid.length} usable set${valid.length===1?'':'s'}`,`Estimated max ${estimatedMax.toFixed(1)} kg`]
  if(asOfDate&&history.at(-1)){const gap=daysBetween(history.at(-1)!.date,asOfDate);if(gap>=42){suggested=availableLoad(suggested*.85,exercise.availableLoadsKg);evidence.push(`${gap}-day gap: 15% return reduction`);confidence='low'}else if(gap>=21){suggested=availableLoad(suggested*.9,exercise.availableLoadsKg);evidence.push(`${gap}-day gap: 10% return reduction`);confidence='low'}}
  const recent=history.slice(-2),repeatSuccess=recent.length===2&&recent.every(x=>x.sets.every(s=>(s.reps??0)>=targetReps&&(s.rir??-1)>=2&&s.feedback!=='form_broke'))
  if(!repeatSuccess&&suggested>source.loadKg)suggested=source.loadKg
  const action=suggested>source.loadKg?'increase':suggested<source.loadKg?'reduce':'hold',reason=action==='increase'?'Two recent exposures met the rep target with clean repetitions in reserve; use the smallest practical increase.':action==='reduce'?'Recent performance, effort, or time away supports a conservative reduction.':'Keep the load and improve rep quality or consistency before increasing.'
  return {loadKg:suggested,confidence,action,reason,evidence,estimatedMaxKg:Number(estimatedMax.toFixed(1)),targetRir}
}

export function progressionAdvice(exerciseId:string,workouts:Workout[]){const history=exerciseHistory(exerciseId,workouts),target=exerciseById[exerciseId]?.targetReps||12;if(!history.length)return {action:'choose' as const,reason:'No comparable working history; calibrate conservatively and leave 2–3 clean reps in reserve'};const latest=history.at(-1)!,drop=latest.sets.length>1&&(latest.sets.at(-1)!.reps??0)<(latest.sets[0].reps??0)*.8;if(latest.sets.some(s=>s.feedback==='pain'||s.feedback==='form_broke'))return {action:'reduce' as const,reason:'Pain or form breakdown prevents progression'};if(drop)return {action:'hold' as const,reason:'Repetitions dropped more than 20% across sets; hold load and improve repeatability'};const successful=history.slice(-2).length===2&&history.slice(-2).every(x=>x.sets.every(s=>(s.reps??0)>=target&&s.rir!==null&&s.rir>=2));if(successful)return {action:'consider_increment' as const,reason:'Two comparable exposures reached the target with at least 2 RIR and no form warning'};const stalled=history.slice(-4).length===4&&history.slice(-4).every(x=>x.sets.every(s=>(s.reps??0)<target));return stalled?{action:'deload' as const,reason:'Four exposures remained below target; reduce load 5–10% and rebuild clean repetitions'}:{action:'hold' as const,reason:'Keep the current load until performance is repeatable with known effort'}}

export function nextSetDecision(exerciseId:string,sets:ActualSet[],plannedSets:number,workouts:Workout[]):SetDecision{const done=workingSets(sets.filter(s=>s.exerciseId===exerciseId)),last=done.at(-1),advice=suggestLoad(exerciseId,workouts,exerciseById[exerciseId]?.targetReps||12,sets);if(!last)return {action:'hold',loadKg:advice.loadKg,continueExercise:true,reason:'Complete a controlled set before adjusting.'};if(last.feedback==='pain')return {action:'stop',loadKg:null,continueExercise:false,reason:'Stop this exercise because pain was reported.'};if(last.feedback==='form_broke')return {action:'reduce',loadKg:advice.loadKg,continueExercise:done.length<plannedSets,reason:'Reduce the load. Continue only if clean technique returns.'};const first=done[0],drop=done.length>1&&first.reps!==null&&last.reps!==null&&last.reps<first.reps*.8;if(drop)return {action:'end',loadKg:last.loadKg,continueExercise:false,reason:'Repetitions fell more than 20% from the first working set; productive volume is complete.'};if(done.length>=plannedSets){if((last.rir??0)>=3&&last.feedback!=='hard'&&done.length<Math.min(3,plannedSets+1))return {action:'hold',loadKg:advice.loadKg,continueExercise:true,reason:'One optional set is reasonable; stop with at least 2 repetitions in reserve.'};return {action:'end',loadKg:last.loadKg,continueExercise:false,reason:'Planned productive volume is complete. More sets are unlikely to improve today’s session.'}}return {action:advice.action==='start'?'hold':advice.action,loadKg:advice.loadKg,continueExercise:true,reason:advice.reason}}
export function canAddWorkingSet(sets:ActualSet[],planned:number){const done=workingSets(sets),last=done.at(-1);if(done.length<planned||done.length>=Math.min(3,planned+1)||!last)return false;return last.feedback!=='pain'&&last.feedback!=='form_broke'&&last.feedback!=='hard'&&(last.rir===null||last.rir>=3)}
