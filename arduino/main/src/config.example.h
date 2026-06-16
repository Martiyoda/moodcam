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
#define MQTT_CLIENT_ID "emotion-esp32-test"

#define TOPIC_ROBOT_COMMAND "robot/test"
#define TOPIC_EMOTION_INPUT "emotion/input"
#define TOPIC_ROBOT_STATUS "robot/status"
#define TOPIC_ROBOT_ERROR "robot/error"
