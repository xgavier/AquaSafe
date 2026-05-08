import { randomUUID } from 'node:crypto'
import { sql } from './db.js'

const controlDescriptions = {
  pump: 'Presuriza el llenado cuando el nivel baja.',
  valve: 'Regula el paso de agua hacia los depositos.',
  alarm: 'Avisa fugas, sobreconsumo o desabastecimiento.',
}

const metricMeta = [
  { key: 'level', label: 'Nivel promedio', tone: 'aqua' },
  { key: 'temperature', label: 'Temperatura', tone: 'teal' },
  { key: 'consumption', label: 'Consumo diario', tone: 'amber' },
  { key: 'risk', label: 'Riesgo activo', tone: 'coral' },
]

const createTankIdentifier = () =>
  `AQS-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined) {
    return fallback
  }

  return Number(value)
}

const formatCapacity = (value) =>
  `${new Intl.NumberFormat('es-GT').format(toNumber(value))} L`

const getTankTone = (level) => {
  if (level >= 70) {
    return 'success'
  }

  if (level >= 50) {
    return 'info'
  }

  if (level >= 35) {
    return 'warning'
  }

  return 'danger'
}

const getRiskLabel = (criticalCount, warningCount) => {
  if (criticalCount > 0) {
    return 'Alto'
  }

  if (warningCount > 1) {
    return 'Medio'
  }

  return 'Bajo'
}

const getRelativeTime = (dateValue) => {
  if (!dateValue) {
    return 'Sin fecha'
  }

  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(dateValue).getTime()) / 60000),
  )

  if (minutes < 1) {
    return 'Ahora'
  }

  if (minutes < 60) {
    return `Hace ${minutes} min`
  }

  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `Hace ${hours} h`
  }

  return `Hace ${Math.round(hours / 24)} d`
}

const normalizeBars = (values, fallback) => {
  if (!values.length) {
    return fallback
  }

  const max = Math.max(...values, 1)
  return values.map((value) => Math.max(14, Math.round((value / max) * 100)))
}

export const getTanks = async (pool) => {
  const result = await pool.request().query(`
    SELECT
      t.TankId AS id,
      t.TankCode AS identifier,
      t.Name AS name,
      t.Location AS location,
      t.CapacityLiters AS capacityLiters,
      t.MinLevelPercent AS minLevelPercent,
      t.MaxTemperatureC AS maxTemperatureC,
      t.Status AS status,
      COALESCE(r.WaterLevelPercent, 0) AS level,
      COALESCE(r.TemperatureC, 0) AS temperature,
      r.RecordedAt AS recordedAt
    FROM dbo.Tanks AS t
    OUTER APPLY (
      SELECT TOP 1
        sr.WaterLevelPercent,
        sr.TemperatureC,
        sr.RecordedAt
      FROM dbo.SensorReadings AS sr
      WHERE sr.TankId = t.TankId
      ORDER BY sr.RecordedAt DESC, sr.ReadingId DESC
    ) AS r
    ORDER BY t.TankId;
  `)

  return result.recordset.map((tank) => {
    const level = Math.round(toNumber(tank.level))

    return {
      id: tank.id,
      identifier: tank.identifier,
      name: tank.name,
      location: tank.location,
      level,
      temperature: Number(toNumber(tank.temperature).toFixed(1)),
      capacityLiters: tank.capacityLiters,
      capacity: formatCapacity(tank.capacityLiters),
      minLevelPercent: Number(toNumber(tank.minLevelPercent).toFixed(1)),
      maxTemperatureC: Number(toNumber(tank.maxTemperatureC).toFixed(1)),
      status: tank.status,
      tone: getTankTone(level),
      recordedAt: tank.recordedAt,
    }
  })
}

const getTankById = async (pool, tankId) => {
  const result = await pool
    .request()
    .input('tankId', sql.Int, tankId)
    .query(`
      SELECT
        t.TankId AS id,
        t.TankCode AS identifier,
        t.Name AS name,
        t.Location AS location,
        t.CapacityLiters AS capacityLiters,
        t.MinLevelPercent AS minLevelPercent,
        t.MaxTemperatureC AS maxTemperatureC,
        t.Status AS status,
        COALESCE(r.WaterLevelPercent, 0) AS level,
        COALESCE(r.TemperatureC, 0) AS temperature,
        r.RecordedAt AS recordedAt
      FROM dbo.Tanks AS t
      OUTER APPLY (
        SELECT TOP 1
          sr.WaterLevelPercent,
          sr.TemperatureC,
          sr.RecordedAt
        FROM dbo.SensorReadings AS sr
        WHERE sr.TankId = t.TankId
        ORDER BY sr.RecordedAt DESC, sr.ReadingId DESC
      ) AS r
      WHERE t.TankId = @tankId;
    `)

  const tank = result.recordset[0]

  if (!tank) {
    return null
  }

  const level = Math.round(toNumber(tank.level))

  return {
    id: tank.id,
    identifier: tank.identifier,
    name: tank.name,
    location: tank.location,
    level,
    temperature: Number(toNumber(tank.temperature).toFixed(1)),
    capacityLiters: tank.capacityLiters,
    capacity: formatCapacity(tank.capacityLiters),
    minLevelPercent: Number(toNumber(tank.minLevelPercent).toFixed(1)),
    maxTemperatureC: Number(toNumber(tank.maxTemperatureC).toFixed(1)),
    status: tank.status,
    tone: getTankTone(level),
    recordedAt: tank.recordedAt,
  }
}

export const createTank = async (pool, tankInput) => {
  const tankIdentifier = createTankIdentifier()
  const request = pool
    .request()
    .input('tankCode', sql.NVarChar(30), tankIdentifier)
    .input('name', sql.NVarChar(80), tankInput.name)
    .input('location', sql.NVarChar(120), tankInput.location)
    .input('capacityLiters', sql.Int, tankInput.capacityLiters)
    .input('minLevelPercent', sql.Decimal(5, 2), tankInput.minLevelPercent)
    .input('maxTemperatureC', sql.Decimal(5, 2), tankInput.maxTemperatureC)
    .input('status', sql.NVarChar(40), tankInput.status)
    .input('initialLevelPercent', sql.Decimal(5, 2), tankInput.initialLevelPercent)
    .input('initialTemperatureC', sql.Decimal(5, 2), tankInput.initialTemperatureC)

  const result = await request.query(`
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;

    DECLARE @InsertedTank table (TankId int);
    DECLARE @TankId int;

    INSERT INTO dbo.Tanks (
      Name,
      TankCode,
      Location,
      CapacityLiters,
      MinLevelPercent,
      MaxTemperatureC,
      Status
    )
    OUTPUT inserted.TankId INTO @InsertedTank
    VALUES (
      @name,
      @tankCode,
      @location,
      @capacityLiters,
      @minLevelPercent,
      @maxTemperatureC,
      @status
    );

    SELECT @TankId = TankId FROM @InsertedTank;

    INSERT INTO dbo.Sensors (
      TankId,
      SerialNumber,
      SensorType,
      LastSeenAt
    )
    VALUES
      (@TankId, CONCAT(N'AQS-LVL-', @TankId), N'nivel', SYSUTCDATETIME()),
      (@TankId, CONCAT(N'AQS-TMP-', @TankId), N'temperatura', SYSUTCDATETIME()),
      (@TankId, CONCAT(N'AQS-FLW-', @TankId), N'flujo', SYSUTCDATETIME());

    INSERT INTO dbo.SensorReadings (
      TankId,
      WaterLevelPercent,
      TemperatureC,
      FlowLitersPerMinute,
      ConsumptionLiters,
      RecordedAt
    )
    VALUES (
      @TankId,
      @initialLevelPercent,
      @initialTemperatureC,
      0,
      0,
      SYSUTCDATETIME()
    );

    IF @initialLevelPercent < @minLevelPercent
    BEGIN
      INSERT INTO dbo.Alerts (
        TankId,
        AlertType,
        Severity,
        Title,
        Detail,
        Status,
        DetectedAt
      )
      VALUES (
        @TankId,
        N'bajo_nivel',
        N'critical',
        CONCAT(N'Nivel bajo: ', @name),
        CONCAT(N'El tinaco ', @name, N' esta en ', FORMAT(@initialLevelPercent, N'0.##'), N'%, por debajo del minimo configurado de ', FORMAT(@minLevelPercent, N'0.##'), N'%.'),
        N'open',
        SYSUTCDATETIME()
      );
    END;

    COMMIT TRANSACTION;

    SELECT @TankId AS tankId;
  `)

  return getTankById(pool, result.recordset[0].tankId)
}

export const updateTank = async (pool, tankId, tankInput) => {
  const result = await pool
    .request()
    .input('tankId', sql.Int, tankId)
    .input('name', sql.NVarChar(80), tankInput.name)
    .input('location', sql.NVarChar(120), tankInput.location)
    .input('capacityLiters', sql.Int, tankInput.capacityLiters)
    .input('minLevelPercent', sql.Decimal(5, 2), tankInput.minLevelPercent)
    .input('maxTemperatureC', sql.Decimal(5, 2), tankInput.maxTemperatureC)
    .input('status', sql.NVarChar(40), tankInput.status)
    .input('levelPercent', sql.Decimal(5, 2), tankInput.levelPercent)
    .input('temperatureC', sql.Decimal(5, 2), tankInput.temperatureC)
    .query(`
      SET XACT_ABORT ON;

      BEGIN TRANSACTION;

      DECLARE @PreviousStatus nvarchar(40);
      DECLARE @AlertType nvarchar(40);
      DECLARE @AlertSeverity nvarchar(20);
      DECLARE @AlertTitle nvarchar(120);
      DECLARE @AlertDetail nvarchar(300);

      SELECT @PreviousStatus = Status
      FROM dbo.Tanks
      WHERE TankId = @tankId;

      IF @PreviousStatus IS NULL
      BEGIN
        ROLLBACK TRANSACTION;
        SELECT CAST(0 AS bit) AS found;
        RETURN;
      END;

      UPDATE dbo.Tanks
      SET Name = @name,
          Location = @location,
          CapacityLiters = @capacityLiters,
          MinLevelPercent = @minLevelPercent,
          MaxTemperatureC = @maxTemperatureC,
          Status = @status,
          UpdatedAt = SYSUTCDATETIME()
      WHERE TankId = @tankId;

      INSERT INTO dbo.SensorReadings (
        TankId,
        WaterLevelPercent,
        TemperatureC,
        FlowLitersPerMinute,
        ConsumptionLiters,
        RecordedAt
      )
      VALUES (
        @tankId,
        @levelPercent,
        @temperatureC,
        0,
        0,
        SYSUTCDATETIME()
      );

      IF @PreviousStatus = N'Operativo'
        AND @status IN (N'Revisar consumo', N'Mantenimiento')
      BEGIN
        SET @AlertType = CASE
          WHEN @status = N'Revisar consumo' THEN N'cambio_revisar_consumo'
          ELSE N'cambio_mantenimiento'
        END;

        SET @AlertSeverity = CASE
          WHEN @status = N'Revisar consumo' THEN N'critical'
          ELSE N'warning'
        END;

        SET @AlertTitle = CASE
          WHEN @status = N'Revisar consumo' THEN CONCAT(N'Revisar consumo: ', @name)
          ELSE CONCAT(N'Mantenimiento: ', @name)
        END;

        SET @AlertDetail = CASE
          WHEN @status = N'Revisar consumo'
            THEN CONCAT(N'El tinaco ', @name, N' paso de Operativo a Revisar consumo. Revisa posible consumo anormal o fuga.')
          ELSE CONCAT(N'El tinaco ', @name, N' paso de Operativo a Mantenimiento. Se requiere seguimiento operativo.')
        END;

        INSERT INTO dbo.Alerts (
          TankId,
          AlertType,
          Severity,
          Title,
          Detail,
          Status,
          DetectedAt
        )
        VALUES (
          @tankId,
          @AlertType,
          @AlertSeverity,
          @AlertTitle,
          @AlertDetail,
          N'open',
          SYSUTCDATETIME()
        );
      END;

      IF @levelPercent < @minLevelPercent
        AND NOT EXISTS (
          SELECT 1
          FROM dbo.Alerts
          WHERE TankId = @tankId
            AND AlertType = N'bajo_nivel'
            AND Status = N'open'
        )
      BEGIN
        INSERT INTO dbo.Alerts (
          TankId,
          AlertType,
          Severity,
          Title,
          Detail,
          Status,
          DetectedAt
        )
        VALUES (
          @tankId,
          N'bajo_nivel',
          N'critical',
          CONCAT(N'Nivel bajo: ', @name),
          CONCAT(N'El tinaco ', @name, N' esta en ', FORMAT(@levelPercent, N'0.##'), N'%, por debajo del minimo configurado de ', FORMAT(@minLevelPercent, N'0.##'), N'%.'),
          N'open',
          SYSUTCDATETIME()
        );
      END;

      IF @levelPercent >= @minLevelPercent
      BEGIN
        UPDATE dbo.Alerts
        SET Status = N'resolved',
            ResolvedAt = COALESCE(ResolvedAt, SYSUTCDATETIME())
        WHERE TankId = @tankId
          AND AlertType = N'bajo_nivel'
          AND Status = N'open';
      END;

      COMMIT TRANSACTION;

      SELECT CAST(1 AS bit) AS found;
    `)

  if (!result.recordset[0]?.found) {
    return null
  }

  return getTankById(pool, tankId)
}

export const deleteTank = async (pool, tankId) => {
  const result = await pool
    .request()
    .input('tankId', sql.Int, tankId)
    .query(`
      SET XACT_ABORT ON;

      BEGIN TRANSACTION;

      IF NOT EXISTS (SELECT 1 FROM dbo.Tanks WHERE TankId = @tankId)
      BEGIN
        ROLLBACK TRANSACTION;
        SELECT CAST(0 AS bit) AS found;
        RETURN;
      END;

      DELETE FROM dbo.SensorReadings WHERE TankId = @tankId;
      DELETE FROM dbo.Sensors WHERE TankId = @tankId;
      DELETE FROM dbo.Alerts WHERE TankId = @tankId;
      DELETE FROM dbo.Tanks WHERE TankId = @tankId;

      COMMIT TRANSACTION;

      SELECT CAST(1 AS bit) AS found;
    `)

  return Boolean(result.recordset[0]?.found)
}

export const getAlerts = async (pool) => {
  const result = await pool.request().query(`
    SELECT
      AlertId AS id,
      Title AS title,
      Detail AS detail,
      Severity AS severity,
      Status AS status,
      DetectedAt AS detectedAt,
      ResolvedAt AS resolvedAt
    FROM dbo.Alerts
    ORDER BY DetectedAt DESC;
  `)

  return result.recordset.map((alert) => ({
    ...alert,
    time: getRelativeTime(alert.detectedAt),
  }))
}

export const getControls = async (pool) => {
  const result = await pool.request().query(`
    SELECT
      ControlKey AS id,
      Name AS title,
      Description AS description,
      IsEnabled AS enabled,
      Mode AS mode,
      UpdatedAt AS updatedAt
    FROM dbo.DeviceControls
    ORDER BY DeviceControlId;
  `)

  return result.recordset.map((control) => ({
    ...control,
    description: control.description ?? controlDescriptions[control.id],
    enabled: Boolean(control.enabled),
  }))
}

export const getSettings = async (pool) => {
  const result = await pool.request().query(`
    SELECT
      SettingKey AS [key],
      Label AS label,
      SettingValue AS value,
      Unit AS unit
    FROM dbo.SystemSettings
    ORDER BY SortOrder;
  `)

  return result.recordset
}

export const getHourlyConsumption = async (pool) => {
  const result = await pool.request().query(`
    SELECT TOP 12
      DATEADD(hour, DATEDIFF(hour, 0, RecordedAt), 0) AS bucket,
      SUM(ConsumptionLiters) AS liters
    FROM dbo.SensorReadings
    GROUP BY DATEADD(hour, DATEDIFF(hour, 0, RecordedAt), 0)
    ORDER BY bucket DESC;
  `)

  return result.recordset
    .reverse()
    .map((row) => Math.round(toNumber(row.liters)))
}

export const getActiveSensorCount = async (pool) => {
  const result = await pool.request().query(`
    SELECT COUNT(*) AS activeSensors
    FROM dbo.Sensors AS s
    INNER JOIN dbo.Tanks AS t ON t.TankId = s.TankId
    WHERE s.IsActive = 1
      AND t.Status = N'Operativo';
  `)

  return Number(result.recordset[0]?.activeSensors ?? 0)
}

export const getDashboard = async (pool) => {
  const [
    tanks,
    alerts,
    controls,
    settings,
    hourlyConsumption,
    activeSensorCount,
  ] = await Promise.all([
    getTanks(pool),
    getAlerts(pool),
    getControls(pool),
    getSettings(pool),
    getHourlyConsumption(pool),
    getActiveSensorCount(pool),
  ])

  const averageLevel =
    tanks.length > 0
      ? Math.round(tanks.reduce((total, tank) => total + tank.level, 0) / tanks.length)
      : 0

  const averageTemperature =
    tanks.length > 0
      ? tanks.reduce((total, tank) => total + tank.temperature, 0) / tanks.length
      : 0

  const dailyConsumption = hourlyConsumption.reduce((total, value) => total + value, 0)
  const criticalCount = alerts.filter((alert) => alert.severity === 'critical').length
  const warningCount = alerts.filter((alert) => alert.severity === 'warning').length

  return {
    overview: {
      status: criticalCount > 0 ? 'Requiere revision' : 'Sistema estable',
      healthScore: Math.max(64, 96 - criticalCount * 16 - warningCount * 4),
      activeDevices: activeSensorCount,
    },
    metrics: metricMeta.map((metric) => {
      if (metric.key === 'level') {
        return {
          ...metric,
          value: `${averageLevel}%`,
          trend: tanks.some((tank) => tank.level < 40)
            ? '1 deposito bajo'
            : '+8% vs ayer',
          bars: normalizeBars(tanks.map((tank) => tank.level), [45, 58, 62, 72, 76]),
        }
      }

      if (metric.key === 'temperature') {
        return {
          ...metric,
          value: `${averageTemperature.toFixed(1)} C`,
          trend: 'Estable',
          bars: normalizeBars(
            tanks.map((tank) => tank.temperature),
            [48, 51, 49, 54, 52],
          ),
        }
      }

      if (metric.key === 'consumption') {
        return {
          ...metric,
          value: `${new Intl.NumberFormat('es-GT').format(dailyConsumption)} L`,
          trend: '-12% esperado',
          bars: normalizeBars(hourlyConsumption, [74, 66, 71, 55, 48, 43, 51]),
        }
      }

      return {
        ...metric,
        value: getRiskLabel(criticalCount, warningCount),
        trend: `${criticalCount + warningCount} alertas activas`,
        bars: [32, 28, 24, 21, 18, 16, 14],
      }
    }),
    tanks,
    alerts: alerts.slice(0, 3),
    controls,
    settings,
    hourlyUse: normalizeBars(hourlyConsumption, [38, 46, 35, 58, 74, 63, 84]),
  }
}

export const updateControl = async (pool, controlKey, enabled) => {
  const result = await pool
    .request()
    .input('controlKey', sql.NVarChar(40), controlKey)
    .input('enabled', sql.Bit, enabled)
    .query(`
      DECLARE @DeviceControlId int;

      SELECT @DeviceControlId = DeviceControlId
      FROM dbo.DeviceControls
      WHERE ControlKey = @controlKey;

      IF @DeviceControlId IS NULL
      BEGIN
        SELECT CAST(0 AS bit) AS found;
        RETURN;
      END;

      UPDATE dbo.DeviceControls
      SET IsEnabled = @enabled,
          UpdatedAt = SYSUTCDATETIME()
      WHERE DeviceControlId = @DeviceControlId;

      INSERT INTO dbo.DeviceEvents (
        DeviceControlId,
        EventType,
        IsEnabled,
        CreatedBy
      )
      VALUES (
        @DeviceControlId,
        'manual_toggle',
        @enabled,
        'dashboard'
      );

      SELECT
        CAST(1 AS bit) AS found,
        ControlKey AS id,
        Name AS title,
        Description AS description,
        IsEnabled AS enabled,
        Mode AS mode,
        UpdatedAt AS updatedAt
      FROM dbo.DeviceControls
      WHERE DeviceControlId = @DeviceControlId;
    `)

  const row = result.recordset[0]

  if (!row?.found) {
    return null
  }

  return {
    ...row,
    enabled: Boolean(row.enabled),
    found: undefined,
  }
}
