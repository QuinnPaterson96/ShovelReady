import type { Pathway } from '../conditional_screening/model'
import { changeProjectSetting, type ProjectSettings } from '../conditional_screening/projectSettings'

// Preserve the supplied words in enquiries. Only an explicit garden-suite choice
// selects that bounded comparison; a product's advertised use is not this answer.
export function mapIntendedUse(value: string): { intendedUse: string; proposedUse: Pathway['proposed_use']; state: 'unanswered' | 'unknown' | 'supplied' } {
  const intendedUse = value.trim()
  const normalized = intendedUse.toLowerCase()
  if (!normalized) return { intendedUse, proposedUse: null, state: 'unanswered' }
  if (['not sure', 'unknown', 'still deciding', 'undecided', 'prefer not to say'].includes(normalized)) return { intendedUse, proposedUse: null, state: 'unknown' }
  return { intendedUse, proposedUse: ['garden suite', 'garden_suite'].includes(normalized) ? 'garden_suite' : 'other', state: 'supplied' }
}

export function applyIntendedUse(settings: ProjectSettings, value: string): ProjectSettings {
  const mapped = mapIntendedUse(value)
  const next = changeProjectSetting(settings, 'proposed_use', mapped.proposedUse)
  return { ...next, evidence: { ...next.evidence, proposed_use: { ...next.evidence.proposed_use,
    note: mapped.state === 'unanswered' ? 'Intended use has not been answered.' : mapped.state === 'unknown' ? 'The homeowner explicitly left intended use unknown.' : `Homeowner supplied intended use: ${mapped.intendedUse}; planning applicability remains unverified.` } } }
}

export function IntendedUseControl({ value, onChange, id = 'builder-intended-use' }: { value: string; onChange: (value: string) => void; id?: string }) {
  const options = ['', 'Garden suite', 'Home office', 'Other use', 'Not sure']
  return <div className="intended-use-control">
    <label htmlFor={id}>How would you use the unit?</label>
    <select id={id} value={value} onChange={event => onChange(event.target.value)} aria-describedby={`${id}-help`}>
      {options.map(option => <option key={option} value={option}>{option || 'Choose an intended use'}</option>)}
      {value && !options.includes(value) && <option value={value}>{value}</option>}
    </select>
    <p id={`${id}-help`}>{mapIntendedUse(value).proposedUse === 'garden_suite' ? 'We will explore a garden-suite scenario. Suitability and local rules still need review.' : 'Physical placement checks are available. Garden-suite planning comparisons need a garden-suite choice; you can keep Not sure.'}</p>
  </div>
}
