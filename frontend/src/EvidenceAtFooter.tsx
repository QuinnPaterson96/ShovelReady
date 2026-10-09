import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Keep map-owned evidence current while disclosing it in the journey footer. */
export function EvidenceAtFooter({ targetId, children }: { targetId?: string; children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const locate = () => setTarget(targetId ? document.getElementById(targetId) : null)
    locate()
    if (!targetId) return
    // Live map geometry arrives asynchronously and can replace the destination.
    const Observer = document.defaultView?.MutationObserver
    if (!Observer) return
    const observer = new Observer(locate)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [targetId])
  return target ? createPortal(children, target) : <>{children}</>
}
