import dotenv from 'dotenv'

dotenv.config({ quiet: true })

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === '') {
    return fallback
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

const parsePort = (value) => {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

const corsOrigins = (process.env.FRONTEND_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const appConfig = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigins,
  databaseName: process.env.DB_DATABASE ?? 'AquaSafeDB',
}

export const createSqlConfig = (database = appConfig.databaseName) => {
  const port = parsePort(process.env.DB_PORT)
  const instanceName = process.env.DB_INSTANCE?.trim()

  const config = {
    server: process.env.DB_SERVER ?? 'localhost',
    database,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port,
    options: {
      encrypt: parseBoolean(process.env.DB_ENCRYPT, false),
      trustServerCertificate: parseBoolean(
        process.env.DB_TRUST_SERVER_CERTIFICATE,
        true,
      ),
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  }

  if (!port && instanceName) {
    config.options.instanceName = instanceName
    delete config.port
  }

  return config
}
