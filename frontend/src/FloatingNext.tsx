import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'

export const PlaybackLayout = createContext(false)

/** The same in-flow action can stick to the viewport within its active step. */
export function FloatingNext({ active, children, className = '' }: { active: boolean; children: ReactNode; className?: string }) {
  const playback = useContext(PlaybackLayout)
  const sticky = active && !playback
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const footer = bar.current
    if (!sticky || !footer?.parentElement) return
    const section = footer.parentElement

    // A browser may consider a tab target visible even when the sticky footer covers it.
    // Programmatically focused headings and findings have their own scroll destinations.
    let frame = 0
    const revealFocus = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof Element) || footer.contains(target) || !target.matches('a[href], button, input, select, textarea, summary')) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (document.activeElement !== target) return
        const field = target.getBoundingClientRect()
        const action = footer.getBoundingClientRect()
        if (field.height <= action.top && field.bottom > action.top && field.top < action.bottom &&
            field.right > action.left && field.left < action.right) {
          target.scrollIntoView({ block: 'center', behavior: 'instant' })
        }
      })
    }
    section.addEventListener('focusin', revealFocus)
    return () => {
      cancelAnimationFrame(frame)
      section.removeEventListener('focusin', revealFocus)
    }
  }, [sticky])

  return <div ref={bar} className={['floating-next', sticky && 'floating-next--active', className].filter(Boolean).join(' ')}>
    {children}
  </div>
}
