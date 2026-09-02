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
```

Aunque Moodcam se ejecute localmente, `FULGENCIO_AGENT_URL` apunta al servicio
Azure e incluye sus credenciales Basic Auth. No debe versionarse.

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
- `WebSocket /ws`: proxy de audio y eventos de conversación.

## Protocolo

- Entrada: audio PCM16, mono, 16 kHz, enviado como frames binarios.
- Salida: eventos JSON `stt_output`, `agent_chunk`, `agent_end` y `tts_chunk`.
- El agente gestiona los turnos y las respuestas.
- `back/prompts.py` contiene la personalidad y el saludo de Dalí.

Este backend no usa Firebase, Azure SQL ni generación de imágenes.
