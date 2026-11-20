export type Muscle = 'chest'|'shoulders'|'triceps'|'back'|'biceps'|'core'|'legs'|'calves'
export type SessionState = 'planned'|'in_progress'|'completed'|'partial'|'unlogged'|'missed'|'skipped'|'scheduled_rest'|'active_recovery'

export interface Profile {
  id: 'owner'; ageAtStart: number; heightCm: number; seedWeightKg: number; physiology: 'male'; timezone: 'Asia/Kolkata';
  foodPreference: string; goals: string[]; waistCm: number|null; theme: 'light'|'dark'|'system'
}
export interface Campaign { id:string; startDate:string; endDate:string; policyVersion:string }
export interface Exercise {
  id:string; name:string; equipment:string; primary:Muscle[]; secondary:Muscle[]; targetReps:number; timed?:boolean; cue:string; restSec:number
}
export interface Prescription { exerciseId:string; sets:number; targetReps:number; loadKg:number|null; loadBasis:'each'|'total'|'bodyweight'|null; restSec:number; role?:'anchor'|'rotation'; selectionReason?:string }
export interface PlannedSession {
  id:string; localDate:string; title:string; kind:'strength'|'cardio'|'recovery'|'rest'; muscles:Muscle[]; durationMin:number; prescriptions:Prescription[]; cardio?:string; state:SessionState; rationale:string[]; sourceSeedDay?:number
}
export interface PlanVersion { id:string; createdAt:string; trigger:string; previousId?:string; sessions:PlannedSession[]; explanations:string[] }
export type SetKind = 'calibration'|'warmup'|'working'|'backoff'
export type SetFeedback = 'too_easy'|'good'|'hard'|'form_broke'|'pain'
export interface ActualSet { id:string; exerciseId:string; setIndex:number; reps:number|null; durationSec:number|null; loadKg:number|null; loadBasis:'each'|'total'|'bodyweight'|null; rir:number|null; completed:boolean; setKind?:SetKind; feedback?:SetFeedback; suggestedLoadKg?:number|null; skippedReason?:string; revision:number }
export interface WorkoutEnergyEstimate {
  method:'met-v1'; bodyWeightKg:number; bodyWeightSource:'measurement'|'check_in'|'profile_estimate'; confidence:'low'|'medium';
  plannedKcal:number; plannedLowKcal:number; plannedHighKcal:number; plannedMinutes:number;
  actualKcal:number; actualLowKcal:number; actualHighKcal:number; actualMinutes:number;
}
export interface Workout { id:string; planSessionId?:string; localDate:string; startedAt:string; endedAt?:string; restUntil?:string; state:'in_progress'|'completed'|'partial'; actualSets:ActualSet[]; notes:string; difficulty?:number; energyEstimate?:WorkoutEnergyEstimate }
export interface CheckIn { id:string; localDate:string; createdAt:string; sleepHours:number|null; energy:number|null; fatigue:number|null; soreness:Partial<Record<Muscle,number>>; pain:boolean; painMuscles:Muscle[]; availableMinutes:number|null; unavailableReason?:'travel'|'illness'|'schedule'|null; weightKg:number|null; notes:string }
export interface XPEvent { id:string; localDate:string; key:string; amount:number; reason:string }
export type MetricType = 'weight'|'waist'|'chest'|'shoulders'|'body_fat'
export interface MetricObservation { id:string; localDate:string; createdAt:string; type:MetricType; value:number; unit:'kg'|'cm'|'percent'; source:'manual'|'imported'; notes:string }
export interface ActivityObservation { id:string; localDate:string; createdAt:string; steps:number|null; waterMl:number|null; source:'manual'|'imported'; notes:string }
export interface Meal { id:string; localDate:string; createdAt:string; name:string; portion:string; calories:number|null; proteinG:number|null; carbsG:number|null; fatG:number|null; source:'manual_estimate'|'label'|'database'; confidence:'low'|'medium'|'high'; notes:string }
export interface AppSettings { id:'settings'; theme:'light'|'dark'|'system'; notificationsEnabled:boolean; workoutReminder:string|null; quietStart:string; quietEnd:string; units:'metric'; aiEnabled?:boolean; aiModel?:'openai/gpt-oss-20b' }

export type TrainerCategory = 'training'|'recovery'|'nutrition'|'exercise_form'|'progress'|'out_of_scope'
export type TrainerContextGroup = 'Profile'|'Body measurements'|'Check-ins'|'Workouts'|'Exercise history'|'Nutrition'|'Activity'|'Pain & recovery'|'Notes'|'Previous AI messages'
export interface TrainerContextItem { id:string; group:TrainerContextGroup; label:string; value:string|number|boolean|null|Record<string,unknown>; date?:string; source:string; recommendedFor?:TrainerCategory[] }
export interface TrainerManualAttachment { id:string; label:string; value:string; date?:string }
export interface TrainerReply { category:TrainerCategory; answer:string; confidence:'low'|'medium'|'high'; evidence:string[]; suggestedAction:string }
export interface TrainerExchange { id:string; createdAt:string; prompt:string; reply:TrainerReply; provider:'groq'; model:'openai/gpt-oss-20b'; contextReceipt:Array<{id:string;label:string;group:string;date?:string;source:string}>; manualAttachments:TrainerManualAttachment[] }
