import asyncio
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

BACK_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACK_DIR))

import fulgencio_conversation
import main


class AsyncContext:
    def __init__(self, value):
        self.value = value

    async def __aenter__(self):
        return self.value

    async def __aexit__(self, exc_type, exc, traceback):
        return False


class VoiceAgentTests(unittest.TestCase):
    def test_config_query_preserves_existing_parameters(self):
        url = "wss://agent.example/ws?region=eu&conversation_config=old"

        self.assertEqual(
            fulgencio_conversation.add_config_query(url),
            "wss://agent.example/ws?region=eu&conversation_config=1",
        )

    def test_session_event_declares_server_managed_responses(self):
        normalized = main.normalize_external_agent_event(
            {"type": "session.created", "message": "Sesión iniciada"}
        )

        self.assertEqual(normalized["voice_agent"], "fulgencio_agent")
        self.assertIs(normalized["server_manages_responses"], True)

    def test_binary_audio_is_forwarded_without_conversion(self):
        audio = b"\x00\x01\x02\x03"
        websocket = SimpleNamespace(
            receive=AsyncMock(
                side_effect=[
                    {"type": "websocket.receive", "bytes": audio},
                    {"type": "websocket.disconnect"},
                ]
            )
        )
        agent_socket = SimpleNamespace(send=AsyncMock())

        asyncio.run(main.forward_client_to_agent(websocket, agent_socket))

        agent_socket.send.assert_awaited_once_with(audio)

    def test_agent_json_event_is_forwarded_to_the_browser(self):
        websocket = SimpleNamespace(send_json=AsyncMock())
        agent_socket = SimpleNamespace(
            recv=AsyncMock(
                side_effect=[
                    json.dumps({"type": "tts_chunk", "audio": "AAE="}),
                    main.WebSocketDisconnect(),
                ]
            )
        )

        asyncio.run(main.forward_agent_to_client(websocket, agent_socket))

        websocket.send_json.assert_awaited_once_with(
            {"type": "tts_chunk", "audio": "AAE="}
        )

    def test_configuration_is_sent_before_starting_relay(self):
        websocket = SimpleNamespace(send_json=AsyncMock())
        agent_socket = SimpleNamespace(send=AsyncMock())

        async def run():
            with patch.object(
                main.websockets,
                "connect",
                return_value=AsyncContext(agent_socket),
            ) as connect:
                with patch.object(
                    main,
                    "relay_external_agent_connection",
                    new=AsyncMock(),
                ) as relay:
                    with patch.object(
                        main,
                        "FULGENCIO_AGENT_URL",
                        "wss://agent.example/ws",
                    ):
                        with patch.object(
                            main,
                            "FULGENCIO_CONVERSATION_INSTRUCTIONS",
                            "Conversación de Moodcam",
                        ):
                            await main.handle_fulgencio_agent(websocket)
            return connect, relay

        connect, relay = asyncio.run(run())

        connect.assert_called_once_with(
            "wss://agent.example/ws?conversation_config=1"
        )
        agent_socket.send.assert_awaited_once()
        self.assertEqual(
            json.loads(agent_socket.send.await_args.args[0]),
            {
                "type": "conversation.configure",
                "instructions": "Conversación de Moodcam",
            },
        )
        relay.assert_awaited_once_with(agent_socket, websocket)

    def test_missing_endpoint_returns_a_safe_error(self):
        websocket = SimpleNamespace(send_json=AsyncMock())

        async def run():
            with patch.object(main, "FULGENCIO_AGENT_URL", ""):
                await main.handle_fulgencio_agent(websocket)

        asyncio.run(run())

        websocket.send_json.assert_awaited_once_with(
            {
                "type": "error",
                "message": "El agente de voz no está configurado.",
            }
        )


if __name__ == "__main__":
    unittest.main()
