import type { ActualSet, CheckIn, MetricObservation, PlannedSession, Profile, Workout, WorkoutEnergyEstimate } from './types'

export interface BodyWeightEvidence { kg:number; source:WorkoutEnergyEstimate['bodyWeightSource']; localDate?:string }
export interface EnergyRange { kcal:number; lowKcal:number; highKcal:number; minutes:number }

const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value))
const round=(value:number)=>Math.max(0,Math.round(value))
const kcal=(met:number,kg:number,minutes:number)=>met*3.5*kg/200*minutes

export function bodyWeightEvidence(date:string,profile:Profile,metrics:MetricObservation[],checkIns:CheckIn[]):BodyWeightEvidence{
  const measured=metrics.filter(m=>m.type==='weight'&&m.localDate<=date&&m.value>0).sort((a,b)=>a.localDate.localeCompare(b.localDate)).at(-1)
  if(measured)return {kg:measured.value,source:'measurement',localDate:measured.localDate}
  const check=checkIns.filter(c=>c.localDate<=date&&(c.weightKg??0)>0).sort((a,b)=>a.localDate.localeCompare(b.localDate)).at(-1)
  if(check?.weightKg)return {kg:check.weightKg,source:'check_in',localDate:check.localDate}
  return {kg:profile.seedWeightKg,source:'profile_estimate'}
}

function plannedMets(session:PlannedSession):[number,number,number]{
  if(session.kind==='cardio')return [5,3.5,7]
  if(session.kind==='recovery')return [2.5,2,3.3]
  return [4.2,3.5,5]
}

export function estimatePlannedEnergy(session:PlannedSession,bodyWeightKg:number):EnergyRange{
  const minutes=Math.max(0,session.durationMin),[point,low,high]=plannedMets(session)
  return {kcal:round(kcal(point,bodyWeightKg,minutes)),lowKcal:round(kcal(low,bodyWeightKg,minutes)),highKcal:round(kcal(high,bodyWeightKg,minutes)),minutes}
}

const isWorking=(set:ActualSet)=>(set.setKind??'working')==='working'||set.setKind==='backoff'

function modeledActualMinutes(session:PlannedSession,sets:ActualSet[]){
  const done=sets.filter(s=>s.completed)
  if(!done.length)return 0
  const activeSeconds=done.reduce((total,set)=>total+(set.durationSec??Math.max(1,set.reps??session.prescriptions.find(p=>p.exerciseId===set.exerciseId)?.targetReps??8)*4),0)
  const byExercise=new Map<string,number>()
  done.forEach(set=>byExercise.set(set.exerciseId,(byExercise.get(set.exerciseId)??0)+1))
  const restSeconds=[...byExercise].reduce((total,[exerciseId,count])=>total+Math.max(0,count-1)*(session.prescriptions.find(p=>p.exerciseId===exerciseId)?.restSec??75),0)
  const transitions=Math.max(0,byExercise.size-1)*60+byExercise.size*30
  return clamp((activeSeconds+restSeconds+transitions)/60,3,session.durationMin*1.75||180)
}

function actualMinutes(session:PlannedSession,workout:Workout,endedAt:string){
  const modeled=modeledActualMinutes(session,workout.actualSets)
  const wall=(new Date(endedAt).getTime()-new Date(workout.startedAt).getTime())/60000
  const wallLooksValid=Number.isFinite(wall)&&wall>=3&&wall<=180&&wall<=Math.max(30,session.durationMin*2.5)
  if(!wallLooksValid)return modeled
  // A real session clock captures setup and rest; never allow an implausibly short clock to erase logged work.
  return clamp(Math.max(wall,modeled*.75),3,180)
}

function actualIntensityMet(session:PlannedSession,sets:ActualSet[]){
  if(session.kind!=='strength')return plannedMets(session)[0]
  const working=sets.filter(s=>s.completed&&isWorking(s))
  if(!working.length)return 2.5
  const feedback=working.map(s=>s.feedback).filter(Boolean)
  const effort=feedback.length?feedback.reduce((sum,value)=>sum+(value==='too_easy'?.9:value==='good'?1:value==='hard'?1.12:value==='form_broke'?1.05:.85),0)/feedback.length:1
  const comparable=working.filter(s=>(s.loadKg??0)>0&&(s.suggestedLoadKg??0)>0)
  const loadRatio=comparable.length?comparable.reduce((sum,s)=>sum+clamp((s.loadKg??0)/(s.suggestedLoadKg??1),.7,1.3),0)/comparable.length:1
  const repRatio=working.reduce((sum,s)=>{const target=session.prescriptions.find(p=>p.exerciseId===s.exerciseId)?.targetReps??s.reps??1;return sum+clamp((s.reps??target)/target,.6,1.35)},0)/working.length
  // Load and reps only nudge intensity; they are not converted directly into calories.
  return clamp(4.2*(.55+.2*effort+.12*loadRatio+.13*repRatio),3,6)
}

export function estimateCompletedEnergy(session:PlannedSession,workout:Workout,evidence:BodyWeightEvidence,endedAt=workout.endedAt??new Date().toISOString()):WorkoutEnergyEstimate{
  const planned=estimatePlannedEnergy(session,evidence.kg),minutes=actualMinutes(session,workout,endedAt),met=actualIntensityMet(session,workout.actualSets)
  const actual=round(kcal(met,evidence.kg,minutes)),uncertainty=evidence.source==='profile_estimate'?.35:.28
  return {
    method:'met-v1',bodyWeightKg:evidence.kg,bodyWeightSource:evidence.source,confidence:evidence.source==='profile_estimate'?'low':'medium',
    plannedKcal:planned.kcal,plannedLowKcal:planned.lowKcal,plannedHighKcal:planned.highKcal,plannedMinutes:planned.minutes,
    actualKcal:actual,actualLowKcal:round(actual*(1-uncertainty)),actualHighKcal:round(actual*(1+uncertainty)),actualMinutes:round(minutes)
  }
}
