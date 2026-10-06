import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { BuilderJourneyNav, emptyBuilderJourneyCompletion } from './BuilderJourneyNav'

test('completed workflow steps have a visible and accessible label; pending steps stay distinct', () => {
  const html = renderToStaticMarkup(<BuilderJourneyNav completion={{
    ...emptyBuilderJourneyCompletion, model: true, placement: true,
  }} />)
  assert.match(html, /aria-label="Model 300 steps"/)
  for (const anchor of ['model', 'property', 'placement', 'next']) {
    assert.match(html, new RegExp(`href="#builder-${anchor}"`))
  }
  assert.match(html, /Model<\/span><span class="builder-journey-state is-complete"><span class="builder-journey-check" aria-hidden="true">✓<\/span>Complete<\/span>/)
  assert.match(html, /Property<\/span><span class="builder-journey-state">To do<\/span>/)
  assert.match(html, /Placement<\/span><span class="builder-journey-state is-complete"><span class="builder-journey-check" aria-hidden="true">✓<\/span>Complete<\/span>/)
  assert.match(html, /Next steps<\/span><span class="builder-journey-state">To do<\/span>/)
  assert.match(html, /Ticks show completed steps/)
  assert.equal((html.match(/aria-hidden="true">✓/g) ?? []).length, 2)
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
  assert.equal((edited.match(/>To do<\/span>/g) ?? []).length, 2)
})
