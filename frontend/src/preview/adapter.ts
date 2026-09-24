import fixtures from './fixtures.json'

// Local saved-data adapter only. Inferred fixture shape is not an API contract.
// Validate edited payloads with docs/usability/check_fixtures.py before use.
export const preview = fixtures
export type SavedResult = typeof fixtures.scenarios[number]['result']
export type SavedRule = typeof fixtures.scenarios[number]['rules'][number]
  | NonNullable<typeof fixtures.scenarios[number]['correction']>['rules'][number]
export const readable = (value: string) => value.replace(/_/g, ' ')
