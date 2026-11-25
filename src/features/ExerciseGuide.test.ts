import { describe, expect, it } from 'vitest'
import { exercises } from '../domain/catalog'
import { guides } from './ExerciseGuide'

describe('exercise demonstrations', () => {
  it('covers every exercise that can be planned at this gym', () => {
    for (const exercise of exercises.filter(exercise => exercise.availableInGym)) {
      const guide = guides[exercise.id]
      expect(guide, exercise.name).toBeDefined()
      expect(Boolean(guide.mediaId || guide.mediaUrl), exercise.name).toBe(true)
      expect(guide.videoId, exercise.name).toMatch(/^[\w-]{11}$/)
    }
  })
})
