    // Firmware principal: conecta el ESP32, recibe comandos MQTT y ejecuta la cola segura.
    #include <WiFi.h>
    #include <WiFiClientSecure.h>
    #include <PubSubClient.h>

    #if __has_include("src/config.h")
    #include "src/config.h"
    #else
    #include "src/config.example.h"
    #endif

    #include "src/core/motors.2.h"
    #include "src/core/safety.2.h"
    #include "src/robot_config.h"

    // Firmware con modo operativo runtime:
    // - calibration: comandos de calibracion segura por articulacion.
    // - real: ejecuta comandos de secuencia artistica por MQTT usando trayectorias por puntos.
    // - set_operating_mode permite cambiar sin reflashear, con validaciones de seguridad.

    constexpr int SERIAL_BAUD = 115200;
    // Payload generoso para comandos con arrays "points" largos sin rechazos
    // silenciosos. Ajustado al heap real del ESP32 (queda margen amplio).
    constexpr size_t MAX_COMMAND_LENGTH = 2048;
    constexpr size_t MQTT_PACKET_BUFFER_SIZE = MAX_COMMAND_LENGTH + 256;
    constexpr unsigned long WIFI_RETRY_MS = 8000;
    constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 20000;
    constexpr unsigned long WIFI_STATUS_LOG_MS = 5000;
    constexpr unsigned long MQTT_RETRY_MS = 5000;
    constexpr unsigned long HEARTBEAT_LOG_MS = 3000;
    constexpr unsigned long MQTT_PRESENCE_MS = 5000;
    constexpr bool WIFI_DIAGNOSTIC_SCAN = true;
    constexpr bool SERIAL_LOG_HEARTBEAT = false;
    constexpr bool SERIAL_LOG_JOINT_STATE = false;

    WiFiClient wifiClient;
    WiFiClientSecure secureWifiClient;
    PubSubClient mqttClient;

    unsigned long lastWifiAttempt = 0;
    unsigned long lastMqttAttempt = 0;
    unsigned long lastWifiStatusLog = 0;
    unsigned long lastHeartbeatLog = 0;
    unsigned long lastMqttPresence = 0;
    bool wifiAttemptInProgress = false;

    enum OperatingMode {
      OPERATING_MODE_CALIBRATION,
      OPERATING_MODE_REAL,
    };

    OperatingMode operatingMode = CALIBRATION_MODE ? OPERATING_MODE_CALIBRATION : OPERATING_MODE_REAL;

    struct PathPoint {
      float x;
      float y;
      float z;
      int brush;
    };

    struct RealCommandProfile {
      int speed;
      unsigned long minPauseMs;
      bool forceBrushUp;
      bool forceBrushDown;
    };

    struct CanvasCornerMeasurement {
      int base;
      int shoulder;
      int elbow;
      int wrist;
    };

    struct QueuedRealCommand {
      String json;
      String type;
    };

    constexpr size_t MAX_REAL_PATH_POINTS = 96;
    constexpr size_t REAL_COMMAND_QUEUE_CAPACITY = 32;
    constexpr float PATH_MIN_X = 0.0f;
    constexpr float PATH_MAX_X = 297.0f;
    constexpr float PATH_MIN_Y = 0.0f;
    constexpr float PATH_MAX_Y = 210.0f;
    constexpr float PATH_MIN_Z = 0.0f;
    constexpr float PATH_MAX_Z = 35.0f;

    // Centro A4 medido: base=90, hombro=120, codo=120 y muneca=40.
    // Los extremos conservan el recorrido ya validado y todos se limitan mas
    // abajo con los margenes mecanicos configurados.
    constexpr int CANVAS_BASE_LEFT_DEG = 125;
    constexpr int CANVAS_BASE_RIGHT_DEG = 55;
    constexpr int CANVAS_NEAR_SHOULDER_DEG = 158;
    constexpr int CANVAS_FAR_SHOULDER_DEG = 162;
    constexpr int CANVAS_NEAR_ELBOW_DEG = 70;
    constexpr int CANVAS_FAR_ELBOW_DEG = 144;
    constexpr int CANVAS_CENTER_SHOULDER_CORRECTION_DEG = -39;
    constexpr int CANVAS_CENTER_ELBOW_CORRECTION_DEG = 24;
    constexpr int CANVAS_WRIST_CONTACT_OFFSET_DEG = 3;
    constexpr int CANVAS_SHOULDER_CONTACT_OFFSET_DEG = 4;
    constexpr int PAINTING_WRIST_ANGLE_DEG = 40;
    constexpr ServoPose CANVAS_CENTER_POSE = {90, 120, 120, 40};
    // Primera referencia medida durante la localizacion manual del A4.
    // Coordenadas: x=297 mm, y=210 mm (esquina inferior derecha).
    constexpr ServoPose CANVAS_BOTTOM_RIGHT_POSE = {49, 115, 100, 40};
    // Coordenadas: x=0 mm, y=210 mm (esquina inferior izquierda).
    constexpr ServoPose CANVAS_BOTTOM_LEFT_POSE = {124, 115, 100, 40};
    // Mediciones brutas de las esquinas superiores. El codo a 180 grados
    // excede su limite operativo actual; no usar para movimiento hasta revisar
    // la referencia mecanica y los limites seguros.
    constexpr CanvasCornerMeasurement CANVAS_TOP_RIGHT_MEASUREMENT = {60, 145, 180, 40};
    constexpr CanvasCornerMeasurement CANVAS_TOP_LEFT_MEASUREMENT = {110, 145, 180, 40};
    // El eje de la base queda fuera del borde frontal del A4. La IK usa esta
    // distancia para extender el brazo de forma distinta en cada punto.
    constexpr float CANVAS_BASE_TO_PAPER_MM = 120.0f;
    constexpr float CANVAS_CENTER_X_MM = PATH_MAX_X * 0.5f;

    // Geometria medida del brazo impreso 3D (aprox):
    // - hombro -> codo: 230 mm
    // - codo -> muneca: 180 mm
    // - diametro superior de base: 110 mm
    constexpr float ARM_SHOULDER_TO_ELBOW_MM = 230.0f;
    constexpr float ARM_ELBOW_TO_WRIST_MM = 180.0f;
    constexpr float ARM_BASE_TOP_DIAMETER_MM = 110.0f;

    // Margenes de seguridad para no usar extremos mecanicos en brazo ad-hoc 3D.
    constexpr int SHOULDER_SAFE_MARGIN_DEG = 3;
    constexpr int ELBOW_SAFE_MARGIN_DEG = 6;
    constexpr int WRIST_SAFE_MARGIN_DEG = 10;

    // Perfil base calibrable en campo para ejecucion artistica real.
    constexpr int REAL_SPEED_STROKE_DEFAULT = 8;
    constexpr int REAL_SPEED_STROKE_MAX = 10;
    constexpr int REAL_SPEED_CONTACT_DEFAULT = 50;
    constexpr int REAL_SPEED_TRANSIT_DEFAULT = 50;
    constexpr int REAL_SPEED_HOME_DEFAULT = 45;
    // Los trazos sobre el lienzo mantienen su perfil; solo se acelera la
    // coreografia fuera del lienzo entre estaciones y hacia HOME.
    constexpr int REAL_SPEED_PAINT_APPROACH = 40;
    constexpr int REAL_SPEED_PAINT_RETURN_HOME = 40;
    constexpr int REAL_SPEED_CLEANING = 40;
    constexpr int REAL_MIN_PAUSE_STROKE_MS = 1;
    constexpr int REAL_MIN_PAUSE_CONTACT_MS = 36;
    constexpr int REAL_MIN_PAUSE_TRANSIT_MS = 14;
    constexpr int REAL_MIN_STEP_PAUSE_MS = 1;
    constexpr int REAL_MAX_STEP_PAUSE_MS = 2000;
    constexpr unsigned long FOUR_SERVO_CONTACT_SETTLE_MS = 250;
    constexpr int WATER_SHAKE_REPETITIONS = 7;
    constexpr int DRY_TOWEL_REPETITIONS = 7;
    constexpr unsigned long DRY_TOWEL_HALF_CYCLE_MS = 20;
    constexpr int DRY_TOWEL_START_BASE_DEG = 180;
    constexpr int DRY_TOWEL_SWIPE_BASE_DEG = 140;
    constexpr int DRY_TOWEL_SHOULDER_DEG = 105;
    constexpr int DRY_TOWEL_ELBOW_DEG = 65;
    constexpr int DRY_TOWEL_WRIST_DEG = 0;
    constexpr int PAINT_LOAD_CIRCLE_REPETITIONS = 2;
    constexpr int PAINT_LOAD_CIRCLE_RADIUS_DEG = 5;
    constexpr unsigned long PAINT_LOAD_SETTLE_MS = 500;
    constexpr int WATER_SHAKE_WRIST_AMPLITUDE_DEG = 5;
    constexpr unsigned long WATER_SHAKE_HALF_CYCLE_MS = 25;

    // Limites especificos para el servo de muneca (SG90 9g, plastico, bajo par):
    // no debe ejecutarse a la velocidad maxima cuando hay desplazamiento angular
    // significativo, y el deadband ~1 grado hace inutiles los movimientos < 2.
    constexpr int WRIST_REAL_MAX_SPEED = 50;
    constexpr int WRIST_SIGNIFICANT_DELTA_DEG = 5;
    // Cuando el codo trabaja muy extendido el par requerido al hombro crece
    // rapidamente; aplicamos una penalizacion de velocidad para compensar la
    // flexion del PLA y la limitacion mecanica de los servos del BQ Zum.
    constexpr int ELBOW_EXTENSION_THRESHOLD_DEG = 110;
    constexpr int ELBOW_EXTENSION_SPEED_PENALTY = 3;
    // Periodo maximo de delay sin servir MQTT durante un paso de moveToPoseSafe.
    constexpr unsigned long MOTION_TICK_SERVICE_MS = 8;

    QueuedRealCommand realCommandQueue[REAL_COMMAND_QUEUE_CAPACITY];
    size_t realCommandQueueHead = 0;
    size_t realCommandQueueTail = 0;
    size_t realCommandQueueDepth = 0;
    bool realCommandExecuting = false;
    String activePaintId;

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
    void publishQueueStatus(const char* status, const char* detail);
    void printHeartbeat();
    void publishPresence(bool force = false);
    void serviceRealCommandQueue();
    bool enqueueRealCommand(const String& json, const String& type);
    bool dequeueRealCommand(QueuedRealCommand& command);
    void clearRealCommandQueue();
    void handleInputCommand(const String& json, bool fromMqtt);
    void handleEmotionCommand(const String& json, bool fromMqtt);
    void handleOperatingModeCommand(const String& json, bool fromMqtt);
    void handleCalibrationCommand(const String& json, const String& type);
    void handleRealModeCommand(const String& json, const String& type);
    bool executeRealPathCommand(const String& json, const String& type);
    bool executeMoodcamStationCommand(const String& json, const String& type);
    bool moveMoodcamPose(const ServoPose& target, int speed);
    bool moveMoodcamStationPose(const ServoPose& target, int speed);
    bool moveMoodcamPaintPose(const ServoPose& target, bool elbowBeforeShoulder);
    bool moveMoodcamWaterPose(const ServoPose& target, int speed);
    bool moveMoodcamDryPose(const ServoPose& target, int speed);
    bool moveToHomeSlowly();
    bool moveToPaintHomeSafely();
    bool moveWaterToHomeSafely();
    bool moveDryToHomeSafely();
    bool loadMoodcamPaint(const String& paintId, int speed);
    bool rinseMoodcamBrush(int speed);
    bool dryMoodcamBrush(int speed);
    bool moodcamPaintPose(const String& paintId, ServoPose& pose);
    bool paintRequiresElbowBeforeShoulder(const String& paintId);
    bool parsePathPoints(const String& json, PathPoint* points, size_t& pointCount, size_t maxPoints);
    bool extractFloatValue(const String& json, const char* key, float& value);
    float mapFloatRange(float value, float inMin, float inMax, float outMin, float outMax);
    ServoPose mapPointToPose(const PathPoint& point);
    RealCommandProfile buildRealCommandProfile(const String& type, const String& json);
    void serviceMotionTick(unsigned long durationMs);
    void printServoConfig(const RobotServoConfig& servo);
    bool isForbiddenRobotCommand(const String& json);
    bool isRealModeCommandType(const String& type);
    bool validCalibrationServo(const String& servoName, const RobotServoConfig*& servoConfig);
    bool validJogDelta(int delta);
    bool beginCalibrationMove(const RobotServoConfig& servo, int targetAngle, int durationMs);
    bool setOperatingMode(const String& modeValue, const char*& errorDetail);
    const char* operatingModeText();
    bool isCalibrationMode();
    const char* wifiStatusText(wl_status_t status);
    const char* wifiAuthText(wifi_auth_mode_t mode);
    const char* mqttStateText(int state);
    String extractStringValue(const String& json, const char* key);
    int extractIntValue(const String& json, const char* key, int fallback);
    bool extractBoolValue(const String& json, const char* key, bool fallback);

    void setup() {
      // setup se ejecuta una sola vez al encender. Inicializa primero las barreras
      // de seguridad y despues la comunicacion, para que el brazo empiece detenido.
      Serial.begin(SERIAL_BAUD);
      delay(200);
      Serial.setTimeout(50);
      beginSafety();
      beginMotors();
      clearEmergencyStop();
      // Permite que moveToPoseSafe siga procesando MQTT entre pasos de
      // interpolacion para no perder presencia durante un stroke largo.
      setMotionTickCallback(serviceMotionTick);

      Serial.println("Inner Synergy ESP32: modo prueba MQTT segura.");
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
        if (mqttClient.setBufferSize(MQTT_PACKET_BUFFER_SIZE)) {
          Serial.print("MQTT buffer size configurado: ");
          Serial.println(MQTT_PACKET_BUFFER_SIZE);
        } else {
          Serial.print("Advertencia: no se pudo configurar MQTT buffer size a ");
          Serial.println(MQTT_PACKET_BUFFER_SIZE);
        }
        connectWiFi();
        connectMQTT();
      } else {
        Serial.println("NETWORK_ENABLED=false. Copia config.example.h a config.h y activalo para WiFi/MQTT.");
      }
    }

    void loop() {
      // loop debe volver rapidamente una y otra vez: asi se atienden MQTT, presencia,
      // cola de comandos y parada de emergencia sin bloquear el microcontrolador.
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
          publishPresence();
          serviceRealCommandQueue();
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
      if (!SERIAL_LOG_HEARTBEAT) {
        return;
      }
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

    void publishPresence(bool force) {
      if (!NETWORK_ENABLED || !mqttClient.connected()) {
        return;
      }
      const unsigned long now = millis();
      if (!force && lastMqttPresence != 0 && now - lastMqttPresence < MQTT_PRESENCE_MS) {
        return;
      }
      lastMqttPresence = now;
      String payload = String("{\"type\":\"presence\",\"device_id\":\"") + MQTT_DEVICE_ID
        + "\",\"component\":\"esp32\",\"status\":\"online\",\"timestamp\":" + now
        + ",\"uptime_ms\":" + now
        + ",\"interval_ms\":" + MQTT_PRESENCE_MS
        + ",\"wifi\":\"" + wifiStatusText(WiFi.status())
        + "\",\"mqtt\":\"connected\"}";
      mqttClient.publish(TOPIC_ESP32_PRESENCE, payload.c_str(), true);
    }

    void serviceMotionTick(unsigned long durationMs) {
      // Sustituye al delay() bloqueante interno de moveToPoseSafe: durante la
      // espera entre pasos sigue procesando MQTT/WiFi para que la conexion no
      // caiga durante strokes largos del modo real.
      const unsigned long start = millis();
      while (millis() - start < durationMs) {
        if (NETWORK_ENABLED && mqttClient.connected()) {
          mqttClient.loop();
          publishPresence();
        }
        const unsigned long elapsed = millis() - start;
        const unsigned long remaining = durationMs > elapsed ? durationMs - elapsed : 0;
        const unsigned long sliceMs = remaining < MOTION_TICK_SERVICE_MS ? remaining : MOTION_TICK_SERVICE_MS;
        if (sliceMs == 0) {
          break;
        }
        delay(sliceMs);
      }
    }

    void printHelp() {
      Serial.println("Comandos seguros:");
      Serial.println("  STATUS - muestra estado");
      Serial.println("  STOP   - cancela movimiento y mantiene servos adjuntos");
      Serial.println("  MQTT set_operating_mode - mode=calibration|real");
      Serial.print("  MQTT ");
      Serial.print(TOPIC_ROBOT_COMMAND);
      Serial.println(" - get_joint_state, stop, set_operating_mode, start_calibration, jog, set_angle, release_servos");
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
      Serial.print("operating_mode: ");
      Serial.println(operatingModeText());
      Serial.print("MOTOR_OUTPUT_ENABLED: ");
      Serial.println(MOTOR_OUTPUT_ENABLED ? "true" : "false");
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
        publishPresence(true);
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

      if (topicName == TOPIC_EMOTION_INPUT) {
        handleEmotionCommand(message, true);
      } else {
        const String type = extractStringValue(message, "type");
        if (type != "get_joint_state") {
          Serial.print("MQTT robot command: ");
          Serial.println(type);
        }
        handleInputCommand(message, true);
      }
    }

    void publishStatus(const char* status, const char* detail) {
      Serial.print("{\"status\":\"");
      Serial.print(status);
      Serial.print("\",\"detail\":\"");
      Serial.print(detail);
      Serial.print("\",\"operating_mode\":\"");
      Serial.print(operatingModeText());
      Serial.println("\"}");

      if (!NETWORK_ENABLED || !mqttClient.connected()) {
        return;
      }
      String payload = String("{\"status\":\"") + status
        + "\",\"detail\":\"" + detail
        + "\",\"operating_mode\":\"" + operatingModeText()
        + "\"}";
      mqttClient.publish(TOPIC_ROBOT_STATUS, payload.c_str());
    }

    void publishError(const char* detail) {
      Serial.print("{\"status\":\"error\",\"detail\":\"");
      Serial.print(detail);
      Serial.print("\",\"operating_mode\":\"");
      Serial.print(operatingModeText());
      Serial.println("\"}");

      if (!NETWORK_ENABLED || !mqttClient.connected()) {
        return;
      }
      String payload = String("{\"status\":\"error\",\"detail\":\"") + detail
        + "\",\"operating_mode\":\"" + operatingModeText()
        + "\"}";
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
        + ",\"operating_mode\":\"" + operatingModeText() + "\""
        + ",\"angles_are_commanded\":true}";
      if (SERIAL_LOG_JOINT_STATE) {
        Serial.println(payload);
      }
      if (NETWORK_ENABLED && mqttClient.connected()) {
        mqttClient.publish(TOPIC_ROBOT_STATUS, payload.c_str());
      }
    }

    void publishStopped(const char* source) {
      requestEmergencyStop();
      clearRealCommandQueue();
      stopMotors();
      const char* stoppedServo = nullptr;
      int stoppedAngle = -1;
      stopCalibrationMotion(stoppedServo, stoppedAngle);
      String detail = String("source=") + source + " active_servos_remain_attached=true";
      if (stoppedServo != nullptr) {
        detail += String(" servo=") + stoppedServo + " commanded_angle=" + stoppedAngle;
      }
      publishStatus("stopped", detail.c_str());
      publishQueueStatus("queue_cleared", "stop_command");
      publishJointState();
    }

    void publishQueueStatus(const char* status, const char* detail) {
      const bool queueFull = realCommandQueueDepth >= REAL_COMMAND_QUEUE_CAPACITY;
      String payload = String("{\"status\":\"") + status
        + "\",\"detail\":\"" + detail
        + "\",\"operating_mode\":\"" + operatingModeText()
        + "\",\"queue_depth\":" + String(static_cast<unsigned int>(realCommandQueueDepth))
        + ",\"queue_capacity\":" + String(static_cast<unsigned int>(REAL_COMMAND_QUEUE_CAPACITY))
        + ",\"queue_full\":" + (queueFull ? "true" : "false")
        + ",\"queue_executing\":" + (realCommandExecuting ? "true" : "false")
        + "}";
      Serial.println(payload);
      if (NETWORK_ENABLED && mqttClient.connected()) {
        mqttClient.publish(TOPIC_ROBOT_STATUS, payload.c_str());
      }
    }

    bool enqueueRealCommand(const String& json, const String& type) {
      if (realCommandQueueDepth >= REAL_COMMAND_QUEUE_CAPACITY) {
        publishQueueStatus("queue_full", type.c_str());
        return false;
      }

      realCommandQueue[realCommandQueueTail].json = json;
      realCommandQueue[realCommandQueueTail].type = type;
      realCommandQueueTail = (realCommandQueueTail + 1) % REAL_COMMAND_QUEUE_CAPACITY;
      realCommandQueueDepth++;
      publishQueueStatus("queued", type.c_str());
      return true;
    }

    bool dequeueRealCommand(QueuedRealCommand& command) {
      if (realCommandQueueDepth == 0) {
        return false;
      }

      command = realCommandQueue[realCommandQueueHead];
      realCommandQueue[realCommandQueueHead].json = "";
      realCommandQueue[realCommandQueueHead].type = "";
      realCommandQueueHead = (realCommandQueueHead + 1) % REAL_COMMAND_QUEUE_CAPACITY;
      realCommandQueueDepth--;
      return true;
    }

    void clearRealCommandQueue() {
      for (size_t index = 0; index < REAL_COMMAND_QUEUE_CAPACITY; index++) {
        realCommandQueue[index].json = "";
        realCommandQueue[index].type = "";
      }
      realCommandQueueHead = 0;
      realCommandQueueTail = 0;
      realCommandQueueDepth = 0;
    }

    void serviceRealCommandQueue() {
      if (realCommandExecuting || realCommandQueueDepth == 0 || isCalibrationMode()) {
        return;
      }

      QueuedRealCommand command;
      if (!dequeueRealCommand(command)) {
        return;
      }

      realCommandExecuting = true;
      publishQueueStatus("queue_draining", command.type.c_str());

      String startedDetail = String("type=") + command.type + " execution=started";
      publishStatus("real_command_received", startedDetail.c_str());

      if (executeRealPathCommand(command.json, command.type)) {
        String completedDetail = String("type=") + command.type + " execution=completed";
        publishStatus("real_command_executed", completedDetail.c_str());
      } else {
        String failedDetail = String("type=") + command.type + " execution=failed";
        publishStatus("real_command_failed", failedDetail.c_str());
      }

      realCommandExecuting = false;
      if (isEmergencyStopped()) {
        clearRealCommandQueue();
        publishQueueStatus("queue_cleared", "emergency_stop");
        return;
      }
      publishQueueStatus(realCommandQueueDepth == 0 ? "queue_idle" : "queue_ready", "command_finished");
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

      if (calibrationMotionActive() && type != "stop" && type != "get_joint_state" && type != "set_operating_mode") {
        publishError("robot_busy");
        return;
      }

      if (type == "get_joint_state") {
        publishJointState();
        return;
      }

      if (type == "stop") {
        publishStopped(fromMqtt ? "mqtt" : "serial");
        return;
      }

      if (type == "resume") {
        if (isCalibrationMode()) {
          publishError("resume_requiere_modo_real");
          return;
        }
        clearEmergencyStop();
        publishStatus("resumed", "emergency_stop_cleared");
        publishJointState();
        return;
      }

      if (type == "set_operating_mode") {
        handleOperatingModeCommand(json, fromMqtt);
        return;
      }

      if (isCalibrationMode()) {
        if (isForbiddenRobotCommand(json)) {
          publishError("base_function y stroke_id no permitidos en calibracion");
          return;
        }

        if (!SAFE_TEST_MODE) {
          publishError("safe_test_mode_required");
          return;
        }

        handleCalibrationCommand(json, type);
        return;
      }

      handleRealModeCommand(json, type);
    }

    void handleOperatingModeCommand(const String& json, bool fromMqtt) {
      if (fromMqtt && (!NETWORK_ENABLED || WiFi.status() != WL_CONNECTED || !mqttClient.connected())) {
        publishError("wifi o mqtt no conectado");
        return;
      }
      if (calibrationMotionActive()) {
        publishError("robot_busy");
        return;
      }

      const String modeValue = extractStringValue(json, "mode");
      if ((modeValue == "calibration" && isCalibrationMode()) || (modeValue == "real" && !isCalibrationMode())) {
        if (modeValue == "real") {
          syncPoseToCommandedAngles();
          clearEmergencyStop();
        }
        String detail = String("mode=") + operatingModeText() + " source=" + (fromMqtt ? "mqtt" : "serial");
        publishStatus("mode_unchanged", detail.c_str());
        publishJointState();
        return;
      }

      const char* errorDetail = nullptr;
      if (!setOperatingMode(modeValue, errorDetail)) {
        publishError(errorDetail == nullptr ? "modo invalido" : errorDetail);
        return;
      }

      // Al pasar a real alineamos la pose interna con los angulos comandados
      // por calibracion para evitar saltos bruscos en el primer movimiento.
      if (!isCalibrationMode()) {
        syncPoseToCommandedAngles();
        clearEmergencyStop();
      }

      String detail = String("mode=") + operatingModeText() + " source=" + (fromMqtt ? "mqtt" : "serial");
      publishStatus("operating_mode_changed", detail.c_str());
      publishJointState();
    }

    void handleCalibrationCommand(const String& json, const String& type) {
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

    void handleRealModeCommand(const String& json, const String& type) {
      if (!FINAL_ARM_MODE) {
        publishError("real_mode_disabled_in_build");
        return;
      }

      if (type.length() == 0) {
        publishError("tipo de comando requerido");
        return;
      }

      if (isForbiddenRobotCommand(json)) {
        publishError("comando heredado no permitido en modo real");
        return;
      }

      if (!isRealModeCommandType(type)) {
        publishError("comando de obra recibido en modo real pero no soportado");
        return;
      }

      if (!enqueueRealCommand(json, type)) {
        publishError("queue_full");
      }
    }

    bool executeRealPathCommand(const String& json, const String& type) {
      if (type == "paint_sequence_start") {
        return true;
      }
      if (type == "paint_sequence_end") {
        return true;
      }

      if (type == "move_to_paint" || type == "dip_paint" || type == "move_to_water"
          || type == "rinse_brush" || type == "move_to_towel" || type == "dry_brush") {
        return executeMoodcamStationCommand(json, type);
      }

      PathPoint points[MAX_REAL_PATH_POINTS];
      size_t pointCount = 0;
      if (!parsePathPoints(json, points, pointCount, MAX_REAL_PATH_POINTS) || pointCount == 0) {
        publishError("points invalidos o vacios en modo real");
        return false;
      }

      const RealCommandProfile profile = buildRealCommandProfile(type, json);
      const MotionParameters safe = sanitizeMotionParameters(
        profile.speed,
        extractIntValue(json, "intensity", 40),
        extractIntValue(json, "duration_ms", type == "stroke" ? 150 : 1200)
      );

      const unsigned long pausePerPoint = max(
        profile.minPauseMs,
        static_cast<unsigned long>(safe.durationMs) / max(static_cast<size_t>(1), pointCount)
      );

      const float armReachMm = ARM_SHOULDER_TO_ELBOW_MM + ARM_ELBOW_TO_WRIST_MM;
      const float canvasDiagonalMm = sqrt(PATH_MAX_X * PATH_MAX_X + PATH_MAX_Y * PATH_MAX_Y);
      const float reachToCanvasRatio = canvasDiagonalMm <= 0.0f ? 1.0f : armReachMm / canvasDiagonalMm;
      bool previousPointWasContact = false;
      const bool strokePath = type == "stroke" && !profile.forceBrushUp;

      if (type == "stroke") {
        String requestedPaintId = extractStringValue(json, "paint_id");
        if (requestedPaintId.length() == 0) {
          requestedPaintId = extractStringValue(json, "color");
        }
        if (requestedPaintId.length() > 0
            && !loadMoodcamPaint(requestedPaintId, REAL_SPEED_CONTACT_DEFAULT)) {
          publishError("color de pintura no configurado en Moodcam");
          return false;
        }
      }

      for (size_t index = 0; index < pointCount; index++) {
        if (isEmergencyStopped()) {
          stopMotors();
          publishError("ejecucion interrumpida por parada de emergencia");
          return false;
        }

        const bool contactPoint = !profile.forceBrushUp && (profile.forceBrushDown || points[index].brush > 0);
        ServoPose target = mapPointToPose(points[index]);
        if (strokePath) {
          target.shoulder = constrain(
            target.shoulder + CANVAS_SHOULDER_CONTACT_OFFSET_DEG,
            SHOULDER_SERVO_CONFIG.minAngle + SHOULDER_SAFE_MARGIN_DEG,
            SHOULDER_SERVO_CONFIG.maxAngle - SHOULDER_SAFE_MARGIN_DEG
          );
          target.wrist = PAINTING_WRIST_ANGLE_DEG;
        }

        const float minEdgeDistance = min(
          min(points[index].x - PATH_MIN_X, PATH_MAX_X - points[index].x),
          min(points[index].y - PATH_MIN_Y, PATH_MAX_Y - points[index].y)
        );
        const bool nearEdge = minEdgeDistance < 18.0f;
        int dynamicSpeed = safe.speed;
        if (nearEdge) {
          dynamicSpeed = max(SAFE_MIN_SPEED, safe.speed - 4);
        }
        if (reachToCanvasRatio > 1.08f) {
          dynamicSpeed = max(SAFE_MIN_SPEED, dynamicSpeed - 2);
        }
        // Penalizacion adicional cuando el codo trabaja muy extendido para
        // proteger al servo del hombro (BQ Zum ~3.5 kg.cm) contra picos de par.
        const ServoPose previousPose = currentPose();
        if (target.elbow > ELBOW_EXTENSION_THRESHOLD_DEG
            || previousPose.elbow > ELBOW_EXTENSION_THRESHOLD_DEG) {
          dynamicSpeed = max(SAFE_MIN_SPEED, dynamicSpeed - ELBOW_EXTENSION_SPEED_PENALTY);
        }
        // El SG90 de la muneca no tolera la velocidad maxima si tiene que recorrer
        // varios grados en un solo paso; limitamos la velocidad efectiva.
        if (abs(target.wrist - previousPose.wrist) > WRIST_SIGNIFICANT_DELTA_DEG) {
          dynamicSpeed = min(dynamicSpeed, WRIST_REAL_MAX_SPEED);
        }

        if (!moveToPoseSafe(target, dynamicSpeed)) {
          stopMotors();
          publishError("fallo al mover pose en modo real");
          return false;
        }

        // El brazo de cuatro servos usa la muneca como eje Z: el primer punto con
        // brush=1 llega a z de contacto antes de avanzar por el trazo.
        if (contactPoint && !previousPointWasContact && !waitSafely(FOUR_SERVO_CONTACT_SETTLE_MS)) {
          stopMotors();
          publishError("ejecucion interrumpida al apoyar el pincel");
          return false;
        }
        previousPointWasContact = contactPoint;

        if (type != "stroke" && !waitSafely(pausePerPoint)) {
          stopMotors();
          publishError("ejecucion interrumpida durante espera segura");
          return false;
        }
      }

      if (type == "stroke" && !moveToHomeSlowly()) {
        publishError("fallo al volver a HOME despues del trazo");
        return false;
      }
      return true;
    }

    bool moveMoodcamPose(const ServoPose& target, int speed) {
      return moveToPoseSafe(target, speed);
    }

    bool moveMoodcamStationPose(const ServoPose& target, int speed) {
      const ServoPose current = currentPose();
      const int stationSpeed = min(speed, REAL_SPEED_PAINT_APPROACH);
      const ServoPose basePose = {target.base, current.shoulder, current.elbow, current.wrist};
      const ServoPose elbowPose = {target.base, current.shoulder, target.elbow, current.wrist};
      const ServoPose shoulderPose = {target.base, target.shoulder, target.elbow, current.wrist};
      return moveToPoseSafe(basePose, stationSpeed)
        && moveToPoseSafe(elbowPose, stationSpeed)
        && moveToPoseSafe(shoulderPose, stationSpeed)
        && moveToPoseSafe(target, stationSpeed);
    }

    bool moveMoodcamPaintPose(const ServoPose& target, bool elbowBeforeShoulder) {
      const ServoPose current = currentPose();
      const ServoPose basePose = {target.base, current.shoulder, current.elbow, current.wrist};
      const ServoPose wristPose = {target.base, current.shoulder, current.elbow, target.wrist};
      const ServoPose elbowPose = {target.base, current.shoulder, target.elbow, target.wrist};
      const ServoPose shoulderPose = {target.base, target.shoulder, current.elbow, target.wrist};
      if (elbowBeforeShoulder) {
        return moveToPoseSafe(basePose, REAL_SPEED_PAINT_APPROACH)
          && moveToPoseSafe(wristPose, REAL_SPEED_PAINT_APPROACH)
          && moveToPoseSafe(elbowPose, REAL_SPEED_PAINT_APPROACH)
          && moveToPoseSafe(target, REAL_SPEED_PAINT_APPROACH);
      }
      return moveToPoseSafe(basePose, REAL_SPEED_PAINT_APPROACH)
        && moveToPoseSafe(wristPose, REAL_SPEED_PAINT_APPROACH)
        && moveToPoseSafe(shoulderPose, REAL_SPEED_PAINT_APPROACH)
        && moveToPoseSafe(target, REAL_SPEED_PAINT_APPROACH);
    }

    bool moveMoodcamWaterPose(const ServoPose& target, int speed) {
      const ServoPose current = currentPose();
      const int waterSpeed = min(speed, REAL_SPEED_CLEANING);
      ServoPose waterApproach = current;

      waterApproach.base = target.base;
      waterApproach.wrist = current.wrist + (target.wrist - current.wrist) * 3 / 4;
      if (!moveToPoseSafe(waterApproach, waterSpeed)) {
        return false;
      }

      waterApproach.elbow = target.elbow;
      if (!moveToPoseSafe(waterApproach, waterSpeed)) {
        return false;
      }

      waterApproach.shoulder = target.shoulder;
      if (!moveToPoseSafe(waterApproach, waterSpeed)) {
        return false;
      }

      waterApproach.wrist = target.wrist;
      return moveToPoseSafe(waterApproach, waterSpeed);
    }

    bool moveMoodcamDryPose(const ServoPose& target, int speed) {
      const ServoPose current = currentPose();
      const int drySpeed = min(speed, REAL_SPEED_CLEANING);
      const int approachWrist = current.wrist + (target.wrist - current.wrist) * 3 / 4;
      const ServoPose basePose = {target.base, current.shoulder, current.elbow, approachWrist};
      const ServoPose elbowPose = {target.base, current.shoulder, target.elbow, approachWrist};
      const ServoPose shoulderPose = {target.base, target.shoulder, target.elbow, approachWrist};
      return moveToPoseSafe(basePose, drySpeed)
        && moveToPoseSafe(elbowPose, drySpeed)
        && moveToPoseSafe(shoulderPose, drySpeed)
        && moveToPoseSafe(target, drySpeed);
    }

    bool moveToHomeSlowly() {
      const ServoPose current = currentPose();
      const ServoPose homePose = {
        BASE_SERVO_CONFIG.homeAngle,
        SHOULDER_SERVO_CONFIG.homeAngle,
        ELBOW_SERVO_CONFIG.homeAngle,
        WRIST_SERVO_CONFIG.homeAngle
      };
      const ServoPose shoulderPose = {current.base, homePose.shoulder, current.elbow, current.wrist};
      const ServoPose basePose = {homePose.base, homePose.shoulder, current.elbow, current.wrist};
      const ServoPose wristPose = {homePose.base, homePose.shoulder, current.elbow, homePose.wrist};
      return moveToPoseSafe(shoulderPose, REAL_SPEED_PAINT_RETURN_HOME)
        && moveToPoseSafe(basePose, REAL_SPEED_PAINT_RETURN_HOME)
        && moveToPoseSafe(wristPose, REAL_SPEED_PAINT_RETURN_HOME)
        && moveToPoseSafe(homePose, REAL_SPEED_PAINT_RETURN_HOME);
    }

    bool moveToPaintHomeSafely() {
      const ServoPose current = currentPose();
      const ServoPose homePose = {
        BASE_SERVO_CONFIG.homeAngle,
        SHOULDER_SERVO_CONFIG.homeAngle,
        ELBOW_SERVO_CONFIG.homeAngle,
        WRIST_SERVO_CONFIG.homeAngle
      };
      const ServoPose basePose = {homePose.base, current.shoulder, current.elbow, current.wrist};
      const ServoPose wristPose = {homePose.base, current.shoulder, current.elbow, homePose.wrist};
      const ServoPose elbowPose = {homePose.base, current.shoulder, homePose.elbow, homePose.wrist};
      return moveToPoseSafe(basePose, REAL_SPEED_PAINT_RETURN_HOME)
        && moveToPoseSafe(wristPose, REAL_SPEED_PAINT_RETURN_HOME)
        && moveToPoseSafe(elbowPose, REAL_SPEED_PAINT_RETURN_HOME)
        && moveToPoseSafe(homePose, REAL_SPEED_PAINT_RETURN_HOME);
    }

    bool moveWaterToHomeSafely() {
      const ServoPose current = currentPose();
      const ServoPose homePose = {
        BASE_SERVO_CONFIG.homeAngle,
        SHOULDER_SERVO_CONFIG.homeAngle,
        ELBOW_SERVO_CONFIG.homeAngle,
        WRIST_SERVO_CONFIG.homeAngle
      };
      const int approachWrist = current.wrist + (homePose.wrist - current.wrist) * 3 / 4;
      const ServoPose shoulderPose = {current.base, homePose.shoulder, current.elbow, approachWrist};
      const ServoPose elbowPose = {current.base, homePose.shoulder, homePose.elbow, approachWrist};
      const ServoPose basePose = {homePose.base, homePose.shoulder, homePose.elbow, approachWrist};
      return moveToPoseSafe(shoulderPose, REAL_SPEED_PAINT_RETURN_HOME)
        && moveToPoseSafe(elbowPose, REAL_SPEED_PAINT_RETURN_HOME)
        && moveToPoseSafe(basePose, REAL_SPEED_PAINT_RETURN_HOME)
        && moveToPoseSafe(homePose, REAL_SPEED_PAINT_RETURN_HOME);
    }

    bool moveDryToHomeSafely() {
      return moveWaterToHomeSafely();
    }

    bool moodcamPaintPose(const String& paintId, ServoPose& pose) {
      String normalized = paintId;
      normalized.toLowerCase();
      if (normalized == "yellow" || normalized == "amarillo") {
        pose = {170, 109, 80, PAINTING_WRIST_ANGLE_DEG};
      } else if (normalized == "red" || normalized == "rojo") {
        pose = {140, 110, 90, PAINTING_WRIST_ANGLE_DEG};
      } else if (normalized == "violet" || normalized == "purple" || normalized == "morado") {
        pose = {20, 110, 90, PAINTING_WRIST_ANGLE_DEG};
      } else if (normalized == "blue" || normalized == "light_blue" || normalized == "azul") {
        pose = {0, 110, 80, PAINTING_WRIST_ANGLE_DEG};
      } else {
        return false;
      }
      return true;
    }

    bool paintRequiresElbowBeforeShoulder(const String& paintId) {
      String normalized = paintId;
      normalized.toLowerCase();
      return normalized == "yellow" || normalized == "amarillo"
        || normalized == "blue" || normalized == "light_blue" || normalized == "azul";
    }

    bool loadMoodcamPaint(const String& paintId, int speed) {
      if (activePaintId.length() > 0 && activePaintId != paintId
          && (!rinseMoodcamBrush(speed) || !dryMoodcamBrush(speed))) {
        return false;
      }
      const bool elbowBeforeShoulder = paintRequiresElbowBeforeShoulder(paintId);
      if (!(elbowBeforeShoulder ? moveToPaintHomeSafely() : moveToHomeSlowly())) {
        return false;
      }
      ServoPose paintPose;
      if (!moodcamPaintPose(paintId, paintPose)) {
        return false;
      }
      if (!moveMoodcamPaintPose(paintPose, elbowBeforeShoulder)) {
        return false;
      }
      const int paintLoadSpeed = constrain(speed / 2, SAFE_MIN_SPEED, SAFE_MAX_SPEED);
      const ServoPose dipPose = {
        paintPose.base,
        paintPose.shoulder,
        paintPose.elbow,
        PAINTING_WRIST_ANGLE_DEG
      };
      if (!moveMoodcamPose(dipPose, paintLoadSpeed) || !waitSafely(PAINT_LOAD_SETTLE_MS)) {
        return false;
      }
      const int circleRadius = PAINT_LOAD_CIRCLE_RADIUS_DEG;
      const ServoPose circlePoints[] = {
        {constrain(dipPose.base + circleRadius, BASE_SERVO_CONFIG.minAngle, BASE_SERVO_CONFIG.maxAngle), dipPose.shoulder, dipPose.elbow, dipPose.wrist},
        {dipPose.base, constrain(dipPose.shoulder + circleRadius, SHOULDER_SERVO_CONFIG.minAngle, SHOULDER_SERVO_CONFIG.maxAngle), dipPose.elbow, dipPose.wrist},
        {constrain(dipPose.base - circleRadius, BASE_SERVO_CONFIG.minAngle, BASE_SERVO_CONFIG.maxAngle), dipPose.shoulder, dipPose.elbow, dipPose.wrist},
        {dipPose.base, constrain(dipPose.shoulder - circleRadius, SHOULDER_SERVO_CONFIG.minAngle, SHOULDER_SERVO_CONFIG.maxAngle), dipPose.elbow, dipPose.wrist}
      };
      for (int repetition = 0; repetition < PAINT_LOAD_CIRCLE_REPETITIONS; repetition++) {
        for (const ServoPose& circlePoint : circlePoints) {
          if (!moveMoodcamPose(circlePoint, paintLoadSpeed)) {
            return false;
          }
        }
        if (!moveMoodcamPose(dipPose, paintLoadSpeed)) {
          return false;
        }
      }
      activePaintId = paintId;
      return moveToHomeSlowly();
    }

    bool rinseMoodcamBrush(int speed) {
      const ServoPose waterPose = {90, 100, 50, 0};
      if (!moveMoodcamWaterPose(waterPose, speed)) {
        return false;
      }
      const ServoPose right = {90, 100, 50, WATER_SHAKE_WRIST_AMPLITUDE_DEG};
      const ServoPose left = {90, 100, 50, 0};
      for (int repetition = 0; repetition < WATER_SHAKE_REPETITIONS; repetition++) {
        if (!moveMoodcamPose(right, speed) || !waitSafely(WATER_SHAKE_HALF_CYCLE_MS)
          || !moveMoodcamPose(left, speed) || !waitSafely(WATER_SHAKE_HALF_CYCLE_MS)) {
          return false;
        }
      }
      activePaintId = "";
      return moveMoodcamPose(waterPose, speed) && moveWaterToHomeSafely();
    }

    bool dryMoodcamBrush(int speed) {
      const ServoPose towelPose = {
        DRY_TOWEL_START_BASE_DEG,
        DRY_TOWEL_SHOULDER_DEG,
        DRY_TOWEL_ELBOW_DEG,
        DRY_TOWEL_WRIST_DEG
      };
      if (!moveMoodcamDryPose(towelPose, speed)) {
        return false;
      }
      for (int repetition = 0; repetition < DRY_TOWEL_REPETITIONS; repetition++) {
        const ServoPose sweepPose = {
          DRY_TOWEL_SWIPE_BASE_DEG,
          DRY_TOWEL_SHOULDER_DEG,
          DRY_TOWEL_ELBOW_DEG,
          DRY_TOWEL_WRIST_DEG
        };
        if (!moveMoodcamPose(sweepPose, speed) || !waitSafely(DRY_TOWEL_HALF_CYCLE_MS)
          || !moveMoodcamPose(towelPose, speed) || !waitSafely(DRY_TOWEL_HALF_CYCLE_MS)) {
          return false;
        }
      }
      return moveMoodcamDryPose(towelPose, speed) && moveDryToHomeSafely();
    }

    bool executeMoodcamStationCommand(const String& json, const String& type) {
      const int speed = constrain(extractIntValue(json, "speed", REAL_SPEED_CONTACT_DEFAULT), SAFE_MIN_SPEED, SAFE_MAX_SPEED);
      if (type == "move_to_paint" || type == "dip_paint") {
        String paintId = extractStringValue(json, "paint_id");
        if (paintId.length() == 0) {
          paintId = extractStringValue(json, "color");
        }
        if (type == "dip_paint") {
          return loadMoodcamPaint(paintId, speed);
        }
        ServoPose paintPose;
        return moodcamPaintPose(paintId, paintPose)
          && moveMoodcamPaintPose(paintPose, paintRequiresElbowBeforeShoulder(paintId));
      }
      if (type == "move_to_water") {
        return moveMoodcamWaterPose({90, 100, 50, 0}, speed);
      }
      if (type == "rinse_brush") {
        return rinseMoodcamBrush(speed);
      }
      if (type == "move_to_towel") {
        return moveMoodcamDryPose({
          DRY_TOWEL_START_BASE_DEG,
          DRY_TOWEL_SHOULDER_DEG,
          DRY_TOWEL_ELBOW_DEG,
          DRY_TOWEL_WRIST_DEG
        }, speed);
      }
      return dryMoodcamBrush(speed);
    }

    RealCommandProfile buildRealCommandProfile(const String& type, const String& json) {
      const bool isStroke = type == "stroke";
      const bool isPaintLoad = type == "dip_paint";
      const bool isWater = type == "rinse_brush";
      const bool isTowel = type == "dry_brush";
      const bool isTransit = type == "move_to_paint"
        || type == "move_to_water"
        || type == "move_to_towel"
        || type == "move_to_rest";

      const int defaultSpeed = isStroke
        ? REAL_SPEED_STROKE_DEFAULT
        : ((isPaintLoad || isWater || isTowel) ? REAL_SPEED_CONTACT_DEFAULT : REAL_SPEED_TRANSIT_DEFAULT);
      const int defaultPause = isStroke
        ? REAL_MIN_PAUSE_STROKE_MS
        : ((isPaintLoad || isWater || isTowel) ? REAL_MIN_PAUSE_CONTACT_MS : REAL_MIN_PAUSE_TRANSIT_MS);
      const int requestedPause = constrain(
        extractIntValue(json, "step_pause_ms", defaultPause),
        REAL_MIN_STEP_PAUSE_MS,
        REAL_MAX_STEP_PAUSE_MS
      );

      const int requestedSpeed = extractIntValue(json, "speed", defaultSpeed);

      return {
        isStroke
          ? constrain(requestedSpeed, SAFE_MIN_SPEED, REAL_SPEED_STROKE_MAX)
          : requestedSpeed,
        static_cast<unsigned long>(requestedPause),
        isTransit,
        isPaintLoad || isWater || isTowel
      };
    }

    bool parsePathPoints(const String& json, PathPoint* points, size_t& pointCount, size_t maxPoints) {
      pointCount = 0;
      const int pointsKey = json.indexOf("\"points\"");
      if (pointsKey < 0) {
        return false;
      }
      const int arrayStart = json.indexOf('[', pointsKey);
      if (arrayStart < 0) {
        return false;
      }

      int depth = 0;
      int objectStart = -1;
      for (int index = arrayStart + 1; index < json.length(); index++) {
        const char ch = json.charAt(index);
        if (ch == ']') {
          break;
        }
        if (ch == '{') {
          if (depth == 0) {
            objectStart = index;
          }
          depth++;
          continue;
        }
        if (ch != '}') {
          continue;
        }
        depth--;
        if (depth != 0 || objectStart < 0) {
          continue;
        }
        if (pointCount >= maxPoints) {
          return false;
        }

        const String objectJson = json.substring(objectStart, index + 1);
        float x = 0.0f;
        float y = 0.0f;
        float z = PATH_MAX_Z;
        if (!extractFloatValue(objectJson, "x", x) || !extractFloatValue(objectJson, "y", y)) {
          return false;
        }
        if (!extractFloatValue(objectJson, "z", z)) {
          z = PATH_MAX_Z;
        }
        const int brush = extractIntValue(objectJson, "brush", 0);
        points[pointCount++] = {x, y, z, brush};
        objectStart = -1;
      }

      return pointCount > 0;
    }

    bool extractFloatValue(const String& json, const char* key, float& value) {
      String pattern = String("\"") + key + "\"";
      const int keyIndex = json.indexOf(pattern);
      if (keyIndex < 0) {
        return false;
      }
      const int colon = json.indexOf(':', keyIndex + pattern.length());
      if (colon < 0) {
        return false;
      }

      int start = colon + 1;
      while (start < json.length() && json.charAt(start) == ' ') {
        start++;
      }

      int end = start;
      if (end < json.length() && json.charAt(end) == '-') {
        end++;
      }
      while (end < json.length()) {
        const char ch = json.charAt(end);
        if (!(isDigit(ch) || ch == '.')) {
          break;
        }
        end++;
      }
      if (end <= start) {
        return false;
      }

      value = json.substring(start, end).toFloat();
      return true;
    }

    float mapFloatRange(float value, float inMin, float inMax, float outMin, float outMax) {
      if (inMax <= inMin) {
        return outMin;
      }
      const float ratio = (value - inMin) / (inMax - inMin);
      return outMin + ratio * (outMax - outMin);
    }

    ServoPose mapPointToPose(const PathPoint& point) {
      const float safeX = constrain(point.x, PATH_MIN_X, PATH_MAX_X);
      const float safeY = constrain(point.y, PATH_MIN_Y, PATH_MAX_Y);
      const float safeZ = constrain(point.z, PATH_MIN_Z, PATH_MAX_Z);

      // Mapeo aproximado (lineal, no IK estricta) pensado para el brazo
      // articulado 3D actual: la base rotatoria recorre el eje X del lienzo,
      // hombro+codo abren/cierran el alcance en Y, muneca ajusta pitch (Z).
      // Se aplican margenes mecanicos por servo para no tocar topes.
      const int baseMin = BASE_SERVO_CONFIG.minAngle;
      const int baseMax = BASE_SERVO_CONFIG.maxAngle;
      const int shoulderMin = SHOULDER_SERVO_CONFIG.minAngle + SHOULDER_SAFE_MARGIN_DEG;
      const int shoulderMax = SHOULDER_SERVO_CONFIG.maxAngle - SHOULDER_SAFE_MARGIN_DEG;
      const int elbowMin = ELBOW_SERVO_CONFIG.minAngle + ELBOW_SAFE_MARGIN_DEG;
      const int elbowMax = ELBOW_SERVO_CONFIG.maxAngle - ELBOW_SAFE_MARGIN_DEG;
      const int wristMin = WRIST_SERVO_CONFIG.minAngle + WRIST_SAFE_MARGIN_DEG;
      const int wristMax = WRIST_SERVO_CONFIG.maxAngle - WRIST_SAFE_MARGIN_DEG;

      // X del lienzo (0..PATH_MAX_X) usa la franja 120..50 grados identificada
      // por los trazos laterales del Moodcam original; no todo el rango de base.
      const int base = static_cast<int>(mapFloatRange(
        safeX,
        PATH_MIN_X,
        PATH_MAX_X,
        static_cast<float>(CANVAS_BASE_LEFT_DEG),
        static_cast<float>(CANVAS_BASE_RIGHT_DEG)
      ));
      // La distancia radial incluye X e Y: los puntos laterales ya no reciben
      // siempre la misma profundidad aunque compartan la misma coordenada Y.
      const float radialX = safeY + CANVAS_BASE_TO_PAPER_MM;
      const float radialY = safeX - CANVAS_CENTER_X_MM;
      const float radialDistance = sqrt(radialX * radialX + radialY * radialY);
      const float linkA = ARM_SHOULDER_TO_ELBOW_MM;
      const float linkB = ARM_ELBOW_TO_WRIST_MM;
      const float minimumReach = fabs(linkA - linkB);
      const float maximumReach = linkA + linkB;
      const float reachableDistance = constrain(radialDistance, minimumReach + 1.0f, maximumReach - 1.0f);
      const float elbowCosine = constrain(
        (reachableDistance * reachableDistance - linkA * linkA - linkB * linkB) / (-2.0f * linkA * linkB),
        -1.0f,
        1.0f
      );
      const float elbowGeometryDeg = acos(elbowCosine) * 180.0f / PI;
      const float shoulderGeometryDeg = atan2(radialY, radialX) * 180.0f / PI
        + acos(constrain(
          (linkA * linkA + reachableDistance * reachableDistance - linkB * linkB) / (2.0f * linkA * reachableDistance),
          -1.0f,
          1.0f
        )) * 180.0f / PI;
      const int shoulder = static_cast<int>(mapFloatRange(
        shoulderGeometryDeg,
        0.0f,
        180.0f,
        static_cast<float>(CANVAS_NEAR_SHOULDER_DEG),
        static_cast<float>(CANVAS_FAR_SHOULDER_DEG)
      )) + CANVAS_CENTER_SHOULDER_CORRECTION_DEG;
      const int elbow = static_cast<int>(mapFloatRange(
        elbowGeometryDeg,
        0.0f,
        180.0f,
        static_cast<float>(CANVAS_NEAR_ELBOW_DEG),
        static_cast<float>(CANVAS_FAR_ELBOW_DEG)
      )) + CANVAS_CENTER_ELBOW_CORRECTION_DEG;
      // Z (altura del pincel) -> pitch de la muneca (rango efectivo reducido).
      const int wrist = static_cast<int>(mapFloatRange(
        safeZ,
        PATH_MIN_Z,
        PATH_MAX_Z,
        static_cast<float>(wristMin + CANVAS_WRIST_CONTACT_OFFSET_DEG),
        static_cast<float>(wristMax + CANVAS_WRIST_CONTACT_OFFSET_DEG)
      ));

      return {
        constrain(base, baseMin, baseMax),
        constrain(shoulder, shoulderMin, shoulderMax),
        constrain(elbow, elbowMin, elbowMax),
        constrain(wrist, wristMin, wristMax)
      };
    }

    void handleEmotionCommand(const String& json, bool fromMqtt) {
      (void)json;
      (void)fromMqtt;
      if (calibrationMotionActive()) {
        publishError("robot_busy");
        return;
      }
      if (isCalibrationMode()) {
        publishError("emotion_test bloqueado mientras CALIBRATION_MODE esta activo");
        return;
      }
    }

    bool isForbiddenRobotCommand(const String& json) {
      return json.indexOf("\"base_function\"") >= 0 || json.indexOf("\"stroke_id\"") >= 0;
    }

    bool isRealModeCommandType(const String& type) {
      return type == "paint_sequence_start"
        || type == "paint_sequence_end"
        || type == "stroke"
        || type == "move_to_paint"
        || type == "dip_paint"
        || type == "move_to_water"
        || type == "rinse_brush"
        || type == "move_to_towel"
        || type == "dry_brush"
        || type == "move_to_rest";
    }

    bool setOperatingMode(const String& modeValue, const char*& errorDetail) {
      errorDetail = nullptr;
      if (modeValue == "calibration") {
        if (!SAFE_TEST_MODE) {
          errorDetail = "safe_test_mode_required";
          return false;
        }
        operatingMode = OPERATING_MODE_CALIBRATION;
        return true;
      }
      if (modeValue == "real") {
        if (!FINAL_ARM_MODE) {
          errorDetail = "real_mode_disabled_in_build";
          return false;
        }
        operatingMode = OPERATING_MODE_REAL;
        return true;
      }
      errorDetail = "modo invalido: usa calibration o real";
      return false;
    }

    const char* operatingModeText() {
      return isCalibrationMode() ? "calibration" : "real";
    }

    bool isCalibrationMode() {
      return operatingMode == OPERATING_MODE_CALIBRATION;
    }

    bool validCalibrationServo(const String& servoName, const RobotServoConfig*& servoConfig) {
      servoConfig = robotServoConfigByName(servoName.c_str());
      return servoConfig != nullptr
        && servoConfig->enabled
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
