import type { PetApi } from './pet'
import type { PanelApi } from './panel'

declare global {
  interface Window {
    petApi: PetApi
    panelApi: PanelApi
  }
}

export {}
