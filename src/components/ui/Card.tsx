import type { ElementType, ReactNode } from 'react'

interface CardProps {
  as?: ElementType
  className?: string
  children?: ReactNode
  [prop: string]: unknown
}

/**
 * Shared rounded-card container (feature 005, contracts/design-system.md).
 * Every card-shaped element in the redesign (insumo rows, alert rows, form
 * sections) renders through this instead of a one-off `div` — `as` lets an
 * interactive row render as a `<button>` or `<form>` while keeping the same
 * visual recipe.
 */
export function Card({ as: Component = 'div', className = '', ...props }: CardProps) {
  return (
    <Component
      className={`rounded-[14px] border border-border bg-surface ${className}`}
      {...props}
    />
  )
}
