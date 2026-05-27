import os
import json
from decimal import Decimal
from datetime import date, datetime
from typing import Any, List, Literal

import pyodbc
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from pydantic import BaseModel, Field


# ==========================
# Cargar variables de entorno
# ==========================

load_dotenv()


# ==========================
# App FastAPI
# ==========================

app = FastAPI(title="AquaSafe AI Recommendation Service")


# ==========================
# CORS
# ==========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================
# Variables de entorno
# ==========================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Para evitar TCP/IP, usamos Shared Memory con prefijo lpc:
# Ejemplo:
# DB_SERVER=lpc:GT-NU-WEB-MD\MSSQL_25
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server")
DB_SERVER = os.getenv("DB_SERVER", r"lpc:GT-NU-WEB-MD\MSSQL_25")
DB_USER = os.getenv("DB_USER", "sa")
DB_PASSWORD = os.getenv("DB_PASSWORD", "change_me")
DB_DATABASE = os.getenv("DB_DATABASE", "AquaSafeDB")
DB_TRUST_CERT = os.getenv("DB_TRUST_CERT", "yes")
DB_ENCRYPT = os.getenv("DB_ENCRYPT", "yes")


# ==========================
# Modelos de respuesta IA
# ==========================

class RecommendationItem(BaseModel):
    title: str = Field(..., description="Título corto en español")
    detail: str = Field(..., description="Detalle breve de la recomendación")
    severity: Literal["critical", "warning", "ok"]
    icon: Literal[
        "Zap",
        "Droplets",
        "Thermometer",
        "AlertTriangle",
        "ShieldCheck",
        "SlidersHorizontal",
        "Activity",
    ]


class RecommendationResponse(BaseModel):
    recommendations: List[RecommendationItem]


# ==========================
# Configurar Gemini
# ==========================

use_gemini = False
gemini_client = None

if GEMINI_API_KEY:
    try:
        gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        use_gemini = True
        print("[AI] Gemini API configurada correctamente.")
    except Exception as e:
        print(f"[AI] Error al inicializar Gemini SDK: {e}")
else:
    print("[AI] GEMINI_API_KEY no configurada. Usando motor de reglas local.")


# ==========================
# Helpers DB
# ==========================

def _json_safe(value: Any) -> Any:
    """
    Convierte tipos de SQL Server/pyodbc a valores serializables en JSON.
    """
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _rows_to_dicts(cursor) -> list[dict]:
    """
    Convierte resultados de pyodbc a lista de diccionarios.
    pyodbc no soporta cursor(as_dict=True) como pymssql.
    """
    columns = [column[0] for column in cursor.description]
    rows = []

    for row in cursor.fetchall():
        item = {}
        for index, column_name in enumerate(columns):
            item[column_name] = _json_safe(row[index])
        rows.append(item)

    return rows


# ==========================
# Base de datos con pyodbc
# ==========================

def get_db_connection():
    """
    Conecta a SQL Server usando ODBC.
    Con DB_SERVER=lpc:SERVIDOR\INSTANCIA fuerza Shared Memory y evita TCP/IP.
    """
    connection_string = (
        f"DRIVER={{{DB_DRIVER}}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_DATABASE};"
        f"UID={DB_USER};"
        f"PWD={DB_PASSWORD};"
        f"Encrypt={DB_ENCRYPT};"
        f"TrustServerCertificate={DB_TRUST_CERT};"
        "Connection Timeout=3;"
    )

    return pyodbc.connect(connection_string)


def get_system_data():
    """
    Obtiene el estado actual de tanques y alertas desde SQL Server.
    Si falla la conexión, devuelve datos simulados para evitar que el API se caiga.
    """
    conn = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
              t.TankId,
              t.Name,
              t.CapacityLiters,
              t.MinLevelPercent,
              t.MaxTemperatureC,
              t.Status,
              COALESCE(r.WaterLevelPercent, 0) AS LevelPercent,
              COALESCE(r.TemperatureC, 0) AS TemperatureC,
              COALESCE(r.RecordedAt, SYSUTCDATETIME()) AS LastSeen
            FROM dbo.Tanks AS t
            OUTER APPLY (
              SELECT TOP 1 WaterLevelPercent, TemperatureC, RecordedAt
              FROM dbo.SensorReadings
              WHERE TankId = t.TankId
              ORDER BY RecordedAt DESC, ReadingId DESC
            ) AS r
        """)

        tanks = _rows_to_dicts(cursor)

        for tank in tanks:
            tank["LevelPercent"] = float(tank.get("LevelPercent") or 0)
            tank["TemperatureC"] = float(tank.get("TemperatureC") or 0)
            tank["MinLevelPercent"] = float(tank.get("MinLevelPercent") or 35)
            tank["MaxTemperatureC"] = float(tank.get("MaxTemperatureC") or 31)

        cursor.execute("""
            SELECT Title, Detail, Severity, DetectedAt
            FROM dbo.Alerts
            WHERE Status = 'open'
            ORDER BY DetectedAt DESC
        """)

        alerts = _rows_to_dicts(cursor)

        return {
            "tanks": tanks,
            "alerts": alerts,
            "source": "SQL Server"
        }

    except Exception as e:
        print(f"[WARN] Error conectando a SQL Server ({e}). Usando datos temporales para IA.")

        return {
            "tanks": [
                {
                    "TankId": 1,
                    "Name": "Tinaco Norte",
                    "CapacityLiters": 1100,
                    "MinLevelPercent": 35.0,
                    "MaxTemperatureC": 31.0,
                    "Status": "Operativo",
                    "LevelPercent": 82.0,
                    "TemperatureC": 24.8,
                    "LastSeen": "2026-05-21T21:00:00"
                },
                {
                    "TankId": 2,
                    "Name": "Deposito Central",
                    "CapacityLiters": 2500,
                    "MinLevelPercent": 35.0,
                    "MaxTemperatureC": 31.0,
                    "Status": "Revisar consumo",
                    "LevelPercent": 34.0,
                    "TemperatureC": 25.0,
                    "LastSeen": "2026-05-21T21:00:00"
                }
            ],
            "alerts": [
                {
                    "Title": "Nivel bajo: Deposito Central",
                    "Detail": "El depósito Central está en 34%, por debajo del 35% configurado.",
                    "Severity": "critical",
                    "DetectedAt": "2026-05-21T21:20:00"
                }
            ],
            "source": "Mock (Fallback DB Offline)"
        }

    finally:
        if conn:
            conn.close()


# ==========================
# Motor local de reglas
# ==========================

def generate_local_heuristics(data):
    """
    Genera recomendaciones usando reglas locales.
    Este motor sirve como respaldo si Gemini falla o no hay API key.
    """
    recommendations = []
    has_critical = False

    tanks = data.get("tanks", [])
    alerts = data.get("alerts", [])

    for tank in tanks:
        name = tank.get("Name", "Tinaco")
        lvl = float(tank.get("LevelPercent", 0))
        min_lvl = float(tank.get("MinLevelPercent", 35))
        temp = float(tank.get("TemperatureC", 0))
        max_temp = float(tank.get("MaxTemperatureC", 31))
        status = str(tank.get("Status", ""))

        if status.lower() == "revisar consumo" or "fuga" in str(alerts).lower():
            recommendations.append({
                "id": f"hr-fuga-{tank.get('TankId', 'x')}",
                "title": "Fuga activa detectada",
                "detail": f"Se registra caída inusual en {name}. Cierre la válvula inteligente para mitigar pérdidas.",
                "severity": "critical",
                "icon": "AlertTriangle"
            })
            has_critical = True

        elif lvl < min_lvl:
            recommendations.append({
                "id": f"hr-nivel-{tank.get('TankId', 'x')}",
                "title": f"Bajo nivel en {name}",
                "detail": f"Nivel actual {lvl}% inferior al mínimo {min_lvl}%. Active la bomba automática.",
                "severity": "critical",
                "icon": "Zap"
            })
            has_critical = True

        if temp > max_temp:
            recommendations.append({
                "id": f"hr-temp-{tank.get('TankId', 'x')}",
                "title": f"Alta temperatura: {name}",
                "detail": f"Temperatura de {temp}°C supera el límite de {max_temp}°C. Revise ventilación y estancamiento.",
                "severity": "warning",
                "icon": "Thermometer"
            })

    if not has_critical:
        recommendations.append({
            "id": "hr-efficiency-1",
            "title": "Optimización del llenado",
            "detail": "Programe el llenado durante la mañana para reducir evaporación y estabilizar consumo.",
            "severity": "ok",
            "icon": "Droplets"
        })
        recommendations.append({
            "id": "hr-efficiency-2",
            "title": "Mantenimiento preventivo",
            "detail": "El sistema está estable. Programe limpieza semestral de sensores ultrasónicos.",
            "severity": "ok",
            "icon": "ShieldCheck"
        })
    else:
        recommendations.append({
            "id": "hr-efficiency-auto",
            "title": "Activar modo automático",
            "detail": "Active la bomba en modo automático para normalizar el flujo de agua.",
            "severity": "ok",
            "icon": "SlidersHorizontal"
        })

    return recommendations[:3]


def _model_to_dict(model):
    """
    Compatibilidad entre Pydantic v1 y v2.
    """
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


# ==========================
# Generación con Gemini
# ==========================

def generate_gemini_recommendations(data):
    """
    Usa Google Gemini para generar recomendaciones en JSON estructurado.
    Si Gemini falla, usa el motor local.
    """
    try:
        if not gemini_client:
            raise RuntimeError("Cliente Gemini no inicializado")

        prompt = f"""
Eres un consultor experto en optimización de recursos hídricos y sistemas de agua para AquaSafe.

Tu tarea:
- Analizar tanques, niveles, temperatura, estado y alertas.
- Generar exactamente 2 o 3 recomendaciones prioritarias.
- Responder en español.
- Ser breve, directo y útil para un operador del sistema.
- No inventar datos que no estén en el JSON.
- Si hay fuga, bajo nivel o temperatura alta, prioriza eso.

Estado actual del sistema AquaSafe en JSON:

{json.dumps(data, indent=2, ensure_ascii=False)}

Reglas de salida:
- title: máximo 6 palabras.
- detail: máximo 25 palabras.
- severity: critical, warning u ok.
- icon: Zap, Droplets, Thermometer, AlertTriangle, ShieldCheck, SlidersHorizontal o Activity.

Devuelve únicamente JSON válido con esta estructura:

{{
  "recommendations": [
    {{
      "title": "texto",
      "detail": "texto",
      "severity": "critical|warning|ok",
      "icon": "Zap|Droplets|Thermometer|AlertTriangle|ShieldCheck|SlidersHorizontal|Activity"
    }}
  ]
}}
"""

        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RecommendationResponse,
                temperature=0.2,
            ),
        )

        if hasattr(response, "parsed") and response.parsed:
            if isinstance(response.parsed, RecommendationResponse):
                parsed_response = response.parsed
            else:
                parsed_response = RecommendationResponse.model_validate(response.parsed)
        else:
            parsed_response = RecommendationResponse.model_validate_json(response.text)

        recommendations = []

        for index, item in enumerate(parsed_response.recommendations[:3]):
            rec = _model_to_dict(item)
            rec["id"] = f"gemini-rec-{index}"
            recommendations.append(rec)

        if not recommendations:
            raise RuntimeError("Gemini no devolvió recomendaciones")

        print("[AI] Recomendaciones generadas exitosamente con Gemini API.")
        return recommendations

    except Exception as e:
        print(f"[AI] Falló la generación con Gemini ({e}). Usando motor de reglas local.")
        return generate_local_heuristics(data)


# ==========================
# Endpoints
# ==========================

@app.get("/")
async def root():
    return {
        "success": True,
        "service": "AquaSafe AI Recommendation Service",
        "docs": "/docs",
        "recommendations": "/api/recommendations"
    }


@app.get("/api/recommendations")
async def get_recommendations():
    """
    Endpoint principal para obtener recomendaciones inteligentes de AquaSafe.
    """
    system_data = get_system_data()

    if use_gemini:
        recs = generate_gemini_recommendations(system_data)
    else:
        recs = generate_local_heuristics(system_data)

    used_gemini = bool(recs) and not recs[0]["id"].startswith("hr-")

    return {
        "success": True,
        "source": "Google Gemini" if used_gemini else "Local Heuristics Engine",
        "model": GEMINI_MODEL if used_gemini else None,
        "dbSource": system_data["source"],
        "recommendations": recs
    }


# ==========================
# Run local
# ==========================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
