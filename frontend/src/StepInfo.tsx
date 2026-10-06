import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** Hover/focus help, with pinned tap support and no journey mutation. */
export function StepInfo({ label, children }: { label: string; children: React.ReactNode }) {
  useEffect(() => { void import('./step-info.css') }, [])
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 12, top: 12 })
  const button = useRef<HTMLButtonElement>(null), popup = useRef<HTMLSpanElement>(null)
  const pinned = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const id = useId()
  const cancelClose = () => { if (timer.current) clearTimeout(timer.current) }
  const dismiss = () => { cancelClose(); pinned.current = false; setOpen(false) }
  const show = () => { cancelClose(); setOpen(true) }
  const leave = () => { cancelClose(); timer.current = setTimeout(() => { if (!pinned.current && document.activeElement !== button.current) setOpen(false) }, 150) }
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const anchor = button.current?.getBoundingClientRect(), box = popup.current?.getBoundingClientRect()
      if (anchor && box) setPosition({ left: Math.max(12, Math.min(anchor.left, document.documentElement.clientWidth - box.width - 12)), top: anchor.bottom + box.height + 8 <= document.documentElement.clientHeight ? anchor.bottom + 8 : Math.max(12, anchor.top - box.height - 8) })
    }
    place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, children])
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!button.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) dismiss() }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss() }
    if (open) { document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape) }
    return () => { cancelClose(); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  return <span className="step-info"><button ref={button} type="button" className="step-info__button" aria-label={`About ${label}`} aria-expanded={open} aria-controls={open ? id : undefined} aria-describedby={open ? id : undefined}
    onMouseEnter={show} onMouseLeave={leave} onFocus={show} onBlur={dismiss}
    onClick={() => { cancelClose(); pinned.current = !pinned.current; setOpen(pinned.current) }} onKeyDown={event => { if (event.key === 'Escape') dismiss() }}>i</button>
    {open && createPortal(<span ref={popup} id={id} role="tooltip" className="step-info__text" style={position} onMouseEnter={show} onMouseLeave={leave}>{children}</span>, document.body)}
  </span>
}
