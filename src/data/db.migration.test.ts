import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { FitQuestDB } from './db'

const legacyStores={profiles:'id',campaigns:'id',plans:'id,createdAt',workouts:'id,localDate,planSessionId',checkIns:'id,localDate',xpEvents:'id,&key,localDate',settings:'id',metrics:'id,localDate,type,[type+localDate]',activities:'id,localDate',meals:'id,localDate,createdAt',trainerExchanges:'id,createdAt'}
const names:string[]=[]

afterEach(async()=>{for(const name of names.splice(0))await Dexie.delete(name)})

describe('on-device database upgrade',()=>{
  it('keeps existing workouts and settings when upgrading from schema 3 to 4',async()=>{
    const name=`fitquest-upgrade-${crypto.randomUUID()}`;names.push(name)
    const old=new Dexie(name);old.version(3).stores(legacyStores);await old.open()
    await old.table('workouts').put({id:'first-workout',planSessionId:'session-1',localDate:'2026-11-21',startedAt:'2026-11-21T10:00:00.000Z',state:'completed',actualSets:[{id:'set-1',exerciseId:'flat-bench-press',setIndex:0,reps:8,loadKg:20,completed:true,revision:1}],notes:'Keep me'})
    await old.table('settings').put({id:'settings',theme:'dark',units:'metric'});old.close()

    const upgraded=new FitQuestDB(name);await upgraded.open()
    expect(await upgraded.workouts.get('first-workout')).toMatchObject({state:'completed',notes:'Keep me'})
    expect((await upgraded.workouts.get('first-workout'))?.actualSets).toHaveLength(1)
    expect(await upgraded.settings.get('settings')).toMatchObject({theme:'dark'})
    expect(upgraded.meditationSessions).toBeDefined()
    upgraded.close()
  })
})
