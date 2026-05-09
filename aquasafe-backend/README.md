# AquaSafe Backend

Backend Node.js/Express conectado a SQL Server para alimentar el dashboard AquaSafe.

## Comandos

```bash
npm install
npm run setup:db
npm run start
```

La API queda disponible en:

```text
http://127.0.0.1:4000/api
```

## Endpoints

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/tanks`
- `POST /api/tanks`
- `PUT /api/tanks/:tankId`
- `DELETE /api/tanks/:tankId`
- `GET /api/alerts`
- `GET /api/controls`
- `PATCH /api/controls/:controlKey`

Ejemplo para cambiar un control:

```bash
curl -X PATCH http://127.0.0.1:4000/api/controls/pump \
  -H "Content-Type: application/json" \
  -d "{\"enabled\":true}"
```

Ejemplo para crear una cisterna:

```bash
curl -X POST http://127.0.0.1:4000/api/tanks \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Cisterna nueva\",\"location\":\"Azotea\",\"capacityLiters\":1100,\"initialLevelPercent\":50,\"initialTemperatureC\":24,\"minLevelPercent\":35,\"maxTemperatureC\":31,\"status\":\"Operativo\"}"
```

## Tablas

- `dbo.Tanks`
- `dbo.Sensors`
- `dbo.SensorReadings`
- `dbo.Alerts`
- `dbo.DeviceControls`
- `dbo.DeviceEvents`
- `dbo.SystemSettings`

## Configuracion

La configuracion local vive en `.env`. El archivo `.env.example` muestra las variables necesarias sin credenciales reales.
