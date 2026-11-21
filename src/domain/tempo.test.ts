import { describe,expect,it } from 'vitest'
import { exerciseById } from './catalog'
import { idealSetDuration, setDurationInsight } from './tempo'
import type { ActualSet } from './types'

const base:ActualSet={id:'s',exerciseId:'flat-db-press',setIndex:0,reps:10,durationSec:null,loadKg:10,loadBasis:'each',rir:2,rpe:8,completed:true,revision:1}
describe('set tempo',()=>{
  it('uses a controlled range based on actual reps',()=>expect(idealSetDuration(exerciseById['flat-db-press'],10,null)).toEqual({lowSec:20,highSec:40,basis:'10 controlled reps at roughly 2–4 seconds each'}))
  it('keeps legacy sets honest when no timer was recorded',()=>expect(setDurationInsight(base,exerciseById['flat-db-press'])).toBe('Timing not recorded'))
  it('flags a rushed set without treating speed as success',()=>expect(setDurationInsight({...base,activeDurationSec:12,targetDurationLowSec:20,targetDurationHighSec:40},exerciseById['flat-db-press'])).toContain('faster'))
})
