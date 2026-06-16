#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

#if __has_include("src/config.h")
#include "src/config.h"
#else
#include "src/config.example.h"
#endif

#include "src/core/brush.h"
#include "src/core/motors.h"
#include "src/core/safety.h"
#include "src/robot_config.h"

// Build de calibracion segura:
// - No acepta base_function.
// - No acepta stroke_id.
// - No ejecuta funciones artisticas.
// - Solo mueve una articulacion por comando de calibracion.

constexpr int SERIAL_BAUD = 115200;
constexpr size_t MAX_COMMAND_LENGTH = 320;
constexpr unsigned long WIFI_RETRY_MS = 8000;
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 20000;
constexpr unsigned long WIFI_STATUS_LOG_MS = 5000;
constexpr unsigned long MQTT_RETRY_MS = 5000;
constexpr unsigned long HEARTBEAT_LOG_MS = 3000;
constexpr bool WIFI_DIAGNOSTIC_SCAN = true;

WiFiClient wifiClient;
WiFiClientSecure secureWifiClient;
PubSubClient mqttClient;

unsigned long lastWifiAttempt = 0;
unsigned long lastMqttAttempt = 0;
unsigned long lastWifiStatusLog = 0;
unsigned long lastHeartbeatLog = 0;
bool wifiAttemptInProgress = false;

void printHelp();
void printStatus();
void connectWiFi();
void connectMQTT();
void printWiFiSsidDiagnostics();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void publishStatus(const char* status, const char* detail);
void publishError(const char* detail);
void publishJointState();
void publishStopped(const char* source);
void printHeartbeat();
void handleInputCommand(const String& json, bool fromMqtt);
void handleEmotionCommand(const String& json, bool fromMqtt);
void handleCalibrationCommand(const String& json, const String& type);
void printServoConfig(const RobotServoConfig& servo);
bool isForbiddenRobotCommand(const String& json);
bool validCalibrationServo(const String& servoName, const RobotServoConfig*& servoConfig);
bool validJogDelta(int delta);
bool beginCalibrationMove(const RobotServoConfig& servo, int targetAngle, int durationMs);
const char* wifiStatusText(wl_status_t status);
const char* wifiAuthText(wifi_auth_mode_t mode);
const char* mqttStateText(int state);
String extractStringValue(const String& json, const char* key);
int extractIntValue(const String& json, const char* key, int fallback);
bool extractBoolValue(const String& json, const char* key, bool fallback);

void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(200);
  Serial.setTimeout(50);
  beginSafety();
  beginMotors();
  beginBrush();
  clearEmergencyStop();

  Serial.println("E-motion ESP32: modo prueba MQTT segura.");
  printHelp();
  printStatus();

  if (NETWORK_ENABLED) {
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    if (MQTT_USE_TLS) {
      secureWifiClient.setInsecure();
      Serial.println("TLS activo en modo prueba: certificado no verificado.");
      mqttClient.setClient(secureWifiClient);
    } else {
      mqttClient.setClient(wifiClient);
    }
    mqttClient.setServer(MQTT_HOST, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    connectWiFi();
    connectMQTT();
  } else {
    Serial.println("NETWORK_ENABLED=false. Copia config.example.h a config.h y activalo para WiFi/MQTT.");
  }
}

void loop() {
  printHeartbeat();

  if (NETWORK_ENABLED) {
    if (WiFi.status() != WL_CONNECTED) {
      const unsigned long now = millis();
      if (lastWifiStatusLog == 0 || now - lastWifiStatusLog >= WIFI_STATUS_LOG_MS) {
        const wl_status_t status = WiFi.status();
        Serial.print("WiFi estado: ");
        Serial.print(wifiStatusText(status));
        Serial.print(" (");
        Serial.print(static_cast<int>(status));
        Serial.println(")");
        lastWifiStatusLog = now;
      }
      connectWiFi();
    } else if (!mqttClient.connected()) {
      if (!calibrationMotionActive()) {
        connectMQTT();
      }
    } else {
      mqttClient.loop();
    }
  }

  if (!Serial.available()) {
    const char* completedServo = nullptr;
    int completedAngle = -1;
    if (updateCalibrationMotion(completedServo, completedAngle)) {
      String detail = String("servo=") + completedServo + " commanded_angle=" + completedAngle;
      publishStatus("movement_completed", detail.c_str());
      publishJointState();
    }
    delay(2);
    return;
  }

  String command = Serial.readStringUntil('\n');
  command.trim();
  if (command.length() == 0) {
    return;
  }

  if (command == "STATUS") {
    printStatus();
    return;
  }

  if (command == "STOP") {
    publishStopped("serial");
    return;
  }

  if (command.startsWith("{")) {
    handleInputCommand(command, false);
    return;
  }

  printHelp();
}

void printHeartbeat() {
  const unsigned long now = millis();
  if (lastHeartbeatLog != 0 && now - lastHeartbeatLog < HEARTBEAT_LOG_MS) {
    return;
  }
  lastHeartbeatLog = now;
  Serial.print("HB ms=");
  Serial.print(now);
  Serial.print(" wifi=");
  Serial.print(wifiStatusText(WiFi.status()));
  Serial.print(" mqtt=");
  Serial.println(mqttClient.connected() ? "on" : "off");
}

void printHelp() {
  Serial.println("Comandos seguros:");
  Serial.println("  STATUS - muestra estado");
  Serial.println("  STOP   - cancela movimiento y mantiene servos adjuntos");
  Serial.print("  MQTT ");
  Serial.print(TOPIC_ROBOT_COMMAND);
  Serial.println(" - start_calibration, jog, set_angle, get_joint_state, stop, release_servos");
}

void printStatus() {
  Serial.print("WiFi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "conectado" : "desconectado");
  Serial.print("MQTT: ");
  Serial.println(mqttClient.connected() ? "conectado" : "desconectado");
  Serial.print("NETWORK_ENABLED: ");
  Serial.println(NETWORK_ENABLED ? "true" : "false");
  Serial.print("DEMO_MODE: ");
  Serial.println(DEMO_MODE ? "true" : "false");
  Serial.print("SAFE_TEST_MODE: ");
  Serial.println(SAFE_TEST_MODE ? "true" : "false");
  Serial.print("CALIBRATION_MODE: ");
  Serial.println(CALIBRATION_MODE ? "true" : "false");
  Serial.print("FINAL_ARM_MODE: ");
  Serial.println(FINAL_ARM_MODE ? "true" : "false");
  Serial.print("MOTOR_OUTPUT_ENABLED: ");
  Serial.println(MOTOR_OUTPUT_ENABLED ? "true" : "false");
  Serial.print("BRUSH_OUTPUT_ENABLED: ");
  Serial.println(BRUSH_OUTPUT_ENABLED ? "true" : "false");
  Serial.println("Mapa definitivo de servos:");
  for (size_t index = 0; index < ROBOT_SERVO_COUNT; index++) {
    printServoConfig(ROBOT_SERVOS[index]);
  }
  const JointCommandState state = calibrationJointState();
  Serial.print("positionKnown: ");
  Serial.println(state.positionKnown ? "true" : "false");
  Serial.print("calibrationMoving: ");
  Serial.println(state.moving ? "true" : "false");
}

void connectWiFi() {
  if (!NETWORK_ENABLED || WiFi.status() == WL_CONNECTED) {
    wifiAttemptInProgress = false;
    if (WiFi.status() == WL_CONNECTED) {
      lastWifiStatusLog = 0;
    }
    return;
  }

  const unsigned long now = millis();

  // Evita relanzar WiFi.begin mientras la STA aun intenta conectarse.
  if (wifiAttemptInProgress) {
    if (now - lastWifiAttempt < WIFI_CONNECT_TIMEOUT_MS) {
      return;
    }
    // Fuerza fin del intento anterior antes de reconfigurar credenciales.
    WiFi.disconnect(false, false);
    delay(100);
    wifiAttemptInProgress = false;
    Serial.println("WiFi: timeout de conexion, reintentando.");
  }

  if (lastWifiAttempt != 0 && now - lastWifiAttempt < WIFI_RETRY_MS) {
    return;
  }
  lastWifiAttempt = now;
  wifiAttemptInProgress = true;

  Serial.print("Conectando WiFi a: ");
  Serial.println(WIFI_SSID);
  if (WIFI_DIAGNOSTIC_SCAN) {
    printWiFiSsidDiagnostics();
  }
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.println("WiFi: intento iniciado sin bloqueo.");
}

void printWiFiSsidDiagnostics() {
  const int total = WiFi.scanNetworks(false, true);
  if (total < 0) {
    Serial.println("WiFi scan: fallo al escanear redes.");
    return;
  }

  bool foundTarget = false;
  String target = String(WIFI_SSID);
  for (int index = 0; index < total; index++) {
    if (WiFi.SSID(index) != target) {
      continue;
    }
    foundTarget = true;
    Serial.print("WiFi scan: SSID objetivo visible. channel=");
    Serial.print(WiFi.channel(index));
    Serial.print(" rssi=");
    Serial.print(WiFi.RSSI(index));
    Serial.print(" auth=");
    Serial.println(wifiAuthText(WiFi.encryptionType(index)));
  }

  if (!foundTarget) {
    Serial.println("WiFi scan: SSID objetivo NO visible (revisa 2.4GHz / nombre exacto).");
  }

  WiFi.scanDelete();
}

const char* wifiStatusText(wl_status_t status) {
  switch (status) {
    case WL_IDLE_STATUS:
      return "idle";
    case WL_NO_SSID_AVAIL:
      return "ssid_no_disponible";
    case WL_SCAN_COMPLETED:
      return "scan_completado";
    case WL_CONNECTED:
      return "conectado";
    case WL_CONNECT_FAILED:
      return "conexion_fallida";
    case WL_CONNECTION_LOST:
      return "conexion_perdida";
    case WL_DISCONNECTED:
      return "desconectado";
    default:
      return "desconocido";
  }
}

const char* wifiAuthText(wifi_auth_mode_t mode) {
  switch (mode) {
    case WIFI_AUTH_OPEN:
      return "open";
    case WIFI_AUTH_WEP:
      return "wep";
    case WIFI_AUTH_WPA_PSK:
      return "wpa_psk";
    case WIFI_AUTH_WPA2_PSK:
      return "wpa2_psk";
    case WIFI_AUTH_WPA_WPA2_PSK:
      return "wpa_wpa2_psk";
    case WIFI_AUTH_WPA2_ENTERPRISE:
      return "wpa2_enterprise";
    case WIFI_AUTH_WPA3_PSK:
      return "wpa3_psk";
    case WIFI_AUTH_WPA2_WPA3_PSK:
      return "wpa2_wpa3_psk";
    case WIFI_AUTH_WAPI_PSK:
      return "wapi_psk";
    default:
      return "auth_desconocido";
  }
}

void connectMQTT() {
  if (!NETWORK_ENABLED || WiFi.status() != WL_CONNECTED || mqttClient.connected()) {
    return;
  }
  const unsigned long now = millis();
  if (lastMqttAttempt != 0 && now - lastMqttAttempt < MQTT_RETRY_MS) {
    return;
  }
  lastMqttAttempt = now;

  Serial.print("Conectando MQTT a: ");
  Serial.print(MQTT_HOST);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  const bool connected = mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD);
  if (!connected) {
    const int state = mqttClient.state();
    Serial.print("MQTT no conectado. Estado: ");
    Serial.print(state);
    Serial.print(" (");
    Serial.print(mqttStateText(state));
    Serial.println(")");
    Serial.print("MQTT client_id=");
    Serial.print(MQTT_CLIENT_ID);
    Serial.print(" user=");
    Serial.println(MQTT_USERNAME);
    if (state == 5) {
      Serial.println("Sugerencia: verifica credenciales y permisos ACL en HiveMQ Cloud (publish/subscribe).");
    }
    return;
  }

  Serial.println("MQTT conectado.");
  if (mqttClient.subscribe(TOPIC_ROBOT_COMMAND) && mqttClient.subscribe(TOPIC_EMOTION_INPUT)) {
    Serial.print("Topic suscrito: ");
    Serial.println(TOPIC_ROBOT_COMMAND);
    Serial.print("Topic suscrito: ");
    Serial.println(TOPIC_EMOTION_INPUT);
    publishStatus("completed", "mqtt_connected");
  } else {
    publishError("no se pudo suscribir a topics mqtt");
  }
}

const char* mqttStateText(int state) {
  switch (state) {
    case -4:
      return "connection_timeout";
    case -3:
      return "connection_lost";
    case -2:
      return "connect_failed";
    case -1:
      return "disconnected";
    case 0:
      return "connected";
    case 1:
      return "bad_protocol";
    case 2:
      return "bad_client_id";
    case 3:
      return "unavailable";
    case 4:
      return "bad_credentials";
    case 5:
      return "unauthorized";
    default:
      return "unknown";
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  const String topicName = String(topic);
  if (topicName != TOPIC_ROBOT_COMMAND && topicName != TOPIC_EMOTION_INPUT) {
    publishError("topic no permitido");
    return;
  }
  if (length == 0 || length > MAX_COMMAND_LENGTH) {
    publishError("payload vacio o demasiado largo");
    return;
  }

  String message;
  message.reserve(length + 1);
  for (unsigned int index = 0; index < length; index++) {
    message += static_cast<char>(payload[index]);
  }

  Serial.print("Comando recibido por MQTT en ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.println(message);
  if (topicName == TOPIC_EMOTION_INPUT) {
    handleEmotionCommand(message, true);
  } else {
    handleInputCommand(message, true);
  }
}

void publishStatus(const char* status, const char* detail) {
  Serial.print("{\"status\":\"");
  Serial.print(status);
  Serial.print("\",\"detail\":\"");
  Serial.print(detail);
  Serial.println("\"}");

  if (!NETWORK_ENABLED || !mqttClient.connected()) {
    return;
  }
  String payload = String("{\"status\":\"") + status + "\",\"detail\":\"" + detail + "\"}";
  mqttClient.publish(TOPIC_ROBOT_STATUS, payload.c_str());
}

void publishError(const char* detail) {
  Serial.print("{\"status\":\"error\",\"detail\":\"");
  Serial.print(detail);
  Serial.println("\"}");

  if (!NETWORK_ENABLED || !mqttClient.connected()) {
    return;
  }
  String payload = String("{\"status\":\"error\",\"detail\":\"") + detail + "\"}";
  mqttClient.publish(TOPIC_ROBOT_ERROR, payload.c_str());
}

void publishJointState() {
  const JointCommandState state = calibrationJointState();
  String payload = String("{\"status\":\"joint_state\",\"base\":") + state.base
    + ",\"shoulder\":" + state.shoulder
    + ",\"elbow\":" + state.elbow
    + ",\"wrist\":" + state.wrist
    + ",\"position_known\":" + (state.positionKnown ? "true" : "false")
    + ",\"moving\":" + (state.moving ? "true" : "false")
    + ",\"angles_are_commanded\":true}";
  Serial.println(payload);
  if (NETWORK_ENABLED && mqttClient.connected()) {
    mqttClient.publish(TOPIC_ROBOT_STATUS, payload.c_str());
  }
}

void publishStopped(const char* source) {
  const char* stoppedServo = nullptr;
  int stoppedAngle = -1;
  stopCalibrationMotion(stoppedServo, stoppedAngle);
  String detail = String("source=") + source + " active_servos_remain_attached=true";
  if (stoppedServo != nullptr) {
    detail += String(" servo=") + stoppedServo + " commanded_angle=" + stoppedAngle;
  }
  publishStatus("stopped", detail.c_str());
  publishJointState();
}

void printServoConfig(const RobotServoConfig& servo) {
  Serial.print("  ");
  Serial.print(servo.name);
  Serial.print(" pin=");
  Serial.print(servo.pin);
  Serial.print(" enabled=");
  Serial.print(servo.enabled ? "true" : "false");
  Serial.print(" range=");
  Serial.print(servo.minAngle);
  Serial.print("-");
  Serial.print(servo.maxAngle);
  Serial.print(" home=");
  Serial.println(servo.homeAngle);
}

void handleInputCommand(const String& json, bool fromMqtt) {
  if (fromMqtt && (!NETWORK_ENABLED || WiFi.status() != WL_CONNECTED || !mqttClient.connected())) {
    publishError("wifi o mqtt no conectado");
    return;
  }

  const String type = extractStringValue(json, "type");

  if (calibrationMotionActive() && type != "stop" && type != "get_joint_state") {
    publishError("robot_busy");
    return;
  }

  if (isForbiddenRobotCommand(json)) {
    publishError("base_function y stroke_id no permitidos en calibracion");
    return;
  }

  if (!CALIBRATION_MODE || !SAFE_TEST_MODE) {
    publishError("calibration_mode_disabled");
    return;
  }

  handleCalibrationCommand(json, type);
}

void handleCalibrationCommand(const String& json, const String& type) {
  if (type == "get_joint_state") {
    publishJointState();
    return;
  }

  if (type == "stop") {
    publishStopped("mqtt");
    return;
  }

  if (type == "start_calibration") {
    if (!extractBoolValue(json, "assume_home", false)) {
      publishError("start_calibration requiere assume_home=true y confirmacion fisica de HOME");
      return;
    }
    if (!startCalibrationAssumingHome()) {
      publishError("no se pudo iniciar calibracion: debe estar parado y con todos los servos detached");
      return;
    }
    publishStatus("calibration_started", "HOME confirmado logicamente; no hubo movimiento ni attach");
    publishJointState();
    return;
  }

  if (type == "release_servos") {
    if (!releaseCalibrationServos()) {
      publishError("robot_busy");
      return;
    }
    publishStatus("servos_released", "ADVERTENCIA: posible caida por gravedad; position_known=false");
    publishJointState();
    return;
  }

  if (type == "pose_test" || type == "hardware_test") {
    publishError("comando bloqueado mientras CALIBRATION_MODE esta activo");
    return;
  }

  if (type != "jog" && type != "set_angle") {
    publishError("tipo de comando de calibracion desconocido");
    return;
  }

  if (!calibrationPositionKnown()) {
    publishError("position_unknown: ejecuta start_calibration con assume_home=true tras confirmar HOME fisicamente");
    return;
  }

  String servoName = extractStringValue(json, "servo");
  servoName.toLowerCase();
  const RobotServoConfig* servo = nullptr;
  if (!validCalibrationServo(servoName, servo)) {
    publishError("servo desconocido, deshabilitado o no calibrable");
    return;
  }

  int targetAngle = -1;
  int durationMs = -1;
  if (type == "jog") {
    const int delta = extractIntValue(json, "delta", 0);
    if (!validJogDelta(delta)) {
      publishError("delta invalido: solo se acepta -5, -1, 1 o 5");
      return;
    }
    targetAngle = calibrationCommandedAngle(servoName.c_str()) + delta;
    if (targetAngle < servo->minAngle || targetAngle > servo->maxAngle) {
      publishError("jog rechazado: el resultado supera los limites configurados");
      return;
    }
    durationMs = abs(delta) * 250;
  } else {
    targetAngle = extractIntValue(json, "angle", -1);
    durationMs = extractIntValue(json, "duration_ms", -1);
    if (targetAngle < servo->minAngle || targetAngle > servo->maxAngle) {
      publishError("set_angle rechazado: angulo fuera de limites");
      return;
    }
    if (durationMs < CALIBRATION_MIN_DURATION_MS || durationMs > CALIBRATION_MAX_DURATION_MS) {
      publishError("duration_ms debe estar entre 200 y 5000");
      return;
    }
  }

  if (!beginCalibrationMove(*servo, targetAngle, durationMs)) {
    publishError("no se pudo iniciar el movimiento de calibracion");
    return;
  }

  if (!calibrationMotionActive()) {
    publishStatus("movement_completed", "angulo solicitado igual al angulo ordenado actual");
    publishJointState();
  }
}

void handleEmotionCommand(const String& json, bool fromMqtt) {
  (void)json;
  (void)fromMqtt;
  if (calibrationMotionActive()) {
    publishError("robot_busy");
    return;
  }
  publishError("emotion_test bloqueado mientras CALIBRATION_MODE esta activo");
}

bool isForbiddenRobotCommand(const String& json) {
  return json.indexOf("\"base_function\"") >= 0 || json.indexOf("\"stroke_id\"") >= 0;
}

bool validCalibrationServo(const String& servoName, const RobotServoConfig*& servoConfig) {
  servoConfig = robotServoConfigByName(servoName.c_str());
  return servoConfig != nullptr
    && servoConfig->enabled
    && servoConfig->id != SERVO_BRUSH
    && servoConfig->pin >= 0;
}

bool validJogDelta(int delta) {
  return delta == -5 || delta == -1 || delta == 1 || delta == 5;
}

bool beginCalibrationMove(const RobotServoConfig& servo, int targetAngle, int durationMs) {
  const int previousAngle = calibrationCommandedAngle(servo.name);
  if (!calibrationJointAttached(servo.name)) {
    String attachDetail = String("servo=") + servo.name
      + " gpio=" + servo.pin
      + " assumed_commanded_angle=" + previousAngle
      + " warning=angulo_logico_no_medicion_fisica";
    publishStatus("servo_attaching", attachDetail.c_str());
  }
  if (!startCalibrationMove(servo.name, targetAngle, durationMs)) {
    return false;
  }
  String moveDetail = String("servo=") + servo.name
    + " gpio=" + servo.pin
    + " previous=" + previousAngle
    + " target=" + targetAngle
    + " duration_ms=" + durationMs;
  publishStatus("moving", moveDetail.c_str());
  return true;
}

String extractStringValue(const String& json, const char* key) {
  String pattern = String("\"") + key + "\"";
  int keyIndex = json.indexOf(pattern);
  if (keyIndex < 0) {
    return "";
  }
  int colon = json.indexOf(':', keyIndex + pattern.length());
  if (colon < 0) {
    return "";
  }
  int firstQuote = json.indexOf('"', colon + 1);
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
  String pattern = String("\"") + key + "\"";
  int keyIndex = json.indexOf(pattern);
  if (keyIndex < 0) {
    return fallback;
  }
  int colon = json.indexOf(':', keyIndex + pattern.length());
  if (colon < 0) {
    return fallback;
  }
  int valueStart = colon + 1;
  while (valueStart < json.length() && json.charAt(valueStart) == ' ') {
    valueStart++;
  }
  int valueEnd = valueStart;
  if (valueEnd < json.length() && json.charAt(valueEnd) == '-') {
    valueEnd++;
  }
  while (valueEnd < json.length() && isDigit(json.charAt(valueEnd))) {
    valueEnd++;
  }
  if (valueEnd == valueStart) {
    return fallback;
  }
  return json.substring(valueStart, valueEnd).toInt();
}

bool extractBoolValue(const String& json, const char* key, bool fallback) {
  String pattern = String("\"") + key + "\"";
  int keyIndex = json.indexOf(pattern);
  if (keyIndex < 0) {
    return fallback;
  }
  int colon = json.indexOf(':', keyIndex + pattern.length());
  if (colon < 0) {
    return fallback;
  }
  int valueStart = colon + 1;
  while (valueStart < json.length() && json.charAt(valueStart) == ' ') {
    valueStart++;
  }
  if (json.substring(valueStart, valueStart + 4) == "true") {
    return true;
  }
  if (json.substring(valueStart, valueStart + 5) == "false") {
    return false;
  }
  return fallback;
}
