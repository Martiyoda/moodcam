export const DEFAULT_DEVICE_ID = 'device1'

export const ARM_CALIBRATION_COMMAND_TYPES = [
    'start_calibration',
    'jog',
    'set_angle',
    'get_joint_state',
    'stop',
    'release_servos',
]

export const TOPIC_KEYS = {
    sessionStart: 'sessionStart',
    faceEmotion: 'faceEmotion',
    sessionSummary: 'sessionSummary',
    strokePlan: 'strokePlan',
    robotCommand: 'robotCommand',
    robotStatus: 'robotStatus',
    systemError: 'systemError',
    moodcamStatus: 'moodcamStatus',
    webPresence: 'webPresence',
    bridgePresence: 'bridgePresence',
    esp32Presence: 'esp32Presence',
    simulatorPresence: 'simulatorPresence',
}

export const TOPIC_TEMPLATES = {
    [TOPIC_KEYS.sessionStart]: 'moodcam/{deviceId}/session/start',
    [TOPIC_KEYS.faceEmotion]: 'moodcam/{deviceId}/emotion/face',
    [TOPIC_KEYS.sessionSummary]: 'moodcam/{deviceId}/session/summary',
    [TOPIC_KEYS.strokePlan]: 'ai/{deviceId}/stroke_plan',
    [TOPIC_KEYS.robotCommand]: 'robot/{deviceId}/command',
    [TOPIC_KEYS.robotStatus]: 'robot/{deviceId}/status',
    [TOPIC_KEYS.systemError]: 'system/{deviceId}/error',
    [TOPIC_KEYS.moodcamStatus]: 'moodcam/{deviceId}/status',
    [TOPIC_KEYS.webPresence]: 'system/{deviceId}/presence/web',
    [TOPIC_KEYS.bridgePresence]: 'system/{deviceId}/presence/ai-bridge',
    [TOPIC_KEYS.esp32Presence]: 'system/{deviceId}/presence/esp32',
    [TOPIC_KEYS.simulatorPresence]: 'system/{deviceId}/presence/simulator',
}

export function normalizeDeviceId(deviceId = DEFAULT_DEVICE_ID) {
    return String(deviceId || DEFAULT_DEVICE_ID)
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || DEFAULT_DEVICE_ID
}

export function topicFor(key, deviceId = DEFAULT_DEVICE_ID) {
    const template = TOPIC_TEMPLATES[key]
    if (!template) throw new Error(`Topic desconocido: ${key}`)
    return template.replace('{deviceId}', normalizeDeviceId(deviceId))
}

export function createTopicMap(deviceId = DEFAULT_DEVICE_ID) {
    return Object.fromEntries(
        Object.values(TOPIC_KEYS).map((key) => [key, topicFor(key, deviceId)])
    )
}

export function createMqttClientId(role, deviceId = DEFAULT_DEVICE_ID, suffix = '') {
    const base = `emotion-${normalizeDeviceId(role)}-${normalizeDeviceId(deviceId)}`
    const normalizedSuffix = String(suffix || '').trim()
    return normalizedSuffix ? `${base}-${normalizedSuffix}` : base
}

export function calibrationTopicsFromMap(topics) {
    return {
        command: topics[TOPIC_KEYS.robotCommand],
        status: topics[TOPIC_KEYS.robotStatus],
        error: topics[TOPIC_KEYS.systemError],
    }
}

export function createSessionId(deviceId = DEFAULT_DEVICE_ID, timestamp = Date.now()) {
    return `session-${normalizeDeviceId(deviceId)}-${timestamp}`
}

export function buildSessionStartPayload({ sessionId, deviceId, artist, mobility, calibration, conversationMode }) {
    const timestamp = Date.now()
    return compactObject({
        type: 'session_start',
        session_id: sessionId,
        device_id: normalizeDeviceId(deviceId),
        artist_id: artist?.id || artist,
        artist_name: artist?.name,
        mobility,
        calibration,
        conversation_mode: conversationMode || 'none',
        timestamp,
        detection_time: new Date(timestamp).toISOString(),
    })
}

export function buildFaceEmotionPayload({ sessionId, deviceId, artistId, emotions, dominant, calibration, mobility, sampleCount, sessionActive }) {
    const timestamp = Date.now()
    return compactObject({
        type: 'face_emotion',
        session_id: sessionId,
        device_id: normalizeDeviceId(deviceId),
        artist_id: artistId,
        dominant,
        confidence: emotions?.[dominant] ? round(emotions[dominant]) : 0,
        face_emotions: roundMap(emotions || {}),
        calibration,
        mobility,
        sample_count: sampleCount,
        session_active: Boolean(sessionActive),
        timestamp,
        detection_time: new Date(timestamp).toISOString(),
    })
}

export function buildPresencePayload({ deviceId, component, status = 'online', uptimeMs, intervalMs, reason, extra = {} }) {
    const timestamp = Date.now()
    return compactObject({
        type: 'presence',
        device_id: normalizeDeviceId(deviceId),
        component,
        status,
        timestamp,
        uptime_ms: uptimeMs,
        interval_ms: intervalMs,
        reason,
        ...extra,
    })
}

export function buildSessionSummaryPayload({ sessionId, deviceId, artist, faceSummary, voiceSummary, combinedSummary, transcript, calibration, mobility, conversationMode }) {
    const timestamp = Date.now()
    return compactObject({
        type: 'session_summary',
        session_id: sessionId,
        device_id: normalizeDeviceId(deviceId),
        artist_id: artist?.id || artist,
        artist_name: artist?.name,
        face_emotions: faceSummary || [],
        voice_emotions: voiceSummary?.main_emotions || [],
        combined_emotions: combinedSummary || [],
        voice_summary: voiceSummary,
        transcript: (transcript || []).map((item) => ({
            speaker: item.speaker,
            text: item.text,
            timestamp: item.timestamp,
        })),
        calibration,
        mobility,
        conversation_mode: conversationMode || 'none',
        timestamp,
        detection_time: new Date(timestamp).toISOString(),
    })
}

export function wrapRobotCommand(command, plan, index, total) {
    return {
        ...command,
        plan_id: plan.id || plan.plan_id,
        session_id: plan.session_id,
        artist: plan.artist,
        sequence_index: index + 1,
        sequence_total: total,
        timestamp: Date.now(),
    }
}

export function createRobotCommandSequence(plan) {
    const commands = Array.isArray(plan?.robot_commands) ? plan.robot_commands : []
    const total = commands.length
    return [
        {
            type: 'paint_sequence_start',
            plan_id: plan.id || plan.plan_id,
            session_id: plan.session_id,
            artist: plan.artist,
            command_count: total,
            timestamp: Date.now(),
        },
        ...commands.map((command, index) => wrapRobotCommand(command, plan, index, total)),
        {
            type: 'paint_sequence_end',
            plan_id: plan.id || plan.plan_id,
            session_id: plan.session_id,
            artist: plan.artist,
            command_count: total,
            timestamp: Date.now(),
        },
    ]
}

export function parseJsonMessage(message) {
    const raw = typeof message === 'string' ? message : message?.toString?.() || ''
    try {
        return JSON.parse(raw)
    } catch {
        return raw
    }
}

function compactObject(value) {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined))
}

function roundMap(values) {
    return Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, round(value)])
    )
}

function round(value) {
    return Math.round((Number(value) || 0) * 1000) / 1000
}