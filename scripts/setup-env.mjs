import fs from 'node:fs'
import path from 'node:path'

const args = new Set(process.argv.slice(2))
const showHelp = args.has('--help') || args.has('-h')
const force = args.has('--force')
const prefersLegacySourceFlag = args.has('--dev') || args.has('--prod')

if (showHelp) {
  console.log('Usage: node scripts/setup-env.mjs [--force]')
  console.log('')
  console.log('Creates .env from .env.production.')
  console.log('')
  console.log('Options:')
  console.log('  --force   Overwrite existing .env')
  process.exit(0)
}

if (prefersLegacySourceFlag) {
  console.warn('[env:setup] --dev/--prod flags are deprecated. Using .env.production only.')
}

const root = process.cwd()
const target = path.join(root, '.env')

const source = path.join(root, '.env.production')

if (!fs.existsSync(source)) {
  console.error('[env:setup] Missing source template: .env.production')
  process.exit(1)
}

if (fs.existsSync(target) && !force) {
  console.log('[env:setup] .env already exists. No changes made.')
  console.log('[env:setup] Use --force to overwrite it.')
  process.exit(0)
}

fs.copyFileSync(source, target)
console.log(`[env:setup] Created .env from ${path.basename(source)}`)
console.log('[env:setup] Next: update secrets before running in production.')
