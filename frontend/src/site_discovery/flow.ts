export type Source = { provider: string; record: string; capturedAt: string | null; sourceDate: string | null; url: string | null; review: string }
export type Address = { id: string; label: string; locality: string | null; precision: string; issues: string[]; point: [number, number] | null; crs: string | null; source: Source; raw: unknown }
export type Parcel = { id: string; label: string; match: string; source: Source; raw: unknown; inspection?: Observation; identityConcern?: string }
export type Polygon = { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] }
export type Observation = { parcel: { geometry: Polygon; areaM2: number | null }; roofs: { id: string; geometry: Polygon }[]; crs: 'EPSG:3157'; buildingsState: string; issues: string[]; source: Source; roofSource: Source | null; raw: unknown }
type PropertyObservation = { address: Address; parcel: Parcel; observation: Observation; review: 'unreviewed'; screening: 'not_performed' }
export type Confirmed = PropertyObservation & ({ schema_version: 'site-discovery.confirmed.v1' } | { schema_version: 'site-discovery.selected.v1'; selection_basis: 'sole_candidate' | 'user_choice'; identity_attestation: 'not_confirmed' })
export type SearchResult<T> = { status: 'ok' | 'no_match' | 'outside_coverage'; candidates: T[]; message?: string }
export type Transport = {
  addresses(query: string, signal: AbortSignal): Promise<SearchResult<Address>>
  parcels(address: Address, signal: AbortSignal): Promise<SearchResult<Parcel>>
  observe(parcel: Parcel, signal: AbortSignal): Promise<Observation>
}
export class DiscoveryProblem extends Error {}
export type State = { query: string; stage: 'idle' | 'addresses' | 'parcels' | 'observation'; busy: boolean; message: string; addresses: Address[]; address: Address | null; parcels: Parcel[]; parcel: Parcel | null; observation: Observation | null; confirmed: Confirmed | null }
export const initial: State = { query: '', stage: 'idle', busy: false, message: '', addresses: [], address: null, parcels: [], parcel: null, observation: null, confirmed: null }

export class DiscoveryFlow {
  state: State = initial
  private generation = 0
  private controller: AbortController | null = null
  private transport: Transport
  private notify: (state: State) => void
  private onConfirm: (value: Confirmed | null) => void
  private autoProceed: boolean
  constructor(transport: Transport, notify: (state: State) => void, onConfirm: (value: Confirmed | null) => void, autoProceed = false) {
    this.autoProceed = autoProceed; this.transport = transport; this.notify = notify; this.onConfirm = onConfirm
  }
  private publish(patch: Partial<State>) { this.state = { ...this.state, ...patch }; this.notify(this.state) }
  private invalidate() { this.generation++; this.controller?.abort(); this.controller = null; if (this.state.confirmed) this.onConfirm(null) }
  private request() { this.invalidate(); const controller = new AbortController(); this.controller = controller; return { controller, generation: this.generation } }
  private current(generation: number) { return generation === this.generation }
  edit(query: string) { if (query === this.state.query) return; this.invalidate(); this.publish({ ...initial, query }) }
  async search() {
    const query = this.state.query.trim()
    if (query.length < 3 || query.length > 160) { this.publish({ message: 'Enter 3 to 160 characters to search.' }); return }
    const { controller, generation } = this.request()
    this.publish({ stage: 'addresses', busy: true, message: '', addresses: [], address: null, parcels: [], parcel: null, observation: null, confirmed: null })
    try {
      const result = await this.transport.addresses(query, controller.signal)
      if (!this.current(generation)) return
      this.publish({ busy: false, addresses: result.candidates, message: result.message ?? (result.status === 'no_match' ? 'No address match. Correct the address or continue with manual site details.' : result.status === 'outside_coverage' ? 'Outside this Victoria parcel demonstration. Continue with manual site details.' : '') })
    } catch { if (this.current(generation)) this.publish({ busy: false, message: 'Address service unavailable or response invalid. Correct the address or continue manually.' }) }
  }
  async chooseAddress(id: string) {
    const address = this.state.addresses.find(candidate => candidate.id === id)
    if (!address) return
    const { controller, generation } = this.request()
    this.publish({ stage: 'parcels', busy: true, message: '', address, parcels: [], parcel: null, observation: null, confirmed: null })
    try {
      const result = await this.transport.parcels(address, controller.signal)
      if (!this.current(generation)) return
      this.publish({ busy: false, parcels: result.candidates, message: result.message ?? (result.status === 'outside_coverage' ? 'This address is outside the Victoria parcel demonstration. Continue manually.' : result.status === 'no_match' ? 'No parcel match. Continue manually or correct the address.' : '') })
      if (this.autoProceed && result.status === 'ok' && result.candidates.length === 1) await this.chooseParcel(result.candidates[0].id)
    } catch (error) { if (this.current(generation)) this.publish({ busy: false, message: error instanceof DiscoveryProblem ? error.message : 'Parcel response invalid. Choose the address again or continue manually.' }) }
  }
  async chooseParcel(id: string) {
    const parcel = this.state.parcels.find(candidate => candidate.id === id)
    if (!parcel) return
    const { controller, generation } = this.request()
    this.publish({ stage: 'observation', busy: true, message: '', parcel, observation: null, confirmed: null })
    try {
      const observation = await this.transport.observe(parcel, controller.signal)
      if (!this.current(generation)) return
      this.publish({ busy: false, observation })
      if (this.autoProceed && observation.parcel.geometry.type !== 'Polygon') {
        this.publish({ message: 'This parcel has separate components. Placement measurements are not supported yet. Choose another property or continue manually.' })
        return
      }
      if (this.autoProceed) {
        const address = this.state.address
        if (!address) return
        const confirmed: Confirmed = { schema_version: 'site-discovery.selected.v1', selection_basis: this.state.parcels.length === 1 ? 'sole_candidate' : 'user_choice', identity_attestation: 'not_confirmed', address, parcel, observation, review: 'unreviewed', screening: 'not_performed' }
        this.publish({ confirmed, message: '' })
        this.onConfirm(confirmed)
      }
    } catch (error) { if (this.current(generation)) this.publish({ busy: false, message: error instanceof DiscoveryProblem ? error.message : 'Parcel response invalid. Retry this parcel or continue manually.' }) }
  }
  confirm() {
    const { address, parcel, observation } = this.state
    if (!address || !parcel || !observation || this.state.busy) return
    const confirmed: Confirmed = { schema_version: 'site-discovery.confirmed.v1', address, parcel, observation, review: 'unreviewed', screening: 'not_performed' }
    this.publish({ confirmed, message: 'Property observation confirmed for this demonstration. No fit checks were run.' })
    this.onConfirm(confirmed)
  }
  changeProperty() { this.invalidate(); this.publish({ ...initial, query: this.state.query, message: 'Choose the property you want to explore.' }) }
  reject() { this.changeProperty() }
  dispose() { this.generation++; this.controller?.abort(); this.controller = null }
}
