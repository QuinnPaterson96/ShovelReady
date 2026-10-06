// DOM integration tests exercise React effects; styles are verified in the browser.
export async function load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export {}', shortCircuit: true }
  return nextLoad(url, context)
}
