import { useEffect, useRef, useState } from 'react'

// Six stops, five narrated phases: placement has a before and an after.
export type WalkthroughStop = 'model' | 'property' | 'initial' | 'moved' | 'result' | 'enquiry'
export const walkthroughStops: WalkthroughStop[] = ['model', 'property', 'initial', 'moved', 'result', 'enquiry']
const dwell: Record<WalkthroughStop, number> = { model: 7000, property: 7000, initial: 7000, moved: 7000, result: 14000, enquiry: 13000 }
export function useWalkthrough(visible: boolean, isReady: (stop: WalkthroughStop) => boolean, failed = false) {
  const [state, setState] = useState<{ stop: WalkthroughStop; paused: boolean; finished?: boolean; skipping: boolean; run: number } | null>(null)
  const ready = state ? isReady(state.stop) : false
  const epoch = useRef(0)
  const halt = () => { epoch.current++ }
  const cancel = () => { epoch.current++; setState(null) }
  const start = () => { const run = ++epoch.current; setState({ stop: 'model', paused: false, skipping: false, run }) }
  const pause = () => { epoch.current++; setState(previous => previous && { ...previous, paused: !previous.paused }) }
  const next = () => {
    epoch.current++
    setState(previous => !previous || !ready ? previous : previous.stop === 'enquiry' ? { ...previous, finished: true, paused: true, skipping: false } : { ...previous, skipping: previous.stop === 'result' ? false : previous.skipping, stop: walkthroughStops[walkthroughStops.indexOf(previous.stop) + 1] })
  }
  const skip = () => { epoch.current++; setState(previous => previous && { ...previous, stop: 'moved', paused: false, skipping: true }) }
  const [reducedMotion, setReducedMotion] = useState(() => typeof window === 'undefined' ? false : window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const changed = () => setReducedMotion(query.matches)
    query.addEventListener('change', changed)
    return () => query.removeEventListener('change', changed)
  }, [])
  useEffect(() => { if (failed) { epoch.current++; setState(previous => previous && { ...previous, paused: true }) } }, [failed])
  useEffect(() => { if (!visible) cancel() }, [visible])
  useEffect(() => {
    if (!state || state.finished || state.paused || !visible || !ready || reducedMotion && !state.skipping) return
    const token = epoch.current
    const timer = window.setTimeout(() => { if (epoch.current === token) next() }, state.skipping ? 0 : dwell[state.stop])
    return () => window.clearTimeout(timer)
  }, [state, ready, visible, reducedMotion])
  useEffect(() => () => { epoch.current++ }, [])
  return { state, ready, halt, start, cancel, pause, next, skip, reducedMotion }
}
