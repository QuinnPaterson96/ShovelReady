/** Reveal the actual input behind a summary action without changing its value. */
export function focusSummaryTarget(document: Document, target: string, block: ScrollLogicalPosition = 'center'): boolean {
  const control = target === 'placement-map'
    ? document.querySelector<HTMLElement>('#placement-map svg, .occupied-lots svg[tabindex]')
    : document.getElementById(target)
  if (!control) return false
  let parent = control.parentElement
  while (parent) {
    if (parent.tagName === 'DETAILS') (parent as HTMLDetailsElement).open = true
    parent = parent.parentElement
  }
  control.scrollIntoView?.({ block, behavior: 'smooth' })
  control.focus({ preventScroll: true })
  return true
}
