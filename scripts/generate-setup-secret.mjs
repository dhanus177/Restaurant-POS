import crypto from 'node:crypto'

function createSetupSecret() {
  return crypto.randomBytes(32).toString('base64url')
}

const secret = createSetupSecret()

console.log('Generated setup secret:')
console.log(secret)
console.log('')
console.log('Set it in .env as:')
console.log(`SETUP_SECRET="${secret}"`)
