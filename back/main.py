import asyncio
import json
import os
from pathlib import Path

import websockets
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from websockets.exceptions import ConnectionClosed

from fulgencio_conversation import add_config_query, load_instructions

ENV_FILE = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_FILE, override=False)


def find_available_port(start_port: int = 8000, max_tries: int = 20) -> int:
    import socket

    for port in range(start_port, start_port + max_tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind(("0.0.0.0", port))
                return port
            except OSError:
                continue

    return start_port


app = FastAPI(title="Voice Relay API")

cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:8080",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VOICE_AGENT_TYPE = os.getenv("VOICE_AGENT_TYPE", "fulgencio_agent").strip()
FULGENCIO_AGENT_URL = os.getenv("FULGENCIO_AGENT_URL", "").strip()
FULGENCIO_CONVERSATION_INSTRUCTIONS = load_instructions()


def is_backend_configured() -> bool:
    return VOICE_AGENT_TYPE == "fulgencio_agent" and bool(FULGENCIO_AGENT_URL)


def normalize_external_agent_event(data: dict) -> dict:
    if data.get("type") != "session.created":
        return data

    return {
        **data,
        "voice_agent": "fulgencio_agent",
        "server_manages_responses": True,
    }


async def forward_client_to_agent(websocket: WebSocket, agent_ws) -> None:
    try:
        while True:
            data = await websocket.receive()
            if data.get("type") == "websocket.disconnect":
                return

            payload = data.get("bytes")

            if payload:
                await agent_ws.send(payload)
            # El agente gestiona la sesión y las respuestas. Los antiguos
            # mensajes de control de Azure no se reenvían.
    except (WebSocketDisconnect, ConnectionClosed):
        return


async def forward_agent_to_client(websocket: WebSocket, agent_ws) -> None:
    try:
        while True:
            message = await agent_ws.recv()
            if not isinstance(message, str):
                continue

            try:
                data = json.loads(message)
            except json.JSONDecodeError:
                continue

            await websocket.send_json(normalize_external_agent_event(data))
    except (WebSocketDisconnect, ConnectionClosed):
        return


async def relay_external_agent_connection(agent_ws, websocket: WebSocket) -> None:
    await websocket.send_json(
        {
            "type": "session.created",
            "message": "Conectado a Fulgencio Agent",
            "voice_agent": "fulgencio_agent",
            "server_manages_responses": True,
        }
    )

    client_task = asyncio.create_task(forward_client_to_agent(websocket, agent_ws))
    agent_task = asyncio.create_task(forward_agent_to_client(websocket, agent_ws))
    done, pending = await asyncio.wait(
        {client_task, agent_task},
        return_when=asyncio.FIRST_COMPLETED,
    )

    for task in pending:
        task.cancel()

    await asyncio.gather(*done, *pending, return_exceptions=True)


async def handle_fulgencio_agent(websocket: WebSocket) -> None:
    if not FULGENCIO_AGENT_URL:
        await websocket.send_json(
            {
                "type": "error",
                "message": "El agente de voz no está configurado.",
            }
        )
        return

    connection_url = (
        add_config_query(FULGENCIO_AGENT_URL)
        if FULGENCIO_CONVERSATION_INSTRUCTIONS
        else FULGENCIO_AGENT_URL
    )

    async with websockets.connect(connection_url) as agent_ws:
        if FULGENCIO_CONVERSATION_INSTRUCTIONS:
            await agent_ws.send(
                json.dumps(
                    {
                        "type": "conversation.configure",
                        "instructions": FULGENCIO_CONVERSATION_INSTRUCTIONS,
                    },
                    ensure_ascii=False,
                )
            )

        await relay_external_agent_connection(agent_ws, websocket)


@app.get("/")
async def root():
    return {
        "ok": True,
        "service": "voice-relay",
        "voice_agent": VOICE_AGENT_TYPE,
        "configured": is_backend_configured(),
    }


@app.get("/health")
async def health():
    return {
        "ok": True,
        "voice_agent": VOICE_AGENT_TYPE,
        "configured": is_backend_configured(),
        "endpoint_configured": bool(FULGENCIO_AGENT_URL),
        "conversation_configured": bool(FULGENCIO_CONVERSATION_INSTRUCTIONS),
        "env_file": str(ENV_FILE),
        "env_file_exists": ENV_FILE.exists(),
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        if VOICE_AGENT_TYPE != "fulgencio_agent":
            await websocket.send_json(
                {
                    "type": "error",
                    "message": "El tipo de agente de voz configurado no es compatible.",
                }
            )
            return

        await handle_fulgencio_agent(websocket)
    except WebSocketDisconnect:
        pass
    except Exception:
        if websocket.client_state.name != "DISCONNECTED":
            try:
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "No se ha podido conectar con el agente de voz.",
                    }
                )
            except Exception:
                pass
    finally:
        try:
            if websocket.client_state.name != "DISCONNECTED":
                await websocket.close()
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000").strip() or "8000")
    if port <= 0:
        port = 8000

    try:
        import socket

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            sock.bind(("0.0.0.0", port))
    except OSError:
        port = find_available_port(start_port=port)

    print(f"Starting backend on port {port}")
    print(
        "Voice agent status: "
        f"type={VOICE_AGENT_TYPE or '(empty)'} "
        f"endpoint={bool(FULGENCIO_AGENT_URL)} "
        f"conversation={bool(FULGENCIO_CONVERSATION_INSTRUCTIONS)}"
    )
    uvicorn.run(app, host="0.0.0.0", port=port)
