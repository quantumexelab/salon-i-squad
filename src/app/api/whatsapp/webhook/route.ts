import { NextRequest, NextResponse } from "next/server";
import {
  extractIncomingMessages,
  handleIncomingWhatsAppMessage,
} from "@/lib/whatsapp/handler";

export const runtime = "nodejs";

const VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN?.trim() ||
  process.env.WEBHOOK_VERIFY_TOKEN?.trim() ||
  "salon_isquad_wa_verify_2026";

/**
 * GET /api/whatsapp/webhook
 * Meta WhatsApp Cloud API Webhook Verification Challenge
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verification successful.");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[WhatsApp Webhook] Verification failed. Token mismatch or missing params.", {
    receivedToken: token,
    expectedToken: VERIFY_TOKEN,
    mode,
  });

  return new Response("Forbidden: Verification token mismatch", { status: 403 });
}

/**
 * POST /api/whatsapp/webhook
 * Receives incoming WhatsApp customer messages and processes conversation state
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const incomingMessages = extractIncomingMessages(payload);

    for (const msg of incomingMessages) {
      console.log(`[WhatsApp Inbound] From: ${msg.from} Type: ${msg.type} Text: "${msg.text}" Payload: "${msg.buttonPayload || msg.listId}"`);
      // Process conversation state asynchronously
      try {
        await handleIncomingWhatsAppMessage(msg);
      } catch (err) {
        console.error(`[WhatsApp Error processing message from ${msg.from}]`, err);
      }
    }

    // Always return 200 OK to Meta quickly so it doesn't retry
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook Error]", error);
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}
