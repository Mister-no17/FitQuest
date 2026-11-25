import { useState } from 'react'
import { ExternalLink, Play, Video } from 'lucide-react'
import type { Exercise } from '../domain/types'

interface Guide { mediaId?:string; mediaUrl?:string; mediaName:string; mediaCredit?:string; mediaCreditUrl?:string; videoId:string; videoTitle:string; channel:string }
export const guides:Record<string,Guide>={
  'flat-db-press':{mediaId:'SpYC0Kp',mediaName:'Dumbbell bench press',videoId:'M0tN99QgPyU',videoTitle:'Flat dumbbell bench press · 30-second form',channel:'All Strength Training'},
  'incline-db-press':{mediaId:'ns0SIbU',mediaName:'Dumbbell incline bench press',videoId:'OC7Qs_SAO2E',videoTitle:'How to do the incline dumbbell press correctly',channel:'Jack Hanrahan Fitness'},
  'pec-deck':{mediaId:'v3xmPAR',mediaName:'Lever seated fly',videoId:'1wn0uToAIXc',videoTitle:'How to set up the pec deck fly',channel:'TylerPath'},
  'db-shoulder-press':{mediaId:'znQUdHY',mediaName:'Dumbbell seated shoulder press',videoId:'rO_iEImwHyo',videoTitle:'Seated dumbbell shoulder press · 2-minute tutorial',channel:'Max Euceda'},
  'lateral-raise':{mediaId:'DsgkuIt',mediaName:'Dumbbell lateral raise',videoId:'PzsMitRdI_8',videoTitle:'Dumbbell lateral raise · 2-minute tutorial',channel:'Max Euceda'},
  'rope-pushdown':{mediaId:'dU605di',mediaName:'Cable pushdown with rope',videoId:'MBGCI-jKo00',videoTitle:'Rope tricep pushdown tutorial',channel:'Coach Zid'},
  'lat-pulldown':{mediaId:'LEprlgG',mediaName:'Cable lat pulldown',videoId:'43hWj8mfYGY',videoTitle:'Lat pulldown · 2-minute tutorial',channel:'Max Euceda'},
  'cable-row':{mediaId:'fUBheHs',mediaName:'Cable seated row',videoId:'vwHG9Jfu4sw',videoTitle:'Seated cable row · 2-minute tutorial',channel:'Max Euceda'},
  'face-pull':{mediaId:'wqNPGCg',mediaName:'Cable rear-delt row with rope',videoId:'0nACaUWdS84',videoTitle:'Face pull setup and movement',channel:'Luiz Salles'},
  'db-curl':{mediaId:'NbVPDMW',mediaName:'Dumbbell biceps curl',videoId:'ykJmrZ5v0Oo',videoTitle:'How to do a dumbbell biceps curl',channel:'Howcast'},
  'hammer-curl':{mediaId:'slDvUAU',mediaName:'Dumbbell hammer curl',videoId:'dT8wHgbSzdE',videoTitle:'Hammer curl proper form and technique',channel:'Brendan Wong'},
  'reverse-crunch':{mediaId:'nCU1Ekp',mediaName:'Reverse crunch',videoId:'yH-oSzE5_g0',videoTitle:'How to do a reverse crunch the right way',channel:'Well+Good'},
  'plank':{mediaUrl:'https://media.giphy.com/media/3PywN1RF3eLyVTgzTw/200w.gif',mediaName:'High plank',mediaCredit:'8fit on GIPHY',mediaCreditUrl:'https://giphy.com/gifs/8fit-core-ab-plank-3PywN1RF3eLyVTgzTw',videoId:'ZYmH7vpuPsE',videoTitle:'High plank form',channel:'MELOS'},
  'goblet-squat':{mediaId:'yn8yg1r',mediaName:'Dumbbell goblet squat',videoId:'JO7D6GJ98wY',videoTitle:'How to do a goblet squat correctly',channel:'Jack Hanrahan Fitness'},
  'leg-press':{mediaId:'10Z2DXU',mediaName:'45-degree leg press',videoId:'WgDRiE1cSAo',videoTitle:'Leg press proper form and technique',channel:'Brendan Wong'},
  'romanian-deadlift':{mediaId:'rR0LJzx',mediaName:'Dumbbell Romanian deadlift',videoId:'QFbZevA7dps',videoTitle:'Dumbbell Romanian deadlift proper form',channel:'NASM'},
  'leg-curl':{mediaId:'17lJ1kr',mediaName:'Lever lying leg curl',videoId:'lUH80pneL5w',videoTitle:'Lying leg curl proper form and technique',channel:'NASM'},
  'calf-raise':{mediaId:'ykUOVze',mediaName:'Lever standing calf raise',videoId:'bZFsPpMY7n8',videoTitle:'Standing calf raise machine setup and form',channel:'Muscle Layman'},
  'cable-crunch':{mediaId:'WW95auq',mediaName:'Cable kneeling crunch',videoId:'CDO29I7PCoc',videoTitle:'Kneeling cable crunch tutorial',channel:'Davis Diley'},
  'machine-chest-press':{mediaId:'T0yTjgW',mediaName:'Lever chest press',videoId:'lPZa9xmiS3I',videoTitle:'Machine chest press setup and technique',channel:'GauravIronX'},
  'reverse-pec-deck':{mediaId:'myfUsKf',mediaName:'Lever seated reverse fly',videoId:'LzsSQzHFuLU',videoTitle:'Reverse pec deck setup and form',channel:'Hypertrophy Coach'},
  'dead-bug':{mediaId:'iny3m5y',mediaName:'Dead bug',videoId:'-gRN_JyVTLY',videoTitle:'Dead bug form and regressions',channel:'Jack Hanrahan Fitness'},
  'side-plank':{mediaUrl:'https://media.self.com/photos/611d68e80fba8918ef07de12/master/w_1024%2Cc_limit/SE_SEN_07_039_Core%2520Day%25201%2520Foundations_GIF-07%2520Side%2520Planks%2520%28right%2520side%29-min.gif',mediaName:'Forearm side plank',mediaCredit:'SELF',mediaCreditUrl:'https://www.self.com/gallery/core-activation-workout',videoId:'iNbH7_edNI8',videoTitle:'Side plank proper form and technique',channel:'Runna'},
  'barbell-bench-press':{mediaId:'EIeI8Vf',mediaName:'Barbell bench press',videoId:'CayG6UYqL8g',videoTitle:'Barbell bench press proper form',channel:'NASM'},
  'db-fly':{mediaId:'yz9nUhF',mediaName:'Dumbbell fly',videoId:'eozdVDA78K0',videoTitle:'Dumbbell fly on a flat bench',channel:'ScottHermanFitness'},
  'barbell-triceps-extension':{mediaId:'h8LFzo9',mediaName:'Lying barbell triceps extension',videoId:'d_KZxkY_0cM',videoTitle:'Skull crushers',channel:'ScottHermanFitness'},
  'one-arm-db-row':{mediaUrl:'https://i0.wp.com/www.strengthlog.com/wp-content/uploads/2020/03/Dumbbell-Row.gif?resize=600%2C600&ssl=1',mediaName:'Bench-supported one-arm dumbbell row',mediaCredit:'StrengthLog',mediaCreditUrl:'https://www.strengthlog.com/dumbbell-exercises-for-beginners/',videoId:'dFzUjzfih7k',videoTitle:'How to do the single-arm dumbbell row',channel:'Max Euceda'},
  'barbell-bent-row':{mediaId:'eZyBC3j',mediaName:'Barbell bent-over row',videoId:'bm0_q9bR_HA',videoTitle:'Barbell bent-over row proper form',channel:'NASM'},
  'db-rear-delt-raise':{mediaId:'mu5Guxt',mediaName:'Dumbbell rear-delt raise',videoId:'ttvfGg9d76c',videoTitle:'Bent-over dumbbell reverse fly',channel:'ScottHermanFitness'},
  'ez-bar-curl':{mediaId:'6TG6x2w',mediaName:'EZ-bar curl',videoId:'zG2xJ0Q5QtI',videoTitle:'Inside-grip EZ-bar curl',channel:'ScottHermanFitness'},
  'barbell-back-squat':{mediaId:'qXTaZnJ',mediaName:'Barbell back squat',videoId:'SW_C1A-rejs',videoTitle:'Deep barbell back squat',channel:'ScottHermanFitness'},
  'db-step-up':{mediaId:'aXtJhlg',mediaName:'Dumbbell step-up',videoId:'9ZknEYboBOQ',videoTitle:'Dumbbell step-up',channel:'Bobby Maximus'},
  'barbell-glute-bridge':{mediaId:'qKBpF7I',mediaName:'Barbell glute bridge',videoId:'QR6SFM5HU_M',videoTitle:'Barbell glute bridge',channel:'Bret Contreras Glute Guy'},
  'db-standing-calf-raise':{mediaId:'dPmaUaU',mediaName:'Dumbbell standing calf raise',videoId:'wxwY7GXxL4k',videoTitle:'Standing dumbbell calf raises',channel:'Bodybuilding.com'},
  'captains-chair-leg-raise':{mediaUrl:'https://i0.wp.com/www.strengthlog.com/wp-content/uploads/2025/10/captains-chair-knee-raises.gif?fit=800%2C800&ssl=1',mediaName:'Captain’s chair bent-knee raise',mediaCredit:'StrengthLog',mediaCreditUrl:'https://www.strengthlog.com/captains-chair-knee-raise/',videoId:'0Pd3UD1k31s',videoTitle:'Captain’s chair knee raise',channel:'Stelios Mixail - Fitness Hub'},
}

export default function ExerciseGuide({exercise}:{exercise:Exercise}){
  const [showVideo,setShowVideo]=useState(false),guide=guides[exercise.id]
  if(!guide)return null
  return <section className="exercise-guide real-guide">
    <figure className="exercise-media"><img src={guide.mediaUrl??`https://static.exercisedb.dev/media/${guide.mediaId}.gif`} alt={`${guide.mediaName} exercise demonstration`} loading="eager"/><figcaption>Real movement demonstration · loops automatically</figcaption></figure>
    <div className="guide-copy"><p className="eyebrow">FORM DEMONSTRATION</p><h3>{exercise.name}</h3><p>{exercise.cue}</p><div className="guide-actions"><button className="primary" onClick={()=>setShowVideo(!showVideo)}><Play/>{showVideo?'Hide YouTube guide':'Watch YouTube guide'}</button></div></div>
    {showVideo&&<div className="video-wrap"><iframe src={`https://www.youtube-nocookie.com/embed/${guide.videoId}?rel=0`} title={guide.videoTitle} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/><div><b>{guide.videoTitle}</b><span>YouTube · {guide.channel} · optional</span><a href={`https://www.youtube.com/watch?v=${guide.videoId}`} target="_blank" rel="noreferrer">Open on YouTube <ExternalLink/></a></div></div>}
    <p className="media-credit">Looping demonstration: <a href={guide.mediaCreditUrl??'https://oss.exercisedb.dev/docs'} target="_blank" rel="noreferrer">{guide.mediaCredit??'ExerciseDB OSS'}</a> · selected YouTube tutorial available for this exercise · internet required.</p>
  </section>
}
