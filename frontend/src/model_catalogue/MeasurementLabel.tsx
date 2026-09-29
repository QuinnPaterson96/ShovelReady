import { useId, useState } from 'react'
import type { Field } from './model'
import { measurementCopy } from './measurementCopy'

export function MeasurementLabel({ field, inputId }: { field: Field; inputId?: string }) {
  const [open, setOpen] = useState(false)
  const uniqueId = useId()
  const helpId = `${inputId ?? uniqueId}-help`
  const copy = measurementCopy[field]
  return <>
    <div className="sr-model-field-label">
      {inputId ? <label htmlFor={inputId}>{copy.label}</label> : <span>{copy.label}</span>}
      <button type="button" className="sr-model-info" aria-label={`About ${copy.name} measurement`}
        aria-expanded={open} aria-controls={helpId} onClick={() => setOpen(value => !value)}>
        <span aria-hidden="true">i</span>
      </button>
    </div>
    <div id={helpId} className="sr-model-help" hidden={!open}>
      <p><strong>Technical term: {copy.technicalTerm}.</strong> {copy.meaning}</p>
      <p>{copy.detail}</p>
    </div>
  </>
}
