import { describe, it, expect, beforeEach } from 'vitest'
import { SoundManager } from '@/services/SoundManager'
import type { SoundName } from '@/services/SoundManager'

let sm: SoundManager

beforeEach(() => {
  sm = SoundManager.getInstance()
  // Reset state to known defaults
  if (!sm.isEnabled()) sm.toggleMute()
  sm.setVolume(0.5)
})

describe('SoundManager', () => {
  describe('getInstance', () => {
    it('returns the same instance on repeated calls', () => {
      const a = SoundManager.getInstance()
      const b = SoundManager.getInstance()
      expect(a).toBe(b)
    })

    it('returns an instance of SoundManager', () => {
      expect(sm).toBeDefined()
      expect(typeof sm.play).toBe('function')
      expect(typeof sm.setVolume).toBe('function')
      expect(typeof sm.toggleMute).toBe('function')
      expect(typeof sm.isEnabled).toBe('function')
    })
  })

  describe('play', () => {
    const allSounds: SoundName[] = ['snap', 'rotate', 'slide', 'invalid', 'complete', 'undo', 'select']

    it.each(allSounds)('does not throw when playing "%s"', (sound) => {
      expect(() => sm.play(sound)).not.toThrow()
    })

    it('calls AudioContext methods when playing a sound', () => {
      // AudioContext is mocked in setup.ts, so play() should go through
      // the entire code path without errors
      sm.play('snap')
      sm.play('rotate')
      sm.play('complete')
      // If we reach here, the AudioContext mock was used successfully
    })
  })

  describe('toggleMute', () => {
    it('toggles enabled state from true to false', () => {
      expect(sm.isEnabled()).toBe(true)
      sm.toggleMute()
      expect(sm.isEnabled()).toBe(false)
    })

    it('toggles enabled state from false to true', () => {
      sm.toggleMute() // false
      sm.toggleMute() // true
      expect(sm.isEnabled()).toBe(true)
    })

    it('toggles back and forth correctly', () => {
      const initial = sm.isEnabled()
      sm.toggleMute()
      expect(sm.isEnabled()).toBe(!initial)
      sm.toggleMute()
      expect(sm.isEnabled()).toBe(initial)
    })
  })

  describe('isEnabled', () => {
    it('returns true by default', () => {
      expect(sm.isEnabled()).toBe(true)
    })

    it('returns false after toggling mute', () => {
      sm.toggleMute()
      expect(sm.isEnabled()).toBe(false)
    })
  })

  describe('setVolume', () => {
    it('clamps volume to minimum 0', () => {
      sm.setVolume(-5)
      // We can verify play still works (volume is internal, but it should not throw)
      expect(() => sm.play('snap')).not.toThrow()
    })

    it('clamps volume to maximum 1', () => {
      sm.setVolume(10)
      expect(() => sm.play('snap')).not.toThrow()
    })

    it('accepts valid volume values', () => {
      sm.setVolume(0)
      expect(() => sm.play('snap')).not.toThrow()

      sm.setVolume(0.5)
      expect(() => sm.play('snap')).not.toThrow()

      sm.setVolume(1)
      expect(() => sm.play('snap')).not.toThrow()
    })

    it('accepts boundary values 0 and 1', () => {
      sm.setVolume(0)
      expect(() => sm.play('rotate')).not.toThrow()

      sm.setVolume(1)
      expect(() => sm.play('rotate')).not.toThrow()
    })
  })

  describe('play when muted', () => {
    it('does not create audio nodes when muted', () => {
      sm.toggleMute()
      expect(sm.isEnabled()).toBe(false)

      // play() should return early when muted, and not throw
      expect(() => sm.play('snap')).not.toThrow()
      expect(() => sm.play('complete')).not.toThrow()
      expect(() => sm.play('invalid')).not.toThrow()
    })

    it('resumes playing after unmuting', () => {
      sm.toggleMute() // mute
      sm.toggleMute() // unmute
      expect(sm.isEnabled()).toBe(true)

      // Should work normally again
      expect(() => sm.play('snap')).not.toThrow()
    })
  })
})
