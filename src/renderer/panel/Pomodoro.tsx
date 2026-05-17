import { useEffect, useState } from 'react'
import type { PomodoroSnapshot } from '../../preload/panel'

const PHASE_LABEL: Record<PomodoroSnapshot['phase'], string> = {
  work: 'Work',
  short_break: 'Short break',
  long_break: 'Long break'
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function Pomodoro() {
  const [snap, setSnap] = useState<PomodoroSnapshot | null>(null)

  useEffect(() => {
    let cancelled = false
    window.panelApi.pomodoroSnapshot().then((s) => {
      if (!cancelled) setSnap(s)
    })
    const off = window.panelApi.onEvent((event) => {
      if (
        event.type === 'pomodoro.tick' ||
        event.type === 'pomodoro.phase_changed' ||
        event.type === 'pomodoro.status_changed' ||
        event.type === 'pomodoro.session_completed'
      ) {
        setSnap(event.snapshot)
      }
    })
    return () => {
      cancelled = true
      off()
    }
  }, [])

  if (!snap) {
    return <div style={{ opacity: 0.5, fontSize: 13 }}>Loading…</div>
  }

  const progress = snap.duration === 0 ? 0 : 1 - snap.remaining / snap.duration
  const isRunning = snap.status === 'running'
  const isPaused = snap.status === 'paused'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>Pomodoro</h2>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          padding: '14px 0',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.04)'
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 1, opacity: 0.7, textTransform: 'uppercase' }}>
          {PHASE_LABEL[snap.phase]}
          {snap.status !== 'idle' && (
            <span style={{ marginLeft: 8, opacity: 0.6 }}>
              · {snap.status}
            </span>
          )}
        </div>
        <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 44, fontWeight: 200 }}>
          {formatTime(snap.remaining)}
        </div>
        <div
          style={{
            width: '80%',
            height: 4,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 999,
            overflow: 'hidden',
            marginTop: 6
          }}
        >
          <div
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: '100%',
              background: snap.phase === 'work'
                ? 'rgba(120,160,255,0.8)'
                : 'rgba(150,210,150,0.8)',
              transition: 'width 600ms linear'
            }}
          />
        </div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
          Sessions completed: {snap.completedWorkSessions}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {!isRunning && !isPaused && (
          <button onClick={() => window.panelApi.pomodoroStart()}>Start</button>
        )}
        {isRunning && (
          <button onClick={() => window.panelApi.pomodoroPause()}>Pause</button>
        )}
        {isPaused && (
          <button onClick={() => window.panelApi.pomodoroResume()}>Resume</button>
        )}
        <button onClick={() => window.panelApi.pomodoroSkip()}>Skip</button>
        <button onClick={() => window.panelApi.pomodoroReset()}>Reset</button>
      </div>
    </div>
  )
}
