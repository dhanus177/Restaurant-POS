import crypto from 'node:crypto'

function createChunk() {
  return crypto.randomBytes(2).toString('hex').toUpperCase()
}

function createLicenseKey() {
  return `${createChunk()}${createChunk()}-${createChunk()}${createChunk()}-${createChunk()}${createChunk()}`
}

const key = createLicenseKey()

console.log('Generated license activation key:')
console.log(key)
console.log('')
console.log('Set it on server as LICENSE_ACTIVATION_KEYS (single or comma-separated list).')
