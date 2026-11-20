import { describe,expect,it } from 'vitest'
import { classifyTrainerPrompt, contextPayload, recommendedContextIds } from './trainer'
import type { TrainerContextItem } from './types'

describe('trainer privacy and scope',()=>{
  it('blocks obvious unrelated coding requests locally',()=>expect(classifyTrainerPrompt('Can you code a Python app?')).toBe('out_of_scope'))
  it('classifies recovery and nutrition questions',()=>{expect(classifyTrainerPrompt('Should I rest with this soreness?')).toBe('recovery');expect(classifyTrainerPrompt('How much protein should I eat?')).toBe('nutrition')})
  it('prioritizes load questions even when recovery is mentioned',()=>expect(classifyTrainerPrompt("Based on my bench sets and today's recovery, what weight should I try?")).toBe('training'))
  it('sends only explicitly selected items and valid manual attachments',()=>{const items:TrainerContextItem[]=[{id:'a',group:'Activity',label:'Steps',value:5000,source:'manual',recommendedFor:['training']},{id:'b',group:'Profile',label:'Goals',value:'fat loss',source:'profile'}];const payload=contextPayload('help',items,new Set(['b']),[{id:'m',label:'Heart rate',value:'120 bpm'}]);expect(payload.selectedData.map(x=>x.id)).toEqual(['b']);expect(payload.manualAttachments).toEqual([{label:'Heart rate',value:'120 bpm',date:undefined}]);expect(recommendedContextIds(items,'training')).toEqual(new Set(['a']))})
})
