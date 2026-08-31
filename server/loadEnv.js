// Carga la configuracion local desde archivos de entorno sin reemplazar
// variables que ya haya proporcionado el sistema operativo.
import dotenv from 'dotenv'

export function loadServerEnv() {
  dotenv.config({ path: '.env.local', override: false })
  dotenv.config({ path: '.env', override: false })
}
