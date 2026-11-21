import { useState } from 'react'
import { ExternalLink, Play, Video } from 'lucide-react'
import type { Exercise } from '../domain/types'

interface Guide { mediaId:string; mediaName:string; videoId:string; videoTitle:string; channel:string }
const guides:Record<string,Guide>={
  'flat-db-press':{mediaId:'SpYC0Kp',mediaName:'Dumbbell bench press',videoId:'M0tN99QgPyU',videoTitle:'Flat dumbbell bench press · 30-second form',channel:'All Strength Training'},
  'incline-db-press':{mediaId:'ns0SIbU',mediaName:'Dumbbell incline bench press',videoId:'OC7Qs_SAO2E',videoTitle:'How to do the incline dumbbell press correctly',channel:'Jack Hanrahan Fitness'},
  'pec-deck':{mediaId:'v3xmPAR',mediaName:'Lever seated fly',videoId:'1wn0uToAIXc',videoTitle:'How to set up the pec deck fly',channel:'TylerPath'},
  'db-shoulder-press':{mediaId:'znQUdHY',mediaName:'Dumbbell seated shoulder press',videoId:'rO_iEImwHyo',videoTitle:'Seated dumbbell shoulder press · 2-minute tutorial',channel:'Max Euceda'},
  'lateral-raise':{mediaId:'DsgkuIt',mediaName:'Dumbbell lateral raise',videoId:'PzsMitRdI_8',videoTitle:'Dumbbell lateral raise · 2-minute tutorial',channel:'Max Euceda'},
  'rope-pushdown':{mediaId:'dU605di',mediaName:'Cable pushdown with rope',videoId:'MBGCI-jKo00',videoTitle:'Rope tricep pushdown tutorial',channel:'Coach Zid'},
  'lat-pulldown':{mediaId:'LEprlgG',mediaName:'Cable lat pulldown',videoId:'43hWj8mfYGY',videoTitle:'Lat pulldown · 2-minute tutorial',channel:'Max Euceda'},
  'cable-row':{mediaId:'fUBheHs',mediaName:'Cable seated row',videoId:'vwHG9Jfu4sw',videoTitle:'Seated cable row · 2-minute tutorial',channel:'Max Euceda'},
  'face-pull':{mediaId:'wqNPGCg',mediaName:'Cable rear-delt row with rope',videoId:'0nACaUWdS84',videoTitle:'Face pull setup and movement',channel:'Luiz Salles'},
  'db-curl':{mediaId:'NbVPDMW',mediaName:'Dumbbell biceps curl',videoId:'sAq_ocpRh_I',videoTitle:'How to perform a dumbbell curl',channel:'ScottHermanFitness'},
  'hammer-curl':{mediaId:'slDvUAU',mediaName:'Dumbbell hammer curl',videoId:'dT8wHgbSzdE',videoTitle:'Hammer curl proper form and technique',channel:'Brendan Wong'},
  'reverse-crunch':{mediaId:'nCU1Ekp',mediaName:'Reverse crunch',videoId:'yH-oSzE5_g0',videoTitle:'How to do a reverse crunch the right way',channel:'Well+Good'},
  'plank':{mediaId:'VBAWRPG',mediaName:'Front plank',videoId:'1gHNGnE4gOU',videoTitle:'Plank proper form',channel:'WeShape'},
  'goblet-squat':{mediaId:'yn8yg1r',mediaName:'Dumbbell goblet squat',videoId:'JO7D6GJ98wY',videoTitle:'How to do a goblet squat correctly',channel:'Jack Hanrahan Fitness'},
  'leg-press':{mediaId:'10Z2DXU',mediaName:'45-degree leg press',videoId:'WgDRiE1cSAo',videoTitle:'Leg press proper form and technique',channel:'Brendan Wong'},
  'romanian-deadlift':{mediaId:'rR0LJzx',mediaName:'Dumbbell Romanian deadlift',videoId:'QFbZevA7dps',videoTitle:'Dumbbell Romanian deadlift proper form',channel:'NASM'},
  'leg-curl':{mediaId:'17lJ1kr',mediaName:'Lever lying leg curl',videoId:'lUH80pneL5w',videoTitle:'Lying leg curl proper form and technique',channel:'NASM'},
  'calf-raise':{mediaId:'ykUOVze',mediaName:'Lever standing calf raise',videoId:'bZFsPpMY7n8',videoTitle:'Standing calf raise machine setup and form',channel:'Muscle Layman'},
  'cable-crunch':{mediaId:'WW95auq',mediaName:'Cable kneeling crunch',videoId:'CDO29I7PCoc',videoTitle:'Kneeling cable crunch tutorial',channel:'Davis Diley'},
  'machine-chest-press':{mediaId:'T0yTjgW',mediaName:'Lever chest press',videoId:'lPZa9xmiS3I',videoTitle:'Machine chest press setup and technique',channel:'GauravIronX'},
  'reverse-pec-deck':{mediaId:'myfUsKf',mediaName:'Lever seated reverse fly',videoId:'LzsSQzHFuLU',videoTitle:'Reverse pec deck setup and form',channel:'Hypertrophy Coach'},
  'dead-bug':{mediaId:'iny3m5y',mediaName:'Dead bug',videoId:'-gRN_JyVTLY',videoTitle:'Dead bug form and regressions',channel:'Jack Hanrahan Fitness'},
  'side-plank':{mediaId:'5VXmnV5',mediaName:'Side plank',videoId:'iNbH7_edNI8',videoTitle:'Side plank proper form and technique',channel:'Runna'},
  'barbell-bench-press':{mediaId:'EIeI8Vf',mediaName:'Barbell bench press',videoId:'CayG6UYqL8g',videoTitle:'Barbell bench press proper form',channel:'NASM'},
  'db-fly':{mediaId:'yz9nUhF',mediaName:'Dumbbell fly',videoId:'eozdVDA78K0',videoTitle:'Dumbbell fly exercise tutorial',channel:'Jeff Nippard'},
  'barbell-triceps-extension':{mediaId:'h8LFzo9',mediaName:'Lying barbell triceps extension',videoId:'d_KZxkY_0cM',videoTitle:'Lying triceps extension form',channel:'ATHLEAN-X'},
  'one-arm-db-row':{mediaId:'C0MA9bC',mediaName:'One-arm dumbbell row',videoId:'gfUg6qWohTk',videoTitle:'One-arm dumbbell row form',channel:'ATHLEAN-X'},
  'barbell-bent-row':{mediaId:'eZyBC3j',mediaName:'Barbell bent-over row',videoId:'bm0_q9bR_HA',videoTitle:'Barbell bent-over row proper form',channel:'NASM'},
  'db-rear-delt-raise':{mediaId:'mu5Guxt',mediaName:'Dumbbell rear-delt raise',videoId:'ttvfGg9d76c',videoTitle:'Bent-over dumbbell reverse fly',channel:'ScottHermanFitness'},
  'ez-bar-curl':{mediaId:'6TG6x2w',mediaName:'EZ-bar curl',videoId:'zG2xJ0Q5QtI',videoTitle:'EZ-bar curl proper form',channel:'Bodybuilding.com'},
  'barbell-back-squat':{mediaId:'qXTaZnJ',mediaName:'Barbell back squat',videoId:'SW_C1A-rejs',videoTitle:'How to squat properly',channel:'Squat University'},
  'db-step-up':{mediaId:'aXtJhlg',mediaName:'Dumbbell step-up',videoId:'9ZknEYboBOQ',videoTitle:'Dumbbell step-up proper form',channel:'NASM'},
  'barbell-glute-bridge':{mediaId:'qKBpF7I',mediaName:'Barbell glute bridge',videoId:'wPM8icPu6H8',videoTitle:'Barbell glute bridge tutorial',channel:'Bret Contreras'},
  'db-standing-calf-raise':{mediaId:'dPmaUaU',mediaName:'Dumbbell standing calf raise',videoId:'wxwY7GXxL4k',videoTitle:'Standing calf raise proper form',channel:'NASM'},
  'captains-chair-leg-raise':{mediaId:'weoDEpH',mediaName:'Captain’s chair knee raise',videoId:'Pr1ieGZ5atk',videoTitle:'Captain’s chair knee raise tutorial',channel:'LivestrongWoman'},
}

export default function ExerciseGuide({exercise}:{exercise:Exercise}){
  const [showVideo,setShowVideo]=useState(false),guide=guides[exercise.id]
  if(!guide)return null
  return <section className="exercise-guide real-guide">
    <figure className="exercise-media"><img src={`https://static.exercisedb.dev/media/${guide.mediaId}.gif`} alt={`${guide.mediaName} exercise demonstration`} loading="eager"/><figcaption>Real movement demonstration · loops automatically</figcaption></figure>
    <div className="guide-copy"><p className="eyebrow">FORM DEMONSTRATION</p><h3>{exercise.name}</h3><p>{exercise.cue}</p><div className="guide-actions"><button className="primary" onClick={()=>setShowVideo(!showVideo)}><Play/>{showVideo?'Hide YouTube guide':'Watch YouTube guide'}</button></div></div>
    {showVideo&&<div className="video-wrap"><iframe src={`https://www.youtube-nocookie.com/embed/${guide.videoId}?rel=0`} title={guide.videoTitle} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/><div><b>{guide.videoTitle}</b><span>YouTube · {guide.channel} · optional</span><a href={`https://www.youtube.com/watch?v=${guide.videoId}`} target="_blank" rel="noreferrer">Open on YouTube <ExternalLink/></a></div></div>}
    <p className="media-credit">Looping demonstration: <a href="https://oss.exercisedb.dev/docs" target="_blank" rel="noreferrer">ExerciseDB OSS</a> · selected YouTube tutorial available for this exercise · internet required.</p>
  </section>
}
