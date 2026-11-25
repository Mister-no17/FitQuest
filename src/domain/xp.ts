import type { XPEvent } from './types'

export interface XPAwardNotice { amount:number; reason:string; total:number }

export function newXpAward(previous:XPEvent[]|null,current:XPEvent[]):XPAwardNotice|null{
  if(previous===null)return null
  const known=new Set(previous.map(event=>event.key))
  const gained=current.filter(event=>!known.has(event.key)&&event.amount>0)
  if(!gained.length)return null
  return {
    amount:gained.reduce((sum,event)=>sum+event.amount,0),
    reason:gained.length===1?gained[0].reason:`${gained.length} achievements recorded`,
    total:current.reduce((sum,event)=>sum+event.amount,0),
  }
}
