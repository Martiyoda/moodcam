import asyncio
import base64
import datetime
import json
import os
import re
import sys
import unicodedata
import urllib.error
import urllib.request
from time import time
from typing import Any, Optional

import requests
import websockets
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from firebase_admin import credentials, db, initialize_app
from fastapi.middleware.cors import CORSMiddleware
from openai import AzureOpenAI
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="GPT Realtime Voice API")

cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000,http://127.0.0.1:8080"
).split(",")

# FastAPI CORSMiddleware no interpreta comodines en allow_origins.
# Si llega un origen con '*' (p. ej. https://fulgenciob-frontend.*.azurecontainerapps.io),
# lo convertimos a una regex y lo pasamos por allow_origin_regex.
normalized_cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]
exact_cors_origins: list[str] = []
cors_regex_parts: list[str] = []

for origin in normalized_cors_origins:
    if "*" in origin:
        escaped = re.escape(origin).replace(r"\*", ".*")
        cors_regex_parts.append(f"^{escaped}$")
    else:
        exact_cors_origins.append(origin)

cors_origin_regex = "|".join(cors_regex_parts) if cors_regex_parts else None

app.add_middleware(
    CORSMiddleware,
    allow_origins=exact_cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-10-01-preview")
MODEL_NAME = os.getenv("MODEL_NAME", "gpt-realtime")
FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL", "")
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "")
FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
USER_DATA_API_URL = os.getenv("USER_DATA_API_URL", "").strip()
USER_DATA_API_TIMEOUT_SECONDS = int(os.getenv("USER_DATA_API_TIMEOUT_SECONDS", "5"))
USER_DATA_API_RETRIES = int(os.getenv("USER_DATA_API_RETRIES", "2"))

# URLs para eventos de robot (regalo y caricatura)
GIFT_ROBOT_API_URL = os.getenv("GIFT_ROBOT_API_URL", "aqui irá la URL del regalo")
CARICATURE_ROBOT_API_URL = os.getenv("CARICATURE_ROBOT_API_URL", "aqui irá la URL de la caricatura")
MODEL_IMAGE_NAME = os.getenv("MODEL_IMAGE_NAME", "gpt-image-1.5")
AZURE_OPENAI_IMAGE_API_VERSION = os.getenv(
    "AZURE_OPENAI_IMAGE_API_VERSION",
    os.getenv("AZURE_OPENAI_IMAGE_API_KEY", "2025-04-01-preview"),
)
AZURE_OPENAI_IMAGE_PROMPT = os.getenv(
    "AZURE_OPENAI_IMAGE_PROMPT",
    "Make an exaggerated caricature of the person appearing in this photo in a line drawing style. I want the lines to be thin and the details to be as minimalist as possible while preserving the exaggerated proportions.",
)
AZURE_OPENAI_IMAGE_ENDPOINT = os.getenv(
    "AZURE_OPENAI_IMAGE_ENDPOINT",
    (
        f"{AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/{MODEL_IMAGE_NAME}/images/generations"
        if AZURE_OPENAI_ENDPOINT
        else ""
    ),
)
AZURE_OPENAI_IMAGE_EDITS_ENDPOINT = os.getenv(
    "AZURE_OPENAI_IMAGE_EDITS_ENDPOINT",
    (
        f"{AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/{MODEL_IMAGE_NAME}/images/edits"
        if AZURE_OPENAI_ENDPOINT
        else ""
    ),
)

client: Optional[AzureOpenAI] = None
firebase_app: Optional[Any] = None
active_sessions: dict[str, Any] = {}
current_status: str = "idle"
status_listener_started: bool = False

if AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY:
    client = AzureOpenAI(
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
    )


def initialize_firebase():
    """
    Inicializa Firebase Admin SDK (Python) para Realtime Database.
    Documentación base:
    https://firebase.google.com/docs/database/admin/save-data?hl=es-419&authuser=3#python
    """
    global firebase_app

    if not FIREBASE_DATABASE_URL:
        print("⚠️ FIREBASE_DATABASE_URL no configurado.")
        return

    cred = None
    cred_source = ""

    # Azure: preferimos recibir credenciales como JSON en secreto/env var.
    if FIREBASE_SERVICE_ACCOUNT_JSON.strip():
        try:
            service_account_info = json.loads(FIREBASE_SERVICE_ACCOUNT_JSON)
            cred = credentials.Certificate(service_account_info)
            cred_source = "FIREBASE_SERVICE_ACCOUNT_JSON"
        except Exception as err:
            print(f"⚠️ FIREBASE_SERVICE_ACCOUNT_JSON inválido: {err}")

    # Local: fallback habitual a archivo JSON en disco.
    if cred is None and FIREBASE_SERVICE_ACCOUNT_PATH:
        try:
            cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
            cred_source = "FIREBASE_SERVICE_ACCOUNT_PATH"
        except Exception as err:
            print(f"⚠️ FIREBASE_SERVICE_ACCOUNT_PATH inválido: {err}")

    if cred is None:
        print(
            "ℹ️ Firebase Admin no configurado (faltan credenciales). "
            "Se usará fallback REST para lectura pública."
        )
        return

    try:
        firebase_app = initialize_app(cred, {"databaseURL": FIREBASE_DATABASE_URL})
        print(f"✅ Firebase Admin inicializado correctamente usando {cred_source}.")
    except Exception as err:
        firebase_app = None
        print(f"⚠️ Error inicializando Firebase Admin: {err}")
        print("ℹ️ Se usará fallback REST para lectura pública.")


def get_user_from_realtime_db(order_number: str) -> Optional[dict[str, Any]]:
    """
    Lee users/{order_number} desde Realtime Database.
    Prioriza Admin SDK; si no hay credenciales, usa REST pública.
    """
    if not FIREBASE_DATABASE_URL:
        return None

    if firebase_app is not None:
        try:
            users_ref = db.reference("users", app=firebase_app)
            value = users_ref.child(order_number).get()
            return value if isinstance(value, dict) else None
        except Exception as err:
            print(f"⚠️ Error leyendo Firebase Admin para {order_number}: {err}")

    # Fallback REST (útil si las reglas permiten lectura pública)
    url = f"{FIREBASE_DATABASE_URL.rstrip('/')}/users/{order_number}.json"
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            payload = response.read().decode("utf-8")
            value = json.loads(payload) if payload else None
            return value if isinstance(value, dict) else None
    except urllib.error.HTTPError as http_err:
        if http_err.code != 404:
            print(f"⚠️ Error HTTP en Firebase REST para {order_number}: {http_err}")
    except Exception as err:
        print(f"⚠️ Error en Firebase REST para {order_number}: {err}")

    return None


def update_user_fields_in_realtime_db(order_number: str, fields: dict[str, Any]) -> bool:
    """
    Actualiza campos parciales en users/{order_number}.
    Prioriza Admin SDK; si no hay credenciales, usa REST PATCH.
    """
    if not FIREBASE_DATABASE_URL:
        print("❌ FIREBASE_DATABASE_URL no configurado para actualizar Firebase.")
        return False

    if firebase_app is not None:
        try:
            users_ref = db.reference("users", app=firebase_app)
            users_ref.child(order_number).update(fields)
            return True
        except Exception as err:
            print(f"⚠️ Error actualizando Firebase Admin para {order_number}: {err}")

    try:
        url = f"{FIREBASE_DATABASE_URL.rstrip('/')}/users/{order_number}.json"
        payload = json.dumps(fields).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="PATCH",
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            status = getattr(response, "status", 200)
            return 200 <= status < 300
    except Exception as err:
        print(f"❌ Error actualizando Firebase REST para {order_number}: {err}")
        return False


def write_robot_action_to_realtime_db(user_data: dict[str, Any]) -> bool:
    """
    Escribe la acción del robot en el nodo `robot_action` en Firebase.
    - Si existe `caricatures` en user_data, envía `draw_caricature`.
    - Si no existe, envía `give_gift_bag`.
    """
    if not FIREBASE_DATABASE_URL:
        print("❌ FIREBASE_DATABASE_URL no configurado para robot_action.")
        return False

    has_caricatures_node = "caricatures" in user_data
    timestamp = int(time())

    if has_caricatures_node:
        caricatures = user_data.get("caricatures")
        caricature_image = ""
        if isinstance(caricatures, list) and len(caricatures) > 0:
            first = caricatures[0]
            if isinstance(first, str):
                caricature_image = first

        action_payload = {
            "type": "draw_caricature",
            "timestamp": timestamp,
            "userId": str(
                user_data.get("userId")
                or user_data.get("user_id")
                or user_data.get("id")
                or ""
            ).strip(),
            "fullName": str(
                user_data.get("full_name")
                or user_data.get("fullName")
                or user_data.get("name")
                or user_data.get("nombre")
                or ""
            ).strip(),
            "caricatureImage": caricature_image,
        }
    else:
        action_payload = {
            "type": "give_gift_bag",
            "timestamp": timestamp,
        }

    if firebase_app is not None:
        try:
            robot_action_ref = db.reference("robot_action", app=firebase_app)
            robot_action_ref.set(action_payload)
            return True
        except Exception as err:
            print(f"⚠️ Error escribiendo robot_action con Firebase Admin: {err}")

    try:
        url = f"{FIREBASE_DATABASE_URL.rstrip('/')}/robot_action.json"
        payload = json.dumps(action_payload).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="PUT",
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            status = getattr(response, "status", 200)
            return 200 <= status < 300
    except Exception as err:
        print(f"❌ Error escribiendo robot_action por REST: {err}")
        return False


def write_current_user_to_realtime_db(user_data: dict[str, Any], order_number: str) -> bool:
    """
    Escribe los datos del usuario resuelto en el nodo `currentUser`.
    """
    if not FIREBASE_DATABASE_URL:
        print("❌ FIREBASE_DATABASE_URL no configurado para currentUser.")
        return False

    current_user_payload = dict(user_data)

    # Normalizar userId para consumo del frontend.
    normalized_user_id = str(
        user_data.get("userId")
        or user_data.get("user_id")
        or user_data.get("id")
        or order_number
        or ""
    ).strip()
    if normalized_user_id:
        current_user_payload["userId"] = normalized_user_id

    if firebase_app is not None:
        try:
            current_user_ref = db.reference("currentUser", app=firebase_app)
            current_user_ref.set(current_user_payload)
            return True
        except Exception as err:
            print(f"⚠️ Error escribiendo currentUser con Firebase Admin: {err}")

    try:
        url = f"{FIREBASE_DATABASE_URL.rstrip('/')}/currentUser.json"
        payload = json.dumps(current_user_payload).encode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="PUT",
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            status = getattr(response, "status", 200)
            return 200 <= status < 300
    except Exception as err:
        print(f"❌ Error escribiendo currentUser por REST: {err}")
        return False


def extract_base64_payload(image_data: str) -> str:
    """
    Admite data URL o base64 directo y devuelve solo el payload base64.
    """
    if not image_data:
        return ""
    marker = "base64,"
    if marker in image_data:
        return image_data.split(marker, 1)[1].strip()
    return image_data.strip()


def parse_generated_base64_list(response_data: dict[str, Any]) -> list[str]:
    """
    Extrae una lista de base64 desde posibles formatos de respuesta del endpoint images.
    """
    results: list[str] = []

    data = response_data.get("data")
    if isinstance(data, list) and data:
        for item in data:
            if not isinstance(item, dict):
                continue
            b64_json = item.get("b64_json")
            if isinstance(b64_json, str) and b64_json.strip():
                results.append(b64_json.strip())

    output = response_data.get("output")
    if isinstance(output, list) and output:
        for item in output:
            if not isinstance(item, dict):
                continue
            b64_json = item.get("b64_json")
            if isinstance(b64_json, str) and b64_json.strip():
                results.append(b64_json.strip())
            content = item.get("content")
            if isinstance(content, list):
                for piece in content:
                    if isinstance(piece, dict):
                        b64_piece = piece.get("b64_json")
                        if isinstance(b64_piece, str) and b64_piece.strip():
                            results.append(b64_piece.strip())

    # Eliminar posibles duplicados preservando orden.
    deduped: list[str] = []
    seen: set[str] = set()
    for entry in results:
        if entry in seen:
            continue
        seen.add(entry)
        deduped.append(entry)

    return deduped


def call_image_generation_sync(photo_base64_or_data_url: str) -> list[str]:
    """
    Edita imagen usando gpt-image-1.5 en endpoint /images/edits
    enviando multipart/form-data (image + prompt), según guía indicada.
    """
    if not AZURE_OPENAI_IMAGE_EDITS_ENDPOINT:
        raise RuntimeError("AZURE_OPENAI_IMAGE_EDITS_ENDPOINT no configurado")
    if not AZURE_OPENAI_API_KEY:
        raise RuntimeError("AZURE_OPENAI_API_KEY no configurado")

    raw_base64 = extract_base64_payload(photo_base64_or_data_url)
    if not raw_base64:
        raise RuntimeError("Foto base64 vacía")

    try:
        image_bytes = base64.b64decode(raw_base64, validate=True)
    except Exception as err:
        raise RuntimeError(f"Base64 de foto inválido: {err}") from err

    # Nombre/extensión orientativo; el backend recibe jpeg desde canvas por defecto.
    files = {
        "image": ("image_to_edit.jpg", image_bytes, "image/jpeg"),
    }
    data = {
        "prompt": AZURE_OPENAI_IMAGE_PROMPT,
        "n": "1",
    }
    headers = {
        "Authorization": f"Bearer {AZURE_OPENAI_API_KEY}",
    }

    version = AZURE_OPENAI_IMAGE_API_VERSION
    request_url = f"{AZURE_OPENAI_IMAGE_EDITS_ENDPOINT}?api-version={version}"
    print(f"🖼️ Edit endpoint fijo: {request_url}")
    response = requests.post(
        request_url,
        headers=headers,
        files=files,
        data=data,
        timeout=90,
    )
    print(f"🖼️ Status Foundry edits: {response.status_code}")

    if response.status_code != 200:
        raise RuntimeError(
            f"HTTP {response.status_code} {response.reason} "
            f"(api-version={version}). Body: {response.text}"
        )

    response_data = response.json()
    generated_base64_list = parse_generated_base64_list(response_data)
    if generated_base64_list:
        print(
            f"✅ Caricaturas generadas correctamente (api-version={version}). "
            f"Cantidad: {len(generated_base64_list)}"
        )
        return generated_base64_list

    raise RuntimeError(
        f"200 sin b64_json (api-version={version}). Body: {response.text}"
    )


def normalize_text(text: str) -> str:
    """Normaliza texto para detectar números con más robustez."""
    lowered = text.lower().strip()
    normalized = unicodedata.normalize("NFKD", lowered)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def extract_order_number(text: str) -> Optional[str]:
    """
    Extrae número de orden desde frases como:
    - "soy el número 42"
    - "mi código es cuatro dos"
    - "my number is 42"
    - "my code is four two"
    """
    if not text:
        return None

    normalized = normalize_text(text)

    # Buscar contexto mínimo para evitar falsos positivos.
    intent_keywords = (
        # Spanish
        "numero",
        "codigo",
        "orden",
        "id",
        "identificador",
        "soy",
        "mi numero",
        "mi codigo",
        # English
        "number",
        "code",
        "order",
        "identifier",
        "my number",
        "my code",
        "i am",
        "i'm",
        "im ",
    )
    if not any(keyword in normalized for keyword in intent_keywords):
        return None

    # 1) Número continuo.
    contiguous_matches = re.findall(r"\b\d{1,6}\b", normalized)
    if contiguous_matches:
        return contiguous_matches[0]

    # 2) Dígitos separados por espacios, comas o guiones.
    separated_matches = re.findall(r"(?:\d[\s,.\-]*){2,6}", normalized)
    for raw in separated_matches:
        digits_only = "".join(ch for ch in raw if ch.isdigit())
        if 1 <= len(digits_only) <= 6:
            return digits_only

    # 3) Número expresado en palabras.
    word_to_digit = {
        # Spanish
        "cero": "0",
        "uno": "1",
        "una": "1",
        "dos": "2",
        "tres": "3",
        "cuatro": "4",
        "cinco": "5",
        "seis": "6",
        "siete": "7",
        "ocho": "8",
        "nueve": "9",
        # English
        "zero": "0",
        "oh": "0",
        "one": "1",
        "two": "2",
        "three": "3",
        "four": "4",
        "five": "5",
        "six": "6",
        "seven": "7",
        "eight": "8",
        "nine": "9",
    }
    word_pattern = (
        r"\b(?:cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|"
        r"zero|oh|one|two|three|four|five|six|seven|eight|nine)\b"
    )
    sequence_pattern = rf"(?:{word_pattern})(?:[\s,.\-]+(?:{word_pattern}))*"
    for seq in re.findall(sequence_pattern, normalized):
        words = re.findall(word_pattern, seq)
        if not words:
            continue
        digits = "".join(word_to_digit[w] for w in words if w in word_to_digit)
        if 1 <= len(digits) <= 6:
            return digits

    return None


# =============================================================================
# SISTEMA DE PROMPTS PARA FULGENCIO
# =============================================================================

REGLAS_CONVERSACION = """
=== CONVERSATION RULES (ALWAYS APPLY) ===

IDENTITY:
You are Fulgencio, a friendly voice assistant.
If asked who you are, say: "I am Fulgencio, created by David Carmona, Enric Domingo,
and Jordi Rebull, all expert developers at ERNI Consulting."

ALLOWED CONVERSATION TOPICS:
1. COMPANY: Ask where the user works and make a short comment about that company.
2. ROLE: Ask about their job role and briefly praise it.
3. TALENT ARENA: Ask what they expect from the event and what they like most so far.
4. ERNI CONSULTING: Ask whether they know ERNI. If yes, acknowledge it and mention
   they can talk to the staff at the booth. If not, explain ERNI is a Swiss technology
   consultancy specialized in software, cloud, AI, and digital transformation.
5. YOUR NAME: Only if asked, say your name is Fulgencio (see IDENTITY).

RESTRICTIONS:
- If the user asks about anything outside these topics, gracefully redirect the
  conversation to one of the allowed topics.
- Example: "That is interesting, but tell me, which company do you work for?"
- Move between topics naturally by finding connections.
- Be kind, professional, and add a touch of humor.
- Keep answers short: maximum 2-3 sentences.
"""


def build_welcome_prompt() -> str:
    """Prompt de bienvenida cuando inicia la conversación."""
    return (
        REGLAS_CONVERSACION + "\n"
        "=== CURRENT SITUATION ===\n\n"
        "You just connected with a new user.\n\n"
        "YOUR TASK:\n"
        "1. Introduce yourself: 'Hi, I am Fulgencio'\n"
        "2. Offer these two options:\n"
        "   - 'I can give you a gift'\n"
        "   - 'Or if you tell me your order number, I can create a fun caricature "
        "     based on the photo you provided'\n"
        "3. Ask: 'What would you like?'\n\n"
        "INTENT DETECTION:\n"
        "- If they say 'gift', 'I want a gift', 'give me the gift', etc. -> GIFT\n"
        "- If they mention a number, 'caricature', 'my number is...', 'I want the caricature', "
        "  'I am number X', etc. -> CARICATURE\n"
    )


def build_conversation_prompt(user_name: str = None, has_caricatures: bool = False) -> str:
    """Prompt para conversación posterior, adaptado al tipo de acción."""
    name_part = f"The user's name is {user_name}. Address them by their name.\n\n" if user_name else ""
    if has_caricatures:
        situation_part = (
            "The user has already chosen an option (gift or caricature), and the process is running.\n"
            "Your task now is to keep a pleasant conversation while they wait.\n\n"
            "FLOW:\n"
            "- Start by asking about their company or role\n"
            "- Move naturally across the 5 allowed topics\n"
            "- Find links between answers to keep the conversation flowing\n"
        )
    else:
        situation_part = (
            "The user has chosen a gift and has no associated caricatures.\n"
            "You must only talk about the gift flow. Do not mention caricatures.\n"
            "You can reply naturally with something like: "
            "'Hi <name>, I see you chose a gift. It is on the way...'.\n"
            "Your task now is to keep a pleasant conversation while they wait for the gift.\n\n"
            "FLOW:\n"
            "- Start by asking about their company or role\n"
            "- Move naturally across the allowed topics\n"
            "- Keep a brief, friendly tone focused on the gift waiting time\n"
        )

    return REGLAS_CONVERSACION + "\n" + "=== CURRENT SITUATION ===\n\n" + name_part + situation_part


def send_user_data_to_external_api_sync(order_number: str, user_data: dict[str, Any]) -> bool:
    """
    Envía datos del usuario a una API externa (si está configurada).
    Reintenta en errores temporales.
    """
    if not USER_DATA_API_URL:
        return False

    payload = {
        "orderNumber": order_number,
        "user": user_data,
    }
    body = json.dumps(payload).encode("utf-8")

    last_error: Optional[Exception] = None
    attempts = max(1, USER_DATA_API_RETRIES + 1)

    for _ in range(attempts):
        try:
            request = urllib.request.Request(
                USER_DATA_API_URL,
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=USER_DATA_API_TIMEOUT_SECONDS) as response:
                status = getattr(response, "status", 200)
                if 200 <= status < 300:
                    return True
                last_error = RuntimeError(f"status={status}")
        except Exception as err:
            last_error = err

    if last_error is not None:
        print(f"⚠️ No se pudo enviar datos a API externa: {last_error}")
    return False


async def trigger_gift_robot(order_number: str) -> bool:
    """
    Dispara evento para mover el robot de regalo.
    Envía el número de orden al robot.
    """
    print(f"🎁 Disparando evento de regalo para usuario {order_number}...")
    try:
        response = await asyncio.to_thread(
            lambda: requests.post(
                GIFT_ROBOT_API_URL,
                json={"orderNumber": order_number, "action": "gift"},
                timeout=10,
            )
        )
        if 200 <= response.status_code < 300:
            print(f"✅ Robot regalo activado para usuario {order_number}")
            return True
        else:
            print(f"⚠️ Robot regalo respondió con status {response.status_code}")
            return False
    except Exception as e:
        print(f"se ha lanzado evento para regalo (error: {e})")
        return False


async def trigger_caricature_robot(order_number: str, caricature_base64: str) -> bool:
    """
    Dispara evento para que el robot dibuje la caricatura.
    Envía la imagen en base64 al robot.
    """
    print(f"🖼️ Disparando evento de caricatura para usuario {order_number}...")
    try:
        response = await asyncio.to_thread(
            lambda: requests.post(
                CARICATURE_ROBOT_API_URL,
                json={
                    "orderNumber": order_number,
                    "action": "caricature",
                    "image": caricature_base64,
                },
                timeout=30,
            )
        )
        if 200 <= response.status_code < 300:
            print(f"✅ Robot caricatura activado para usuario {order_number}")
            return True
        else:
            print(f"⚠️ Robot caricatura respondió con status {response.status_code}")
            return False
    except Exception as e:
        print(f"se ha lanzado evento para caricatura (error: {e})")
        return False


def setup_firebase_status_listener():
    """
    Configura listener para cambios en el nodo 'status' de Firebase.
    Cuando cambia a 'painting', notifica a las sesiones activas.
    """
    global status_listener_started, current_status
    
    if status_listener_started:
        return
    
    if firebase_app is None:
        print("⚠️ Firebase no inicializado, no se puede configurar listener de status")
        return
    
    def on_status_change(event):
        global current_status
        new_status = event.data
        if new_status == current_status:
            return
        
        old_status = current_status
        current_status = new_status if new_status else "idle"
        print(f"📡 Status Firebase cambió: {old_status} -> {current_status}")
        
        if current_status == "painting":
            print("🎨 Estado 'painting' detectado - se aplicarán instrucciones de conversación")
    
    try:
        ref = db.reference("status")
        ref.listen(on_status_change)
        status_listener_started = True
        print("✅ Listener de status de Firebase configurado correctamente")
    except Exception as e:
        print(f"⚠️ Error configurando listener de status: {e}")


initialize_firebase()
setup_firebase_status_listener()


class CaricatureGenerationRequest(BaseModel):
    orderNumber: str
    photoBase64: str


class TranscriptionSummaryRequest(BaseModel):
    messages: list[dict[str, str]]


def build_user_summary_fallback(messages: list[str]) -> str:
    """
    Fallback local para generar un resumen breve y legible del usuario
    cuando la llamada al modelo no devuelve texto utilizable.
    """
    cleaned = [m.strip() for m in messages if isinstance(m, str) and m.strip()]
    if not cleaned:
        return ""

    combined = " ".join(cleaned)
    normalized = normalize_text(combined)

    name = ""
    age = ""
    job = ""
    company = ""
    interest = ""

    # Nombre (ej: "me llamo X", "soy X")
    name_match = re.search(r"\b(me llamo|mi nombre es)\s+([a-záéíóúñüA-ZÁÉÍÓÚÑÜ][^,.!?]{1,40})", combined, flags=re.IGNORECASE)
    if name_match:
        name = name_match.group(2).strip()

    # Edad (ej: "tengo 53 años")
    age_match = re.search(r"\btengo\s+(\d{1,3})\s+anos?\b", normalized)
    if age_match:
        age = age_match.group(1)

    # Rol/puesto
    job_match = re.search(
        r"\b(soy|trabajo como)\s+(desarrollador(?:a)?(?:\s+[a-zA-Z\-]+)?|ingenier[oa]|frontend|backend|full[-\s]?stack|product manager|qa)\b",
        normalized,
    )
    if job_match:
        job = job_match.group(2).strip()

    # Empresa
    company_match = re.search(r"\btrabajo en\s+([a-zA-Z0-9ÁÉÍÓÚÑáéíóúñüÜ .,&\-]{2,50})", combined, flags=re.IGNORECASE)
    if company_match:
        company = company_match.group(1).strip(" .")

    # Intereses: tomar hasta 3 mensajes relevantes y no vacíos.
    relevant_interests = [
        msg
        for msg in cleaned
        if len(msg) > 8 and not re.search(r"\b(si|no|vale|ok|todo)\b", normalize_text(msg))
    ]
    interests_text = "; ".join(relevant_interests[-3:]) if relevant_interests else cleaned[-1]

    parts: list[str] = []
    if name:
        parts.append(f"El usuario se llama {name}.")
    else:
        parts.append("El usuario mantiene una conversación sobre su perfil.")

    if age:
        parts.append(f"Tiene {age} años.")
    if job:
        parts.append(f"Su rol es {job}.")
    if company:
        parts.append(f"Trabaja en {company}.")
    if interests_text:
        parts.append(f"En cuanto a intereses e inquietudes, comenta: {interests_text}.")

    # Añadir cierre orientado a marketing sin inventar datos.
    parts.append(
        "Para seguimiento comercial, conviene profundizar en sus necesidades técnicas y en su contexto profesional."
    )

    summary = " ".join(parts).strip()
    # Evitar salida con puntos suspensivos si vinieran en el texto original.
    summary = re.sub(r"\.{3,}", ".", summary)
    return summary


async def summarize_user_messages_with_realtime(messages: list[dict[str, str]]) -> str:
    """
    Resume solo los mensajes del usuario usando gpt-realtime en modo texto.
    """
    normalized_messages: list[dict[str, str]] = []
    for item in messages:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if role not in ("user", "assistant") or not content:
            continue
        normalized_messages.append({"role": role, "content": content})

    user_only_messages = [
        m["content"] for m in normalized_messages if m["role"] == "user" and m["content"].strip()
    ]

    if not user_only_messages:
        return ""
    if not AZURE_OPENAI_ENDPOINT or not AZURE_OPENAI_API_KEY:
        return build_user_summary_fallback(user_only_messages)

    endpoint_base = AZURE_OPENAI_ENDPOINT.rstrip("/")
    if endpoint_base.startswith("https://"):
        endpoint_base = endpoint_base.replace("https://", "wss://")
    elif endpoint_base.startswith("http://"):
        endpoint_base = endpoint_base.replace("http://", "ws://")

    realtime_url = (
        f"{endpoint_base}/openai/realtime"
        f"?deployment={MODEL_NAME}&api-version={AZURE_OPENAI_API_VERSION}"
    )
    headers = {"api-key": AZURE_OPENAI_API_KEY}

    full_conversation = "\n".join(
        f"- {m['role'].upper()}: {m['content']}" for m in normalized_messages
    )
    summarization_prompt = (
        "Summarize this conversation:"
        "Full conversation (context):\n"
        f"{full_conversation}\n\n"
    )

    collected_text_parts: list[str] = []
    try:
        async with websockets.connect(realtime_url, additional_headers=headers) as realtime_ws:
            session_init = {
                "type": "session.update",
                "session": {
                    "modalities": ["text"],
                    "instructions": "You are an assistant that summarizes conversations accurately.",
                },
            }
            await realtime_ws.send(json.dumps(session_init))

            await realtime_ws.send(
                json.dumps(
                    {
                        "type": "conversation.item.create",
                        "item": {
                            "type": "message",
                            "role": "user",
                            "content": [{"type": "input_text", "text": summarization_prompt}],
                        },
                    }
                )
            )
            await realtime_ws.send(json.dumps({"type": "response.create"}))

            # Recibir texto hasta completar la respuesta
            for _ in range(200):
                raw = await asyncio.wait_for(realtime_ws.recv(), timeout=20)
                if not isinstance(raw, str):
                    continue
                event = json.loads(raw)
                event_type = event.get("type")
                if event_type in ("conversation.item.output_text.delta", "response.output_text.delta"):
                    delta = event.get("delta")
                    if isinstance(delta, str):
                        collected_text_parts.append(delta)
                elif event_type in ("conversation.item.output_text.done", "response.output_text.done"):
                    text = event.get("text")
                    if isinstance(text, str) and text.strip():
                        if not "".join(collected_text_parts).strip():
                            collected_text_parts.append(text)
                elif event_type == "response.done":
                    break
    except Exception as err:
        print(f"⚠️ Error resumiendo con gpt-realtime: {err}")

    summary = "".join(collected_text_parts).strip()
    if summary:
        # Si el modelo devolvió algo con formato de "lista pegada", usar fallback limpio.
        if summary.count("|") >= 2 and len(summary) > 120:
            return build_user_summary_fallback(user_only_messages)
        return summary
    return build_user_summary_fallback(user_only_messages)


@app.get("/")
async def root():
    """Endpoint de salud"""
    return {
        "status": "ok",
        "message": "GPT Realtime Voice API está funcionando",
        "model": MODEL_NAME,
        "configured": client is not None,
    }


@app.get("/health")
async def health():
    """Endpoint de salud detallado"""
    return {
        "status": "healthy",
        "endpoint_configured": bool(AZURE_OPENAI_ENDPOINT),
        "api_key_configured": bool(AZURE_OPENAI_API_KEY),
    }


@app.get("/firebase/health")
async def firebase_health():
    """Estado de integración Firebase en backend."""
    return {
        "database_url_configured": bool(FIREBASE_DATABASE_URL),
        "service_account_path_configured": bool(FIREBASE_SERVICE_ACCOUNT_PATH),
        "service_account_json_configured": bool(FIREBASE_SERVICE_ACCOUNT_JSON.strip()),
        "admin_sdk_initialized": firebase_app is not None,
    }


@app.get("/firebase/users/{order_number}")
async def firebase_get_user(order_number: str):
    """Lee users/{order_number} en Realtime Database."""
    user = get_user_from_realtime_db(order_number)
    return {
        "order_number": order_number,
        "found": user is not None,
        "user": user,
    }


@app.post("/photo/generate-caricature")
async def generate_caricature(payload: CaricatureGenerationRequest):
    """
    Genera caricaturas desde foto usando gpt-image-1.5 y las guarda en
    users/{order}/caricatures (array).
    """
    order_number = payload.orderNumber.strip()
    print("========================================")
    print("🟦 Inicio generación de caricatura")
    print(f"🧾 orderNumber: {order_number}")
    print("========================================")

    if not order_number:
        raise HTTPException(status_code=400, detail="orderNumber es obligatorio")
    if not payload.photoBase64.strip():
        raise HTTPException(status_code=400, detail="photoBase64 es obligatorio")

    try:
        print("1) Generando caricatura en Azure Foundry...")
        caricatures_base64 = await asyncio.to_thread(
            call_image_generation_sync,
            payload.photoBase64,
        )
        print(f"2) Caricaturas generadas. Total: {len(caricatures_base64)}")
        for i, b64_img in enumerate(caricatures_base64, start=1):
            print(f"   - Caricatura #{i}: longitud base64={len(b64_img)}")

        caricatures_data_urls = [
            f"data:image/png;base64,{img_b64}" for img_b64 in caricatures_base64
        ]

        print("3) Guardando caricaturas en Firebase...")
        updated_ok = await asyncio.to_thread(
            update_user_fields_in_realtime_db,
            order_number,
            {
                "caricatures": caricatures_data_urls,
                "caricaturesTimestamp": datetime.datetime.utcnow().isoformat() + "Z",
            },
        )
        if not updated_ok:
            raise RuntimeError("No se pudo guardar caricatures en Firebase")

        print(f"✅ Caricaturas guardadas en users/{order_number}/caricatures")
        return {
            "ok": True,
            "orderNumber": order_number,
            "storedInFirebase": True,
            "generatedCount": len(caricatures_data_urls),
        }
    except HTTPException:
        raise
    except Exception as err:
        print(f"❌ Error en generación/guardado de caricatura: {err}")
        raise HTTPException(status_code=500, detail=str(err))


@app.post("/transcriptions/summarize")
async def summarize_transcription(payload: TranscriptionSummaryRequest):
    """
    Recibe mensajes del usuario y devuelve un resumen generado con gpt-realtime.
    """
    summary = await summarize_user_messages_with_realtime(payload.messages)
    return {
        "ok": True,
        "summary": summary,
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Endpoint WebSocket para manejar la conversación de voz en tiempo real.
    Recibe audio del frontend y lo reenvía al modelo GPT Realtime de Microsoft Foundry.
    """
    await websocket.accept()
    
    if not client:
        await websocket.send_json({
            "type": "error",
            "message": "Azure OpenAI no está configurado. Verifica las variables de entorno."
        })
        await websocket.close()
        return

    try:
        endpoint_base = AZURE_OPENAI_ENDPOINT.rstrip('/')
        if endpoint_base.startswith('https://'):
            endpoint_base = endpoint_base.replace('https://', 'wss://')
        elif endpoint_base.startswith('http://'):
            endpoint_base = endpoint_base.replace('http://', 'ws://')
        
        realtime_url = f"{endpoint_base}/openai/realtime?deployment={MODEL_NAME}&api-version={AZURE_OPENAI_API_VERSION}"
        
        print(f"Intentando conectar a: {realtime_url.replace(AZURE_OPENAI_API_KEY, '***')}")
        
        headers = {
            "api-key": AZURE_OPENAI_API_KEY,
        }

        try:
            async with websockets.connect(
                realtime_url,
                additional_headers=headers,
            ) as realtime_ws:
                await handle_realtime_connection(realtime_ws, websocket)
        except Exception as e:
            print(f"Error con 'deployment', intentando con 'model': {e}")
            # Si falla con deployment, intentar con model
            realtime_url = f"{endpoint_base}/openai/realtime?model={MODEL_NAME}&api-version={AZURE_OPENAI_API_VERSION}"
            print(f"Intentando conectar a: {realtime_url}")
            async with websockets.connect(
                realtime_url,
                additional_headers=headers,
            ) as realtime_ws:
                await handle_realtime_connection(realtime_ws, websocket)
    
    except Exception as e:
        print(f"Error general en WebSocket: {e}")
        try:
            if websocket.client_state.name != "DISCONNECTED":
                await websocket.send_json({
                    "type": "error",
                    "message": f"Error al conectar con GPT Realtime: {str(e)}"
                })
        except:
            pass
    finally:
        try:
            if websocket.client_state.name != "DISCONNECTED":
                await websocket.close()
        except:
            pass


async def handle_realtime_connection(realtime_ws, websocket):
    """Maneja la conexión con GPT Realtime una vez establecida"""
    session_ctx: dict[str, Any] = {
        "latest_user_text": "",
        "is_user_locked": False,
        "locked_order_number": None,
        "locked_user_data": None,
        "initial_response_sent": False,
    }

    session_init = {
        "type": "session.update",
        "session": {
            "modalities": ["text", "audio"],
            "instructions": build_welcome_prompt(),
            "voice": "cedar",
            "input_audio_format": "pcm16",
            "output_audio_format": "pcm16",
            "input_audio_transcription": {
                "model": "whisper-1"
            },
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.5,
                "prefix_padding_ms": 300,
                "silence_duration_ms": 500,
                "create_response": False,
            },
            "input_audio_transcription": {
                "model": "whisper-1"
            }
        }
    }
    await realtime_ws.send(json.dumps(session_init))

    async def resolve_user_context_if_needed() -> None:
        """
        Detecta número de orden en el último texto del usuario y, si encuentra
        datos en Firebase, bloquea el contexto para esta sesión.
        """
        if session_ctx["is_user_locked"]:
            return

        latest_text = session_ctx.get("latest_user_text", "")
        order_number = extract_order_number(latest_text)
        if not order_number:
            return

        user_data = await asyncio.to_thread(get_user_from_realtime_db, order_number)
        '''
        print(f"user_data: {user_data}")
        '''
        if not user_data:
            print(f"⚠️ Número detectado pero sin datos en Firebase: {order_number}")
            return

        current_user_ok = await asyncio.to_thread(
            write_current_user_to_realtime_db,
            user_data,
            order_number,
        )
        if current_user_ok:
            print("✅ currentUser actualizado en Firebase.")
        else:
            print("⚠️ No se pudo actualizar currentUser en Firebase.")

        robot_action_ok = await asyncio.to_thread(write_robot_action_to_realtime_db, user_data)
        if robot_action_ok:
            print("✅ robot_action actualizado en Firebase.")
        else:
            print("⚠️ No se pudo actualizar robot_action en Firebase.")

        session_ctx["is_user_locked"] = True
        session_ctx["locked_order_number"] = order_number
        session_ctx["locked_user_data"] = user_data
        print(f"se ha detectado que se ha pedido el número: {order_number}")
        resolved_name = (
            str(
                user_data.get("fullName")
                or user_data.get("name")
                or user_data.get("nombre")
                or ""
            ).strip()
        )
        print(f"Nombre resuelto desde Firebase: {resolved_name or '(vacío)'}")
        resolved_caricatures = user_data.get("caricatures")
        has_caricatures = isinstance(resolved_caricatures, list) and len(resolved_caricatures) > 0
        resolved_photo = user_data.get("photo")
        if isinstance(resolved_caricatures, list):
            print(f"Caricaturas detectadas para usuario: {len(resolved_caricatures)}")
        else:
            print("Caricaturas detectadas para usuario: 0")
        if resolved_photo:
            print(f"Foto del usuario detectada: {len(str(resolved_photo))} caracteres")

        # Enviar al frontend el contexto resuelto (incluyendo caricaturas y foto) para UI.
        try:
            await websocket.send_json({
                "type": "user.context.resolved",
                "orderNumber": order_number,
                "fullName": resolved_name,
                "caricatures": (
                    resolved_caricatures
                    if isinstance(resolved_caricatures, list)
                    else []
                ),
                "photo": resolved_photo if isinstance(resolved_photo, str) else None,
            })
            print("✅ Evento user.context.resolved enviado al frontend.")
        except Exception as err:
            print(f"⚠️ No se pudo enviar user.context.resolved al frontend: {err}")

        # Refuerzo fuerte: fijar contexto personalizado en la sesión realtime.
        user_name = resolved_name or None
        session_instructions = build_conversation_prompt(user_name, has_caricatures)
        
        session_update = {
            "type": "session.update",
            "session": {
                "instructions": session_instructions
            },
        }
        try:
            await realtime_ws.send(json.dumps(session_update))
            print("✅ session.update con prompt de conversación enviado.")
        except Exception as err:
            print(f"⚠️ No se pudo enviar session.update: {err}")

        if USER_DATA_API_URL:
            await asyncio.to_thread(send_user_data_to_external_api_sync, order_number, user_data)

    def inject_personalization_in_response(message: dict[str, Any]) -> dict[str, Any]:
        """
        Añade instrucciones personalizadas justo antes de pedir respuesta al modelo.
        """
        user_data = session_ctx.get("locked_user_data") or {}
        user_name = None
        
        has_caricatures = False
        if session_ctx["is_user_locked"] and isinstance(user_data, dict):
            user_name = str(
                user_data.get("fullName")
                or user_data.get("name")
                or user_data.get("nombre")
                or ""
            ).strip() or None
            resolved_caricatures = user_data.get("caricatures")
            has_caricatures = isinstance(resolved_caricatures, list) and len(resolved_caricatures) > 0

        # Usar prompt de conversación si ya tenemos usuario, si no el de bienvenida
        if session_ctx["is_user_locked"]:
            personalization = build_conversation_prompt(user_name, has_caricatures)
        else:
            personalization = build_welcome_prompt()

        response_payload = message.get("response")
        if not isinstance(response_payload, dict):
            response_payload = {}

        existing_instructions = response_payload.get("instructions")
        if isinstance(existing_instructions, str) and existing_instructions.strip():
            response_payload["instructions"] = (
                f"{personalization}\n\n{existing_instructions.strip()}"
            )
        else:
            response_payload["instructions"] = personalization

        message["response"] = response_payload
        return message

    async def trigger_response_create() -> None:
        """Dispara una respuesta del modelo con el prompt ya personalizado."""
        response_msg = {"type": "response.create"}
        response_msg = inject_personalization_in_response(response_msg)
        await realtime_ws.send(json.dumps(response_msg))

    # Respuesta inicial de la sesión (sin esperar a frontend).
    await trigger_response_create()
    session_ctx["initial_response_sent"] = True

    async def forward_to_realtime():
        try:
            while True:
                try:
                    data = await websocket.receive()
                except RuntimeError as e:
                    if "disconnect" in str(e).lower():
                        print("Cliente desconectado (receive)")
                        break
                    raise
                
                if "bytes" in data:
                    audio_data = data["bytes"]
                    audio_size = len(audio_data)
                    if audio_size > 0:
                        audio_base64 = base64.b64encode(audio_data).decode("utf-8")
                        try:
                            audio_event = {
                                "type": "input_audio_buffer.append",
                                "audio": audio_base64
                            }
                            await realtime_ws.send(json.dumps(audio_event))
                            if audio_size % 100 == 0:
                                print(f"Audio recibido y enviado a GPT Realtime: {audio_size} bytes")
                        except websockets.exceptions.ConnectionClosed:
                            print("Conexión con GPT Realtime cerrada (enviando audio)")
                            break
                    else:
                        print("Advertencia: Audio recibido con 0 bytes")
                    
                elif "text" in data:
                    try:
                        message = json.loads(data["text"])
                        message_type = message.get("type", "unknown")
                        print(f"Recibido del frontend: {message_type}")

                        # Forzar control manual de respuestas en cualquier session.update de frontend.
                        if message_type == "session.update":
                            session_payload = message.get("session")
                            if isinstance(session_payload, dict):
                                td = session_payload.get("turn_detection")
                                if isinstance(td, dict):
                                    td["create_response"] = False

                        # Captura mensajes de texto de usuario si vienen por item.create.
                        should_trigger_manual_response = False
                        if message_type == "conversation.item.create":
                            item = message.get("item", {})
                            role = item.get("role")
                            content = item.get("content", [])
                            if role == "user" and isinstance(content, list):
                                text_chunks: list[str] = []
                                for chunk in content:
                                    if (
                                        isinstance(chunk, dict)
                                        and chunk.get("type") == "input_text"
                                        and isinstance(chunk.get("text"), str)
                                    ):
                                        text_chunks.append(chunk["text"])
                                if text_chunks:
                                    session_ctx["latest_user_text"] = " ".join(text_chunks).strip()
                                    should_trigger_manual_response = True

                        # Bloquear response.create del frontend: lo controla el backend
                        # para garantizar que Firebase se procese antes de responder.
                        if message_type == "response.create":
                            print("ℹ️ response.create recibido desde frontend, se ignora (modo control backend).")
                            continue

                        await realtime_ws.send(json.dumps(message))

                        # Flujo manual para mensajes de texto de usuario.
                        if should_trigger_manual_response:
                            await resolve_user_context_if_needed()
                            await trigger_response_create()
                    except json.JSONDecodeError:
                        pass
                    except websockets.exceptions.ConnectionClosed:
                        print("Conexión con GPT Realtime cerrada (enviando texto)")
                        break
                        
        except WebSocketDisconnect:
            print("Cliente desconectado")
        except Exception as e:
            print(f"Error en forward_to_realtime: {e}")
            try:
                if not websocket.client_state.name == "DISCONNECTED":
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e)
                    })
            except:
                pass

    async def forward_to_client():
        try:
            while True:
                message = await realtime_ws.recv()
                if isinstance(message, str):
                    try:
                        data = json.loads(message)
                        """
                        print(f"Recibido de GPT Realtime: {data.get('type', 'unknown')}")
                        """

                        # Captura transcripción final de audio de usuario.
                        if data.get("type") == "conversation.item.input_audio_transcription.completed":
                            transcript = data.get("transcript")
                            if isinstance(transcript, str) and transcript.strip():
                                session_ctx["latest_user_text"] = transcript.strip()
                                await resolve_user_context_if_needed()
                                # Solo después de transcribir y resolver Firebase.
                                await trigger_response_create()

                        try:
                            if websocket.client_state.name != "DISCONNECTED":
                                await websocket.send_json(data)
                        except RuntimeError:
                            print("Cliente desconectado, no se puede enviar mensaje")
                            break
                    except json.JSONDecodeError:
                        try:
                            if websocket.client_state.name != "DISCONNECTED":
                                await websocket.send_text(message)
                        except RuntimeError:
                            break
                elif isinstance(message, bytes):
                    try:
                        if websocket.client_state.name != "DISCONNECTED":
                            await websocket.send_bytes(message)
                    except RuntimeError:
                        print("Cliente desconectado, no se puede enviar audio")
                        break
                    
        except websockets.exceptions.ConnectionClosed:
            print("Conexión con GPT Realtime cerrada")
            try:
                if websocket.client_state.name != "DISCONNECTED":
                    await websocket.send_json({
                        "type": "error",
                        "message": "Conexión con GPT Realtime cerrada"
                    })
            except:
                pass
        except Exception as e:
            print(f"Error en forward_to_client: {e}")
            try:
                if websocket.client_state.name != "DISCONNECTED":
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e)
                    })
            except:
                pass

    try:
        initial_response = await realtime_ws.recv()
        if isinstance(initial_response, str):
            response_data = json.loads(initial_response)
            print(f"Respuesta inicial de GPT Realtime: {response_data.get('type', 'unknown')}")
            if websocket.client_state.name != "DISCONNECTED":
                await websocket.send_json(response_data)
    except Exception as e:
        print(f"Error esperando respuesta inicial: {e}")
    
    try:
        await asyncio.gather(
            forward_to_realtime(),
            forward_to_client(),
            return_exceptions=True
        )
    except Exception as e:
        print(f"Error en WebSocket: {e}")
        try:
            if websocket.client_state.name != "DISCONNECTED":
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
        except:
            pass
        try:
            await websocket.close()
        except:
            pass
    finally:
        # Limpieza explícita de contexto al terminar la sesión.
        session_ctx["latest_user_text"] = ""
        session_ctx["is_user_locked"] = False
        session_ctx["locked_order_number"] = None
        session_ctx["locked_user_data"] = None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

