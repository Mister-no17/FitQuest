import { addDays } from './dates'
import { exerciseById } from './catalog'
import type { CheckIn, Meal, MetricObservation, PlannedSession, Workout } from './types'

export const rollingAverage = (observations:MetricObservation[], type:MetricObservation['type'], window=7) => {
  const rows=observations.filter(o=>o.type===type).sort((a,b)=>a.localDate.localeCompare(b.localDate))
  return rows.map((row,index)=>{const slice=rows.slice(Math.max(0,index-window+1),index+1);return {...row,average:slice.reduce((n,x)=>n+x.value,0)/slice.length,coverage:slice.length}})
}

export const dailyNutrition = (meals:Meal[], localDate:string) => meals.filter(m=>m.localDate===localDate).reduce((out,m)=>({calories:out.calories+(m.calories||0),proteinG:out.proteinG+(m.proteinG||0),count:out.count+1}),{calories:0,proteinG:0,count:0})

export const workoutVolume = (workouts:Workout[]) => {
  const volume:Record<string,number>={}
  workouts.flatMap(w=>w.actualSets).filter(s=>s.completed&&(s.setKind??'working')!=='calibration'&&(s.setKind??'working')!=='warmup').forEach(s=>{const e=exerciseById[s.exerciseId];e?.primary.forEach(m=>volume[m]=(volume[m]||0)+1);e?.secondary.forEach(m=>volume[m]=(volume[m]||0)+0.5)})
  return volume
}

export function weeklyReview(endDate:string, sessions:PlannedSession[], workouts:Workout[], checkIns:CheckIn[]){
  const start=addDays(endDate,-6),inRange=(d:string)=>d>=start&&d<=endDate
  const relevant=sessions.filter(s=>inRange(s.localDate)),actual=workouts.filter(w=>inRange(w.localDate)),checks=checkIns.filter(c=>inRange(c.localDate))
  const completed=actual.filter(w=>w.state==='completed').length,partial=actual.filter(w=>w.state==='partial').length,missed=relevant.filter(s=>s.state==='missed').length,recovery=relevant.filter(s=>s.state==='scheduled_rest'||s.state==='active_recovery').length
  const sleep=checks.map(c=>c.sleepHours).filter((n):n is number=>n!==null),avgSleep=sleep.length?sleep.reduce((a,b)=>a+b,0)/sleep.length:null
  const messages:string[]=[]
  if(completed+partial===0)messages.push('No training was logged this week; start with the next feasible mission rather than making up volume.')
  else messages.push(`${completed} completed and ${partial} partial session${completed+partial===1?'':'s'} were recorded.`)
  if(missed)messages.push(`${missed} confirmed miss${missed===1?' was':'es were'} retained without a double-session penalty.`)
  if(avgSleep!==null)messages.push(`Average logged sleep was ${avgSleep.toFixed(1)} hours across ${sleep.length} check-in${sleep.length===1?'':'s'}.`)
  else messages.push('Sleep coverage is insufficient for a recovery trend.')
  return {start,end:endDate,completed,partial,missed,recovery,avgSleep,checkInCoverage:checks.length,messages}
}
