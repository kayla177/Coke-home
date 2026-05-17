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
  }
}

contextBridge.exposeInMainWorld('panelApi', api)

export type PanelApi = typeof api
