import { addDays, CAMPAIGN_START } from './dates'
import type { Exercise, PlannedSession, Prescription, Workout } from './types'

const db=[2.5,5,7.5,10,12.5,15,20]
const bar=(base:number)=>Array.from({length:18},(_,i)=>base+i*5)
const available=(e:Exercise):Exercise=>({...e,availableInGym:true})
const e=(id:string,name:string,equipment:string,primary:Exercise['primary'],secondary:Exercise['secondary'],targetReps:number,cue:string,restSec:number,loads?:number[],basis?:Exercise['defaultLoadBasis'],timed=false)=>available({id,name,equipment,primary,secondary,targetReps,cue,restSec,availableLoadsKg:loads,defaultLoadBasis:basis,timed})

export const gymEquipmentProfile=[
  {group:'Free weights',items:['Short straight barbell · ~7.5 kg','Medium straight barbell · ~10 kg','Long straight barbell · ~15 kg','EZ curl bar · ~7.5 kg','Weight plates · 2.5, 5, 15 kg','Dumbbells · 2.5–20 kg','Indian clubs (mudgars) · up to ~5 kg']},
  {group:'Strength stations',items:['Squat / barbell rack','Bench press station','Flat workout bench','Fixed-angle incline bench','Captain’s chair / vertical knee raise']},
  {group:'Cardio',items:['Motorized treadmill','Elliptical cross trainer','2 indoor spin bikes']},
  {group:'Other',items:['2 stability balls','Aerobic step-up platforms','Weight plate storage rack','Barbell storage stand']},
] as const

const current:Exercise[]=[
  e('flat-db-press','Flat dumbbell press','Dumbbells + flat bench',['chest'],['triceps','shoulders'],12,'Control the descent; stop if you feel pain.',90,db,'each'),
  e('incline-db-press','Incline dumbbell press','Dumbbells + fixed incline bench',['chest'],['triceps','shoulders'],12,'Keep shoulder blades gently set.',90,db,'each'),
  e('barbell-bench-press','Barbell bench press','Long barbell + bench press station',['chest'],['triceps','shoulders'],10,'Use safeties or a spotter, keep feet planted, and stop before form changes.',120,bar(15),'total'),
  e('db-fly','Dumbbell fly','Dumbbells + flat bench',['chest'],['shoulders'],12,'Use a light load and a comfortable arc; do not chase a deep stretch.',75,db,'each'),
  e('db-shoulder-press','Dumbbell shoulder press','Dumbbells + fixed incline bench',['shoulders'],['triceps'],10,'Keep ribs down and avoid grinding reps.',90,db,'each'),
  e('lateral-raise','Dumbbell lateral raise','Dumbbells',['shoulders'],[],15,'Lift with control; lighter is fine.',60,db,'each'),
  e('barbell-triceps-extension','Lying barbell triceps extension','Short barbell + flat bench',['triceps'],[],12,'Start light, keep upper arms steady, and use a comfortable elbow range.',75,bar(7.5),'total'),
  e('one-arm-db-row','One-arm dumbbell row','Dumbbell + flat bench',['back'],['biceps'],12,'Brace on the bench and pull toward your hip without twisting.',90,db,'each'),
  e('barbell-bent-row','Barbell bent-over row','Medium barbell + rack',['back'],['biceps','core'],10,'Hinge and brace; row without jerking your torso.',105,bar(10),'total'),
  e('db-rear-delt-raise','Bent-over rear-delt raise','Dumbbells',['shoulders','back'],[],15,'Use a light load, keep a soft elbow, and move without swinging.',60,db,'each'),
  e('db-curl','Dumbbell curl','Dumbbells',['biceps'],[],12,'Avoid swinging.',60,db,'each'),
  e('hammer-curl','Hammer curl','Dumbbells',['biceps'],[],12,'Keep wrists neutral.',60,db,'each'),
  e('ez-bar-curl','EZ-bar curl','EZ curl bar',['biceps'],[],12,'Keep elbows near your sides and do not lean back.',75,bar(7.5),'total'),
  e('goblet-squat','Goblet squat','Dumbbell',['legs'],['core'],12,'Choose a pain-free depth.',90,db,'total'),
  e('barbell-back-squat','Barbell back squat','Long barbell + squat rack',['legs'],['core'],10,'Set rack safeties, brace, and use a depth you can control.',120,bar(15),'total'),
  e('db-step-up','Dumbbell step-up','Dumbbells + aerobic step',['legs'],['core'],10,'Use a stable step, drive through the working foot, and control the descent.',90,db,'each'),
  e('romanian-deadlift','Dumbbell Romanian deadlift','Dumbbells',['legs'],['back'],10,'Hinge with a long spine; stop before form changes.',90,db,'each'),
  e('barbell-glute-bridge','Barbell glute bridge','Barbell + flat bench',['legs'],['core'],12,'Pad the bar, keep ribs down, and finish with the glutes.',90,bar(7.5),'total'),
  e('db-standing-calf-raise','Dumbbell standing calf raise','Dumbbells + step',['calves'],[],15,'Use support for balance and pause at the top and bottom.',60,db,'each'),
  e('captains-chair-leg-raise','Captain’s chair knee raise','Captain’s chair',['core'],[],12,'Curl the pelvis without swinging; shorten the range if your back arches.',60,undefined,'bodyweight'),
  e('reverse-crunch','Reverse crunch','Bodyweight',['core'],[],12,'Curl the pelvis; avoid momentum.',60,undefined,'bodyweight'),
  e('plank','Plank','Bodyweight',['core'],[],30,'Breathe and keep a comfortable neutral spine.',60,undefined,'bodyweight',true),
  e('dead-bug','Dead bug','Bodyweight',['core'],[],10,'Keep the lower back comfortably supported.',45,undefined,'bodyweight'),
  e('side-plank','Side plank','Bodyweight',['core'],[],30,'Use knees down if needed.',60,undefined,'bodyweight',true),
]

// Historical-only entries ensure old workout logs always remain readable after migration.
const legacy:Exercise[]=[
  ['pec-deck','Pec deck','Machine',['chest'],[],12],['rope-pushdown','Rope pushdown','Cable',['triceps'],[],12],['lat-pulldown','Lat pulldown','Cable',['back'],['biceps'],12],['cable-row','Cable row','Cable',['back'],['biceps'],12],['face-pull','Face pull','Cable',['shoulders','back'],[],15],['leg-press','Leg press','Machine',['legs'],[],12],['leg-curl','Leg curl','Machine',['legs'],[],12],['calf-raise','Machine calf raise','Machine',['calves'],[],15],['cable-crunch','Cable crunch','Cable',['core'],[],12],['machine-chest-press','Machine chest press','Machine',['chest'],['triceps'],12],['reverse-pec-deck','Reverse pec deck','Machine',['shoulders','back'],[],15],
].map(([id,name,equipment,primary,secondary,targetReps])=>({id,name,equipment,primary,secondary,targetReps,cue:'Historical exercise retained for existing workout records.',restSec:75,availableInGym:false} as Exercise))
export const exercises=[...current,...legacy]

const anchors=new Set(['incline-db-press','db-shoulder-press','one-arm-db-row','barbell-bent-row','goblet-squat','romanian-deadlift'])
const make=(day:number,date:string,title:string,kind:PlannedSession['kind'],ids:string[],durationMin:number,cardio:string,muscles:PlannedSession['muscles']):PlannedSession=>({
  id:`gym-${day}`,localDate:date,title,kind,muscles,durationMin,cardio,state:kind==='rest'?'scheduled_rest':kind==='recovery'?'active_recovery':'planned',sourceSeedDay:day,
  prescriptions:ids.map(id=>{const x=exercises.find(y=>y.id===id)!,role=anchors.has(id)?'anchor':'rotation';return {exerciseId:id,sets:2,targetReps:x.targetReps,loadKg:null,loadBasis:x.defaultLoadBasis??null,restSec:x.restSec,role,selectionReason:role==='anchor'?'Anchor retained for comparable progression':'Available-equipment rotation for balanced variation'} as Prescription}),
  rationale:day===1?['Returning after a 3–4 month break','Two comfortable working sets; leave 2–3 reps in reserve']:['Uses only equipment confirmed at your gym','Anchors preserve progression while compatible accessories rotate']
})

type T=[string,PlannedSession['kind'],string[],number,string,PlannedSession['muscles']]
const base:T[]=[
 ['The Comeback','strength',['flat-db-press','incline-db-press','db-fly','db-shoulder-press','lateral-raise','barbell-triceps-extension'],60,'15–20 min easy treadmill walk',['chest','shoulders','triceps']],
 ['Back, biceps & core','strength',['one-arm-db-row','barbell-bent-row','db-rear-delt-raise','db-curl','hammer-curl','reverse-crunch','plank'],60,'15–20 min easy elliptical',['back','biceps','core']],
 ['Active recovery','recovery',[],40,'35–45 min easy treadmill, elliptical, or spin bike',[]],
 ['Legs & core','strength',['goblet-squat','db-step-up','romanian-deadlift','barbell-glute-bridge','db-standing-calf-raise','captains-chair-leg-raise','plank'],60,'10–15 min easy spin bike',['legs','calves','core']],
 ['Upper body','strength',['incline-db-press','barbell-bench-press','one-arm-db-row','barbell-bent-row','lateral-raise','db-rear-delt-raise'],60,'15–20 min easy treadmill',['chest','back','shoulders']],
 ['Cardio & core','cardio',['reverse-crunch','dead-bug','side-plank'],45,'30–40 min easy/moderate elliptical or spin bike',['core']],
 ['Rest & reset','rest',[],0,'Optional gentle treadmill walk',[]],
]
const pushA:T=['Push · variation A','strength',['incline-db-press','barbell-bench-press','db-fly','db-shoulder-press','lateral-raise','barbell-triceps-extension'],60,'15–20 min treadmill',['chest','shoulders','triceps']]
const pushB:T=['Push · variation B','strength',['flat-db-press','incline-db-press','db-fly','db-shoulder-press','lateral-raise','barbell-triceps-extension'],60,'15–20 min treadmill',['chest','shoulders','triceps']]
const pullA:T=['Pull · variation A','strength',['one-arm-db-row','barbell-bent-row','db-rear-delt-raise','hammer-curl','reverse-crunch','plank'],60,'15–20 min elliptical',['back','biceps','core']]
const pullB:T=['Pull · variation B','strength',['one-arm-db-row','barbell-bent-row','db-rear-delt-raise','ez-bar-curl','captains-chair-leg-raise','plank'],60,'15–20 min elliptical',['back','biceps','core']]
const recovery:T=['Active recovery','recovery',[],40,'35–45 min easy cardio of your choice',[]]
const legsA:T=['Legs · variation A','strength',['goblet-squat','romanian-deadlift','db-step-up','barbell-glute-bridge','db-standing-calf-raise','dead-bug','side-plank'],60,'10–15 min spin bike',['legs','calves','core']]
const legsB:T=['Legs · variation B','strength',['barbell-back-squat','romanian-deadlift','db-step-up','barbell-glute-bridge','db-standing-calf-raise','reverse-crunch','plank'],60,'10–15 min spin bike',['legs','calves','core']]
const upperA:T=['Upper · variation A','strength',['incline-db-press','flat-db-press','one-arm-db-row','barbell-bent-row','lateral-raise','db-rear-delt-raise'],60,'15–20 min treadmill',['chest','back','shoulders']]
const upperB:T=['Upper · variation B','strength',['barbell-bench-press','incline-db-press','one-arm-db-row','barbell-bent-row','db-rear-delt-raise','db-curl'],60,'15–20 min treadmill',['chest','back','shoulders','biceps']]
const cardio:T=['Cardio & core','cardio',['captains-chair-leg-raise','dead-bug','side-plank'],45,'30–40 min elliptical or spin bike',['core']]
const rest:T=['Rest & reset','rest',[],0,'Optional gentle walk',[]]
const days:T[]=[...base,pushA,pullA,recovery,legsA,upperA,cardio,rest,pushB,pullB,recovery,legsB,upperB,cardio,rest,pushA,pullA,recovery,legsB,upperA,cardio,rest,pushB,pullB]
export const campaignSessions=days.map((d,i)=>make(i+1,addDays(CAMPAIGN_START,i),...d))
export const seedSessions=campaignSessions.slice(0,7)
const clone=(s:PlannedSession):PlannedSession=>({...s,prescriptions:s.prescriptions.map(p=>({...p})),rationale:[...s.rationale],muscles:[...s.muscles]})
export function completeCampaignSessions(existing:PlannedSession[]){const byDate=new Map(existing.map(s=>[s.localDate,s]));return campaignSessions.map(t=>byDate.get(t.localDate)??clone(t))}
export function migratePlanForGymEquipment(existing:PlannedSession[],workouts:Workout[]){const old=new Map(existing.map(s=>[s.localDate,s])),ids=new Set(workouts.map(w=>w.planSessionId).filter(Boolean)),dates=new Set(workouts.map(w=>w.localDate));return campaignSessions.map(t=>{const x=old.get(t.localDate);return x&&(ids.has(x.id)||dates.has(x.localDate))?clone(x):clone(t)})}

export const substitutionPools:Record<string,string[]>={
 'flat-db-press':['incline-db-press','barbell-bench-press','db-fly'],'incline-db-press':['flat-db-press','barbell-bench-press','db-fly'],'barbell-bench-press':['flat-db-press','incline-db-press'],'db-fly':['flat-db-press','incline-db-press'],
 'one-arm-db-row':['barbell-bent-row'],'barbell-bent-row':['one-arm-db-row'],'db-rear-delt-raise':['one-arm-db-row'],'db-curl':['hammer-curl','ez-bar-curl'],'hammer-curl':['db-curl','ez-bar-curl'],'ez-bar-curl':['db-curl','hammer-curl'],
 'goblet-squat':['barbell-back-squat','db-step-up'],'barbell-back-squat':['goblet-squat','db-step-up'],'db-step-up':['goblet-squat'],'romanian-deadlift':['barbell-glute-bridge'],'barbell-glute-bridge':['romanian-deadlift'],'reverse-crunch':['dead-bug','captains-chair-leg-raise','plank'],'captains-chair-leg-raise':['reverse-crunch','dead-bug'],'plank':['side-plank','dead-bug'],'side-plank':['plank','dead-bug'],'dead-bug':['plank','side-plank']
}
export const exerciseById=Object.fromEntries(exercises.map(x=>[x.id,x]))
