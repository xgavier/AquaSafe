import sql from 'mssql'
import { appConfig, createSqlConfig } from '../src/config.js'

const assertSafeDatabaseName = (name) => {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(
      'DB_DATABASE solo puede contener letras, numeros y guion bajo.',
    )
  }
}

const databaseName = appConfig.databaseName
assertSafeDatabaseName(databaseName)

const createDatabase = async () => {
  const masterPool = await new sql.ConnectionPool(createSqlConfig('master')).connect()

  try {
    await masterPool.request().batch(`
      IF DB_ID(N'${databaseName}') IS NULL
      BEGIN
        CREATE DATABASE [${databaseName}];
      END;
    `)
  } finally {
    await masterPool.close()
  }
}

const createSchema = async (pool) => {
  await pool.request().batch(`
    IF OBJECT_ID(N'dbo.Tanks', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Tanks (
        TankId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Tanks PRIMARY KEY,
        TankCode nvarchar(30) NULL,
        Name nvarchar(80) NOT NULL,
        Location nvarchar(120) NOT NULL,
        CapacityLiters int NOT NULL,
        MinLevelPercent decimal(5,2) NOT NULL CONSTRAINT DF_Tanks_MinLevel DEFAULT (35),
        MaxTemperatureC decimal(5,2) NOT NULL CONSTRAINT DF_Tanks_MaxTemp DEFAULT (31),
        Status nvarchar(40) NOT NULL CONSTRAINT DF_Tanks_Status DEFAULT (N'Operativo'),
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Tanks_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt datetime2(0) NOT NULL CONSTRAINT DF_Tanks_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_Tanks_Capacity CHECK (CapacityLiters > 0),
        CONSTRAINT CK_Tanks_MinLevel CHECK (MinLevelPercent >= 0 AND MinLevelPercent <= 100)
      );
    END;

    IF COL_LENGTH(N'dbo.Tanks', N'TankCode') IS NULL
    BEGIN
      ALTER TABLE dbo.Tanks ADD TankCode nvarchar(30) NULL;
    END;

    IF OBJECT_ID(N'dbo.Sensors', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Sensors (
        SensorId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Sensors PRIMARY KEY,
        TankId int NULL,
        SerialNumber nvarchar(80) NOT NULL,
        SensorType nvarchar(40) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_Sensors_IsActive DEFAULT (1),
        LastSeenAt datetime2(0) NULL,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_Sensors_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Sensors_SerialNumber UNIQUE (SerialNumber),
        CONSTRAINT FK_Sensors_Tanks FOREIGN KEY (TankId) REFERENCES dbo.Tanks(TankId)
      );
    END;

    IF OBJECT_ID(N'dbo.SensorReadings', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.SensorReadings (
        ReadingId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_SensorReadings PRIMARY KEY,
        TankId int NOT NULL,
        WaterLevelPercent decimal(5,2) NOT NULL,
        TemperatureC decimal(5,2) NOT NULL,
        FlowLitersPerMinute decimal(10,2) NOT NULL,
        ConsumptionLiters decimal(10,2) NOT NULL,
        RecordedAt datetime2(0) NOT NULL CONSTRAINT DF_SensorReadings_RecordedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_SensorReadings_Tanks FOREIGN KEY (TankId) REFERENCES dbo.Tanks(TankId),
        CONSTRAINT CK_SensorReadings_Level CHECK (WaterLevelPercent >= 0 AND WaterLevelPercent <= 100),
        CONSTRAINT CK_SensorReadings_Temperature CHECK (TemperatureC >= 0 AND TemperatureC <= 80)
      );
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE name = N'IX_SensorReadings_Tank_RecordedAt'
        AND object_id = OBJECT_ID(N'dbo.SensorReadings')
    )
    BEGIN
      CREATE INDEX IX_SensorReadings_Tank_RecordedAt
      ON dbo.SensorReadings (TankId, RecordedAt DESC);
    END;

    IF OBJECT_ID(N'dbo.Alerts', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Alerts (
        AlertId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_Alerts PRIMARY KEY,
        TankId int NULL,
        AlertType nvarchar(40) NOT NULL,
        Severity nvarchar(20) NOT NULL,
        Title nvarchar(120) NOT NULL,
        Detail nvarchar(300) NOT NULL,
        Status nvarchar(20) NOT NULL CONSTRAINT DF_Alerts_Status DEFAULT (N'open'),
        DetectedAt datetime2(0) NOT NULL CONSTRAINT DF_Alerts_DetectedAt DEFAULT SYSUTCDATETIME(),
        ResolvedAt datetime2(0) NULL,
        CONSTRAINT FK_Alerts_Tanks FOREIGN KEY (TankId) REFERENCES dbo.Tanks(TankId),
        CONSTRAINT CK_Alerts_Severity CHECK (Severity IN (N'critical', N'warning', N'ok')),
        CONSTRAINT CK_Alerts_Status CHECK (Status IN (N'open', N'resolved', N'ignored'))
      );
    END;

    IF OBJECT_ID(N'dbo.DeviceControls', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.DeviceControls (
        DeviceControlId int IDENTITY(1,1) NOT NULL CONSTRAINT PK_DeviceControls PRIMARY KEY,
        ControlKey nvarchar(40) NOT NULL,
        Name nvarchar(90) NOT NULL,
        Description nvarchar(220) NULL,
        IsEnabled bit NOT NULL CONSTRAINT DF_DeviceControls_IsEnabled DEFAULT (0),
        Mode nvarchar(20) NOT NULL CONSTRAINT DF_DeviceControls_Mode DEFAULT (N'manual'),
        UpdatedAt datetime2(0) NOT NULL CONSTRAINT DF_DeviceControls_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_DeviceControls_ControlKey UNIQUE (ControlKey),
        CONSTRAINT CK_DeviceControls_Mode CHECK (Mode IN (N'manual', N'automatic'))
      );
    END;

    IF OBJECT_ID(N'dbo.DeviceEvents', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.DeviceEvents (
        EventId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_DeviceEvents PRIMARY KEY,
        DeviceControlId int NOT NULL,
        EventType nvarchar(40) NOT NULL,
        IsEnabled bit NOT NULL,
        CreatedAt datetime2(0) NOT NULL CONSTRAINT DF_DeviceEvents_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy nvarchar(80) NOT NULL CONSTRAINT DF_DeviceEvents_CreatedBy DEFAULT (N'system'),
        CONSTRAINT FK_DeviceEvents_DeviceControls FOREIGN KEY (DeviceControlId)
          REFERENCES dbo.DeviceControls(DeviceControlId)
      );
    END;

    IF OBJECT_ID(N'dbo.SystemSettings', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.SystemSettings (
        SettingKey nvarchar(60) NOT NULL CONSTRAINT PK_SystemSettings PRIMARY KEY,
        Label nvarchar(120) NOT NULL,
        SettingValue nvarchar(120) NOT NULL,
        Unit nvarchar(20) NULL,
        SortOrder int NOT NULL CONSTRAINT DF_SystemSettings_SortOrder DEFAULT (0),
        UpdatedAt datetime2(0) NOT NULL CONSTRAINT DF_SystemSettings_UpdatedAt DEFAULT SYSUTCDATETIME()
      );
    END;
  `)
}

const seedData = async (pool) => {
  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM dbo.Tanks)
    BEGIN
      INSERT INTO dbo.Tanks (
        TankCode,
        Name,
        Location,
        CapacityLiters,
        MinLevelPercent,
        MaxTemperatureC,
        Status
      )
      VALUES
        (N'AQS-00001', N'Cisterna Norte', N'Planta alta', 1100, 35, 31, N'Operativo'),
        (N'AQS-00002', N'Deposito Central', N'Patio tecnico', 2500, 35, 31, N'Llenado parcial'),
        (N'AQS-00003', N'Reserva Sur', N'Area de servicio', 900, 35, 31, N'Revisar consumo');
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Sensors)
    BEGIN
      INSERT INTO dbo.Sensors (TankId, SerialNumber, SensorType, LastSeenAt)
      SELECT TankId, CONCAT(N'AQS-LVL-', TankId), N'nivel', SYSUTCDATETIME()
      FROM dbo.Tanks;

      INSERT INTO dbo.Sensors (TankId, SerialNumber, SensorType, LastSeenAt)
      SELECT TankId, CONCAT(N'AQS-TMP-', TankId), N'temperatura', SYSUTCDATETIME()
      FROM dbo.Tanks;

      INSERT INTO dbo.Sensors (TankId, SerialNumber, SensorType, LastSeenAt)
      SELECT TankId, CONCAT(N'AQS-FLW-', TankId), N'flujo', SYSUTCDATETIME()
      FROM dbo.Tanks;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.SensorReadings)
    BEGIN
      WITH SampleReadings AS (
        SELECT *
        FROM (VALUES
          (N'Cisterna Norte', 11, 68.0, 24.0, 4.8, 116.0),
          (N'Cisterna Norte', 10, 70.0, 24.1, 4.3, 108.0),
          (N'Cisterna Norte', 9, 73.0, 24.1, 5.1, 124.0),
          (N'Cisterna Norte', 8, 75.0, 24.3, 5.6, 138.0),
          (N'Cisterna Norte', 7, 78.0, 24.5, 6.1, 154.0),
          (N'Cisterna Norte', 6, 81.0, 24.8, 5.8, 146.0),
          (N'Cisterna Norte', 5, 83.0, 24.7, 6.3, 160.0),
          (N'Cisterna Norte', 4, 84.0, 24.9, 5.2, 132.0),
          (N'Cisterna Norte', 3, 82.0, 24.8, 4.8, 120.0),
          (N'Cisterna Norte', 2, 82.0, 24.8, 4.4, 112.0),
          (N'Cisterna Norte', 1, 82.0, 24.8, 4.1, 104.0),
          (N'Cisterna Norte', 0, 82.0, 24.8, 4.0, 102.0),

          (N'Deposito Central', 11, 58.0, 24.7, 3.8, 94.0),
          (N'Deposito Central', 10, 60.0, 24.8, 4.1, 102.0),
          (N'Deposito Central', 9, 62.0, 24.9, 4.3, 108.0),
          (N'Deposito Central', 8, 65.0, 25.0, 4.7, 118.0),
          (N'Deposito Central', 7, 67.0, 25.1, 5.0, 126.0),
          (N'Deposito Central', 6, 68.0, 25.0, 5.2, 130.0),
          (N'Deposito Central', 5, 66.0, 24.9, 4.9, 122.0),
          (N'Deposito Central', 4, 65.0, 24.9, 4.5, 114.0),
          (N'Deposito Central', 3, 64.0, 24.8, 4.2, 106.0),
          (N'Deposito Central', 2, 64.0, 24.8, 4.0, 100.0),
          (N'Deposito Central', 1, 64.0, 24.8, 3.7, 92.0),
          (N'Deposito Central', 0, 64.0, 24.8, 3.5, 88.0),

          (N'Reserva Sur', 11, 48.0, 25.2, 2.2, 58.0),
          (N'Reserva Sur', 10, 46.0, 25.3, 2.5, 64.0),
          (N'Reserva Sur', 9, 44.0, 25.4, 2.8, 72.0),
          (N'Reserva Sur', 8, 43.0, 25.5, 3.1, 78.0),
          (N'Reserva Sur', 7, 42.0, 25.6, 3.5, 86.0),
          (N'Reserva Sur', 6, 41.0, 25.6, 3.2, 80.0),
          (N'Reserva Sur', 5, 40.0, 25.5, 3.0, 76.0),
          (N'Reserva Sur', 4, 39.0, 25.5, 2.8, 70.0),
          (N'Reserva Sur', 3, 39.0, 25.4, 2.7, 66.0),
          (N'Reserva Sur', 2, 38.0, 25.3, 2.5, 62.0),
          (N'Reserva Sur', 1, 38.0, 25.3, 2.4, 60.0),
          (N'Reserva Sur', 0, 38.0, 25.2, 2.3, 58.0)
        ) AS sample (
          TankName,
          HoursAgo,
          WaterLevelPercent,
          TemperatureC,
          FlowLitersPerMinute,
          ConsumptionLiters
        )
      )
      INSERT INTO dbo.SensorReadings (
        TankId,
        WaterLevelPercent,
        TemperatureC,
        FlowLitersPerMinute,
        ConsumptionLiters,
        RecordedAt
      )
      SELECT
        t.TankId,
        sr.WaterLevelPercent,
        sr.TemperatureC,
        sr.FlowLitersPerMinute,
        sr.ConsumptionLiters,
        DATEADD(hour, -sr.HoursAgo, SYSUTCDATETIME())
      FROM SampleReadings AS sr
      INNER JOIN dbo.Tanks AS t ON t.Name = sr.TankName;
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.Alerts)
    BEGIN
      INSERT INTO dbo.Alerts (
        TankId,
        AlertType,
        Severity,
        Title,
        Detail,
        Status,
        DetectedAt,
        ResolvedAt
      )
      SELECT
        t.TankId,
        N'consumo_anormal',
        N'warning',
        N'Consumo fuera de horario',
        N'Flujo sostenido detectado durante 18 minutos.',
        N'open',
        DATEADD(minute, -6, SYSUTCDATETIME()),
        NULL
      FROM dbo.Tanks AS t
      WHERE t.Name = N'Deposito Central'
      UNION ALL
      SELECT
        t.TankId,
        N'nivel_normal',
        N'ok',
        N'Cisterna Norte recuperada',
        N'Nivel normalizado despues del ciclo de bomba.',
        N'resolved',
        DATEADD(minute, -24, SYSUTCDATETIME()),
        DATEADD(minute, -18, SYSUTCDATETIME())
      FROM dbo.Tanks AS t
      WHERE t.Name = N'Cisterna Norte'
      UNION ALL
      SELECT
        t.TankId,
        N'bajo_nivel',
        N'critical',
        N'Reserva Sur en observacion',
        N'Nivel por debajo del umbral de operacion.',
        N'open',
        DATEADD(minute, -41, SYSUTCDATETIME()),
        NULL
      FROM dbo.Tanks AS t
      WHERE t.Name = N'Reserva Sur';
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.DeviceControls)
    BEGIN
      INSERT INTO dbo.DeviceControls (
        ControlKey,
        Name,
        Description,
        IsEnabled,
        Mode
      )
      VALUES
        (N'pump', N'Bomba automatica', N'Presuriza el llenado cuando el nivel baja.', 1, N'automatic'),
        (N'valve', N'Valvula inteligente', N'Regula el paso de agua hacia los depositos.', 1, N'automatic'),
        (N'alarm', N'Alarma sonora', N'Avisa fugas, sobreconsumo o desabastecimiento.', 0, N'manual');
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.SystemSettings)
    BEGIN
      INSERT INTO dbo.SystemSettings (
        SettingKey,
        Label,
        SettingValue,
        Unit,
        SortOrder
      )
      VALUES
        (N'min_level_percent', N'Nivel minimo', N'35', N'%', 1),
        (N'max_temperature_c', N'Temperatura maxima', N'31', N'C', 2),
        (N'abnormal_consumption_percent', N'Consumo anormal', N'+24', N'%', 3);
    END;
  `)
}

const ensureTankIdentifiers = async (pool) => {
  await pool.request().batch(`
    UPDATE dbo.Tanks
    SET TankCode = CONCAT(N'AQS-', RIGHT(CONCAT(N'00000', TankId), 5))
    WHERE TankCode IS NULL OR LTRIM(RTRIM(TankCode)) = N'';

    IF EXISTS (
      SELECT 1
      FROM sys.columns
      WHERE object_id = OBJECT_ID(N'dbo.Tanks')
        AND name = N'TankCode'
        AND is_nullable = 1
    )
    BEGIN
      ALTER TABLE dbo.Tanks ALTER COLUMN TankCode nvarchar(30) NOT NULL;
    END;

    IF NOT EXISTS (
      SELECT 1
      FROM sys.indexes
      WHERE name = N'UQ_Tanks_TankCode'
        AND object_id = OBJECT_ID(N'dbo.Tanks')
    )
    BEGIN
      CREATE UNIQUE INDEX UQ_Tanks_TankCode ON dbo.Tanks (TankCode);
    END;
  `)
}

const printSummary = async (pool) => {
  const result = await pool.request().query(`
    SELECT N'Tanks' AS [table], COUNT(*) AS rows_count FROM dbo.Tanks
    UNION ALL
    SELECT N'Sensors', COUNT(*) FROM dbo.Sensors
    UNION ALL
    SELECT N'SensorReadings', COUNT(*) FROM dbo.SensorReadings
    UNION ALL
    SELECT N'Alerts', COUNT(*) FROM dbo.Alerts
    UNION ALL
    SELECT N'DeviceControls', COUNT(*) FROM dbo.DeviceControls
    UNION ALL
    SELECT N'SystemSettings', COUNT(*) FROM dbo.SystemSettings;
  `)

  console.table(result.recordset)
}

const run = async () => {
  console.log(`Creando/verificando base ${databaseName}...`)
  await createDatabase()

  const pool = await new sql.ConnectionPool(createSqlConfig(databaseName)).connect()

  try {
    console.log('Creando/verificando tablas...')
    await createSchema(pool)

    console.log('Insertando datos semilla si hacen falta...')
    await seedData(pool)

    console.log('Verificando identificadores unicos de cisternas...')
    await ensureTankIdentifiers(pool)

    console.log('Resumen de datos:')
    await printSummary(pool)
  } finally {
    await pool.close()
  }
}

run().catch((error) => {
  console.error('No se pudo preparar la base de datos AquaSafe.')
  console.error(error.message)
  process.exitCode = 1
})
