import { describe,expect,it } from 'vitest'
import { meditationGoalMet,meditationStats } from './meditation'
import type { MeditationSession } from './types'

const session=(date:string,seconds:number):MeditationSession=>({id:`m-${date}-${seconds}`,localDate:date,startedAt:`${date}T08:00:00+05:30`,endedAt:`${date}T08:10:00+05:30`,targetSeconds:600,completedSeconds:seconds,state:seconds>=600?'completed':'partial',source:'manual',audio:'silent'})

describe('meditation tracking',()=>{
  it('combines partial sessions toward the daily goal',()=>{const sessions=[session('2026-11-22',240),session('2026-11-22',360)];expect(meditationGoalMet(sessions,'2026-11-22')).toBe(true)})
  it('keeps yesterday streak alive before today is complete',()=>{const stats=meditationStats([session('2026-11-20',600),session('2026-11-21',600)],'2026-11-22');expect(stats.currentStreak).toBe(2);expect(stats.longestStreak).toBe(2)})
  it('counts the current day once its goal is complete',()=>{const stats=meditationStats([session('2026-11-21',600),session('2026-11-22',600)],'2026-11-22');expect(stats.currentStreak).toBe(2);expect(stats.sevenDayMinutes).toBe(20)})
})
