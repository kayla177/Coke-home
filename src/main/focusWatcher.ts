import { powerMonitor } from 'electron'
import activeWin from 'active-win'
import { bus, type ActiveAppInfo } from './events.js'
import { getClassification, recordSeenApp } from './store.js'

const POLL_MS = 3000
const IDLE_THRESHOLD_SECONDS = 60

let pollHandle: NodeJS.Timeout | null = null
let lastApp: string | null = null
let wasIdle = false

export function startFocusWatcher(): () => void {
  if (pollHandle) return () => {}
  pollHandle = setInterval(() => {
    void poll()
  }, POLL_MS)
  void poll()

  return () => {
    if (pollHandle) {
      clearInterval(pollHandle)
      pollHandle = null
    }
  }
}

async function poll(): Promise<void> {
  // Idle status (system-wide; never needs permissions).
  const idleSec = powerMonitor.getSystemIdleTime()
  const isIdle = idleSec >= IDLE_THRESHOLD_SECONDS
  if (isIdle !== wasIdle) {
    wasIdle = isIdle
    bus.emit({ type: 'idle.changed', idle: isIdle })
  }

  // Active app. active-win throws if Accessibility permission is missing on
  // recent macOS — we degrade gracefully.
  let info: { owner?: { name: string; bundleId?: string } } | undefined
  try {
    info = (await activeWin()) ?? undefined
  } catch {
    return
  }
  if (!info?.owner) return

  const app: ActiveAppInfo = {
    name: info.owner.name,
    bundleId: info.owner.bundleId
  }

  if (recordSeenApp(app.name)) {
    bus.emit({ type: 'app.seen', name: app.name })
  }

  if (app.name === lastApp) return
  lastApp = app.name

  const kind = getClassification(app.name)
  bus.emit({ type: 'focus.changed', app, kind })
}
