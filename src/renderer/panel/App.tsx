import { useState } from 'react'
import { Tasks } from './Tasks'
import { Pomodoro } from './Pomodoro'
import { Settings } from './Settings'

type Tab = 'tasks' | 'pomodoro' | 'settings'

export function App() {
  const [tab, setTab] = useState<Tab>('tasks')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        boxSizing: 'border-box'
      }}
    >
      <header
        style={{
          display: 'flex',
          gap: 6,
          padding: '10px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          WebkitAppRegion: 'drag'
        } as React.CSSProperties}
      >
        <div style={{ display: 'flex', gap: 6, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')} label="Tasks" />
          <TabButton active={tab === 'pomodoro'} onClick={() => setTab('pomodoro')} label="Pomodoro" />
          <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} label="Settings" />
        </div>
        <div style={{ flex: 1 }} />
        <button
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={() => window.panelApi.close()}
          aria-label="Close panel"
        >
          ✕
        </button>
      </header>

      <main style={{ flex: 1, padding: 14, overflowY: 'auto' }}>
        {tab === 'tasks' && <Tasks />}
        {tab === 'pomodoro' && <Pomodoro />}
        {tab === 'settings' && <Settings />}
      </main>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button className={active ? 'active' : ''} onClick={onClick}>
      {label}
    </button>
  )
}
