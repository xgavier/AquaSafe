#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define PIN_ONE_WIRE   4 
#define PIN_TRIGGER    5
#define PIN_ECHO       6
#define PIN_BUZZER     11 


#define DIST_LLENO     5   
#define DIST_MITAD    20   
#define DIST_VACIO    35  
#define DIST_MAXIMA   45  


#define INTERVALO_FUGA_MS   2000UL   
#define UMBRAL_FUGA_CM      0.3      
#define CONFIRMACIONES_FUGA 2          


OneWire         ourWire(PIN_ONE_WIRE);
DallasTemperature sensorsito(&ourWire);
LiquidCrystal_I2C lcdsito(0x27, 16, 2);


float  nivelAnterior       = -1;   
int    contadorFuga        = 0;
bool   fugaConfirmada      = false;
unsigned long tiempoUltimaFuga = 0;


float medirDistancia() {
  const int  MUESTRAS       = 5;
  const long TIMEOUT_US     = 25000;  
  const float DIST_MIN_CM   = 2.0;
  const float DIST_MAX_CM   = DIST_MAXIMA + 5.0;

  float suma  = 0;
  int   validas = 0;

  for (int i = 0; i < MUESTRAS; i++) {
    digitalWrite(PIN_TRIGGER, LOW);
    delayMicroseconds(4);
    digitalWrite(PIN_TRIGGER, HIGH);
    delayMicroseconds(10);
    digitalWrite(PIN_TRIGGER, LOW);

    long duracion = pulseIn(PIN_ECHO, HIGH, TIMEOUT_US);

    if (duracion == 0) continue;          

    float dist = duracion * 0.01715;     

    if (dist >= DIST_MIN_CM && dist <= DIST_MAX_CM) {
      suma += dist;
      validas++;
    }
    delay(15);                            
  }

  if (validas == 0) return -1;            
  return suma / validas;
}


String estadoTanque(float dist) {
  if (dist < 0)                           return "Sin lectura";
  if (dist <= DIST_LLENO)                 return "Tanque lleno";
  if (dist <= DIST_MITAD)                 return "Nivel alto";
  if (dist <= DIST_VACIO)                 return "Nivel medio";
  if (dist <= DIST_MAXIMA)                return "Tanque vacio";
  return "Fuera de rango";
}


void verificarFuga(float distActual) {
  unsigned long ahora = millis();
  if (ahora - tiempoUltimaFuga < INTERVALO_FUGA_MS) return;
  tiempoUltimaFuga = ahora;
  if (distActual < 0) return;

  if (nivelAnterior < 0) {
    nivelAnterior = distActual;
    return;
  }

  float caida = distActual - nivelAnterior;
  nivelAnterior = distActual;

  if (caida >= UMBRAL_FUGA_CM) {
    contadorFuga++;
    if (contadorFuga >= CONFIRMACIONES_FUGA) fugaConfirmada = true;
  } else if (caida < -UMBRAL_FUGA_CM) {
    contadorFuga = 0;
    fugaConfirmada = false;
    digitalWrite(PIN_BUZZER, LOW);
  }
}


void alarmaFuga() {
  tone(PIN_BUZZER, 1000, 200);  
}


void setup() {
  Serial.begin(9600);

  lcdsito.init();
  lcdsito.backlight();

  sensorsito.begin();

  pinMode(PIN_TRIGGER, OUTPUT);
  pinMode(PIN_ECHO,    INPUT);
  pinMode(PIN_BUZZER,  OUTPUT);

  digitalWrite(PIN_TRIGGER, LOW);
  digitalWrite(PIN_BUZZER,  LOW);

  lcdsito.setCursor(0, 0);
  lcdsito.print("Iniciando...");
  delay(1500);
  lcdsito.clear();
}


void loop() {
 
  sensorsito.requestTemperatures();
  float temp = sensorsito.getTempCByIndex(0);

  
  float dist = medirDistancia();

 
  verificarFuga(dist);

  lcdsito.setCursor(0, 0);
  lcdsito.print("                ");   
  lcdsito.setCursor(0, 0);

  if (fugaConfirmada) {
    lcdsito.print("!! FUGA !!      ");
    alarmaFuga();
  } else {
    String estado = estadoTanque(dist);
    lcdsito.print(estado);
  }

  lcdsito.setCursor(0, 1);
  lcdsito.print("                ");
  lcdsito.setCursor(0, 1);

  if (temp == DEVICE_DISCONNECTED_C) {
    lcdsito.print("Temp: error");
  } else {
    lcdsito.print("T:");
    lcdsito.print(temp, 1);
    lcdsito.print((char)223);        
    lcdsito.print("C ");

    if (dist >= 0) {
      lcdsito.print((int)dist);
      lcdsito.print("cm");
    }
  }

  Serial.print("Dist: "); Serial.print(dist);
  Serial.print(" cm | Temp: "); Serial.print(temp);
  Serial.print(" C | Fuga: "); Serial.print(contadorFuga);
  Serial.print("/"); Serial.println(CONFIRMACIONES_FUGA);

  delay(500);
}
