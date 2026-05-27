import cors from 'cors'
import express from 'express'
import { appConfig } from './config.js'
import { closePool, getPool } from './db.js'
import {
  createTank,
  deleteTank,
  getAlerts,
  getControls,
  getDashboard,
  getTanks,
  updateTank,
  updateControl,
  addTelemetryReading,
} from './dashboardService.js'

const app = express()

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true
  }

  if (appConfig.corsOrigins.includes(origin)) {
    return true
  }

  return /^http:\/\/(localhost|127\.0\.0\.1):517\d$/.test(origin)
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true)
        return
      }

      callback(new Error(`Origen no permitido por CORS: ${origin}`))
    },
  }),
)
app.use(express.json())

app.get('/api/health', async (_request, response, next) => {
  try {
    const pool = await getPool()
    await pool.request().query('SELECT 1 AS ok;')

    response.json({
      ok: true,
      database: appConfig.databaseName,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/dashboard', async (_request, response, next) => {
  try {
    const pool = await getPool()
    response.json(await getDashboard(pool))
  } catch (error) {
    next(error)
  }
})

app.get('/api/tanks', async (_request, response, next) => {
  try {
    const pool = await getPool()
    response.json(await getTanks(pool))
  } catch (error) {
    next(error)
  }
})

const toRequiredText = (value) => String(value === undefined || value === null ? '' : value).trim()

const toNumberOrDefault = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

const isInRange = (value, min, max) => value >= min && value <= max

const toPositiveInteger = (value) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

app.post('/api/tanks', async (request, response, next) => {
  try {
    const name = toRequiredText(request.body.name)
    const location = toRequiredText(request.body.location)
    const status = toRequiredText(request.body.status) || 'Operativo'
    const capacityLiters = Math.round(
      toNumberOrDefault(request.body.capacityLiters, Number.NaN),
    )
    const minLevelPercent = toNumberOrDefault(request.body.minLevelPercent, 35)
    const maxTemperatureC = toNumberOrDefault(request.body.maxTemperatureC, 31)
    const initialLevelPercent = toNumberOrDefault(
      request.body.initialLevelPercent,
      0,
    )
    const initialTemperatureC = toNumberOrDefault(
      request.body.initialTemperatureC,
      24,
    )

    const errors = []

    if (!name || name.length > 80) {
      errors.push('El nombre es obligatorio y debe tener maximo 80 caracteres.')
    }

    if (!location || location.length > 120) {
      errors.push('La ubicacion es obligatoria y debe tener maximo 120 caracteres.')
    }

    if (!Number.isInteger(capacityLiters) || capacityLiters <= 0) {
      errors.push('La capacidad debe ser un numero entero mayor que 0.')
    }

    if (!isInRange(minLevelPercent, 0, 100)) {
      errors.push('El nivel minimo debe estar entre 0 y 100.')
    }

    if (!isInRange(initialLevelPercent, 0, 100)) {
      errors.push('El nivel inicial debe estar entre 0 y 100.')
    }

    if (!isInRange(maxTemperatureC, 0, 80)) {
      errors.push('La temperatura maxima debe estar entre 0 y 80 C.')
    }

    if (!isInRange(initialTemperatureC, 0, 80)) {
      errors.push('La temperatura inicial debe estar entre 0 y 80 C.')
    }

    if (!status || status.length > 40) {
      errors.push('El estado es obligatorio y debe tener maximo 40 caracteres.')
    }

    if (errors.length) {
      response.status(400).json({ errors })
      return
    }

    const pool = await getPool()
    const tank = await createTank(pool, {
      name,
      location,
      capacityLiters,
      minLevelPercent,
      maxTemperatureC,
      status,
      initialLevelPercent,
      initialTemperatureC,
    })

    response.status(201).json(tank)
  } catch (error) {
    next(error)
  }
})

app.put('/api/tanks/:tankId', async (request, response, next) => {
  try {
    const tankId = toPositiveInteger(request.params.tankId)

    if (!tankId) {
      response.status(400).json({ error: 'El identificador del tinaco no es valido.' })
      return
    }

    const name = toRequiredText(request.body.name)
    const location = toRequiredText(request.body.location)
    const status = toRequiredText(request.body.status) || 'Operativo'
    const capacityLiters = Math.round(
      toNumberOrDefault(request.body.capacityLiters, Number.NaN),
    )
    const minLevelPercent = toNumberOrDefault(request.body.minLevelPercent, 35)
    const maxTemperatureC = toNumberOrDefault(request.body.maxTemperatureC, 31)
    const levelPercent = toNumberOrDefault(request.body.levelPercent, 0)
    const temperatureC = toNumberOrDefault(request.body.temperatureC, 24)
    const errors = []

    if (!name || name.length > 80) {
      errors.push('El nombre es obligatorio y debe tener maximo 80 caracteres.')
    }

    if (!location || location.length > 120) {
      errors.push('La ubicacion es obligatoria y debe tener maximo 120 caracteres.')
    }

    if (!Number.isInteger(capacityLiters) || capacityLiters <= 0) {
      errors.push('La capacidad debe ser un numero entero mayor que 0.')
    }

    if (!isInRange(minLevelPercent, 0, 100)) {
      errors.push('El nivel minimo debe estar entre 0 y 100.')
    }

    if (!isInRange(levelPercent, 0, 100)) {
      errors.push('El nivel actual debe estar entre 0 y 100.')
    }

    if (!isInRange(maxTemperatureC, 0, 80)) {
      errors.push('La temperatura maxima debe estar entre 0 y 80 C.')
    }

    if (!isInRange(temperatureC, 0, 80)) {
      errors.push('La temperatura actual debe estar entre 0 y 80 C.')
    }

    if (!status || status.length > 40) {
      errors.push('El estado es obligatorio y debe tener maximo 40 caracteres.')
    }

    if (errors.length) {
      response.status(400).json({ errors })
      return
    }

    const pool = await getPool()
    const tank = await updateTank(pool, tankId, {
      name,
      location,
      capacityLiters,
      minLevelPercent,
      maxTemperatureC,
      status,
      levelPercent,
      temperatureC,
    })

    if (!tank) {
      response.status(404).json({ error: 'Tinaco no encontrado.' })
      return
    }

    response.json(tank)
  } catch (error) {
    next(error)
  }
})

app.delete('/api/tanks/:tankId', async (request, response, next) => {
  try {
    const tankId = toPositiveInteger(request.params.tankId)

    if (!tankId) {
      response.status(400).json({ error: 'El identificador del tinaco no es valido.' })
      return
    }

    const pool = await getPool()
    const deleted = await deleteTank(pool, tankId)

    if (!deleted) {
      response.status(404).json({ error: 'Tinaco no encontrado.' })
      return
    }

    response.status(204).send()
  } catch (error) {
    next(error)
  }
})

app.get('/api/alerts', async (_request, response, next) => {
  try {
    const pool = await getPool()
    response.json(await getAlerts(pool))
  } catch (error) {
    next(error)
  }
})

app.get('/api/controls', async (_request, response, next) => {
  try {
    const pool = await getPool()
    response.json(await getControls(pool))
  } catch (error) {
    next(error)
  }
})

app.patch('/api/controls/:controlKey', async (request, response, next) => {
  try {
    const { enabled } = request.body

    if (typeof enabled !== 'boolean') {
      response.status(400).json({
        error: 'El campo enabled debe ser booleano.',
      })
      return
    }

    const pool = await getPool()
    const control = await updateControl(pool, request.params.controlKey, enabled)

    if (!control) {
      response.status(404).json({
        error: 'Control no encontrado.',
      })
      return
    }

    response.json(control)
  } catch (error) {
    next(error)
  }
})

app.post('/api/telemetry', async (request, response, next) => {
  try {
    const { tankCode, waterLevelPercent, temperatureC, isLeak } = request.body

    if (!tankCode) {
      response.status(400).json({ error: 'El codigo del tinaco (tankCode) es obligatorio.' })
      return
    }

    if (waterLevelPercent === undefined || temperatureC === undefined) {
      response.status(400).json({ error: 'waterLevelPercent y temperatureC son obligatorios.' })
      return
    }

    const pool = await getPool()
    const result = await addTelemetryReading(pool, tankCode, {
      waterLevelPercent: Number(waterLevelPercent),
      temperatureC: Number(temperatureC),
      isLeak: Boolean(isLeak),
    })

    if (!result || !result.success) {
      response.status(404).json({ error: `Tinaco con codigo ${tankCode} no encontrado.` })
      return
    }

    response.status(201).json({
      success: true,
      message: 'Telemetria registrada correctamente.',
      tankId: result.tankId,
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/ai/recommendations', async (request, response, next) => {
  try {
    const aiUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'
    const res = await fetch(`${aiUrl}/api/recommendations`)
    if (!res.ok) {
      throw new Error(`Servicio de IA retorno codigo de error ${res.status}`)
    }
    const data = await res.json()
    response.json(data)
  } catch (error) {
    console.error('Error al consultar el servicio de IA:', error.message)
    response.json({
      recommendations: [
        {
          id: 'fb-1',
          title: 'Sistema de IA en espera',
          detail: 'El servicio de analisis inteligente en Python esta desconectado. Iniciando heuristica local.',
          severity: 'warning',
          icon: 'Brain'
        },
        {
          id: 'fb-2',
          title: 'Consumo optimo',
          detail: 'No se detectan anomalias de flujo. Mantenga el control de la bomba activo.',
          severity: 'ok',
          icon: 'ShieldCheck'
        }
      ]
    })
  }
})

app.use((error, _request, response, _next) => {
  console.error(error)
  response.status(500).json({
    error: 'Error interno del backend AquaSafe.',
    detail: process.env.NODE_ENV === 'production' ? undefined : error.message,
  })
})

const server = app.listen(appConfig.port, () => {
  console.log(`AquaSafe API escuchando en http://127.0.0.1:${appConfig.port}`)
})

const shutdown = async () => {
  server.close(async () => {
    await closePool()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
