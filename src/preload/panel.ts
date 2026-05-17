import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

export type PetState =
  | 'idle'
  | 'walk'
  | 'sleep'
  | 'cheer'
  | 'working'
  | 'distracted'
  | 'celebrating'

export type PomodoroPhase = 'work' | 'short_break' | 'long_break'
export type PomodoroStatus = 'idle' | 'running' | 'paused'

export interface PomodoroSnapshot {
  phase: PomodoroPhase
  status: PomodoroStatus
  remaining: number
  duration: number
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

const api = {
  setPetState: (state: PetState): void => {
    ipcRenderer.send('pet:set-state', state)
  },
  requestState: async (): Promise<PetState> => {
    return ipcRenderer.invoke('pet:get-state')
  },
  onState: (cb: (state: PetState) => void): (() => void) => {
    const handler = (_e: IpcRendererEvent, state: PetState) => cb(state)
    ipcRenderer.on('pet:state', handler)
    return () => ipcRenderer.off('pet:state', handler)
  },
  close: (): void => {
    ipcRenderer.send('panel:close')
  },

  // Pomodoro
  pomodoroSnapshot: async (): Promise<PomodoroSnapshot> => {
    return ipcRenderer.invoke('pomodoro:snapshot')
  },
  pomodoroStart: (): void => ipcRenderer.send('pomodoro:start'),
  pomodoroPause: (): void => ipcRenderer.send('pomodoro:pause'),
  pomodoroResume: (): void => ipcRenderer.send('pomodoro:resume'),
  pomodoroSkip: (): void => ipcRenderer.send('pomodoro:skip'),
  pomodoroReset: (): void => ipcRenderer.send('pomodoro:reset'),

  // Focus / classifications
  listSeenApps: async (): Promise<string[]> => ipcRenderer.invoke('focus:list-seen'),
  listClassifications: async (): Promise<Record<string, AppClassification>> =>
    ipcRenderer.invoke('focus:list-classifications'),
  getClassification: async (name: string): Promise<AppClassification> =>
    ipcRenderer.invoke('focus:get-classification', name),
  setClassification: (name: string, kind: AppClassification): void => {
    ipcRenderer.send('focus:set-classification', name, kind)
  },

  // Bus
  onEvent: (cb: (event: AppEvent) => void): (() => void) => {
    const handler = (_e: IpcRendererEvent, event: AppEvent) => cb(event)
    ipcRenderer.on('app:event', handler)
    return () => ipcRenderer.off('app:event', handler)
  }
}

contextBridge.exposeInMainWorld('panelApi', api)

export type PanelApi = typeof api
