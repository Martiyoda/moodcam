# Backend - Voice Relay API

Backend en Python con FastAPI para relaying de conversación por voz con el modelo realtime de Azure Foundry.

## Setup

1. Crear un entorno virtual:
```bash
python -m venv venv
```

2. Activarlo:
- Windows: `venv\Scripts\activate`
- Linux/Mac: `source venv/bin/activate`

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Configurar variables de entorno:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION` opcional, por defecto `2024-10-01-preview`
- `MODEL_NAME` opcional, por defecto `gpt-realtime`

5. Ejecutar el servidor:
```bash
python main.py
```

O con uvicorn:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Endpoints

- `GET /`: comprobación básica
- `GET /health`: estado de configuración
- `WebSocket /ws`: relay en tiempo real de audio y eventos

## Qué hace

- Recibe audio PCM16 desde el frontend
- Lo reenvía al websocket realtime de Azure Foundry
- Devuelve audio y eventos al navegador

## Qué no hace

- No usa Firebase
- No genera imágenes
- No guarda contexto de usuario
