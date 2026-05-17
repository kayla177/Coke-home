import { useEffect, useState } from 'react'
import type { AppClassification, PetState } from '../../preload/panel'

const STATES: PetState[] = [
  'idle',
  'walk',
  'sleep',
  'cheer',
  'working',
  'distracted',
  'celebrating'
]

const KINDS: AppClassification[] = ['neutral', 'work', 'distraction']
const KIND_COLOR: Record<AppClassification, string> = {
  neutral: 'rgba(255,255,255,0.08)',
  work: 'rgba(120,160,255,0.25)',
  distraction: 'rgba(255,130,130,0.25)'
}

export function Settings() {
  const [state, setState] = useState<PetState>('idle')
  const [seen, setSeen] = useState<string[]>([])
  const [classifications, setClassifications] = useState<Record<string, AppClassification>>({})

  const refreshApps = async () => {
    const [s, c] = await Promise.all([
      window.panelApi.listSeenApps(),
      window.panelApi.listClassifications()
    ])
    setSeen(s)
    setClassifications(c)
  }

  useEffect(() => {
    let cancelled = false
    window.panelApi.requestState().then((s) => {
      if (!cancelled) setState(s)
    })
    refreshApps()
    const offState = window.panelApi.onState((s) => setState(s))
    const offEvent = window.panelApi.onEvent((e) => {
      if (e.type === 'app.seen' || e.type === 'classifications.changed') {
        refreshApps()
      }
    })
    return () => {
      cancelled = true
      offState()
      offEvent()
    }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>Settings</h2>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, opacity: 0.7 }}>App classifications</div>
        <div style={{ fontSize: 11, opacity: 0.5 }}>
          Mark apps as <strong>work</strong> or <strong>distraction</strong>. During a
          work session, focusing a distraction app nudges the pet.
        </div>
        {seen.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.5, padding: '8px 0' }}>
            No apps detected yet. Switch between apps to populate this list.
            (If nothing appears for a while, grant Accessibility permission to
            this app in System Settings → Privacy &amp; Security.)
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {seen.map((name) => {
              const kind = classifications[name] ?? 'neutral'
              return (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 8,
                    background: KIND_COLOR[kind]
                  }}
                >
                  <div style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {KINDS.map((k) => (
                      <button
                        key={k}
                        className={k === kind ? 'active' : ''}
                        onClick={() => window.panelApi.setClassification(name, k)}
                        style={{ padding: '3px 8px', fontSize: 11 }}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, opacity: 0.7 }}>Manual pet state override (debug)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {STATES.map((s) => (
            <button
              key={s}
              className={s === state ? 'active' : ''}
              onClick={() => window.panelApi.setPetState(s)}
              style={{ padding: '4px 8px', fontSize: 11 }}
            >
              {s}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, opacity: 0.55 }}>
          Current: <strong>{state}</strong>
        </div>
      </section>
    </div>
  )
}
