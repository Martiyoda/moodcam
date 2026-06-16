#include "core/brush.h"
#include "core/motors.h"
#include "core/safety.h"
#include "painters/alma_thomas.h"
#include "painters/de_kooning.h"
#include "painters/kandinsky.h"
#include "painters/pollock.h"
#include "painters/rothko.h"

// LEGACY: sketch serial de la fase artistica inicial.
// El sketch oficial actual para calibracion MQTT esta en arduino/main/main.ino.

// Biblioteca base E-motion.
// Recibe comandos JSON por Serial. No contiene conexion con OpenAI ni MQTT.
// Si los pines siguen sin configurar, arranca en simulacion y no mueve hardware.

constexpr int SERIAL_BAUD = 115200;
constexpr size_t MAX_COMMAND_LENGTH = 420;
bool simulationMode = true;

struct PaintCommand {
  String baseFunction;
  int speed;
  int intensity;
  int durationMs;
  int pressure;
};

typedef void (*PainterFunction)(int speed, int intensity, int durationMs, int pressure);

struct FunctionEntry {
  const char* name;
  PainterFunction fn;
};

FunctionEntry functionMap[] = {
  {"kandinskyLines", kandinskyLines},
  {"kandinskyCircles", kandinskyCircles},
  {"kandinskyZigZag", kandinskyZigZag},
  {"kandinskyGeometricMix", kandinskyGeometricMix},
  {"kandinskyGeometricRhythm", kandinskyGeometricRhythm},
  {"kandinskyContrastMarks", kandinskyContrastMarks},
  {"kandinskyArcs", kandinskyArcs},
  {"pollockSplash", pollockSplash},
  {"pollockDrip", pollockDrip},
  {"pollockRandomLines", pollockRandomLines},
  {"pollockEnergeticShake", pollockEnergeticShake},
  {"pollockLoopPath", pollockLoopPath},
  {"pollockControlledDrip", pollockControlledDrip},
  {"pollockSimulatedSplash", pollockSimulatedSplash},
  {"pollockLayeredWeb", pollockLayeredWeb},
  {"pollockAllOverPass", pollockAllOverPass},
  {"rothkoBlock", rothkoBlock},
  {"rothkoLayer", rothkoLayer},
  {"rothkoSlowRectangle", rothkoSlowRectangle},
  {"rothkoSoftBlend", rothkoSoftBlend},
  {"rothkoLayeredField", rothkoLayeredField},
  {"rothkoSoftBlock", rothkoSoftBlock},
  {"rothkoTwoFieldComposition", rothkoTwoFieldComposition},
  {"rothkoHorizontalWash", rothkoHorizontalWash},
  {"rothkoSoftEdge", rothkoSoftEdge},
  {"almaDots", almaDots},
  {"almaMosaic", almaMosaic},
  {"almaRepeatedMarks", almaRepeatedMarks},
  {"almaColorRhythm", almaColorRhythm},
  {"almaThomasColorBars", almaThomasColorBars},
  {"almaThomasDensityWave", almaThomasDensityWave},
  {"almaThomasVerticalStripes", almaThomasVerticalStripes},
  {"almaThomasConcentricPattern", almaThomasConcentricPattern},
  {"almaThomasMosaic", almaThomasMosaic},
  {"deKooningGesture", deKooningGesture},
  {"deKooningCurves", deKooningCurves},
  {"deKooningAggressiveStroke", deKooningAggressiveStroke},
  {"deKooningLayeredStroke", deKooningLayeredStroke},
  {"deKooningSweep", deKooningSweep},
  {"deKooningLayeredCurve", deKooningLayeredCurve},
  {"deKooningAngularGesture", deKooningAngularGesture},
  {"deKooningFragmentedOutline", deKooningFragmentedOutline},
  {"deKooningRepaintPass", deKooningRepaintPass}
};

void printHelp() {
  Serial.println("Comandos disponibles:");
  Serial.println("  STATUS  - muestra el estado de seguridad");
  Serial.println("  ARM     - arma hardware o simulacion");
  Serial.println("  STOP    - activa la parada de emergencia");
  Serial.println("  NEUTRAL - vuelve lentamente a la pose neutral si esta armado");
  Serial.println("  TEST    - ejecuta un patron Kandinsky suave si esta armado");
  Serial.println("  JSON    - envia {\"base_function\":\"pollockSplash\",...}");
}

void sendStatus(const char* status, const char* detail) {
  Serial.print("{\"status\":\"");
  Serial.print(status);
  Serial.print("\",\"detail\":\"");
  Serial.print(detail);
  Serial.print("\",\"simulation\":");
  Serial.print(simulationMode ? "true" : "false");
  Serial.println("}");
}

void printStatus() {
  Serial.print("Emergency stop: ");
  Serial.println(isEmergencyStopped() ? "ACTIVO" : "inactivo");
  Serial.print("Motors configured: ");
  Serial.println(motorsConfigured() ? "si" : "no");
  Serial.print("Brush configured: ");
  Serial.println(brushConfigured() ? "si" : "no");
  Serial.print("Simulation mode: ");
  Serial.println(simulationMode ? "si" : "no");
}

void setup() {
  Serial.begin(SERIAL_BAUD);
  beginSafety();
  beginMotors();
  beginBrush();
  simulationMode = !motorsConfigured() || !brushConfigured();
  if (simulationMode) {
    clearEmergencyStop();
  }
  Serial.println("E-motion iniciado en modo seguro.");
  printHelp();
  printStatus();
}

void loop() {
  if (!Serial.available()) {
    delay(20);
    return;
  }

  String command = Serial.readStringUntil('\n');
  command.trim();
  if (command.length() == 0) {
    return;
  }
  if (command.length() > MAX_COMMAND_LENGTH) {
    sendStatus("error", "comando demasiado largo");
    return;
  }

  if (command.startsWith("{")) {
    handleJsonCommand(command);
    return;
  }

  command.toUpperCase();

  if (command == "STOP") {
    requestEmergencyStop();
    stopBrush();
    stopMotors();
    sendStatus("error", "parada de emergencia activada");
    return;
  }

  if (command == "STATUS") {
    printStatus();
    return;
  }

  if (command == "ARM") {
    if (!simulationMode && (!motorsConfigured() || !brushConfigured())) {
      Serial.println("Armado rechazado: configura y calibra motores y pincel primero.");
      return;
    }
    clearEmergencyStop();
    sendStatus("completed", simulationMode ? "simulacion armada" : "hardware armado");
    return;
  }

  if (isEmergencyStopped()) {
    Serial.println("Comando rechazado: parada de emergencia activa.");
    return;
  }

  if (command == "NEUTRAL") {
    liftBrush();
    returnToNeutral();
    return;
  }

  if (command == "TEST") {
    kandinskyLines(25, 20, 1500, 10);
    return;
  }

  printHelp();
}

void handleJsonCommand(const String& json) {
  sendStatus("received", "comando recibido");

  PaintCommand command;
  if (!parsePaintCommand(json, command)) {
    sendStatus("error", "json invalido o campos incompletos");
    return;
  }

  PainterFunction fn = findPainterFunction(command.baseFunction);
  if (fn == nullptr) {
    sendStatus("error", "base_function no existe");
    return;
  }

  if (isEmergencyStopped()) {
    sendStatus("error", "parada de emergencia activa");
    return;
  }

  MotionParameters safe = sanitizeMotionParameters(
    command.speed,
    command.intensity,
    command.durationMs,
    command.pressure
  );

  sendStatus("running", command.baseFunction.c_str());
  fn(safe.speed, safe.intensity, safe.durationMs, safe.pressure);

  if (isEmergencyStopped()) {
    sendStatus("error", "ejecucion interrumpida");
    return;
  }
  sendStatus("completed", command.baseFunction.c_str());
}

PainterFunction findPainterFunction(const String& name) {
  const size_t count = sizeof(functionMap) / sizeof(functionMap[0]);
  for (size_t index = 0; index < count; index++) {
    if (name == functionMap[index].name) {
      return functionMap[index].fn;
    }
  }
  return nullptr;
}

bool parsePaintCommand(const String& json, PaintCommand& command) {
  command.baseFunction = extractStringValue(json, "base_function");
  command.speed = extractIntValue(json, "speed", -1);
  command.intensity = extractIntValue(json, "intensity", -1);
  command.durationMs = extractIntValue(json, "duration_ms", -1);
  command.pressure = extractIntValue(json, "pressure", -1);

  return command.baseFunction.length() > 0
    && command.speed >= 0
    && command.intensity >= 0
    && command.durationMs > 0
    && command.pressure >= 0;
}

String extractStringValue(const String& json, const char* key) {
  String pattern = String("\"") + key + "\":";
  int keyIndex = json.indexOf(pattern);
  if (keyIndex < 0) {
    return "";
  }
  int firstQuote = json.indexOf('"', keyIndex + pattern.length());
  if (firstQuote < 0) {
    return "";
  }
  int secondQuote = json.indexOf('"', firstQuote + 1);
  if (secondQuote < 0) {
    return "";
  }
  return json.substring(firstQuote + 1, secondQuote);
}

int extractIntValue(const String& json, const char* key, int fallback) {
  String pattern = String("\"") + key + "\":";
  int keyIndex = json.indexOf(pattern);
  if (keyIndex < 0) {
    return fallback;
  }
  int valueStart = keyIndex + pattern.length();
  while (valueStart < json.length() && json.charAt(valueStart) == ' ') {
    valueStart++;
  }
  int valueEnd = valueStart;
  while (valueEnd < json.length() && isDigit(json.charAt(valueEnd))) {
    valueEnd++;
  }
  if (valueEnd == valueStart) {
    return fallback;
  }
  return json.substring(valueStart, valueEnd).toInt();
}
