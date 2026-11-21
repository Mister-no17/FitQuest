import { db } from './db'

export interface FitQuestBackup { app:'FitQuest'; schemaVersion:2|3|4; exportedAt:string; data:Record<string,unknown[]> }
const tableNames=['profiles','campaigns','plans','workouts','checkIns','xpEvents','settings','metrics','activities','meals','meditationSessions','trainerExchanges'] as const

export async function createBackup():Promise<FitQuestBackup>{
  const data:Record<string,unknown[]>={}
  for(const name of tableNames)data[name]=await db.table(name).toArray()
  return {app:'FitQuest',schemaVersion:4,exportedAt:new Date().toISOString(),data}
}

export function validateBackup(input:unknown):input is FitQuestBackup{
  if(!input||typeof input!=='object')return false
  const value=input as Partial<FitQuestBackup>
  if(value.app!=='FitQuest'||![2,3,4].includes(Number(value.schemaVersion))||!value.data||typeof value.data!=='object')return false
  const required=tableNames.filter(name=>(name!=='trainerExchanges'||Number(value.schemaVersion)>=3)&&(name!=='meditationSessions'||value.schemaVersion===4))
  return required.every(name=>Array.isArray(value.data?.[name])&&value.data[name].every(row=>row&&typeof row==='object'&&typeof (row as {id?:unknown}).id==='string'))
}

export async function importBackup(backup:FitQuestBackup){
  await db.transaction('rw',db.tables,async()=>{for(const name of tableNames)await db.table(name).bulkPut(backup.data[name]||[])})
}

export async function resetAllData(){await db.delete()}
