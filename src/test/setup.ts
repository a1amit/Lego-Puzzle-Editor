import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// ============================================
// BROWSER API MOCKS
// ============================================

// Mock AudioContext for SoundManager
const mockOscillator = {
  type: 'sine',
  frequency: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
}

const mockGain = {
  gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
}

class MockAudioContext {
  currentTime = 0
  state = 'running'
  destination = {}
  createOscillator() { return { ...mockOscillator } }
  createGain() { return { ...mockGain } }
  resume() { return Promise.resolve() }
}

Object.defineProperty(globalThis, 'AudioContext', {
  value: MockAudioContext,
  writable: true,
})

// Mock navigator.vibrate for haptics
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(() => true),
  writable: true,
})

// Mock localStorage
const localStorageStore: Record<string, string> = {}
const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]) }),
  get length() { return Object.keys(localStorageStore).length },
  key: vi.fn((i: number) => Object.keys(localStorageStore)[i] ?? null),
}

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Mock fetch (default no-op, tests override as needed)
globalThis.fetch = vi.fn(() =>
  Promise.resolve(new Response(JSON.stringify({}), { status: 200 }))
) as unknown as typeof fetch

// Helper to reset mocks between tests
export function resetBrowserMocks() {
  vi.mocked(navigator.vibrate).mockClear()
  vi.mocked(globalThis.fetch).mockClear()
  mockLocalStorage.getItem.mockClear()
  mockLocalStorage.setItem.mockClear()
  mockLocalStorage.removeItem.mockClear()
  mockLocalStorage.clear.mockClear()
  Object.keys(localStorageStore).forEach(k => delete localStorageStore[k])
}
