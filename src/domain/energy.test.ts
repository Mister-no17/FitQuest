import { describe, expect, it } from 'vitest'
import { estimateCompletedEnergy, estimatePlannedEnergy } from './energy'
import type { ActualSet, PlannedSession, Workout } from './types'

const session:PlannedSession={id:'s',localDate:'2026-11-20',title:'Strength',kind:'strength',muscles:['legs'],durationMin:45,prescriptions:[{exerciseId:'squat',sets:3,targetReps:10,loadKg:null,loadBasis:'total',restSec:90}],state:'planned',rationale:[]}
const set=(id:string,reps:number,loadKg:number,feedback:ActualSet['feedback']='good'):ActualSet=>({id,exerciseId:'squat',setIndex:Number(id),reps,durationSec:null,loadKg,loadBasis:'total',rir:2,completed:true,setKind:'working',feedback,suggestedLoadKg:40,revision:1})
const workout=(sets:ActualSet[],minutes=40):Workout=>({id:'w',planSessionId:'s',localDate:'2026-11-20',startedAt:'2026-11-20T10:00:00.000Z',endedAt:new Date(Date.parse('2026-11-20T10:00:00.000Z')+minutes*60000).toISOString(),state:'completed',actualSets:sets,notes:''})

describe('workout energy estimates',()=>{
  it('scales planned energy with body weight and duration',()=>{expect(estimatePlannedEnergy(session,80).kcal).toBeGreaterThan(estimatePlannedEnergy(session,60).kcal);expect(estimatePlannedEnergy({...session,durationMin:60},80).kcal).toBeGreaterThan(estimatePlannedEnergy(session,80).kcal)})
  it('keeps the point inside an uncertainty range',()=>{const result=estimateCompletedEnergy(session,workout([set('0',10,40),set('1',10,40),set('2',10,40)]),{kg:75,source:'measurement'});expect(result.actualLowKcal).toBeLessThan(result.actualKcal);expect(result.actualHighKcal).toBeGreaterThan(result.actualKcal);expect(result.confidence).toBe('medium')})
  it('uses completed work and duration without treating kilograms as calories',()=>{const less=estimateCompletedEnergy(session,workout([set('0',8,30,'too_easy')],15),{kg:75,source:'measurement'}),more=estimateCompletedEnergy(session,workout([set('0',10,45,'hard'),set('1',10,45,'hard'),set('2',10,45,'hard')],45),{kg:75,source:'measurement'});expect(more.actualKcal).toBeGreaterThan(less.actualKcal);expect(more.actualKcal/less.actualKcal).toBeLessThan(5)})
  it('marks profile-only weight as low confidence',()=>{expect(estimateCompletedEnergy(session,workout([set('0',10,40)]),{kg:75,source:'profile_estimate'}).confidence).toBe('low')})
})
