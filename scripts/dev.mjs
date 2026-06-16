import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const viteEntry = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))

const children = [
  spawn(process.execPath, ['server/index.js'], { stdio: 'inherit' }),
  spawn(process.execPath, [viteEntry, '--host', '127.0.0.1'], { stdio: 'inherit' }),
]

let shuttingDown = false

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  children.forEach((child) => {
    if (!child.killed) child.kill('SIGTERM')
  })
  setTimeout(() => process.exit(code), 150)
}

children.forEach((child) => {
  child.on('error', (error) => {
    console.error('No se pudo iniciar un proceso de desarrollo:', error.message)
    shutdown(1)
  })

  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) shutdown(code || 1)
  })
})

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
