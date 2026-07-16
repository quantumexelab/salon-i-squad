"""
Salon I Squad — WhatsApp Cloud API webhook (Module B).

GET  /webhook  — Meta webhook verification
POST /webhook  — Incoming message receiver (logs text + sender for now)
"""

from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from flask import Flask, jsonify, request

load_dotenv()

app = Flask(__name__)

WEBHOOK_VERIFY_TOKEN = os.getenv("WEBHOOK_VERIFY_TOKEN", "").strip()
META_API_TOKEN = os.getenv("META_API_TOKEN", "").strip()
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "").strip()
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "").strip()


def _extract_inbound_messages(payload: dict[str, Any]) -> list[dict[str, str]]:
    """Pull plain-text WhatsApp messages and sender phone numbers from a webhook body."""
    messages: list[dict[str, str]] = []

    for entry in payload.get("entry") or []:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}
            for msg in value.get("messages") or []:
                if msg.get("type") != "text":
                    continue
                text_body = ((msg.get("text") or {}).get("body") or "").strip()
                sender = str(msg.get("from") or "").strip()
                if sender or text_body:
                    messages.append({"from": sender, "text": text_body})

    return messages


@app.get("/")
def health() -> Any:
    return jsonify(
        {
            "service": "salon-i-squad-whatsapp-bot",
            "status": "ok",
            "webhook": "/webhook",
        }
    )


@app.route("/webhook", methods=["GET", "POST"])
def webhook() -> Any:
    # --- Meta webhook verification (GET) ---
    if request.method == "GET":
        mode = request.args.get("hub.mode")
        token = request.args.get("hub.verify_token")
        challenge = request.args.get("hub.challenge")

        if mode == "subscribe" and token and challenge:
            if token == WEBHOOK_VERIFY_TOKEN:
                print("Webhook verified successfully.")
                # Meta expects the raw challenge string with HTTP 200.
                return str(challenge), 200
            print("Webhook verification failed: token mismatch.")
            return jsonify({"error": "Verification token mismatch"}), 403

        return jsonify({"error": "Missing hub.mode, hub.verify_token, or hub.challenge"}), 400

    # --- Incoming WhatsApp events (POST) ---
    payload = request.get_json(silent=True) or {}
    inbound = _extract_inbound_messages(payload)

    for item in inbound:
        print(f"[WhatsApp] from={item['from']} text={item['text']!r}")

    if not inbound:
        # Status updates / non-text events — acknowledge without failing.
        print("[WhatsApp] POST received (no text message in payload).")

    # Always acknowledge quickly so Meta does not retry.
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "true").lower() in {"1", "true", "yes"}

    print(f"Starting WhatsApp bot on http://{host}:{port}/webhook")
    if not WEBHOOK_VERIFY_TOKEN:
        print("Warning: WEBHOOK_VERIFY_TOKEN is empty — Meta verification will fail.")
    if not META_API_TOKEN or not WHATSAPP_PHONE_NUMBER_ID:
        print("Note: META_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set yet (ok for Phase 22).")
    if FIREBASE_CREDENTIALS_PATH:
        print(f"Firebase credentials path configured: {FIREBASE_CREDENTIALS_PATH}")

    app.run(host=host, port=port, debug=debug)
