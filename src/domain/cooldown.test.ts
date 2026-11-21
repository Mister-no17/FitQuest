import { describe,expect,it } from 'vitest'
import { cooldownForSession } from './cooldown'
import { initialPlan } from './engine'

describe('session cooldown',()=>{
  it('starts gradually and ends with breathing',()=>{const steps=cooldownForSession(initialPlan('2026-11-21T00:00:00Z').sessions[0]);expect(steps[0].id).toBe('gradual-easy-pace');expect(steps.at(-1)?.id).toBe('relaxed-breathing')})
  it('selects stretches only for muscles in the session',()=>{const session=initialPlan('2026-11-21T00:00:00Z').sessions[0],steps=cooldownForSession(session);expect(steps.filter(s=>s.muscles.length).every(s=>s.muscles.every(m=>session.muscles.includes(m)))).toBe(true)})
  it('keeps the routine short enough to finish',()=>{const steps=cooldownForSession(initialPlan('2026-11-21T00:00:00Z').sessions[3]);expect(steps.reduce((n,s)=>n+s.seconds,0)).toBeLessThanOrEqual(600)})
})
