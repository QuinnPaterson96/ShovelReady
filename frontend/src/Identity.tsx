import { useEffect, useState } from 'react'

type Identity = {
  application_commit: string | null
  frontend_commit: string | null
  spatial_revision: string | null
}

export default function IdentityPanel() {
  const [identity, setIdentity] = useState<Identity | null>(null)
  const built = import.meta.env.VITE_APPLICATION_COMMIT as string | undefined
  const commit = built && /^[0-9a-f]{40}$/.test(built) ? built : null
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/identity', { signal: controller.signal }).then(async response => {
      const data = await response.json()
      const valid = (value: unknown, pattern: RegExp) => value === null ||
        (typeof value === 'string' && pattern.test(value))
      if (response.ok && data.schema_version === 'sr-21.identity.v1' &&
          data.screening_status === 'not_performed' &&
          valid(data.application_commit, /^[0-9a-f]{40}$/) &&
          valid(data.frontend_commit, /^[0-9a-f]{40}$/) &&
          valid(data.spatial_revision, /^spatial:sha256:[0-9a-f]{64}$/)) setIdentity(data)
    }).catch(() => {})
    return () => controller.abort()
  }, [])
  return <details>
    <summary>Application and observation identity</summary>
    <p>Application commit: <code>{identity?.application_commit ?? 'Unavailable'}</code></p>
    <p>Frontend build commit: <code>{commit ?? 'Unavailable'}</code></p>
    {commit && identity && commit !== identity.frontend_commit &&
      <p>Frontend and API build identity differ. Reload or check the launched build.</p>}
    <p>Selected observation revision: <code style={{ overflowWrap: 'anywhere' }}>
      {identity?.spatial_revision ?? 'Unavailable'}</code></p>
    <p>No screening performed. This observation selection is not an accepted dataset release.
      The fictional preview uses separate synthetic scenarios.</p>
  </details>
}
