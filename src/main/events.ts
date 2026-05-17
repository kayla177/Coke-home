// Single source of truth for app events. Anything that "happens" (Pomodoro
// transitions, focus changes, tasks, future agent messages) flows through here.
// Subscribed BrowserWindows receive every event over the `app:event` IPC channel
// so renderers can react. This is also the seam the LLM agent will subscribe
// to in v2 — no v1 caller cares whether a handler is local or remote.

import type { BrowserWindow } from 'electron'

export type PomodoroPhase = 'work' | 'short_break' | 'long_break'
export type PomodoroStatus = 'idle' | 'running' | 'paused'

export interface PomodoroSnapshot {
  phase: PomodoroPhase
  status: PomodoroStatus
  /** Seconds remaining in the current phase. */
  remaining: number
  /** Full duration of the current phase, in seconds. */
  duration: number
  /** Number of completed work sessions in the current cycle. */
  completedWorkSessions: number
}

export type AppClassification = 'work' | 'distraction' | 'neutral'

export interface ActiveAppInfo {
  name: string
  bundleId?: string
}

export type AppEvent =
  | { type: 'pomodoro.phase_changed'; phase: PomodoroPhase; snapshot: PomodoroSnapshot }
  | { type: 'pomodoro.status_changed'; status: PomodoroStatus; snapshot: PomodoroSnapshot }
  | { type: 'pomodoro.tick'; snapshot: PomodoroSnapshot }
  | { type: 'pomodoro.session_completed'; phase: PomodoroPhase; snapshot: PomodoroSnapshot }
  | { type: 'focus.changed'; app: ActiveAppInfo; kind: AppClassification }
  | { type: 'distraction.detected'; app: ActiveAppInfo; durationMs: number }
  | { type: 'idle.changed'; idle: boolean }
  | { type: 'app.seen'; name: string }
  | { type: 'classifications.changed'; classifications: Record<string, AppClassification> }
  | { type: 'notify'; text: string; kind: 'nudge' | 'cheer' | 'info'; ttlMs: number }

export type EventHandler = (event: AppEvent) => void

const handlers = new Set<EventHandler>()
const windows = new Set<BrowserWindow>()

export const bus = {
  emit(event: AppEvent): void {
    for (const handler of handlers) handler(event)
    for (const win of windows) {
      if (!win.isDestroyed()) win.webContents.send('app:event', event)
    }
  },
  on(handler: EventHandler): () => void {
    handlers.add(handler)
    return () => handlers.delete(handler)
  },
  subscribeWindow(win: BrowserWindow): void {
    windows.add(win)
    win.on('closed', () => windows.delete(win))
  }
}
