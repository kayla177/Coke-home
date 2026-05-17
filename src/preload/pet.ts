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

const api = {
  togglePanel: (): void => {
    ipcRenderer.send('panel:toggle')
  },
  requestState: async (): Promise<PetState> => {
    return ipcRenderer.invoke('pet:get-state')
  },
  onState: (cb: (state: PetState) => void): (() => void) => {
    const handler = (_e: IpcRendererEvent, state: PetState) => cb(state)
    ipcRenderer.on('pet:state', handler)
    return () => ipcRenderer.off('pet:state', handler)
  },
  dragStart: (): void => {
    ipcRenderer.send('pet:drag-start')
  },
  dragMove: (dx: number, dy: number): void => {
    ipcRenderer.send('pet:drag-move', dx, dy)
  },
  dragEnd: (): void => {
    ipcRenderer.send('pet:drag-end')
  }
}

contextBridge.exposeInMainWorld('petApi', api)

export type PetApi = typeof api
