import dotenv from 'dotenv'

dotenv.config({ quiet: true })

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === '') {
    return fallback
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

const clean = (value) => String(value ?? '').trim()

const corsOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const appConfig = {
  port: Number(process.env.PORT || 4000),
  corsOrigins,
  databaseName: process.env.DB_DATABASE || 'AquaSafeDB',
}

const poolConfig = {
  max: 10,
  min: 0,
  idleTimeoutMillis: 30000,
}

const replaceDatabaseInConnectionString = (connectionString, database) => {
  const parts = connectionString
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

  let replaced = false

  const updatedParts = parts.map((part) => {
    const [rawKey] = part.split('=')
    const key = rawKey.trim().toLowerCase()

    if (key === 'database' || key === 'initial catalog') {
      replaced = true
      return `${rawKey}=` + database
    }

    return part
  })

  if (!replaced) {
    updatedParts.push(`Database=${database}`)
  }

  return `${updatedParts.join(';')};`
}

const buildConnectionString = (database) => {
  const explicitConnectionString = clean(process.env.DB_CONNECTION_STRING)

  if (explicitConnectionString) {
    return replaceDatabaseInConnectionString(explicitConnectionString, database)
  }

  const driver = clean(process.env.DB_DRIVER) || 'ODBC Driver 18 for SQL Server'
  const server = clean(process.env.DB_SERVER) || 'lpc:localhost\\MSSQL_25'
  const user = clean(process.env.DB_USER)
  const password = clean(process.env.DB_PASSWORD)
  const encrypt = parseBoolean(process.env.DB_ENCRYPT, false) ? 'yes' : 'no'
  const trustCertificate = parseBoolean(
    process.env.DB_TRUST_SERVER_CERTIFICATE,
    true,
  )
    ? 'yes'
    : 'no'
  const trustedConnection = parseBoolean(process.env.DB_TRUSTED_CONNECTION, false)

  const segments = [
    `Driver={${driver}}`,
    `Server=${server}`,
    `Database=${database}`,
    `Encrypt=${encrypt}`,
    `TrustServerCertificate=${trustCertificate}`,
  ]

  if (trustedConnection) {
    segments.push('Trusted_Connection=yes')
  } else {
    segments.push(`UID=${user}`)
    segments.push(`PWD=${password}`)
  }

  return `${segments.join(';')};`
}

export const createSqlConfig = (database = appConfig.databaseName) => ({
  connectionString: buildConnectionString(database),
  pool: poolConfig,
})
