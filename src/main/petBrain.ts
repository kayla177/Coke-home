import { bus, type AppClassification } from './events.js'
import { setPetState, type PetState } from './petState.js'
import { pomodoro } from './pomodoro.js'

const CELEBRATE_MS = 3500
const DISTRACTION_DEBOUNCE_MS = 8000

interface Brain {
  isIdle: boolean
  focusKind: AppClassification
  focusName: string | null
  distractedSince: number | null
  celebrateUntil: number
}

const state: Brain = {
  isIdle: false,
  focusKind: 'neutral',
  focusName: null,
  distractedSince: null,
  celebrateUntil: 0
}

let distractionTimer: NodeJS.Timeout | null = null
let nudgedFor: string | null = null

function compute(): PetState {
  const now = Date.now()
  if (now < state.celebrateUntil) return 'celebrating'
  if (state.isIdle) return 'sleep'

  const snap = pomodoro.snapshot()
  const distractedLongEnough =
    state.distractedSince !== null && now - state.distractedSince > DISTRACTION_DEBOUNCE_MS

  if (snap.status === 'running' && snap.phase === 'work') {
    if (distractedLongEnough) return 'distracted'
    return 'working'
  }
  if (snap.status === 'running') {
    return 'sleep'
  }

  // Pomodoro idle/paused: still react to focus.
  if (distractedLongEnough) return 'distracted'
  if (state.focusKind === 'work') return 'working'
  return 'idle'
}

function apply(): void {
  setPetState(compute())
}

function maybeNudge(): void {
  const snap = pomodoro.snapshot()
  if (
    state.focusKind === 'distraction' &&
    state.focusName !== nudgedFor &&
    (snap.status === 'running' && snap.phase === 'work' ? true : true)
  ) {
    nudgedFor = state.focusName
    bus.emit({
      type: 'notify',
      text: pickNudge(),
      kind: 'nudge',
      ttlMs: 4500
    })
  }
}

function pickNudge(): string {
  const lines = [
    'oi, back to work?',
    'we agreed: focus first 👀',
    'just one more minute… right?',
    'I see you 🐾'
  ]
  return lines[Math.floor(Math.random() * lines.length)]!
}

export function startPetBrain(): () => void {
  return bus.on((event) => {
    if (event.type === 'pomodoro.session_completed') {
      state.celebrateUntil = Date.now() + CELEBRATE_MS
      setPetState('celebrating')
      setTimeout(apply, CELEBRATE_MS + 50)
      return
    }

    if (event.type === 'idle.changed') {
      state.isIdle = event.idle
    }

    if (event.type === 'focus.changed') {
      state.focusKind = event.kind
      state.focusName = event.app.name
      if (event.kind === 'distraction') {
        state.distractedSince = Date.now()
        if (distractionTimer) clearTimeout(distractionTimer)
        distractionTimer = setTimeout(() => {
          apply()
          maybeNudge()
        }, DISTRACTION_DEBOUNCE_MS + 50)
      } else {
        state.distractedSince = null
        nudgedFor = null
        if (distractionTimer) {
          clearTimeout(distractionTimer)
          distractionTimer = null
        }
      }
    }

    apply()
  })
}
