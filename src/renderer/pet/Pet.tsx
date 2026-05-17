import { useEffect, useRef, useState } from 'react'
import { SPRITES, type PetState } from './sprites'
import type { NotifyEvent } from '../../preload/pet'

const CLICK_THRESHOLD_PX = 4
const CLICK_THRESHOLD_MS = 350

interface Bubble {
  id: number
  text: string
  kind: NotifyEvent['kind']
}

export function Pet() {
  const [state, setState] = useState<PetState>('idle')
  const [hovered, setHovered] = useState(false)
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const movedRef = useRef(false)
  const bubbleTimer = useRef<NodeJS.Timeout | null>(null)
  const sprite = SPRITES[state]

  useEffect(() => {
    if (!window.petApi) {
      console.warn('[pet] window.petApi missing — preload failed to load')
      return
    }
    const offState = window.petApi.onState((next) => setState(next))
    const offNotify = window.petApi.onNotify((n) => {
      setBubble({ id: Date.now() + Math.random(), text: n.text, kind: n.kind })
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current)
      bubbleTimer.current = setTimeout(() => setBubble(null), n.ttlMs)
    })
    window.petApi.requestState().then((s) => setState(s)).catch(() => {})
    return () => {
      offState()
      offNotify()
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !window.petApi) return
    dragStartRef.current = { x: e.screenX, y: e.screenY, t: Date.now() }
    movedRef.current = false
    window.petApi.dragStart()

    const onMove = (m: MouseEvent) => {
      const start = dragStartRef.current
      if (!start) return
      const dx = m.screenX - start.x
      const dy = m.screenY - start.y
      if (!movedRef.current && Math.abs(dx) + Math.abs(dy) > CLICK_THRESHOLD_PX) {
        movedRef.current = true
      }
      if (movedRef.current) window.petApi.dragMove(dx, dy)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      const start = dragStartRef.current
      dragStartRef.current = null
      window.petApi.dragEnd()
      if (start && !movedRef.current && Date.now() - start.t < CLICK_THRESHOLD_MS) {
        window.petApi.togglePanel()
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {bubble && (
        <div
          key={bubble.id}
          style={{
            position: 'absolute',
            right: 30,
            bottom: 130,
            maxWidth: 200,
            padding: '8px 12px',
            borderRadius: 14,
            background:
              bubble.kind === 'nudge'
                ? 'rgba(255, 200, 200, 0.96)'
                : bubble.kind === 'cheer'
                  ? 'rgba(200, 240, 200, 0.96)'
                  : 'rgba(245, 245, 248, 0.96)',
            color: '#1d1d20',
            fontSize: 12,
            lineHeight: 1.35,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            boxShadow: '0 6px 14px rgba(0,0,0,0.28)',
            pointerEvents: 'none',
            animation: 'bubble-in 220ms ease-out both',
            transformOrigin: 'bottom right'
          }}
        >
          {bubble.text}
          <span
            style={{
              position: 'absolute',
              right: 18,
              bottom: -6,
              width: 12,
              height: 12,
              background: 'inherit',
              transform: 'rotate(45deg)',
              borderRadius: 2
            }}
          />
        </div>
      )}

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 140,
          height: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab'
        }}
      >
        <div
          style={{
            fontSize: 110,
            lineHeight: 1,
            filter: hovered
              ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.35))'
              : 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
            transform: hovered ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 120ms ease, filter 120ms ease',
            animation: `${sprite.anim} ${sprite.duration} ease-in-out infinite`,
            willChange: 'transform',
            pointerEvents: 'none'
          }}
        >
          {sprite.face}
        </div>
      </div>
    </div>
  )
}
