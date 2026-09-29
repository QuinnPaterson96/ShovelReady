import type { Field } from './model'

// Presentation of physical model inputs only. These are not municipal rule definitions.
export const measurementCopy: Record<Field, {
  label: string; name: string; technicalTerm: string; meaning: string; detail: string; hint: string
}> = {
  width: {
    label: 'Width (m)', name: 'width', technicalTerm: 'nominal exterior width',
    meaning: 'The stated outside width of the building, from the provider or your plans.',
    detail: 'Nominal means a stated dimension, not a verified installed measurement. Check whether roof overhangs, decks and other projections are included. A local rule may measure from different edges.',
    hint: 'Outside width. Check whether overhangs are included.',
  },
  depth: {
    label: 'Length (m)', name: 'length', technicalTerm: 'nominal exterior depth',
    meaning: 'The stated outside length of the building, sometimes called depth in model specifications. Rotating the building does not change this measurement.',
    detail: 'Check whether roof overhangs, decks and other projections are included. This is a building dimension, not the depth of the lot or a distance to its boundary.',
    hint: 'Outside length. Check whether decks or projections are included.',
  },
  height: {
    label: 'Height (m)', name: 'height', technicalTerm: 'roof height from foundation datum',
    meaning: 'The distance from the foundation reference shown on the plans to the highest point of the roof.',
    detail: 'It is separate from ceiling height and the provider’s published exterior height. Height measured from the surrounding ground needs site details and the local rule’s definition.',
    hint: 'From the foundation reference to the highest roof point. Leave blank if unsure.',
  },
  area: {
    label: 'Interior floor area (m²)', name: 'interior floor area', technicalTerm: 'manufacturer interior floor area',
    meaning: 'The floor space inside the building, as stated by the provider or supplied from your plans.',
    detail: 'This is a physical product measurement. A local bylaw may count or exclude different spaces when calculating floor area. No conversion to that definition has been established here.',
    hint: 'Inside floor space. A local bylaw may count it differently.',
  },
}
