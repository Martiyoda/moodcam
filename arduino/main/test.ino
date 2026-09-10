// Sketch alternativo de pruebas del firmware. Solo se activa cuando se define
// MOTOR_TEST_SKETCH; no forma parte del arranque normal del brazo.
#if defined(MOTOR_TEST_SKETCH)
/*
  ==========================================================
  TEST DE MOTORES - BRAZO ROBOTICO (ESP32 + ESP32Servo)
  ==========================================================
  Este programa permite comprobar que los 4 servos del brazo
  se mueven correctamente usando desplazamientos desde la
  posicion actual en el Monitor Serie.

  Conexiones (GPIO):
    BASE            -> 26
    HOMBRO          -> 25
    CODO            -> 33
    muneca/PINZA    -> 32

  Requisitos:
    - Libreria "ESP32Servo" instalada (by Kevin Harrington / madhephaestus)
    - Alimentar los servos con una fuente externa de 5V
      (NO usar el pin 5V del ESP32 para varios servos, puede
      resetear la placa). Unir GND de la fuente con GND del ESP32.

  Uso por Monitor Serie (115200 baudios):
    Escribe una letra + un numero y pulsa Enter. Ejemplos:
      b10   -> mueve BASE 10 grados hacia un lado
      b-10  -> mueve BASE 10 grados hacia el otro lado
      h45   -> mueve HOMBRO 45 grados desde su posicion actual
      c-20  -> mueve CODO 20 grados hacia el otro lado
      m0    -> no mueve muneca/PINZA
      t     -> hace un test automatico de barrido en los 4 servos
      s     -> muestra la posicion actual de todos los servos
  ==========================================================
*/

#include <ESP32Servo.h>
#include "src/robot_config.h"

// ---------- Definicion de pines ----------
#define PIN_BASE    BASE_SERVO_CONFIG.pin
#define PIN_HOMBRO  SHOULDER_SERVO_CONFIG.pin
#define PIN_CODO    ELBOW_SERVO_CONFIG.pin
#define PIN_MUNECA  WRIST_SERVO_CONFIG.pin

// La prueba usa la misma referencia fisica y los mismos limites que main.ino.
const int ANGULO_MIN_BASE = BASE_SERVO_CONFIG.minAngle;
const int ANGULO_MIN_HOMBRO = SHOULDER_SERVO_CONFIG.minAngle;
const int ANGULO_MIN_CODO = ELBOW_SERVO_CONFIG.minAngle;
const int ANGULO_MIN_MUNECA = WRIST_SERVO_CONFIG.minAngle;
const int ANGULO_MAX_BASE = BASE_SERVO_CONFIG.maxAngle;
const int ANGULO_MAX_HOMBRO = SHOULDER_SERVO_CONFIG.maxAngle;
const int ANGULO_MAX_CODO = ELBOW_SERVO_CONFIG.maxAngle;
const int ANGULO_MAX_MUNECA = WRIST_SERVO_CONFIG.maxAngle;
const int OFFSET_SERVO_HOMBRO = 45;
const int OFFSET_SERVO_CODO = -10;
const int ANGULO_MIN_HOMBRO_FISICO = ANGULO_MIN_HOMBRO - OFFSET_SERVO_HOMBRO;
const int ANGULO_MAX_HOMBRO_FISICO = ANGULO_MAX_HOMBRO - OFFSET_SERVO_HOMBRO;
const int ANGULO_MIN_CODO_FISICO = ANGULO_MIN_CODO - OFFSET_SERVO_CODO;
const int ANGULO_MAX_CODO_FISICO = ANGULO_MAX_CODO - OFFSET_SERVO_CODO;

// ---------- Objetos Servo ----------
Servo servoBase;
Servo servoHombro;
Servo servoCodo;
Servo servoMuneca;

// ---------- Posiciones actuales (para poder mostrarlas con 's') ----------
int posBase   = BASE_SERVO_CONFIG.homeAngle;
int posHombro = SHOULDER_SERVO_CONFIG.homeAngle - OFFSET_SERVO_HOMBRO;
int posCodo   = ELBOW_SERVO_CONFIG.homeAngle - OFFSET_SERVO_CODO;
int posMuneca = WRIST_SERVO_CONFIG.homeAngle;

void procesarComando(Servo &servo, int &posActual, String valor, const char* nombre, int anguloMin, int anguloMax, int offsetServo = 0);
void moverServo(Servo &servo, int gradosServo, const char* nombre, int offsetServo = 0);
void mostrarPosiciones();
void testBarrido();
void testUnServo(Servo &servo, int &posActual, const char* nombre, int posicionHome, int anguloMin, int anguloMax);

void setup() {
  Serial.begin(115200);
  delay(500);

  // Recomendado por la libreria ESP32Servo para usar el timer correctamente
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  servoBase.setPeriodHertz(50);
  servoHombro.setPeriodHertz(50);
  servoCodo.setPeriodHertz(50);
  servoMuneca.setPeriodHertz(50);

  // attach(pin, pulso_min_us, pulso_max_us) -> 500-2400 es un rango tipico seguro
  servoBase.attach(PIN_BASE, 500, 2400);
  servoHombro.attach(PIN_HOMBRO, 500, 2400);
  servoCodo.attach(PIN_CODO, 500, 2400);
  servoMuneca.attach(PIN_MUNECA, 500, 2400);

  // Posicion inicial centrada
  moverServo(servoBase, posBase, "BASE");
  moverServo(servoHombro, posHombro + OFFSET_SERVO_HOMBRO, "HOMBRO", OFFSET_SERVO_HOMBRO);
  moverServo(servoCodo, posCodo + OFFSET_SERVO_CODO, "CODO", OFFSET_SERVO_CODO);
  moverServo(servoMuneca, posMuneca, "MUNECA");

  Serial.println("==========================================");
  Serial.println(" Brazo robotico listo para pruebas");
  Serial.println(" Comandos relativos: b+/-grados h+/-grados c+/-grados m+/-grados");
  Serial.println(" Ejemplo: b10 suma 10; b-10 resta 10 desde la posicion actual");
  Serial.println(" Posicion HOME fisica: BASE=90 HOMBRO=45 CODO=100 MUNECA=90");
  Serial.println(" t = test de barrido automatico");
  Serial.println(" s = mostrar posiciones actuales");
  Serial.println("==========================================");
}

void loop() {
  if (Serial.available() > 0) {
    String entrada = Serial.readStringUntil('\n');
    entrada.trim();

    if (entrada.length() == 0) return;

    char comando = tolower(entrada.charAt(0));
    String resto = entrada.substring(1);
    resto.trim();

    switch (comando) {
      case 'b':
        procesarComando(servoBase, posBase, resto, "BASE", ANGULO_MIN_BASE, ANGULO_MAX_BASE);
        break;
      case 'h':
        procesarComando(servoHombro, posHombro, resto, "HOMBRO", ANGULO_MIN_HOMBRO_FISICO, ANGULO_MAX_HOMBRO_FISICO, OFFSET_SERVO_HOMBRO);
        break;
      case 'c':
        procesarComando(servoCodo, posCodo, resto, "CODO", ANGULO_MIN_CODO_FISICO, ANGULO_MAX_CODO_FISICO, OFFSET_SERVO_CODO);
        break;
      case 'm':
        procesarComando(servoMuneca, posMuneca, resto, "MUNECA", ANGULO_MIN_MUNECA, ANGULO_MAX_MUNECA);
        break;
      case 't':
        testBarrido();
        break;
      case 's':
        mostrarPosiciones();
        break;
      default:
        Serial.println("Comando no reconocido. Usa b/h/c/m + grados, t o s.");
        break;
    }
  }
}

// ---------- Funciones auxiliares ----------

void procesarComando(Servo &servo, int &posActual, String valor, const char* nombre, int anguloMin, int anguloMax, int offsetServo) {
  if (valor.length() == 0) {
    Serial.print("Falta el desplazamiento. Ejemplo: b10 o b-10 para mover ");
    Serial.println(nombre);
    return;
  }

  int desplazamiento = valor.toInt();
  int posicionObjetivo = posActual + desplazamiento;
  int posicionLimitada = constrain(posicionObjetivo, anguloMin, anguloMax);

  moverServo(servo, posicionLimitada + offsetServo, nombre, offsetServo);
  posActual = posicionLimitada;

  if (posicionObjetivo != posicionLimitada) {
    Serial.print("Limite aplicado: ");
    Serial.println(posicionLimitada);
  }
}

void moverServo(Servo &servo, int gradosServo, const char* nombre, int offsetServo) {
  servo.write(gradosServo);
  Serial.print(nombre);
  Serial.print(" -> ");
  Serial.print(gradosServo - offsetServo);
  Serial.println(" grados");
}

void mostrarPosiciones() {
  Serial.println("---- Posiciones fisicas actuales ----");
  Serial.print("BASE:   "); Serial.println(posBase);
  Serial.print("HOMBRO: "); Serial.println(posHombro);
  Serial.print("CODO:   "); Serial.println(posCodo);
  Serial.print("MUNECA: "); Serial.println(posMuneca);
  Serial.println("------------------------------");
}

// Test automatico con los limites configurados para cada articulacion.
void testBarrido() {
  Serial.println(">> Iniciando test de barrido automatico...");

  testUnServo(servoBase, posBase, "BASE", BASE_SERVO_CONFIG.homeAngle, ANGULO_MIN_BASE, ANGULO_MAX_BASE);
  testUnServo(servoHombro, posHombro, "HOMBRO", SHOULDER_SERVO_CONFIG.homeAngle, ANGULO_MIN_HOMBRO, ANGULO_MAX_HOMBRO);
  posHombro = SHOULDER_SERVO_CONFIG.homeAngle - OFFSET_SERVO_HOMBRO;
  testUnServo(servoCodo, posCodo, "CODO", ELBOW_SERVO_CONFIG.homeAngle, ANGULO_MIN_CODO, ANGULO_MAX_CODO);
  posCodo = ELBOW_SERVO_CONFIG.homeAngle - OFFSET_SERVO_CODO;
  testUnServo(servoMuneca, posMuneca, "MUNECA", WRIST_SERVO_CONFIG.homeAngle, ANGULO_MIN_MUNECA, ANGULO_MAX_MUNECA);

  Serial.println(">> Test de barrido finalizado.");
}

void testUnServo(Servo &servo, int &posActual, const char* nombre, int posicionHome, int anguloMin, int anguloMax) {
  Serial.print(">> Probando "); Serial.println(nombre);

  for (int angulo = anguloMin; angulo <= anguloMax; angulo += 5) {
    servo.write(angulo);
    delay(30);
  }
  for (int angulo = anguloMax; angulo >= anguloMin; angulo -= 5) {
    servo.write(angulo);
    delay(30);
  }

  servo.write(posicionHome);
  posActual = posicionHome;
  delay(300);
}
#endif