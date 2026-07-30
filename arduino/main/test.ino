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

// ---------- Definicion de pines ----------
#define PIN_BASE    26
#define PIN_HOMBRO  25
#define PIN_CODO    33
#define PIN_MUNECA  32

// ---------- Limites de angulo (ajusta si tu servo lo requiere) ----------
const int ANGULO_MIN = 0;
const int ANGULO_MAX = 180;

// ---------- Objetos Servo ----------
Servo servoBase;
Servo servoHombro;
Servo servoCodo;
Servo servoMuneca;

// ---------- Posiciones actuales (para poder mostrarlas con 's') ----------
int posBase   = 90;
int posHombro = 90;
int posCodo   = 90;
int posMuneca = 90;

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
  moverServo(servoBase,   posBase,   "BASE");
  moverServo(servoHombro, posHombro, "HOMBRO");
  moverServo(servoCodo,   posCodo,   "CODO");
  moverServo(servoMuneca, posMuneca, "MUNECA");

  Serial.println("==========================================");
  Serial.println(" Brazo robotico listo para pruebas");
  Serial.println(" Comandos relativos: b+/-grados h+/-grados c+/-grados m+/-grados");
  Serial.println(" Ejemplo: b10 suma 10; b-10 resta 10 desde la posicion actual");
  Serial.println(" Posicion inicial: BASE=90 HOMBRO=90 CODO=90 MUNECA=90");
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
        procesarComando(servoBase, posBase, resto, "BASE", false);
        break;
      case 'h':
        procesarComando(servoHombro, posHombro, resto, "HOMBRO", true);
        break;
      case 'c':
        procesarComando(servoCodo, posCodo, resto, "CODO", true);
        break;
      case 'm':
        procesarComando(servoMuneca, posMuneca, resto, "MUNECA", false);
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

void procesarComando(Servo &servo, int &posActual, String valor, const char* nombre, bool invertirDireccion) {
  if (valor.length() == 0) {
    Serial.print("Falta el desplazamiento. Ejemplo: b10 o b-10 para mover ");
    Serial.println(nombre);
    return;
  }

  int desplazamiento = valor.toInt();
  int posicionObjetivo = posActual + desplazamiento;
  int posicionLimitada = constrain(posicionObjetivo, ANGULO_MIN, ANGULO_MAX);
  int posicionServo = invertirDireccion
    ? ANGULO_MAX - posicionLimitada
    : posicionLimitada;

  moverServo(servo, posicionServo, nombre);
  posActual = posicionLimitada;

  if (posicionObjetivo != posicionLimitada) {
    Serial.print("Limite aplicado: ");
    Serial.println(posicionLimitada);
  }
}

void moverServo(Servo &servo, int grados, const char* nombre) {
  servo.write(grados);
  Serial.print(nombre);
  Serial.print(" -> ");
  Serial.print(grados);
  Serial.println(" grados");
}

void mostrarPosiciones() {
  Serial.println("---- Posiciones actuales ----");
  Serial.print("BASE:   "); Serial.println(posBase);
  Serial.print("HOMBRO: "); Serial.println(posHombro);
  Serial.print("CODO:   "); Serial.println(posCodo);
  Serial.print("MUNECA: "); Serial.println(posMuneca);
  Serial.println("------------------------------");
}

// Test automatico: mueve cada servo de 0 a 180 y vuelta, uno por uno
void testBarrido() {
  Serial.println(">> Iniciando test de barrido automatico...");

  testUnServo(servoBase, posBase, "BASE");
  testUnServo(servoHombro, posHombro, "HOMBRO");
  testUnServo(servoCodo, posCodo, "CODO");
  testUnServo(servoMuneca, posMuneca, "MUNECA");

  Serial.println(">> Test de barrido finalizado.");
}

void testUnServo(Servo &servo, int &posActual, const char* nombre) {
  Serial.print(">> Probando "); Serial.println(nombre);

  for (int angulo = ANGULO_MIN; angulo <= ANGULO_MAX; angulo += 5) {
    servo.write(angulo);
    delay(30);
  }
  for (int angulo = ANGULO_MAX; angulo >= ANGULO_MIN; angulo -= 5) {
    servo.write(angulo);
    delay(30);
  }

  servo.write(90); // vuelve al centro
  posActual = 90;
  delay(300);
}