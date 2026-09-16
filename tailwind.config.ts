import type { Config } from 'tailwindcss'

/**
 * Tailwind v4 auto-detects content via the `@tailwindcss/vite` plugin, so this
 * file only exists to document/extend shared design tokens — see the
 * `touch-target` utility in `src/styles/index.css` for the Constitution III
 * (≥48x48px) touch-target convention.
 */
export default {
  theme: {
    extend: {},
  },
} satisfies Config
