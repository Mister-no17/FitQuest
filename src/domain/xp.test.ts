import { describe,expect,it } from 'vitest'
import { newXpAward } from './xp'
import type { XPEvent } from './types'

const event=(key:string,amount:number):XPEvent=>({id:key,key,localDate:'2026-11-26',amount,reason:key})

describe('XP feedback',()=>{
  it('announces newly earned XP once, with the updated total',()=>{
    const before=[event('first',40)],after=[...before,event('workout',40)]
    expect(newXpAward(before,after)).toEqual({amount:40,reason:'workout',total:80})
    expect(newXpAward(after,after)).toBeNull()
  })
  it('does not announce history on launch or zero-point completion markers',()=>{
    const current=[event('earned',40),event('capped',0)]
    expect(newXpAward(null,current)).toBeNull()
    expect(newXpAward([current[0]],current)).toBeNull()
  })
})
