import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

// Enumerate with Node so discovery includes independently integrated component tests
// on Windows as well as Linux, without depending on shell glob expansion.
function tests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? tests(path) : /\.test\.tsx?$/.test(entry.name) ? [path] : []
  })
}
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...tests('src').sort()], {
  stdio: 'inherit', env: { ...process.env, TSX_TSCONFIG_PATH: 'tsconfig.app.json' },
})
if (result.error) throw result.error
process.exit(result.status ?? 1)
