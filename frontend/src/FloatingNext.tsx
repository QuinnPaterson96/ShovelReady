import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/** One action, docked while its active section is visible; never duplicates a button. */
export function FloatingNext({ active, sectionId, children }: { active: boolean; sectionId: string; children: ReactNode }) {
  const end = useRef<HTMLDivElement>(null)
  const action = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(128)
  const [floating, setFloating] = useState(false)
  const [bounds, setBounds] = useState({ left: 8, width: 320 })
  useEffect(() => {
    if (!action.current) return
    const measure = () => setHeight(action.current!.getBoundingClientRect().height)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(action.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const section = document.getElementById(sectionId)
    if (!active || !section || !end.current || typeof IntersectionObserver === 'undefined') { setFloating(false); return }
    let sectionVisible = false, endVisible = false
    const update = () => {
      const box = section.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth
      setBounds(viewportWidth <= 760
        ? { left: 8, width: Math.max(0, viewportWidth - 16) }
        : { left: Math.max(8, box.left), width: Math.max(0, Math.min(box.width, viewportWidth - 16)) })
      setFloating(sectionVisible && !endVisible)
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === section) sectionVisible = entry.isIntersecting
        else endVisible = entry.isIntersecting && entry.intersectionRatio >= .95
      }
      update()
    }, { threshold: [0, .95] })
    observer.observe(section); observer.observe(end.current)
    window.addEventListener('resize', update)
    return () => { observer.disconnect(); window.removeEventListener('resize', update) }
  }, [active, sectionId])
  return <div ref={end} className={`floating-next${active && floating ? ' floating-next--docked' : ''}`} style={{ minHeight: height || undefined, '--next-left': `${bounds.left}px`, '--next-width': `${bounds.width}px` } as CSSProperties}><div ref={action} className="floating-next__action">{children}</div></div>
}
