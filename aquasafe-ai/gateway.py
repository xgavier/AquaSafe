import os
import time
import re
import random
import requests
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

PORT = os.getenv("SERIAL_PORT", "COM3")
BAUDRATE = int(os.getenv("SERIAL_BAUDRATE", 9600))
INTERVAL = float(os.getenv("TELEMETRY_INTERVAL", 2.0))
TANK_CODE = os.getenv("TANK_CODE", "AQS-00001")
MOCK_SERIAL = os.getenv("MOCK_SERIAL", "false").lower() in ("true", "1", "yes")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000/api/telemetry")

print("====================================================")
print("     AquaSafe - Puerta de Enlace de Telemetría      ")
print("====================================================")
print(f"Tinaco destino: {TANK_CODE}")
print(f"URL de Backend: {BACKEND_URL}")
print(f"Intervalo: {INTERVAL} segundos")
if MOCK_SERIAL:
    print("Modo: SIMULACIÓN DE PUERTO SERIAL (MOCK)")
    print("Consejo: Crea un archivo 'simulate_leak.txt' con 'true' para simular fuga.")
else:
    print(f"Modo: LECTURA SERIAL REAL en {PORT} ({BAUDRATE} baudios)")
print("====================================================")

def parse_arduino_data(line):
    """
    Parsea una línea del Arduino con formato:
    Dist: 23.45 cm | Temp: 25.40 C | Fuga: 0/2
    """
    try:
        dist_match = re.search(r"Dist:\s*([\d\.-]+)", line)
        temp_match = re.search(r"Temp:\s*([\d\.-]+)", line)
        fuga_match = re.search(r"Fuga:\s*(\d+)/(\d+)", line)
        
        if not dist_match or not temp_match:
            return None
            
        dist = float(dist_match.group(1))
        temp = float(temp_match.group(1))
        
        # Fuga activa si el contador alcanza el límite configurado (por ejemplo, 2/2)
        is_leak = False
        if fuga_match:
            fuga_count = int(fuga_match.group(1))
            fuga_limit = int(fuga_match.group(2))
            is_leak = fuga_count >= fuga_limit
            
        return dist, temp, is_leak
    except Exception as e:
        print(f"Error parseando datos: {e}")
        return None

def calculate_level_percentage(dist):
    """
    Convierte distancia en cm a porcentaje (0% - 100%)
    DIST_LLENO = 5 cm (100%)
    DIST_VACIO = 35 cm (0%)
    Rango = 30 cm
    """
    if dist < 0:
        return 0.0
    
    # Inverso: a menor distancia, más lleno
    percentage = ((35.0 - dist) / 30.0) * 100.0
    return max(0.0, min(100.0, round(percentage, 1)))

def send_telemetry(level_percent, temp, is_leak):
    payload = {
        "tankCode": TANK_CODE,
        "waterLevelPercent": level_percent,
        "temperatureC": temp,
        "isLeak": is_leak
    }
    
    try:
        response = requests.post(BACKEND_URL, json=payload, timeout=3)
        if response.status_code == 201:
            print(f"[OK] Telemetría enviada: Nivel: {level_percent}% | Temp: {temp}°C | Fuga: {is_leak}")
        else:
            print(f"[ERROR] Backend rechazó datos ({response.status_code}): {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] No se pudo conectar al Backend: {e}")

def run_mock_gateway():
    current_level = 80.0
    base_temp = 24.0
    
    while True:
        # Comprobar si hay simulación de fuga desde un archivo local
        simulate_leak = False
        leak_file = "simulate_leak.txt"
        if os.path.exists(leak_file):
            try:
                with open(leak_file, "r") as f:
                    content = f.read().strip().lower()
                    simulate_leak = content in ("true", "1", "yes")
            except Exception:
                pass
        
        # Simular comportamiento
        if simulate_leak:
            # En fuga, el nivel baja y se calienta un poco el agua
            current_level = max(10.0, current_level - 1.8)
            temp = base_temp + random.uniform(0.5, 1.2)
            is_leak = True
            print(f"[SIM FUGA] Nivel bajando rápidamente: {current_level:.1f}%")
        else:
            # Ciclo normal: fluctuación pequeña
            current_level = max(5.0, min(100.0, current_level + random.uniform(-0.3, 0.4)))
            temp = base_temp + random.uniform(-0.4, 0.4)
            is_leak = False
        
        send_telemetry(round(current_level, 1), round(temp, 1), is_leak)
        time.sleep(INTERVAL)

def run_real_gateway():
    import serial
    
    try:
        ser = serial.Serial(PORT, BAUDRATE, timeout=1)
        ser.flush()
        print(f"Puerto serial {PORT} abierto con éxito.")
    except Exception as e:
        print(f"Error abriendo puerto serial {PORT}: {e}")
        print("Asegúrate de que el Arduino esté conectado y configurado en el puerto correcto.")
        print("Sugerencia: puedes configurar MOCK_SERIAL=true en el archivo .env para simular.")
        return

    while True:
        try:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    print(f"[Arduino Raw] {line}")
                    parsed = parse_arduino_data(line)
                    if parsed:
                        dist, temp, is_leak = parsed
                        level_percent = calculate_level_percentage(dist)
                        send_telemetry(level_percent, temp, is_leak)
            time.sleep(0.1)  # Pequeño delay para no saturar el CPU
        except KeyboardInterrupt:
            print("Cerrando puerto serial y deteniendo gateway...")
            ser.close()
            break
        except Exception as e:
            print(f"Error en bucle de lectura serial: {e}")
            time.sleep(2)

if __name__ == "__main__":
    try:
        if MOCK_SERIAL:
            run_mock_gateway()
        else:
            run_real_gateway()
    except KeyboardInterrupt:
        print("\nGateway detenido por el usuario.")
