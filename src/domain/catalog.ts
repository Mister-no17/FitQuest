import { addDays, CAMPAIGN_START } from './dates'
import type { Exercise, PlannedSession, Prescription } from './types'

export const exercises: Exercise[] = [
  ['flat-db-press','Flat dumbbell press','Dumbbells',['chest'],['triceps','shoulders'],12,false,'Control the descent; stop if you feel pain.',90],
  ['incline-db-press','Incline dumbbell press','Dumbbells',['chest'],['triceps','shoulders'],12,false,'Keep shoulder blades gently set.',90],
  ['pec-deck','Pec deck','Machine',['chest'],[],12,false,'Use a comfortable range; do not force the stretch.',75],
  ['db-shoulder-press','Dumbbell shoulder press','Dumbbells',['shoulders'],['triceps'],10,false,'Keep ribs down and avoid grinding reps.',90],
  ['lateral-raise','Lateral raise','Dumbbells',['shoulders'],[],15,false,'Lift with control; lighter is fine.',60],
  ['rope-pushdown','Rope pushdown','Cable',['triceps'],[],12,false,'Keep elbows still.',60],
  ['lat-pulldown','Lat pulldown','Cable',['back'],['biceps'],12,false,'Pull elbows toward your sides.',90],
  ['cable-row','Cable row','Cable',['back'],['biceps'],12,false,'Pause without leaning back.',90],
  ['face-pull','Face pull','Cable',['shoulders','back'],[],15,false,'Pull toward eye level with control.',60],
  ['db-curl','Dumbbell curl','Dumbbells',['biceps'],[],12,false,'Avoid swinging.',60],
  ['hammer-curl','Hammer curl','Dumbbells',['biceps'],[],12,false,'Keep wrists neutral.',60],
  ['reverse-crunch','Reverse crunch','Bodyweight',['core'],[],12,false,'Curl the pelvis; avoid momentum.',60],
  ['plank','Plank','Bodyweight',['core'],[],30,true,'Breathe and keep a comfortable neutral spine.',60],
  ['goblet-squat','Goblet squat','Dumbbell',['legs'],['core'],12,false,'Choose a pain-free depth.',90],
  ['leg-press','Leg press','Machine',['legs'],[],12,false,'Control depth and avoid locking knees.',90],
  ['romanian-deadlift','Romanian deadlift','Dumbbells',['legs'],['back'],10,false,'Hinge with a long spine; stop before form changes.',90],
  ['leg-curl','Leg curl','Machine',['legs'],[],12,false,'Use a smooth tempo.',75],
  ['calf-raise','Calf raise','Machine',['calves'],[],15,false,'Pause at the top and bottom.',60],
  ['cable-crunch','Cable crunch','Cable',['core'],[],12,false,'Move through the trunk, not the hips.',60],
  ['machine-chest-press','Machine chest press','Machine',['chest'],['triceps'],12,false,'Set the seat for a comfortable shoulder position.',90],
  ['reverse-pec-deck','Reverse pec deck','Machine',['shoulders','back'],[],15,false,'Keep the motion controlled.',60],
  ['dead-bug','Dead bug','Bodyweight',['core'],[],10,false,'Keep the lower back comfortably supported.',45],
  ['side-plank','Side plank','Bodyweight',['core'],[],30,true,'Use knees down if needed.',60],
].map(([id,name,equipment,primary,secondary,targetReps,timed,cue,restSec]) => ({id,name,equipment,primary,secondary,targetReps,timed,cue,restSec} as Exercise))

const anchors=new Set(['incline-db-press','db-shoulder-press','lat-pulldown','cable-row','goblet-squat','romanian-deadlift'])
const make = (day:number, date:string, title:string, kind:PlannedSession['kind'], ids:string[], durationMin:number, cardio:string, muscles:PlannedSession['muscles']):PlannedSession => ({
  id:`seed-${day}`, localDate:date, title, kind, muscles, durationMin, cardio, state:kind==='rest'?'scheduled_rest':kind==='recovery'?'active_recovery':'planned', sourceSeedDay:day,
  prescriptions:ids.map(id=>{const e=exercises.find(x=>x.id===id)!,role=anchors.has(id)?'anchor':'rotation';return {exerciseId:id,sets:2,targetReps:e.targetReps,loadKg:null,loadBasis:e.equipment==='Bodyweight'?'bodyweight':null,restSec:e.restSec,role,selectionReason:role==='anchor'?'Anchor movement retained for comparable progression':'Rotating movement selected for balanced variation'} as Prescription}),
  rationale: day===1?['Returning after a 3–4 month break','Start with two comfortable working sets and leave 2–3 reps in reserve']:day<=7?['Initial balanced microcycle; future dates may adapt from actual logs']:['Hybrid rotation: anchor movements preserve comparable progress while accessories vary','Selection remains subject to recovery, pain, recent volume and available time']
})

export const seedSessions: PlannedSession[] = [
  make(1,'2026-11-21','The Comeback','strength',['flat-db-press','incline-db-press','pec-deck','db-shoulder-press','lateral-raise','rope-pushdown'],60,'15–20 min easy incline walk',['chest','shoulders','triceps']),
  make(2,'2026-11-22','Back, biceps & core','strength',['lat-pulldown','cable-row','face-pull','db-curl','hammer-curl','reverse-crunch','plank'],60,'About 20 min easy',['back','biceps','core']),
  make(3,'2026-11-23','Active recovery','recovery',[],40,'35–45 min easy/moderate if tolerated',[]),
  make(4,'2026-11-24','Legs & core','strength',['goblet-squat','leg-press','romanian-deadlift','leg-curl','calf-raise','cable-crunch','plank'],60,'15–20 min easy',['legs','calves','core']),
  make(5,'2026-11-25','Upper body','strength',['incline-db-press','machine-chest-press','lat-pulldown','cable-row','lateral-raise','reverse-pec-deck'],60,'About 20 min easy',['chest','back','shoulders']),
  make(6,'2026-11-26','Cardio & core','cardio',['reverse-crunch','dead-bug','side-plank'],45,'Up to 35–45 min if tolerated',['core']),
  make(7,'2026-11-27','Rest & reset','rest',[],0,'Optional gentle walk',[]),
]

type DayTemplate=[title:string,kind:PlannedSession['kind'],ids:string[],duration:number,cardio:string,muscles:PlannedSession['muscles']]
const generatedWeeks:DayTemplate[][]=[
  [
    ['Push · variation A','strength',['incline-db-press','machine-chest-press','pec-deck','db-shoulder-press','lateral-raise','rope-pushdown'],60,'15–20 min easy incline walk',['chest','shoulders','triceps']],
    ['Pull · variation A','strength',['lat-pulldown','cable-row','reverse-pec-deck','hammer-curl','reverse-crunch','plank'],60,'About 20 min easy',['back','biceps','core']],
    ['Active recovery','recovery',[],40,'35–45 min easy/moderate if tolerated',[]],
    ['Legs · variation A','strength',['goblet-squat','romanian-deadlift','leg-press','leg-curl','calf-raise','dead-bug','side-plank'],60,'15–20 min easy',['legs','calves','core']],
    ['Upper · variation A','strength',['incline-db-press','machine-chest-press','lat-pulldown','cable-row','lateral-raise','face-pull'],60,'About 20 min easy',['chest','back','shoulders']],
    ['Cardio & core','cardio',['reverse-crunch','dead-bug','side-plank'],45,'Up to 35–45 min if tolerated',['core']],
    ['Rest & reset','rest',[],0,'Optional gentle walk',[]],
  ],
  [
    ['Push · variation B','strength',['flat-db-press','incline-db-press','pec-deck','db-shoulder-press','lateral-raise','rope-pushdown'],60,'15–20 min easy incline walk',['chest','shoulders','triceps']],
    ['Pull · variation B','strength',['lat-pulldown','cable-row','face-pull','db-curl','cable-crunch','plank'],60,'About 20 min easy',['back','biceps','core']],
    ['Active recovery','recovery',[],40,'35–45 min easy/moderate if tolerated',[]],
    ['Legs · variation B','strength',['goblet-squat','romanian-deadlift','leg-press','leg-curl','calf-raise','cable-crunch','plank'],60,'15–20 min easy',['legs','calves','core']],
    ['Upper · variation B','strength',['incline-db-press','machine-chest-press','lat-pulldown','cable-row','reverse-pec-deck','db-curl'],60,'About 20 min easy',['chest','back','shoulders','biceps']],
    ['Cardio & core','cardio',['reverse-crunch','dead-bug','side-plank'],45,'Up to 35–45 min if tolerated',['core']],
    ['Rest & reset','rest',[],0,'Optional gentle walk',[]],
  ],
  [
    ['Push · variation C','strength',['incline-db-press','machine-chest-press','pec-deck','db-shoulder-press','lateral-raise','rope-pushdown'],60,'15–20 min easy incline walk',['chest','shoulders','triceps']],
    ['Pull · variation C','strength',['lat-pulldown','cable-row','reverse-pec-deck','hammer-curl','reverse-crunch','side-plank'],60,'About 20 min easy',['back','biceps','core']],
    ['Active recovery','recovery',[],40,'35–45 min easy/moderate if tolerated',[]],
    ['Legs · variation C','strength',['goblet-squat','romanian-deadlift','leg-press','leg-curl','calf-raise','dead-bug','plank'],60,'15–20 min easy',['legs','calves','core']],
    ['Upper · variation C','strength',['flat-db-press','incline-db-press','lat-pulldown','cable-row','face-pull','lateral-raise'],60,'About 20 min easy',['chest','back','shoulders']],
    ['Cardio & core','cardio',['reverse-crunch','dead-bug','side-plank'],45,'Up to 35–45 min if tolerated',['core']],
    ['Rest & reset','rest',[],0,'Optional gentle walk',[]],
  ],
  [
    ['Push · consolidation','strength',['incline-db-press','machine-chest-press','pec-deck','db-shoulder-press','lateral-raise','rope-pushdown'],60,'15–20 min easy incline walk',['chest','shoulders','triceps']],
    ['Pull · consolidation','strength',['lat-pulldown','cable-row','face-pull','db-curl','hammer-curl','plank'],60,'About 20 min easy',['back','biceps','core']],
  ],
]

export const campaignSessions:PlannedSession[]=[...seedSessions]
generatedWeeks.flat().forEach((template,index)=>{const day=index+8;if(day>30)return;const [title,kind,ids,duration,cardio,muscles]=template;campaignSessions.push(make(day,addDays(CAMPAIGN_START,day-1),title,kind,ids,duration,cardio,muscles))})
export function completeCampaignSessions(existing:PlannedSession[]){const byDate=new Map(existing.map(s=>[s.localDate,s]));return campaignSessions.map(template=>{const current=byDate.get(template.localDate);return current?{...current,prescriptions:current.prescriptions.map(p=>({...p,role:p.role??(anchors.has(p.exerciseId)?'anchor':'rotation'),selectionReason:p.selectionReason??(anchors.has(p.exerciseId)?'Anchor movement retained for comparable progression':'Rotating movement selected for balanced variation')}))}:{...template,prescriptions:template.prescriptions.map(p=>({...p})),rationale:[...template.rationale],muscles:[...template.muscles]}})}

export const substitutionPools:Record<string,string[]>={
  'flat-db-press':['machine-chest-press','incline-db-press','pec-deck'],'incline-db-press':['machine-chest-press','flat-db-press','pec-deck'],'machine-chest-press':['flat-db-press','incline-db-press','pec-deck'],'pec-deck':['machine-chest-press','incline-db-press'],
  'lat-pulldown':['cable-row'],'cable-row':['lat-pulldown'],'face-pull':['reverse-pec-deck'],'reverse-pec-deck':['face-pull'],'db-curl':['hammer-curl'],'hammer-curl':['db-curl'],
  'goblet-squat':['leg-press'],'leg-press':['goblet-squat'],'romanian-deadlift':['leg-curl'],'leg-curl':['romanian-deadlift'],'reverse-crunch':['dead-bug','cable-crunch','plank'],'cable-crunch':['dead-bug','reverse-crunch','plank'],'plank':['side-plank','dead-bug'],'side-plank':['plank','dead-bug'],'dead-bug':['plank','side-plank']
}

export const exerciseById = Object.fromEntries(exercises.map(e=>[e.id,e]))
