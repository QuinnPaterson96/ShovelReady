export type MeasurementDimension = 'length' | 'area'
type Value = string | number | null | undefined
const formats = {
  length: new Intl.NumberFormat('en-CA', { maximumFractionDigits: 2, useGrouping: false }),
  area: new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1, useGrouping: false }),
}

// Display only: never feed this string into evaluation or stored observations.
export function formatMeasurement(value: Value, dimension: MeasurementDimension): string {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return 'unknown'
  if (typeof value === 'string' && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) return 'unknown'
  const number = Number(value)
  if (!Number.isFinite(number)) return 'unknown'
  const rounded = formats[dimension].format(number)
  // A small conflict/shortfall is still nonzero even when the usual display rounds to zero.
  if (number !== 0 && Number(rounded) === 0) {
    const resolution = dimension === 'area' ? '0.1' : '0.01'
    return number > 0 ? `< ${resolution}` : `> -${resolution}`
  }
  return rounded
}

export function measurementWithUnit(value: Value, dimension: MeasurementDimension): string {
  const text = formatMeasurement(value, dimension)
  return text === 'unknown' ? text : `${text} ${dimension === 'area' ? 'm²' : 'm'}`
}
