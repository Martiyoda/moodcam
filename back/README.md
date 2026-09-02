# Backend - Voice Relay API

Backend FastAPI que conecta Moodcam con el agente de voz externo usado por Fulgencio.

## Configuración

1. Crear y activar un entorno virtual.
2. Instalar las dependencias:

```bash
pip install -r requirements.txt
```

3. Crear `back/.env` con:

```dotenv
VOICE_AGENT_TYPE=fulgencio_agent
FULGENCIO_AGENT_URL=wss://usuario:clave@fulgencio-agent.example/ws
# Solo necesario si el agente usa un certificado autofirmado.
FULGENCIO_AGENT_TLS_VERIFY=false
```

Aunque Moodcam se ejecute localmente, `FULGENCIO_AGENT_URL` apunta al servicio
Azure e incluye sus credenciales Basic Auth. No debe versionarse.

`FULGENCIO_AGENT_TLS_VERIFY` vale `true` por defecto. Para un certificado TLS
autofirmado se puede establecer en `false`; esto desactiva la verificación del
certificado únicamente en la conexión saliente del backend hacia Fulgencio.
Debe usarse solo como solución temporal. La opción recomendada es instalar un
certificado firmado por una autoridad de confianza y mantenerla en `true`.

4. Ejecutar el backend:

```bash
python main.py
```

También puede iniciarse con:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints

- `GET /`: estado básico y agente seleccionado.
- `GET /health`: estado de configuración sin exponer credenciales.
- `WebSocket /ws`: proxy de audio y eventos de conversación entre el frontend y
	Fulgencio.

## Protocolo

- Entrada: audio PCM16, mono, 16 kHz, enviado como frames binarios.
- Salida: eventos JSON `stt_output`, `agent_chunk`, `agent_end` y `tts_chunk`.
- El agente gestiona los turnos y las respuestas.
- `back/prompts.py` contiene la personalidad y el saludo de Dalí.

El navegador se conecta al relay local (`ws://localhost:8000/ws`); las
credenciales de `FULGENCIO_AGENT_URL` permanecen en el backend. Al abrir cada
sesión, el backend conecta con Fulgencio, añade `conversation_config=1` cuando
hay instrucciones configuradas y reenvía el audio y los eventos de respuesta.

## Diagnóstico

Comprobar la configuración del relay:

```bash
curl http://localhost:8000/health
```

La respuesta debe indicar `configured: true` y `endpoint_configured: true`.
Si el frontend muestra `No se ha podido conectar con el agente de voz`, revisar
la ventana donde se ejecuta el backend: ahora registra el tipo y el motivo real
del error de conexión. Después de modificar `back/.env`, reiniciar el backend
para recargar las variables de entorno.

Este backend no usa Firebase, Azure SQL ni generación de imágenes.
