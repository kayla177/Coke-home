import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createTray } from './tray.js'
import {
  getPetState,
  setPetState,
  subscribePetState,
  type PetState
} from './petState.js'
import { bus, type AppClassification } from './events.js'
import { pomodoro } from './pomodoro.js'
import { startPetBrain } from './petBrain.js'
import { startFocusWatcher } from './focusWatcher.js'
import {
  getClassification,
  listClassifications,
  listSeenApps,
  setClassification
} from './store.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PET_WIDTH = 260
const PET_HEIGHT = 220
const PANEL_WIDTH = 360
const PANEL_HEIGHT = 480

let petWindow: BrowserWindow | null = null
let panelWindow: BrowserWindow | null = null

function rendererUrl(name: 'pet' | 'panel'): string | { file: string } {
  if (process.env.ELECTRON_RENDERER_URL) {
    return `${process.env.ELECTRON_RENDERER_URL}/${name}/index.html`
  }
  return { file: join(__dirname, `../renderer/${name}/index.html`) }
}

function loadRenderer(win: BrowserWindow, name: 'pet' | 'panel'): void {
  const target = rendererUrl(name)
  if (typeof target === 'string') win.loadURL(target)
  else win.loadFile(target.file)
}

function createPetWindow(): BrowserWindow {
  const { workArea } = screen.getPrimaryDisplay()

  const win = new BrowserWindow({
    width: PET_WIDTH,
    height: PET_HEIGHT,
    x: workArea.x + workArea.width - PET_WIDTH - 40,
    y: workArea.y + workArea.height - PET_HEIGHT - 40,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/pet.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  loadRenderer(win, 'pet')
  // Show immediately — `ready-to-show` doesn't always fire reliably for
  // transparent windows on macOS. The window is positioned off-screen until
  // the renderer paints, so a brief flash isn't visible.
  win.show()

  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('[pet] renderer gone:', details)
  })
  win.webContents.on('preload-error', (_e, preloadPath, error) => {
    console.error('[pet] preload error:', preloadPath, error)
  })

  subscribePetState(win)
  bus.subscribeWindow(win)

  return win
}

function createPanelWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    frame: false,
    transparent: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/panel.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  loadRenderer(win, 'panel')
  subscribePetState(win)
  bus.subscribeWindow(win)

  win.on('blur', () => {
    if (!win.isDestroyed()) win.hide()
  })

  return win
}

function positionPanelNearPet(): void {
  if (!panelWindow || !petWindow) return
  const petBounds = petWindow.getBounds()
  const { workArea } = screen.getDisplayMatching(petBounds)
  const gap = 12

  let x = petBounds.x - PANEL_WIDTH - gap
  if (x < workArea.x) x = petBounds.x + petBounds.width + gap
  if (x + PANEL_WIDTH > workArea.x + workArea.width) {
    x = workArea.x + workArea.width - PANEL_WIDTH - gap
  }

  let y = petBounds.y + petBounds.height / 2 - PANEL_HEIGHT / 2
  if (y < workArea.y) y = workArea.y + gap
  if (y + PANEL_HEIGHT > workArea.y + workArea.height) {
    y = workArea.y + workArea.height - PANEL_HEIGHT - gap
  }

  panelWindow.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT
  })
}

function togglePanel(): void {
  if (!panelWindow || panelWindow.isDestroyed()) {
    panelWindow = createPanelWindow()
  }
  if (panelWindow.isVisible()) {
    panelWindow.hide()
  } else {
    positionPanelNearPet()
    panelWindow.show()
    panelWindow.focus()
  }
}

let dragOrigin: { x: number; y: number } | null = null

function registerIpc(): void {
  ipcMain.handle('pet:get-state', () => getPetState())
  ipcMain.on('pet:set-state', (_e, next: PetState) => setPetState(next))
  ipcMain.on('panel:toggle', () => togglePanel())
  ipcMain.on('panel:close', () => panelWindow?.hide())

  ipcMain.on('pet:drag-start', () => {
    if (!petWindow) return
    const { x, y } = petWindow.getBounds()
    dragOrigin = { x, y }
  })
  ipcMain.on('pet:drag-move', (_e, dx: number, dy: number) => {
    if (!petWindow || !dragOrigin) return
    petWindow.setPosition(
      Math.round(dragOrigin.x + dx),
      Math.round(dragOrigin.y + dy)
    )
  })
  ipcMain.on('pet:drag-end', () => {
    dragOrigin = null
  })

  ipcMain.handle('pomodoro:snapshot', () => pomodoro.snapshot())
  ipcMain.on('pomodoro:start', () => pomodoro.start())
  ipcMain.on('pomodoro:pause', () => pomodoro.pause())
  ipcMain.on('pomodoro:resume', () => pomodoro.resume())
  ipcMain.on('pomodoro:skip', () => pomodoro.skip())
  ipcMain.on('pomodoro:reset', () => pomodoro.reset())

  ipcMain.handle('focus:list-seen', () => listSeenApps())
  ipcMain.handle('focus:list-classifications', () => listClassifications())
  ipcMain.handle('focus:get-classification', (_e, name: string) => getClassification(name))
  ipcMain.on('focus:set-classification', (_e, name: string, kind: AppClassification) => {
    setClassification(name, kind)
    bus.emit({ type: 'classifications.changed', classifications: listClassifications() })
  })
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock?.hide()
  }

  registerIpc()
  startPetBrain()
  startFocusWatcher()
  petWindow = createPetWindow()

  createTray({
    onToggle: () => {
      if (!petWindow) return
      if (petWindow.isVisible()) petWindow.hide()
      else petWindow.show()
    },
    onQuit: () => app.quit()
  })
})

app.on('window-all-closed', () => {
  // keep running in the tray
})

app.on('activate', () => {
  if (!petWindow || petWindow.isDestroyed()) {
    petWindow = createPetWindow()
  } else {
    petWindow.show()
  }
})
