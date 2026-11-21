import type { ActualSet, Exercise } from './types'

export interface DurationTarget { lowSec:number; highSec:number; basis:string }

export function idealSetDuration(exercise:Exercise,reps:number|null,durationSec:number|null):DurationTarget{
  if(exercise.timed){const target=Math.max(1,durationSec??exercise.targetReps);return {lowSec:Math.max(1,Math.round(target*.9)),highSec:Math.max(2,Math.round(target*1.2)),basis:`${target}-second controlled hold`}}
  const count=Math.max(1,reps??exercise.targetReps)
  return {lowSec:count*2,highSec:count*4,basis:`${count} controlled reps at roughly 2–4 seconds each`}
}

export function setDurationInsight(set:ActualSet,exercise:Exercise){
  if(set.activeDurationSec===undefined)return 'Timing not recorded'
  const target={lowSec:set.targetDurationLowSec,highSec:set.targetDurationHighSec}
  if(target.lowSec===undefined||target.highSec===undefined)return `${set.activeDurationSec} seconds recorded`
  if(set.activeDurationSec<target.lowSec)return `${set.activeDurationSec}s · faster than the ${target.lowSec}–${target.highSec}s controlled range`
  if(set.activeDurationSec>target.highSec)return `${set.activeDurationSec}s · slower than the ${target.lowSec}–${target.highSec}s controlled range${(set.rpe??0)>=9?' with very high effort':''}`
  return `${set.activeDurationSec}s · within the ${target.lowSec}–${target.highSec}s controlled range`
}
