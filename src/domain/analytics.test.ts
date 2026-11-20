import { describe,expect,it } from 'vitest'
import { dailyNutrition, rollingAverage, weeklyReview, workoutVolume } from './analytics'
import { initialPlan } from './engine'
import type { Meal, MetricObservation, Workout } from './types'

const metric=(date:string,value:number):MetricObservation=>({id:date,localDate:date,createdAt:date,type:'weight',value,unit:'kg',source:'manual',notes:''})
describe('analytics',()=>{
  it('computes sparse rolling averages with coverage',()=>{const r=rollingAverage([metric('2026-11-21',86),metric('2026-11-23',85)],'weight');expect(r[1].average).toBe(85.5);expect(r[1].coverage).toBe(2)})
  it('sums only known manual nutrition estimates',()=>{const meals:Meal[]=[{id:'1',localDate:'2026-11-21',createdAt:'',name:'Dal',portion:'1 bowl',calories:250,proteinG:14,carbsG:null,fatG:null,source:'manual_estimate',confidence:'low',notes:''}];expect(dailyNutrition(meals,'2026-11-21')).toEqual({calories:250,proteinG:14,count:1})})
  it('counts primary and secondary muscle workload explicitly',()=>{const w:Workout={id:'w',localDate:'2026-11-21',startedAt:'',state:'completed',notes:'',actualSets:[{id:'s',exerciseId:'flat-db-press',setIndex:0,reps:12,durationSec:null,loadKg:10,loadBasis:'each',rir:2,completed:true,revision:1}]};expect(workoutVolume([w])).toEqual({chest:1,triceps:.5,shoulders:.5})})
  it('does not invent sleep coverage in weekly review',()=>{const review=weeklyReview('2026-11-27',initialPlan('').sessions,[],[]);expect(review.avgSleep).toBeNull();expect(review.messages.join(' ')).toContain('insufficient')})
})
