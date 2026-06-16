import dotenv from 'dotenv'

export function loadServerEnv() {
  dotenv.config({ path: '.env.local', override: false })
  dotenv.config({ path: '.env', override: false })
}
