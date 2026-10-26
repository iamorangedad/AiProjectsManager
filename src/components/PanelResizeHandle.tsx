import { useState } from 'react'
import { clampPanelWidth, widthFromDrag } from '../canvas/panelWidth'

export default function PanelResizeHandle({
  edge,
  width,
  min,
  label,
  onWidth,
  onDragging,
}: {
  edge: 'east' | 'west'
  width: number
  min: number
  label: string
  onWidth: (width: number) => void
  onDragging?: (dragging: boolean) => void
}) {
  const [active, setActive] = useState(false)
  const [hover, setHover] = useState(false)

  return (
    <div
      data-resize={edge === 'east' ? 'projects' : 'details'}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      title={label}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const handle = event.currentTarget
        handle.setPointerCapture(event.pointerId)
        const startX = event.clientX
        const startWidth = width
        setActive(true)
        onDragging?.(true)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        const finish = () => {
          setActive(false)
          onDragging?.(false)
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
        }
        const move = (ev: PointerEvent) => {
          onWidth(clampPanelWidth(widthFromDrag(startWidth, startX, ev.clientX, edge), min, window.innerWidth))
        }
        const up = () => {
          handle.removeEventListener('pointermove', move)
          handle.removeEventListener('pointerup', up)
          handle.removeEventListener('pointercancel', up)
          finish()
        }
        handle.addEventListener('pointermove', move)
        handle.addEventListener('pointerup', up)
        handle.addEventListener('pointercancel', up)
      }}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 10,
        [edge === 'east' ? 'right' : 'left']: 0,
        cursor: 'col-resize',
        zIndex: 4,
        touchAction: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 2,
          left: edge === 'east' ? 8 : 0,
          background: active || hover ? '#2563eb' : 'transparent',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
