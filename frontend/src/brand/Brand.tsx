import markUrl from './parcel-mark.svg'
import './brand.css'

/** Compact identity for the application header. The parent owns navigation. */
export function Brand() {
  return <span className="sr-identity">
    <img className="sr-identity__mark" src={markUrl} alt="" width="40" height="40" />
    <span className="sr-identity__name">Shovel<span>Ready</span></span>
  </span>
}
