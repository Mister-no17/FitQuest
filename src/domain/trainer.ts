import { exerciseById } from './catalog'
import type { ActivityObservation, CheckIn, Meal, MetricObservation, Profile, TrainerCategory, TrainerContextItem, TrainerExchange, TrainerManualAttachment, Workout } from './types'

export interface TrainerData { profile:Profile; metrics:MetricObservation[]; checkIns:CheckIn[]; workouts:Workout[]; activities:ActivityObservation[]; meals:Meal[]; exchanges:TrainerExchange[] }

export function classifyTrainerPrompt(prompt:string):TrainerCategory{
  const text=prompt.toLowerCase()
  if(/\b(code|coding|javascript|typescript|python|program|politic|election|president|stock|crypto|essay|homework|movie|dating)\b/.test(text))return 'out_of_scope'
  if(/\b(form|technique|posture|grip|stance|how (do|to)|pain during)\b/.test(text))return 'exercise_form'
  if(/\b(food|meal|diet|protein|calorie|nutrition|eat)\b/.test(text))return 'nutrition'
  if(/\b(weight|load|rep|set|bench|press|squat|deadlift|curl|pulldown|row|workout|train|exercise)\b/.test(text))return 'training'
  if(/\b(sleep|sore|soreness|fatigue|recover|recovery|rest|pain|injury)\b/.test(text))return 'recovery'
  if(/\b(progress|trend|improv|weight loss|waist|history)\b/.test(text))return 'progress'
  return 'training'
}

const recommended=(group:TrainerContextItem['group'], category:TrainerCategory)=>{
  const byCategory:Record<TrainerCategory,TrainerContextItem['group'][]>=
    {training:['Profile','Check-ins','Workouts','Exercise history','Pain & recovery'],recovery:['Profile','Check-ins','Pain & recovery','Activity'],nutrition:['Profile','Body measurements','Nutrition','Activity'],exercise_form:['Profile','Exercise history','Pain & recovery'],progress:['Profile','Body measurements','Check-ins','Workouts','Exercise history','Nutrition','Activity'],out_of_scope:[]}
  return byCategory[category].includes(group)
}

export function buildTrainerContext(data:TrainerData, category:TrainerCategory):TrainerContextItem[]{
  const items:TrainerContextItem[]=[]
  const add=(item:Omit<TrainerContextItem,'recommendedFor'>)=>items.push({...item,recommendedFor:recommended(item.group,category)?[category]:[]})
  add({id:'profile:basics',group:'Profile',label:'Age, height and starting weight',value:{age:data.profile.ageAtStart,heightCm:data.profile.heightCm,startingWeightKg:data.profile.seedWeightKg},source:'profile'})
  add({id:'profile:goals',group:'Profile',label:'Fitness goals',value:{goals:data.profile.goals,foodPreference:data.profile.foodPreference},source:'profile'})
  for(const m of data.metrics.slice().sort((a,b)=>b.localDate.localeCompare(a.localDate)))add({id:`metric:${m.id}`,group:'Body measurements',label:`${m.type.replace('_',' ')} · ${m.localDate}`,value:{value:m.value,unit:m.unit,notes:m.notes},date:m.localDate,source:m.source})
  for(const c of data.checkIns.slice().sort((a,b)=>b.localDate.localeCompare(a.localDate)))add({id:`check:${c.id}`,group:'Check-ins',label:`Daily check-in · ${c.localDate}`,value:{sleepHours:c.sleepHours,energy:c.energy,fatigue:c.fatigue,availableMinutes:c.availableMinutes,weightKg:c.weightKg},date:c.localDate,source:'manual'})
  for(const c of data.checkIns.filter(c=>c.pain||Object.keys(c.soreness).length||c.notes))add({id:`recovery:${c.id}`,group:'Pain & recovery',label:`Recovery notes · ${c.localDate}`,value:{pain:c.pain,painMuscles:c.painMuscles,soreness:c.soreness,notes:c.notes},date:c.localDate,source:'manual'})
  for(const w of data.workouts.slice().sort((a,b)=>b.localDate.localeCompare(a.localDate))) {
    add({id:`workout:${w.id}`,group:'Workouts',label:`${w.state} workout · ${w.localDate}`,value:{startedAt:w.startedAt,endedAt:w.endedAt,difficulty:w.difficulty,energyEstimate:w.energyEstimate,notes:w.notes},date:w.localDate,source:'workout log'})
    const grouped=new Map<string,typeof w.actualSets>(); for(const set of w.actualSets){const list=grouped.get(set.exerciseId)||[];list.push(set);grouped.set(set.exerciseId,list)}
    for(const [exerciseId,sets] of grouped)add({id:`sets:${w.id}:${exerciseId}`,group:'Exercise history',label:`${exerciseById[exerciseId]?.name||exerciseId} · ${w.localDate}`,value:{sets:sets.map(s=>({kind:s.setKind||'working',loadKg:s.loadKg,reps:s.reps,durationSec:s.durationSec,rpe:s.rpe,rir:s.rir,feedback:s.feedback,activeDurationSec:s.activeDurationSec,targetDurationLowSec:s.targetDurationLowSec,targetDurationHighSec:s.targetDurationHighSec,completed:s.completed}))},date:w.localDate,source:'set log'})
  }
  for(const meal of data.meals.slice().sort((a,b)=>b.localDate.localeCompare(a.localDate)))add({id:`meal:${meal.id}`,group:'Nutrition',label:`${meal.name} · ${meal.localDate}`,value:{portion:meal.portion,calories:meal.calories,proteinG:meal.proteinG,carbsG:meal.carbsG,fatG:meal.fatG,confidence:meal.confidence,notes:meal.notes},date:meal.localDate,source:meal.source})
  for(const a of data.activities.slice().sort((x,y)=>y.localDate.localeCompare(x.localDate)))add({id:`activity:${a.id}`,group:'Activity',label:`Activity · ${a.localDate}`,value:{steps:a.steps,waterMl:a.waterMl,notes:a.notes},date:a.localDate,source:a.source})
  for(const e of data.exchanges.slice(-10).reverse())add({id:`ai:${e.id}`,group:'Previous AI messages',label:`Previous trainer reply · ${e.createdAt.slice(0,10)}`,value:{prompt:e.prompt,reply:e.reply.answer,category:e.reply.category},date:e.createdAt.slice(0,10),source:'Groq response saved locally'})
  return items
}

export function recommendedContextIds(items:TrainerContextItem[],category:TrainerCategory){return new Set(items.filter(i=>i.recommendedFor?.includes(category)).map(i=>i.id))}

export function contextPayload(prompt:string,items:TrainerContextItem[],selected:Set<string>,manual:TrainerManualAttachment[]){return {prompt,selectedData:items.filter(i=>selected.has(i.id)).map(({id,group,label,value,date,source})=>({id,group,label,value,date,source})),manualAttachments:manual.filter(m=>m.label.trim()&&m.value.trim()).map(m=>({label:m.label.trim(),value:m.value.trim(),date:m.date||undefined}))}}
