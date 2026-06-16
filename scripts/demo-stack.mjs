import { spawn } from 'node:child_process'

const processes = [
  {
    name: 'ai-bridge',
    command: 'node',
    args: ['server/ai-bridge/index.js'],
  },
  {
    name: 'esp32-sim',
    command: 'node',
    args: ['server/esp32-simulator/index.js'],
  },
]

let shuttingDown = false

const children = processes.map((item) => {
  const child = spawn(item.command, item.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  })

  child.stdout.on('data', (chunk) => process.stdout.write(`[${item.name}] ${chunk}`))
  child.stderr.on('data', (chunk) => process.stderr.write(`[${item.name}] ${chunk}`))
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) shutdown(code || 1)
  })

  return child
})

console.log('Demo robot iniciada: AI Bridge + simulador ESP32.')
console.log('En otra terminal ejecuta: npm run demo:session')

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  children.forEach((child) => {
    if (!child.killed) child.kill('SIGTERM')
  })
  setTimeout(() => process.exit(code), 150)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
