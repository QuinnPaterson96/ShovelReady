import { useEffect, useRef, useState } from 'react'

// Six stops, five narrated phases: placement has a before and an after.
export type WalkthroughStop = 'model' | 'property' | 'initial' | 'moved' | 'result' | 'enquiry'
export const walkthroughStops: WalkthroughStop[] = ['model', 'property', 'initial', 'moved', 'result', 'enquiry']
export const walkthroughPhase: Record<WalkthroughStop, number> = { model: 1, property: 2, initial: 3, moved: 3, result: 4, enquiry: 5 }
export function useWalkthrough(visible: boolean, isReady: (stop: WalkthroughStop) => boolean, failed = false) {
  const [state, setState] = useState<{ stop: WalkthroughStop; finished: boolean; skipping: boolean; run: number } | null>(null)
  const ready = !!state && (!failed || state.stop === 'model' || state.stop === 'property') && isReady(state.stop)
  const epoch = useRef(0)
  const halt = () => { epoch.current++ }
  const cancel = () => { epoch.current++; setState(null) }
  const start = () => { const run = ++epoch.current; setState({ stop: 'model', finished: false, skipping: false, run }) }
  const go = (stop: WalkthroughStop, skipping = false) => { const run = ++epoch.current; setState({ stop, finished: stop === 'enquiry', skipping, run }) }
  const next = () => { if (state && ready && !state.finished) go(walkthroughStops[walkthroughStops.indexOf(state.stop) + 1]) }
  const back = () => { if (state && state.stop !== 'model') go(walkthroughStops[walkthroughStops.indexOf(state.stop) - 1]) }
  const skip = () => { if (state) go('moved', true) }
  useEffect(() => { if (!visible) cancel() }, [visible])
  // Only an explicit Skip completes the moved measurement and opens its result.
  // Ordinary steps never advance with time or when a response arrives.
  useEffect(() => { if (state?.skipping && ready && visible && state.run === epoch.current) go('result') }, [state, ready, visible])
  useEffect(() => () => { epoch.current++ }, [])
  return { state, ready, halt, start, cancel, next, back, skip }
}
