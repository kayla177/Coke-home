// Day 2: a tiny in-memory pet-state holder so renderer ⇄ main stay in sync.
// Day 3 replaces this with the proper event bus + state machine.

import type { BrowserWindow } from 'electron'

export type PetState =
  | 'idle'
  | 'walk'
  | 'sleep'
  | 'cheer'
  | 'working'
  | 'distracted'
  | 'celebrating'

let current: PetState = 'idle'
const subscribers = new Set<BrowserWindow>()

export function getPetState(): PetState {
  return current
}

export function setPetState(next: PetState): void {
  if (next === current) return
  current = next
  for (const win of subscribers) {
    if (!win.isDestroyed()) {
      win.webContents.send('pet:state', current)
    }
  }
}

export function subscribePetState(win: BrowserWindow): void {
  subscribers.add(win)
  win.on('closed', () => subscribers.delete(win))
}
