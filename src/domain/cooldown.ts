import type { Muscle, PlannedSession } from './types'

export interface CooldownStep { id:string; title:string; seconds:number; muscles:Muscle[]; instruction:string }

const stretches:Record<Muscle,CooldownStep>={
  chest:{id:'chest-doorway',title:'Gentle doorway chest stretch',seconds:40,muscles:['chest'],instruction:'Place one forearm lightly on a doorway, turn away until you feel a mild chest stretch, then switch sides. Do not force the shoulder.'},
  shoulders:{id:'shoulder-cross-body',title:'Cross-body shoulder stretch',seconds:40,muscles:['shoulders'],instruction:'Bring one arm across your chest and support it above the elbow. Keep the shoulder relaxed, then switch sides.'},
  triceps:{id:'triceps-overhead',title:'Overhead triceps stretch',seconds:40,muscles:['triceps'],instruction:'Raise one arm, bend the elbow and lightly guide it with the other hand. Keep ribs relaxed, then switch sides.'},
  back:{id:'bench-lat',title:'Supported bench lat stretch',seconds:30,muscles:['back'],instruction:'Rest your hands on the bench, step back and gently send your hips away while keeping your spine comfortable.'},
  biceps:{id:'biceps-open',title:'Gentle arm-opening stretch',seconds:30,muscles:['biceps'],instruction:'Stand tall, reach both arms slightly behind you with palms open and stop at a mild stretch across the front of the arms.'},
  core:{id:'standing-side-reach',title:'Standing side reach',seconds:40,muscles:['core'],instruction:'Reach one arm overhead and lean gently to the opposite side without twisting, then switch sides.'},
  legs:{id:'quad-hamstring',title:'Supported quad and hamstring reset',seconds:60,muscles:['legs'],instruction:'Hold the bench for balance. Gently stretch each front thigh, then place each heel on a low step and hinge slightly for the hamstrings.'},
  calves:{id:'wall-calf',title:'Wall calf stretch',seconds:40,muscles:['calves'],instruction:'Step one foot back, keep the heel down and lean gently toward a wall or rack. Switch sides.'},
}

export function cooldownForSession(session:PlannedSession):CooldownStep[]{
  const gradual:CooldownStep={id:'gradual-easy-pace',title:'Gradually lower your pace',seconds:300,muscles:[],instruction:session.kind==='cardio'?'Continue on the same machine at a very easy pace until breathing settles.':'Walk slowly on the treadmill or pedal very easily. You should be able to speak comfortably.'}
  const selected=[...new Set(session.muscles)].slice(0,5).map(m=>stretches[m])
  const breathing:CooldownStep={id:'relaxed-breathing',title:'Relaxed breathing',seconds:60,muscles:[],instruction:'Stand or sit comfortably. Let your shoulders drop and take slow, unforced breaths. Stop and seek help for chest pain, faintness or unusual breathlessness.'}
  return [gradual,...selected,breathing]
}
