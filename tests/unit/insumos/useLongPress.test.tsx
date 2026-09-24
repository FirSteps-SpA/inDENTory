import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useLongPress } from '../../../src/features/insumos/lib/useLongPress'

function Harness({
  onLong,
  onClick,
}: {
  onLong: () => void
  onClick: () => void
}) {
  const handlers = useLongPress(onLong)
  return (
    <button type="button" onClick={onClick} {...handlers}>
      tarjeta
    </button>
  )
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function setup() {
  const onLong = vi.fn()
  const onClick = vi.fn()
  render(<Harness onLong={onLong} onClick={onClick} />)
  return { onLong, onClick, boton: screen.getByRole('button') }
}

describe('useLongPress (spec 007 FR-010, research.md R6)', () => {
  it('fires after a 500 ms hold and swallows the following click', () => {
    const { onLong, onClick, boton } = setup()

    fireEvent.pointerDown(boton, { clientX: 10, clientY: 10 })
    act(() => vi.advanceTimersByTime(500))
    fireEvent.pointerUp(boton)
    fireEvent.click(boton)

    expect(onLong).toHaveBeenCalledOnce()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not fire on an early release, and the click still opens', () => {
    const { onLong, onClick, boton } = setup()

    fireEvent.pointerDown(boton, { clientX: 10, clientY: 10 })
    act(() => vi.advanceTimersByTime(300))
    fireEvent.pointerUp(boton)
    fireEvent.click(boton)
    act(() => vi.advanceTimersByTime(500))

    expect(onLong).not.toHaveBeenCalled()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is cancelled when the finger moves more than 10 px (scroll)', () => {
    const { onLong, boton } = setup()

    fireEvent.pointerDown(boton, { clientX: 10, clientY: 10 })
    fireEvent.pointerMove(boton, { clientX: 10, clientY: 25 })
    act(() => vi.advanceTimersByTime(600))

    expect(onLong).not.toHaveBeenCalled()
  })

  it('fires on contextmenu', () => {
    const { onLong, boton } = setup()

    fireEvent.contextMenu(boton)

    expect(onLong).toHaveBeenCalledOnce()
  })
})
