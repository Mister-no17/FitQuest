import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@capnative/capacitor-secure-storage'

const KEY='fitquest.groq.api-key'
let webSessionKey=''

export const isNativeSecureStorage=()=>Capacitor.isNativePlatform()
export async function saveGroqKey(value:string){
  const key=value.trim()
  if(!key.startsWith('gsk_'))throw new Error('Groq keys normally start with gsk_. Check the copied key.')
  if(isNativeSecureStorage())await SecureStorage.set({key:KEY,value:key}); else webSessionKey=key
}
export async function getGroqKey(){if(isNativeSecureStorage()){try{return (await SecureStorage.get({key:KEY})).value||''}catch{return ''}}return webSessionKey}
export async function hasGroqKey(){if(isNativeSecureStorage())return SecureStorage.has({key:KEY}).then(r=>r.value).catch(()=>false);return Boolean(webSessionKey)}
export async function removeGroqKey(){if(isNativeSecureStorage())await SecureStorage.remove({key:KEY}).catch(()=>{});else webSessionKey=''}
