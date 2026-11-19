import placementCapture from '../brand/home-placement.svg'
import './homepage.css'

type Props = { onAssessment: () => void; onDemo: () => void; onWalkthrough: () => void }

export default function Homepage({ onAssessment, onDemo, onWalkthrough }: Props) {
  return <div className="homepage">
    <section className="homepage-hero" aria-labelledby="home-title">
      <div className="homepage-promise">
        <p className="eyebrow">A place to start, before you build</p>
        <h1 id="home-title">Could a prefab home fit on your lot?</h1>
        <p className="homepage-lead">Explore your property using municipal map data and published model dimensions. Try a placement, see potential constraints, and prepare a useful enquiry.</p>
        <div className="homepage-actions">
          <button className="sr-primary" onClick={onAssessment}>Check my property <span aria-hidden="true">→</span></button>
          <button onClick={onWalkthrough}>Watch the demo</button>
        </div>
        <p className="homepage-entry-note">The six-stage demo explores aux box Model 240, including an optional budget estimate. Advance at your pace. Check my property returns to your work in this open session.</p>
        <p className="homepage-scope">Explore mapped properties in the City of Victoria and the District of Saanich. A promising placement still needs source review and site-specific advice; this is not a permit finding.</p>
      </div>
      <figure className="homepage-product">
        <div className="homepage-product-bar"><span>Inside ShovelReady</span><span className="homepage-example-tag">Saved example</span></div>
        <div className="homepage-plan">
          <img src={placementCapture} width="560" height="840" fetchPriority="high" alt="Actual placement map: the proposed Model 240 overlaps a captured roofline on the saved Victoria parcel." />
          <div className="homepage-plan-key">
            <p className="eyebrow">Try a position</p>
            <h2>See the space.<br />Spot the questions.</h2>
            <ul>
              <li><span className="homepage-key-parcel" aria-hidden="true" />Mapped lot</li>
              <li><span className="homepage-key-roof" aria-hidden="true" />Existing roofline</li>
              <li><span className="homepage-key-unit" aria-hidden="true" />Proposed prefab</li>
            </ul>
            <p className="homepage-conflict">This position overlaps a mapped roofline. Move the unit to explore another position.</p>
          </div>
        </div>
        <figcaption>aux box Model 240 · saved Victoria example. City of Victoria outlines captured October 7, 2026; approximate and unreviewed. <span className="homepage-attribution">Contains information licensed under the <a href="https://opendata.victoria.ca/pages/open-data-licence">Open Government Licence – City of Victoria</a>.</span> <button className="homepage-text-button" onClick={onDemo}>Try an example</button></figcaption>
      </figure>
    </section>

    <section className="homepage-process" aria-labelledby="home-process">
      <p className="eyebrow">From a possibility to a useful conversation</p>
      <h2 id="home-process">Give your next step a clearer starting point.</h2>
      <div className="homepage-steps">
        <article><span className="homepage-step-number">01 / Placement</span><h3>Explore your lot</h3><p>Find your property, choose a model and move its footprint on the map. Considering a small, separate home in your yard? You may know it as a garden suite or backyard home.</p></article>
        <article><span className="homepage-step-number">02 / Findings</span><h3>Know what to ask</h3><p>Review approximate distances, possible overlaps and available City map flags. See which planning questions depend on assumptions or still need information.</p></article>
        <article><span className="homepage-step-number">03 / Enquiry</span><h3>Bring the context</h3><p>Prepare a draft with your placement, project goals and outstanding questions. Review it, then share it with the provider yourself.</p></article>
      </div>
    </section>

    <section className="homepage-coverage" aria-labelledby="home-coverage">
      <div><p className="eyebrow">Where you can explore today</p><h2 id="home-coverage">Mapped coverage in Victoria and Saanich</h2><p>The map helps you investigate a possibility. It cannot establish whether a home is permitted on a particular property.</p></div>
      <dl>
        <div><dt>City of Victoria</dt><dd>Find a property, place a model on available parcel and roofline outlines, and explore preliminary garden-suite checks and municipal map flags.</dd></div>
        <div><dt>District of Saanich</dt><dd>Find a property and explore a mapped placement. Local garden-suite comparisons cover lot area, lot width, floor area and landscaped share where inputs are available.</dd></div>
        <div><dt>Elsewhere or missing map data</dt><dd>Use a manual sketch with approximate dimensions. Local planning comparisons depend on municipal coverage, your inputs and the assumptions shown.</dd></div>
      </dl>
    </section>

    <section className="homepage-builders" aria-labelledby="home-builders">
      <div><p className="eyebrow">For builders &amp; prefab manufacturers · pilot concept</p><h2 id="home-builders">Help prospective customers arrive with a clearer project.</h2><p>Let visitors explore your models on their property and bring you their placement, project goals and outstanding questions.</p><p>A website integration pilot could bring this exploration into your customer journey. The current demonstration is independent; provider participation and integration are not established.</p></div>
      <div className="homepage-pilot-action"><button onClick={onWalkthrough}>Preview the customer journey <span aria-hidden="true">→</span></button><p>Pilot enquiries are not open on this site yet. Explore the demonstration to see the proposed experience.</p></div>
    </section>
  </div>
}
