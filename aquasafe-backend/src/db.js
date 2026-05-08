import sql from 'mssql'
import { createSqlConfig } from './config.js'

let poolPromise

export const getPool = async () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(createSqlConfig()).connect()
  }

  return poolPromise
}

export const closePool = async () => {
  if (poolPromise) {
    const pool = await poolPromise
    await pool.close()
    poolPromise = undefined
  }
}

export { sql }
