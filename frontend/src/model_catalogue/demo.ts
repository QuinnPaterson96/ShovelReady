import observations from './demo-catalogue.json'
import { bundledCatalogue, type Catalogue, type CatalogueModel } from './model'
import { initialProjectSettings } from '../conditional_screening/projectSettings'

// Separate observational bundle: neither this adapter nor code deployment publishes data.
export const demoObservations = observations as Catalogue
export const journeyModels = [
  { id: 'aux-300', contact: 'https://www.auxbox.ca/contact', description: 'A prefabricated living space with a private bedroom, kitchen and full bathroom. The manufacturer lists a 300 sq ft footprint.' },
  { id: 'aux-240', contact: 'https://www.auxbox.ca/contact', description: 'Studio accommodation. Confirm the kitchen and bathroom options for your project.' },
  { id: 'wcch-ch-studio', contact: 'https://westcoastcontainerhomes.ca/contact/', description: 'A compact sleeping/living space with kitchenette and bathroom. Permanent residential suitability needs provider confirmation.' },
  { id: 'hewing-quadra4', contact: 'https://hewinghaus.com/connect/', description: 'Published as a one-bedroom home. Confirm the kitchen and bathroom configuration with Hewing Haus.' },
] as const
export const journeyCatalogue: Pick<Catalogue, 'models'> = {
  models: journeyModels.map(item => [...bundledCatalogue.models, ...demoObservations.models].find(model => model.model_id === item.id)!) }
export const defaultJourneyModel = journeyCatalogue.models.find(model => model.model_id === 'aux-300')!
export const modelSnapshot = (model: CatalogueModel) => demoObservations.models.some(item => item.model_id === model.model_id)
  ? demoObservations.snapshot_id : bundledCatalogue.snapshot_id
export const modelContact = (model: CatalogueModel) => journeyModels.find(item => item.id === model.model_id)?.contact ?? model.provider_url
export const modelDescription = (model: CatalogueModel) => journeyModels.find(item => item.id === model.model_id)?.description ?? model.intended_use_note
export function modelProjectSettings(model: CatalogueModel) {
  const settings = initialProjectSettings()
  if (model.model_id === 'aux-300') return settings
  // A new model never inherits the reference journey's use or installation assumptions.
  return { proposal: { ...settings.proposal, proposed_use: null, foundation_attached: null },
    evidence: { ...settings.evidence,
      proposed_use: { value: null, origin: 'unknown' as const, source: null, note: 'Use and provider suitability need confirmation for this model.' },
      foundation_attached: { value: null, origin: 'unknown' as const, source: null, note: 'Model-specific foundation and installation scope unconfirmed.' } } }
}
export const modelMeasure = (model: CatalogueModel, name: string) => model.measurements.find(item => item.name === name)
