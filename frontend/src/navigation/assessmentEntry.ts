import { journeyCatalogue } from '../model_catalogue/demo'

// Small, validated entry payload shared by direct links and explicit actions.
// No builder tenancy, independent assessment state or calculation path.
export type AssessmentEntry = { example?: boolean; walkthrough?: boolean; modelId?: string }
export function assessmentEntry(hash: string): AssessmentEntry | null {
  if (hash === '#examples/model-300') return { example: true, modelId: 'aux-300' }
  if (hash === '#builder' || hash.startsWith('#builder-') || hash.startsWith('#placement-action-')) return {}
  if (hash !== '#assessment' && !hash.startsWith('#assessment?')) return null
  const params = new URLSearchParams(hash.split('?')[1] ?? '')
  const modelId = params.get('model')
  return modelId && journeyCatalogue.models.some(model => model.model_id === modelId) ? { modelId } : {}
}
