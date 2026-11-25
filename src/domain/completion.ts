import type { PlannedSession, Workout, XPEvent } from './types'

export function completedSession(session: PlannedSession | undefined, workouts: Workout[], xpEvents: XPEvent[]) {
  if (!session) return false
  if (workouts.some(workout => workout.localDate === session.localDate && workout.state === 'completed')) return true
  return xpEvents.some(event => event.localDate === session.localDate && event.key.startsWith(`${session.localDate}:recovery:`))
}

export function sessionStatus(session: PlannedSession | undefined, workouts: Workout[], xpEvents: XPEvent[]) {
  if (completedSession(session, workouts, xpEvents)) return 'completed'
  return workouts.find(workout => workout.localDate === session?.localDate)?.state ?? session?.state ?? 'future'
}
