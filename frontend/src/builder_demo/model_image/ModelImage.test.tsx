import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { ModelImage, type ClearedModelPhoto } from './ModelImage'

test('uncleared Model 300 imagery stays off the page while the official source remains reachable', () => {
  const fallback = renderToStaticMarkup(<ModelImage />)
  assert.match(fallback, /Manufacturer photo available on aux box/)
  assert.match(fallback, /View photos and specifications on aux box/)
  assert.match(fallback, /private bedroom, kitchen and full bathroom/)
  assert.match(fallback, /rel="noopener noreferrer"/)
  assert.match(fallback, /https:\/\/www\.auxbox\.ca\/model-300/)
  assert.doesNotMatch(fallback, /<img\b/)

  const remote: ClearedModelPhoto = {
    localSrc: 'https://images.squarespace-cdn.com/unapproved.jpg',
    alt: 'Exterior of Model 300',
    sourcePage: 'https://www.auxbox.ca/model-300',
    imageLabel: 'Model 300 exterior',
    photographerOrRightsHolder: 'Unverified',
    permissionBasis: 'Unverified',
    permissionRecord: 'https://www.auxbox.ca/model-300',
    checkedAt: '2026-10-05',
  }
  assert.doesNotMatch(renderToStaticMarkup(<ModelImage photo={remote} />), /<img\b/)
})
