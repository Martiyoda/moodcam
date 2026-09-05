// Plantilla publica de configuracion del ESP32.
// Copiala como config.h y rellena valores locales; nunca pongas credenciales reales aqui.
#pragma once

// Copia este archivo como config.h y rellena tus datos reales.
// No subas config.h a GitHub.

#define NETWORK_ENABLED false

#define WIFI_SSID "TU_WIFI"
#define WIFI_PASSWORD "TU_PASSWORD_WIFI"

// HiveMQ Cloud suele usar puerto 8883 con TLS.
#define MQTT_USE_TLS true
#define MQTT_HOST "TU_CLUSTER_HIVEMQ"
#define MQTT_PORT 8883
#define MQTT_USERNAME "TU_USUARIO_HIVEMQ"
#define MQTT_PASSWORD "TU_PASSWORD_HIVEMQ"
#define MQTT_DEVICE_ID "device1"
#define MQTT_CLIENT_ID "emotion-esp32-" MQTT_DEVICE_ID

#define TOPIC_ROBOT_COMMAND "robot/" MQTT_DEVICE_ID "/command"
#define TOPIC_EMOTION_INPUT "moodcam/" MQTT_DEVICE_ID "/emotion/face"
#define TOPIC_ROBOT_STATUS "robot/" MQTT_DEVICE_ID "/status"
#define TOPIC_ROBOT_ERROR "system/" MQTT_DEVICE_ID "/error"
#define TOPIC_ESP32_PRESENCE "system/" MQTT_DEVICE_ID "/presence/esp32"
