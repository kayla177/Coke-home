import { Menu, Tray, nativeImage } from 'electron'

interface TrayOptions {
  onToggle: () => void
  onQuit: () => void
}

let tray: Tray | null = null

export function createTray(opts: TrayOptions): Tray {
  // 16x16 transparent PNG with a small filled circle — generated inline so we
  // don't need an asset on disk for Day 1. Swap for a real icon later.
  const icon = nativeImage
    .createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAUklEQVR42mNgGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIwCAAYABQz3wIN6AAAAAElFTkSuQmCC'
    )
    .resize({ width: 16, height: 16 })
  icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('Coke — focus companion')

  const menu = Menu.buildFromTemplate([
    { label: 'Show / hide pet', click: opts.onToggle },
    { type: 'separator' },
    { label: 'Quit', click: opts.onQuit }
  ])
  tray.setContextMenu(menu)
  tray.on('click', opts.onToggle)

  return tray
}
