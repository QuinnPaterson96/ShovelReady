type WorkflowKind = 'site' | 'model' | 'review' | 'share'

/** Decorative 20 px icons for labelled workflow steps. */
export function WorkflowIcon({ kind }: { kind: WorkflowKind }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" {...common}>
    {kind === 'site' && <>
      <path d="m3 6 13-3 5 15-13 3z" />
      <path d="m8 10 6-1 2 7-6 1z" />
      <circle cx="19" cy="6" r="1" fill="currentColor" stroke="none" />
    </>}
    {kind === 'model' && <>
      <path d="m3 10 9-5 9 5v9H3z" />
      <path d="M3 10h18M8 19v-6h8v6" />
    </>}
    {kind === 'review' && <>
      <path d="M5 3h11l3 3v15H5zM16 3v4h3M8 11h7M8 15h4" />
      <circle cx="17" cy="15" r="2.5" />
    </>}
    {kind === 'share' && <>
      <path d="M4 5h16v12H9l-5 4zM8 10h8M8 13h5" />
    </>}
  </svg>
}
