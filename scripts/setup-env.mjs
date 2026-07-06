import fs from 'node:fs'
import path from 'node:path'

const args = new Set(process.argv.slice(2))
const showHelp = args.has('--help') || args.has('-h')
const force = args.has('--force')
const preferDev = args.has('--dev')
const preferProd = args.has('--prod')

if (showHelp) {
  console.log('Usage: node scripts/setup-env.mjs [--dev|--prod] [--force]')
  console.log('')
  console.log('Creates .env automatically from available templates.')
  console.log('')
  console.log('Options:')
  console.log('  --dev     Prefer .env.example first, then .env.production')
  console.log('  --prod    Prefer .env.production first, then .env.example (default)')
  console.log('  --force   Overwrite existing .env')
  process.exit(0)
}

if (preferDev && preferProd) {
  console.error('[env:setup] Use only one of --dev or --prod.')
  process.exit(1)
}

const root = process.cwd()
const target = path.join(root, '.env')

const candidateFiles = preferDev
  ? ['.env.example', '.env.production']
  : ['.env.production', '.env.example']

const source = candidateFiles
  .map((file) => path.join(root, file))
  .find((filePath) => fs.existsSync(filePath))

if (!source) {
  console.error('[env:setup] No source template found. Expected .env.production or .env.example')
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
