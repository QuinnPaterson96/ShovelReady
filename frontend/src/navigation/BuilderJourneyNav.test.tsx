import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { BuilderJourneyNav, emptyBuilderJourneyCompletion } from './BuilderJourneyNav'

test('completed workflow steps have a visible and accessible label; pending steps stay distinct', () => {
  const html = renderToStaticMarkup(<BuilderJourneyNav completion={{
    ...emptyBuilderJourneyCompletion, model: true, property: true, placement: true,
  }} />)
  assert.match(html, /aria-label="Prefab model steps"/)
  for (const anchor of ['model', 'property', 'placement', 'purpose', 'quick-checks', 'next', 'email']) {
    assert.match(html, new RegExp(`href="#builder-${anchor}"`))
  }
  assert.match(html, /Model<\/span><span class="builder-journey-state is-complete"><span class="builder-journey-check" aria-hidden="true">✓<\/span>Complete<\/span>/)
  assert.match(html, /Property<\/span><span class="builder-journey-state is-complete"><span class="builder-journey-check" aria-hidden="true">✓<\/span>Complete<\/span>/)
  assert.match(html, /Placement<\/span><span class="builder-journey-state is-complete"><span class="builder-journey-check" aria-hidden="true">✓<\/span>Complete<\/span>/)
  assert.match(html, /Prepare enquiry<\/span><span class="builder-journey-state">To do<\/span>/)
  assert.match(html, /Ticks show workflow progress/)
  assert.equal((html.match(/aria-hidden="true">✓/g) ?? []).length, 3)
})

test('a stale completion disappears when host state invalidates it', () => {
  const complete = renderToStaticMarkup(<BuilderJourneyNav completion={{
    model: true, property: true, placement: true, enquiry: true,
  }} />)
  const edited = renderToStaticMarkup(<BuilderJourneyNav completion={{
    model: true, property: true, placement: false, enquiry: false,
  }} />)
  assert.equal((complete.match(/>Complete<\/span>/g) ?? []).length, 4)
  assert.equal((edited.match(/>Complete<\/span>/g) ?? []).length, 2)
  assert.equal((edited.match(/>To do<\/span>/g) ?? []).length, 8)
})

test('entry presents four stages without an empty detailed ladder', () => {
  const html = renderToStaticMarkup(<BuilderJourneyNav completion={emptyBuilderJourneyCompletion} />)
  assert.match(html, /Find property/)
  assert.match(html, /Place unit/)
  assert.doesNotMatch(html, /Street edges|Intended purpose/)
})
