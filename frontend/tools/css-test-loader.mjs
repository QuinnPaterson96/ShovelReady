// DOM integration tests exercise React effects; styles are verified in the browser.
export async function load(url, context, nextLoad) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export {}', shortCircuit: true }
  // App-level navigation tests consume Vite's static image URL imports.
  if (url.endsWith('.svg')) return { format: 'module', source: `export default ${JSON.stringify(url)}`, shortCircuit: true }
  return nextLoad(url, context)
}
