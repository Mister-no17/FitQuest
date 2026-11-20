import { describe,expect,it } from 'vitest'
import { buildGroqRequest, TRAINER_MODEL } from './groq'
describe('Groq request',()=>{it('uses the fixed model, strict schema and scoped system role',()=>{const request=buildGroqRequest({prompt:'test'});expect(request.model).toBe(TRAINER_MODEL);expect(request.response_format.json_schema.strict).toBe(true);expect(request.messages[0].content).toContain('Only answer about exercise')})})
