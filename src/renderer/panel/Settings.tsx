import { useEffect, useState } from 'react'
import type { PetState } from '../../preload/panel'

const STATES: PetState[] = [
  'idle',
  'walk',
  'sleep',
  'cheer',
  'working',
  'distracted',
  'celebrating'
]

export function Settings() {
  const [state, setState] = useState<PetState>('idle')

  useEffect(() => {
    let cancelled = false
    window.panelApi.requestState().then((s) => {
      if (!cancelled) setState(s)
    })
    const off = window.panelApi.onState((s) => setState(s))
    return () => {
      cancelled = true
      off()
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>Settings</h2>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, opacity: 0.7 }}>
          Pet state (manual override — Day 4 hooks this to focus detection)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {STATES.map((s) => (
            <button
              key={s}
              className={s === state ? 'active' : ''}
              onClick={() => window.panelApi.setPetState(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, opacity: 0.55 }}>
          Current: <strong>{state}</strong>
        </div>
      </section>
    </div>
  )
}
