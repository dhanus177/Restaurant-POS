import { spawn } from 'node:child_process'

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options,
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`))
    })
  })
}

async function main() {
  const skipMigrate = process.env.SKIP_DB_MIGRATE === 'true'

  if (!skipMigrate) {
    console.log('Running prisma migrate deploy...')
    await run('node_modules/.bin/prisma', ['migrate', 'deploy'])
  } else {
    console.log('Skipping prisma migrate deploy (SKIP_DB_MIGRATE=true).')
  }

  const port = process.env.PORT || '3000'
  console.log(`Starting Next.js on port ${port}...`)
  await run('node_modules/.bin/next', ['start', '-p', port, '-H', '0.0.0.0'])
}

main().catch((error) => {
  console.error('Container startup failed:', error)
  process.exit(1)
})
