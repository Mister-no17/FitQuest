import { addDays } from './dates'
import type { MeditationSession } from './types'

export const DAILY_MEDITATION_SECONDS=600

export const meditationSecondsForDate=(sessions:MeditationSession[],localDate:string)=>sessions
  .filter(session=>session.localDate===localDate)
  .reduce((total,session)=>total+Math.max(0,session.completedSeconds),0)

export const meditationGoalMet=(sessions:MeditationSession[],localDate:string)=>meditationSecondsForDate(sessions,localDate)>=DAILY_MEDITATION_SECONDS

export function meditationStats(sessions:MeditationSession[],today:string){
  const totals=new Map<string,number>()
  for(const session of sessions)totals.set(session.localDate,(totals.get(session.localDate)||0)+Math.max(0,session.completedSeconds))
  const completedDays=[...totals].filter(([,seconds])=>seconds>=DAILY_MEDITATION_SECONDS).map(([date])=>date).sort()
  let current=0,cursor=today
  if((totals.get(cursor)||0)<DAILY_MEDITATION_SECONDS)cursor=addDays(cursor,-1)
  while((totals.get(cursor)||0)>=DAILY_MEDITATION_SECONDS){current++;cursor=addDays(cursor,-1)}
  let longest=0,run=0,previous=''
  for(const date of completedDays){run=previous&&addDays(previous,1)===date?run+1:1;longest=Math.max(longest,run);previous=date}
  const sevenDaySeconds=Array.from({length:7},(_,i)=>totals.get(addDays(today,-i))||0).reduce((a,b)=>a+b,0)
  return {currentStreak:current,longestStreak:longest,totalSessions:sessions.filter(s=>s.completedSeconds>0).length,totalMinutes:Math.floor(sessions.reduce((n,s)=>n+s.completedSeconds,0)/60),sevenDayMinutes:Math.floor(sevenDaySeconds/60)}
}
