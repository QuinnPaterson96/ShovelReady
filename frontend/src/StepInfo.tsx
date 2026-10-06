import { useEffect, useId, useState } from 'react'

/** Nearby help opens by click, tap or keyboard and never changes the journey. */
export function StepInfo({ label, children }: { label: string; children: React.ReactNode }) {
  useEffect(() => { void import('./step-info.css') }, [])
  const [open, setOpen] = useState(false)
  const id = useId()
  return <span className="step-info"><button type="button" className="step-info__button" aria-label={`About ${label}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false) }}>i</button><span id={id} hidden={!open} className="step-info__text">{children}</span></span>
}
