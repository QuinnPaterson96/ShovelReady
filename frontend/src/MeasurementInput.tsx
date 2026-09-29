import { useState, type ComponentPropsWithoutRef } from 'react'
import { formatMeasurement, type MeasurementDimension } from './measurements'

type Props = Omit<ComponentPropsWithoutRef<'input'>, 'value'> & {
  value: string; dimension: MeasurementDimension
}

// Focusing reveals the editable original. Focus/blur never dispatch a value change.
export function MeasurementInput({ value, dimension, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false)
  const rounded = formatMeasurement(value, dimension)
  // Keep invalid entries visible for correction and sub-resolution numbers editable.
  const display = focused || rounded === 'unknown' || /^[<>]/.test(rounded) ? value : rounded
  return <input {...props} value={display}
    onFocus={event => { setFocused(true); onFocus?.(event) }}
    onBlur={event => { setFocused(false); onBlur?.(event) }} />
}
