import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { FitQuestDB, creditAttestedDayThree, db, seedDatabase } from './db'

const legacyStores={profiles:'id',campaigns:'id',plans:'id,createdAt',workouts:'id,localDate,planSessionId',checkIns:'id,localDate',xpEvents:'id,&key,localDate',settings:'id',metrics:'id,localDate,type,[type+localDate]',activities:'id,localDate',meals:'id,localDate,createdAt',trainerExchanges:'id,createdAt'}
const names:string[]=[]

afterEach(async()=>{for(const name of names.splice(0))await Dexie.delete(name)})

describe('on-device database upgrade',()=>{
  it('does not credit Day 3 on a brand-new installation',async()=>{
    names.push('fitquest')
    await seedDatabase('2026-11-26T10:00:00.000Z')
    await seedDatabase('2026-11-26T10:00:01.000Z')
    expect((await db.profiles.get('owner'))?.day3AttestationMigrated).toBe(true)
    expect(await db.xpEvents.where('localDate').equals('2026-11-23').count()).toBe(0)
    db.close()
  })
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
  it('credits the confirmed Day 3 light session once without changing existing records',async()=>{
    const name=`fitquest-day3-${crypto.randomUUID()}`;names.push(name)
    const store=new FitQuestDB(name);await store.open()
    await store.workouts.put({id:'first-workout',localDate:'2026-11-21',startedAt:'2026-11-21T10:00:00.000Z',state:'completed',actualSets:[],notes:'Keep my data'})
    await store.settings.put({id:'settings',theme:'dark',notificationsEnabled:false,workoutReminder:null,quietStart:'22:00',quietEnd:'07:00',units:'metric',aiEnabled:false,aiModel:'openai/gpt-oss-20b'})
    expect(await creditAttestedDayThree(store)).toBe(40)
    expect(await creditAttestedDayThree(store)).toBe(0)
    const day3=await store.xpEvents.where('localDate').equals('2026-11-23').toArray()
    expect(day3).toHaveLength(1)
    expect(day3[0]).toMatchObject({amount:40,key:'2026-11-23:recovery:day-3-user-attested'})
    expect(await store.workouts.get('first-workout')).toMatchObject({notes:'Keep my data'})
    expect(await store.settings.get('settings')).toMatchObject({theme:'dark'})
    store.close()
  })
  it('still marks Day 3 complete when the daily XP cap was already reached',async()=>{
    const name=`fitquest-day3-cap-${crypto.randomUUID()}`;names.push(name)
    const store=new FitQuestDB(name);await store.open()
    await store.xpEvents.put({id:'prior',localDate:'2026-11-23',key:'2026-11-23:prior',amount:100,reason:'Earlier earned XP'})
    expect(await creditAttestedDayThree(store)).toBe(0)
    expect(await store.xpEvents.where('localDate').equals('2026-11-23').count()).toBe(2)
    expect((await store.xpEvents.where('key').equals('2026-11-23:recovery:day-3-user-attested').first())?.amount).toBe(0)
    store.close()
  })
})
