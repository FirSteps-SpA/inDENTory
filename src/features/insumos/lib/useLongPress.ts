import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'

export interface LongPressOptions {
  ms?: number
  toleranciaPx?: number
}

/**
 * Toque largo como vía *adicional* al botón "⋮" (spec 007 FR-010,
 * research.md R6) — nunca la única. Se cancela si el dedo se mueve más de
 * `toleranciaPx` (un scroll con guantes no abre el menú) o se levanta antes
 * de `ms`. Tras disparar, se traga el click siguiente para que no se abra
 * además el detalle. `contextmenu` (clic derecho / menú nativo de Android)
 * también lo dispara.
 */
export function useLongPress(
  onLongPress: () => void,
  { ms = 500, toleranciaPx = 10 }: LongPressOptions = {},
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origen = useRef<{ x: number; y: number } | null>(null)
  const disparado = useRef(false)
  const callback = useRef(onLongPress)

  useEffect(() => {
    callback.current = onLongPress
  }, [onLongPress])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  function cancelar() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    origen.current = null
  }

  return {
    onPointerDown: (event: PointerEvent) => {
      disparado.current = false
      origen.current = { x: event.clientX, y: event.clientY }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        disparado.current = true
        timer.current = null
        callback.current()
      }, ms)
    },
    onPointerMove: (event: PointerEvent) => {
      if (!origen.current) return
      const dx = event.clientX - origen.current.x
      const dy = event.clientY - origen.current.y
      if (Math.hypot(dx, dy) > toleranciaPx) cancelar()
    },
    onPointerUp: cancelar,
    onPointerLeave: cancelar,
    onPointerCancel: cancelar,
    onClickCapture: (event: MouseEvent) => {
      if (disparado.current) {
        disparado.current = false
        event.preventDefault()
        event.stopPropagation()
      }
    },
    onContextMenu: (event: MouseEvent) => {
      event.preventDefault()
      cancelar()
      disparado.current = false
      callback.current()
    },
  }
}
