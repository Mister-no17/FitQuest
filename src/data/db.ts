import Dexie, { type EntityTable } from 'dexie'
import type { Profile, Campaign, PlanVersion, Workout, CheckIn, XPEvent, AppSettings, MetricObservation, ActivityObservation, Meal, MeditationSession, TrainerExchange } from '../domain/types'
import { initialPlan } from '../domain/engine'
import { completeCampaignSessions, migratePlanForGymEquipment } from '../domain/catalog'

export class FitQuestDB extends Dexie {
  profiles!:EntityTable<Profile,'id'>; campaigns!:EntityTable<Campaign,'id'>; plans!:EntityTable<PlanVersion,'id'>; workouts!:EntityTable<Workout,'id'>; checkIns!:EntityTable<CheckIn,'id'>; xpEvents!:EntityTable<XPEvent,'id'>; settings!:EntityTable<AppSettings,'id'>; metrics!:EntityTable<MetricObservation,'id'>; activities!:EntityTable<ActivityObservation,'id'>; meals!:EntityTable<Meal,'id'>; meditationSessions!:EntityTable<MeditationSession,'id'>; trainerExchanges!:EntityTable<TrainerExchange,'id'>
  constructor(){
    super('fitquest')
    this.version(1).stores({profiles:'id',campaigns:'id',plans:'id,createdAt',workouts:'id,localDate,planSessionId',checkIns:'id,localDate',xpEvents:'id,&key,localDate',settings:'id'})
    this.version(2).stores({profiles:'id',campaigns:'id',plans:'id,createdAt',workouts:'id,localDate,planSessionId',checkIns:'id,localDate',xpEvents:'id,&key,localDate',settings:'id',metrics:'id,localDate,type,[type+localDate]',activities:'id,localDate',meals:'id,localDate,createdAt'})
      .upgrade(async tx=>{const settings=await tx.table('settings').get('settings');if(settings)await tx.table('settings').put({...settings,notificationsEnabled:false,workoutReminder:null,quietStart:'22:00',quietEnd:'07:00',units:'metric'})})
    this.version(3).stores({profiles:'id',campaigns:'id',plans:'id,createdAt',workouts:'id,localDate,planSessionId',checkIns:'id,localDate',xpEvents:'id,&key,localDate',settings:'id',metrics:'id,localDate,type,[type+localDate]',activities:'id,localDate',meals:'id,localDate,createdAt',trainerExchanges:'id,createdAt'})
      .upgrade(async tx=>{const settings=await tx.table('settings').get('settings');if(settings)await tx.table('settings').put({...settings,aiEnabled:false,aiModel:'openai/gpt-oss-20b'})})
    this.version(4).stores({profiles:'id',campaigns:'id',plans:'id,createdAt',workouts:'id,localDate,planSessionId',checkIns:'id,localDate',xpEvents:'id,&key,localDate',settings:'id',metrics:'id,localDate,type,[type+localDate]',activities:'id,localDate',meals:'id,localDate,createdAt',meditationSessions:'id,localDate,state,[localDate+state]',trainerExchanges:'id,createdAt'})
  }
}
export const db=new FitQuestDB()
export async function seedDatabase(nowIso:string){
  await db.transaction('rw',[db.profiles,db.campaigns,db.plans,db.workouts,db.settings],async()=>{
    if(!(await db.profiles.count())){
      await db.profiles.add({id:'owner',ageAtStart:21,heightCm:177.8,seedWeightKg:86,physiology:'male',timezone:'Asia/Kolkata',foodPreference:'Jain vegetarian; flexible regular Indian food',goals:['Overall fat loss and reduced waist','Fuller chest and broader-looking shoulders','Stronger core and athletic fitness'],waistCm:null,theme:'light'})
      await db.campaigns.add({id:'campaign-2026-11',startDate:'2026-11-21',endDate:'2026-12-20',policyVersion:'1.0'})
      await db.plans.add(initialPlan(nowIso))
      await db.settings.add({id:'settings',theme:'light',notificationsEnabled:false,workoutReminder:null,quietStart:'22:00',quietEnd:'07:00',units:'metric',aiEnabled:false,aiModel:'openai/gpt-oss-20b'})
      return
    }
    const latest=await db.plans.orderBy('createdAt').last()
    if(latest&&latest.sessions.length<30)await db.plans.put({...latest,id:'plan-campaign-v3',createdAt:nowIso,trigger:'campaign_horizon_v3',previousId:latest.id,sessions:completeCampaignSessions(latest.sessions),explanations:['Added the complete 30-day hybrid rotation without changing recorded workouts',...latest.explanations]})
    const current=await db.plans.orderBy('createdAt').last()
    const hasEquipmentMigration=(await db.plans.toArray()).some(plan=>plan.trigger==='gym_equipment_v4')
    if(current&&!hasEquipmentMigration){
      const workouts=await db.workouts.toArray()
      await db.plans.put({id:`plan-gym-v4-${Date.parse(nowIso)}`,createdAt:nowIso,trigger:'gym_equipment_v4',previousId:current.id,sessions:migratePlanForGymEquipment(current.sessions,workouts),explanations:['Future sessions now use only equipment confirmed at your gym','Any date with a workout log was preserved exactly, including its original exercises and prescription',...current.explanations]})
    }
  })
}

export async function awardXP(localDate:string,key:string,amount:number,reason:string){
  const dayEvents=await db.xpEvents.where('localDate').equals(localDate).toArray(); const used=dayEvents.reduce((n,e)=>n+e.amount,0); const grant=Math.max(0,Math.min(amount,100-used));
  if(!grant) return 0
  try{await db.xpEvents.add({id:crypto.randomUUID(),localDate,key:`${localDate}:${key}`,amount:grant,reason});return grant}catch{return 0}
}
