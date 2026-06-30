import asyncio
import base64
import json
import os

import websockets
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

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

AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "").strip()
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "").strip()
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-01-preview").strip()
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-realtime").strip()


def build_realtime_url() -> str:
    endpoint = AZURE_OPENAI_ENDPOINT.rstrip("/")
    if endpoint.startswith("https://"):
        endpoint = endpoint.replace("https://", "wss://", 1)
    elif endpoint.startswith("http://"):
        endpoint = endpoint.replace("http://", "ws://", 1)

    return f"{endpoint}/openai/realtime?deployment={MODEL_NAME}&api-version={AZURE_OPENAI_API_VERSION}"


def is_backend_configured() -> bool:
    return bool(AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY)


@app.get("/")
async def root():
    return {"ok": True, "service": "voice-relay"}


@app.get("/health")
async def health():
    return {
        "ok": True,
        "azure_openai_configured": is_backend_configured(),
        "model_name": MODEL_NAME,
        "api_version": AZURE_OPENAI_API_VERSION,
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    if not is_backend_configured():
        await websocket.send_json(
            {
                "type": "error",
                "message": "Azure OpenAI no está configurado. Revisa las variables de entorno.",
            }
        )
        await websocket.close()
        return

    headers = {"api-key": AZURE_OPENAI_API_KEY}
    realtime_url = build_realtime_url()

    try:
        async with websockets.connect(
            realtime_url,
            additional_headers=headers,
        ) as realtime_ws:
            client_task = asyncio.create_task(
                forward_client_to_azure(websocket, realtime_ws)
            )
            azure_task = asyncio.create_task(
                forward_azure_to_client(websocket, realtime_ws)
            )
            done, pending = await asyncio.wait(
                {client_task, azure_task},
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()

            await asyncio.gather(*pending, return_exceptions=True)
            for task in done:
                task.result()
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        if websocket.client_state.name != "DISCONNECTED":
            try:
                await websocket.send_json({"type": "error", "message": str(exc)})
            except Exception:
                pass
    finally:
        try:
            if websocket.client_state.name != "DISCONNECTED":
                await websocket.close()
        except Exception:
            pass


async def forward_client_to_azure(websocket: WebSocket, realtime_ws) -> None:
    try:
        while True:
            data = await websocket.receive()

            if "bytes" in data and data["bytes"] is not None:
                payload = data["bytes"]
                if payload:
                    audio_event = {
                        "type": "input_audio_buffer.append",
                        "audio": base64.b64encode(payload).decode("utf-8"),
                    }
                    await realtime_ws.send(json.dumps(audio_event))
                continue

            if "text" in data and data["text"] is not None:
                message = data["text"]
                if message:
                    await realtime_ws.send(message)
    except WebSocketDisconnect:
        return
    except Exception:
        return


async def forward_azure_to_client(websocket: WebSocket, realtime_ws) -> None:
    try:
        while True:
            message = await realtime_ws.recv()

            if isinstance(message, bytes):
                await websocket.send_bytes(message)
                continue

            if isinstance(message, str):
                try:
                    json.loads(message)
                    await websocket.send_text(message)
                except json.JSONDecodeError:
                    await websocket.send_text(message)
    except websockets.exceptions.ConnectionClosed:
        return
    except WebSocketDisconnect:
        return
    except Exception:
        return


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
