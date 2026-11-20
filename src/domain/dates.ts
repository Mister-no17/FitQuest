const DAY_MS = 86_400_000
export const CAMPAIGN_START = '2026-11-21'
export const CAMPAIGN_END = '2026-12-20'
const parse = (d:string) => new Date(`${d}T00:00:00+05:30`).getTime()
export const campaignDay = (localDate:string) => Math.floor((parse(localDate)-parse(CAMPAIGN_START))/DAY_MS)+1
export const isCampaignDate = (d:string) => d>=CAMPAIGN_START && d<=CAMPAIGN_END
export const addDays = (d:string, amount:number) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(parse(d)+amount*DAY_MS))
export const localDateFor = (date:Date) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
export const displayDate = (d:string) => new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',weekday:'short'}).format(new Date(`${d}T12:00:00+05:30`))
