import { useState } from 'react'

export type RetainedResult<T> = { scopeKey: string; inputKey: string; result: T }
export function retainedResultView<T>(previous: RetainedResult<T> | null, input: { scopeKey: string | null; inputKey: string; current: T | null; pending: boolean }) {
  // Never retain another property/model. Recalculation is a display-only snapshot;
  // current/export eligibility cannot follow from a visible previous result.
  const current = !!input.scopeKey && !input.pending && input.current !== null
  const retained = input.pending && previous?.scopeKey === input.scopeKey ? previous.result : null
  return { result: current ? input.current : retained, updating: input.pending, current }
}

export function useRetainedResult<T>(input: { scopeKey: string | null; inputKey: string; current: T | null; pending: boolean }) {
  const [previous, setPrevious] = useState<RetainedResult<T> | null>(null)
  const view = retainedResultView(previous, input)
  // Guarded render-time state adjustment keeps old scopes out even on the first
  // render after a switch. A settled error/null clears the retained snapshot.
  if (previous && (previous.scopeKey !== input.scopeKey || !input.pending && input.current === null)) setPrevious(null)
  else if (view.current && input.current && (previous?.scopeKey !== input.scopeKey || previous.inputKey !== input.inputKey)) {
    setPrevious({ scopeKey: input.scopeKey!, inputKey: input.inputKey, result: input.current })
  }
  return view
}
