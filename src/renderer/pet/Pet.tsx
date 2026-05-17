import { useEffect, useRef, useState } from 'react'
import { SPRITES, type PetState } from './sprites'

const CLICK_THRESHOLD_PX = 4
const CLICK_THRESHOLD_MS = 350

export function Pet() {
  const [state, setState] = useState<PetState>('idle')
  const [hovered, setHovered] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const movedRef = useRef(false)
  const sprite = SPRITES[state]

  useEffect(() => {
    if (!window.petApi) {
      console.warn('[pet] window.petApi missing — preload failed to load')
      return
    }
    const off = window.petApi.onState((next) => setState(next))
    window.petApi.requestState().then((s) => setState(s)).catch(() => {})
    return off
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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={handleMouseDown}
      style={{
        width: '100%',
        height: '100%',
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
  )
}
