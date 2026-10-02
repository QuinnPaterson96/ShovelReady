import './brand.css'

/** A conceptual site diagram, never an evaluated placement. */
export function PropertyIllustration() {
  return <figure className="sr-property-illustration">
    <svg viewBox="0 0 560 310" role="img" aria-label="Illustrative parcel showing an existing home and a possible small new unit. No placement or zoning result is shown.">
      <rect width="560" height="310" fill="#eef4f2" />
      <path d="M0 254 560 156v154H0z" fill="#dce9e6" />
      <path d="m80 70 370-48 41 200-370 56z" fill="#f8fbfa" stroke="#245b68" strokeWidth="3" strokeLinejoin="round" />
      <path d="m80 70 370-48 41 200-370 56z" fill="none" stroke="#245b68" strokeWidth="1" strokeDasharray="8 9" opacity=".5" />
      <path d="m160 125 129-18 18 88-129 20z" fill="#245b68" />
      <path d="m149 128 69-41 79 19-137 21z" fill="#184752" />
      <path d="m204 190 25-4 4 25-25 4z" fill="#e5f0f1" />
      <path d="m350 157 80-11 12 59-80 13z" fill="#fbf2e7" stroke="#9a6337" strokeWidth="3" strokeLinejoin="round" />
      <path d="m341 159 42-31 49 18-82 11z" fill="#9a6337" />
      <path d="m321 205 32-4" fill="none" stroke="#9a6337" strokeWidth="2" strokeDasharray="4 6" strokeLinecap="round" />
      <g fontFamily="Segoe UI, system-ui, sans-serif" fontWeight="650" fontSize="14">
        <rect x="129" y="226" width="127" height="28" rx="6" fill="#fff" stroke="#c8d5d4" />
        <text x="143" y="245" fill="#203238">Existing home</text>
        <rect x="322" y="232" width="154" height="28" rx="6" fill="#fff" stroke="#c8d5d4" />
        <text x="335" y="251" fill="#5a3719">Possible new unit</text>
        <rect x="25" y="31" width="116" height="28" rx="6" fill="#fff" stroke="#c8d5d4" />
        <text x="36" y="50" fill="#245b68">Parcel outline</text>
      </g>
    </svg>
    <figcaption>Illustrative concept only. The shapes do not show a measured fit, zoning permission or approval.</figcaption>
  </figure>
}
