import { describe, expect, it } from 'vitest'
import { campaignSessions } from './catalog'
import { completedSession, sessionStatus } from './completion'
import type { XPEvent } from './types'

describe('campaign completion',()=>{
  it('shows a recovery day as complete from its XP record without a check-in',()=>{
    const day3=campaignSessions[2]
    const event:XPEvent={id:'day3',localDate:day3.localDate,key:`${day3.localDate}:recovery:day-3-user-attested`,amount:40,reason:'Confirmed light exercise'}
    expect(completedSession(day3,[],[event])).toBe(true)
    expect(sessionStatus(day3,[],[event])).toBe('completed')
    expect(completedSession(campaignSessions[3],[],[event])).toBe(false)
  })
})
