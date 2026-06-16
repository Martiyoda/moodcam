const SERVOS = {
    base: { gpio: 26, minAngle: 80, maxAngle: 110, homeAngle: 90 },
    shoulder: { gpio: 25, minAngle: 80, maxAngle: 110, homeAngle: 90 },
    elbow: { gpio: 33, minAngle: 80, maxAngle: 110, homeAngle: 90 },
    wrist: { gpio: 32, minAngle: 80, maxAngle: 110, homeAngle: 90 },
}

const VALID_DELTAS = new Set([-5, -1, 1, 5])

export function createCalibrationSimulator() {
    const state = {
        base: 90,
        shoulder: 90,
        elbow: 90,
        wrist: 90,
        positionKnown: false,
        moving: false,
        attached: {
            base: false,
            shoulder: false,
            elbow: false,
            wrist: false,
        },
    }

    function handleCommand(command) {
        if (!command || typeof command !== 'object') return [error('payload invalido')]

        if (state.moving && command.type !== 'stop' && command.type !== 'get_joint_state') {
            return [error('robot_busy')]
        }

        if (command.type === 'start_calibration') return startCalibration(command)
        if (command.type === 'get_joint_state') return [jointState()]
        if (command.type === 'jog') return jog(command)
        if (command.type === 'set_angle') return setAngle(command)
        if (command.type === 'stop') return stop()
        if (command.type === 'release_servos') return releaseServos()

        return [error(`tipo no permitido: ${command.type || 'sin tipo'}`)]
    }

    function startCalibration(command) {
        if (command.assume_home !== true) return [error('start_calibration requiere assume_home=true')]
        if (Object.values(state.attached).some(Boolean)) return [error('libera los servos antes de reasumir HOME')]

        Object.entries(SERVOS).forEach(([servo, config]) => {
            state[servo] = config.homeAngle
        })
        state.positionKnown = true
        state.moving = false

        return [status('calibration_started', 'assume_home=true'), jointState()]
    }

    function jog(command) {
        const config = SERVOS[command.servo]
        if (!config) return [error('servo no permitido')]
        if (!VALID_DELTAS.has(command.delta)) return [error('delta no permitido')]
        return moveServo(command.servo, state[command.servo] + command.delta, Math.abs(command.delta) * 250)
    }

    function setAngle(command) {
        const config = SERVOS[command.servo]
        if (!config) return [error('servo no permitido')]
        if (!Number.isInteger(command.angle)) return [error('set_angle requiere angle entero')]
        if (!Number.isInteger(command.duration_ms) || command.duration_ms < 200 || command.duration_ms > 5000) {
            return [error('duration_ms debe estar entre 200 y 5000')]
        }
        return moveServo(command.servo, command.angle, command.duration_ms)
    }

    function moveServo(servo, targetAngle, durationMs) {
        const config = SERVOS[servo]
        if (!state.positionKnown) return [error('position_unknown')]
        if (targetAngle < config.minAngle || targetAngle > config.maxAngle) {
            return [error('angulo fuera de limites')]
        }

        const previous = state[servo]
        const messages = []
        if (!state.attached[servo]) {
            state.attached[servo] = true
            messages.push(status('servo_attaching', `servo=${servo} gpio=${config.gpio} commanded_angle=${previous}`))
        }

        state.moving = true
        messages.push(status('moving', `servo=${servo} previous=${previous} target=${targetAngle} duration_ms=${durationMs}`))
        state[servo] = targetAngle
        state.moving = false
        messages.push(status('movement_completed', `servo=${servo} commanded_angle=${targetAngle}`))
        messages.push(jointState())
        return messages
    }

    function stop() {
        state.moving = false
        return [status('stopped', 'source=simulator active_servos_remain_attached=true'), jointState()]
    }

    function releaseServos() {
        if (state.moving) return [error('release_servos rechazado: movimiento activo')]
        Object.keys(state.attached).forEach((servo) => {
            state.attached[servo] = false
        })
        state.positionKnown = false
        return [status('servos_released', 'ADVERTENCIA: posible caida por gravedad'), jointState()]
    }

    function jointState() {
        return status('joint_state', undefined, {
            base: state.base,
            shoulder: state.shoulder,
            elbow: state.elbow,
            wrist: state.wrist,
            position_known: state.positionKnown,
            moving: state.moving,
            angles_are_commanded: true,
        })
    }

    return { handleCommand, getState: () => structuredClone(state) }
}

function status(statusName, detail, extra = {}) {
    return {
        topic: 'status',
        payload: {
            status: statusName,
            ...(detail ? { detail } : {}),
            ...extra,
        },
    }
}

function error(detail) {
    return {
        topic: 'error',
        payload: {
            status: 'error',
            detail,
        },
    }
}