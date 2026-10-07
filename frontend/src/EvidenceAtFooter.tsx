import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Keep map-owned evidence current while disclosing it in the journey footer. */
export function EvidenceAtFooter({ targetId, children }: { targetId?: string; children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  useEffect(() => { setTarget(targetId ? document.getElementById(targetId) : null) }, [targetId])
  return target ? createPortal(children, target) : <>{children}</>
}
