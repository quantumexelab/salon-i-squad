/**
 * WhatsApp Cloud API Client
 * Handles sending text messages, interactive quick-reply buttons, and interactive lists.
 */

const GRAPH_API_VERSION = "v22.0";

export type WhatsAppButton = {
  id: string;
  title: string;
};

export type WhatsAppListRow = {
  id: string;
  title: string;
  description?: string;
};

export type WhatsAppListSection = {
  title: string;
  rows: WhatsAppListRow[];
};

function getApiCredentials() {
  const token =
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() ||
    process.env.META_API_TOKEN?.trim() ||
    "";
  const phoneId =
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ||
    "1283961314800179";

  return { token, phoneId };
}

/**
 * Normalizes phone numbers to standard international format without '+' or leading zeros.
 * Example: +94 72 123 8400 -> 94721238400, 0721238400 -> 94721238400
 */
export function normalizeWhatsAppNumber(raw: string): string {
  let cleaned = raw.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "94" + cleaned.slice(1);
  }
  return cleaned;
}

async function callWhatsAppApi(payload: Record<string, unknown>): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const { token, phoneId } = getApiCredentials();

  if (!token) {
    console.error("[WhatsApp API] Missing WHATSAPP_ACCESS_TOKEN / META_API_TOKEN in environment.");
    return { ok: false, error: "Missing META_API_TOKEN" };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseJson = await res.json();

    if (!res.ok) {
      console.error("[WhatsApp API Error]", res.status, JSON.stringify(responseJson));
      return { ok: false, error: JSON.stringify(responseJson) };
    }

    return { ok: true, data: responseJson };
  } catch (err) {
    console.error("[WhatsApp API Network Error]", err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Sends a plain text message to a WhatsApp number.
 */
export async function sendWhatsAppText(to: string, body: string): Promise<boolean> {
  const recipient = normalizeWhatsAppNumber(to);
  const result = await callWhatsAppApi({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: { preview_url: false, body: body.slice(0, 4096) },
  });
  if (!result.ok) {
    console.warn(`[sendWhatsAppText Failed] to=${recipient} error=${result.error}`);
  }
  return result.ok;
}

/**
 * Sends an interactive Quick-Reply button message (up to 3 buttons).
 */
export async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: WhatsAppButton[],
  options?: { headerText?: string; footerText?: string },
): Promise<boolean> {
  const recipient = normalizeWhatsAppNumber(to);

  // Meta limits: max 3 buttons, button title max 20 chars
  const formattedButtons = buttons.slice(0, 3).map((b) => ({
    type: "reply",
    reply: {
      id: b.id.slice(0, 256),
      title: b.title.slice(0, 20),
    },
  }));

  const interactive: Record<string, unknown> = {
    type: "button",
    body: { text: bodyText.slice(0, 1024) },
    action: { buttons: formattedButtons },
  };

  if (options?.headerText) {
    interactive.header = { type: "text", text: options.headerText.slice(0, 60) };
  }
  if (options?.footerText) {
    interactive.footer = { text: options.footerText.slice(0, 60) };
  }

  const result = await callWhatsAppApi({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "interactive",
    interactive,
  });

  return result.ok;
}

/**
 * Sends an interactive List message (up to 10 rows total, max 10 rows per section).
 */
export async function sendWhatsAppList(
  to: string,
  bodyText: string,
  buttonText: string,
  sections: WhatsAppListSection[],
  options?: { headerText?: string; footerText?: string },
): Promise<boolean> {
  const recipient = normalizeWhatsAppNumber(to);

  const formattedSections = sections.map((s) => ({
    title: s.title.slice(0, 24),
    rows: s.rows.slice(0, 10).map((r) => ({
      id: r.id.slice(0, 200),
      title: r.title.slice(0, 24),
      description: r.description ? r.description.slice(0, 72) : undefined,
    })),
  }));

  const interactive: Record<string, unknown> = {
    type: "list",
    body: { text: bodyText.slice(0, 1024) },
    action: {
      button: buttonText.slice(0, 20),
      sections: formattedSections,
    },
  };

  if (options?.headerText) {
    interactive.header = { type: "text", text: options.headerText.slice(0, 60) };
  }
  if (options?.footerText) {
    interactive.footer = { text: options.footerText.slice(0, 60) };
  }

  const result = await callWhatsAppApi({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "interactive",
    interactive,
  });

  return result.ok;
}

/**
 * Sends an urgent notification to the Salon Owner / Admin on WhatsApp.
 */
export async function sendAdminWhatsAppNotification(messageText: string): Promise<boolean> {
  const adminPhone =
    process.env.SALON_OWNER_WHATSAPP?.trim() ||
    "94752087304";

  console.log(`[Admin Notification] Sending alert to owner ${adminPhone}...`);
  // Small delay to ensure Meta API processes prior message without rate throttling
  await new Promise((resolve) => setTimeout(resolve, 500));
  const success = await sendWhatsAppText(adminPhone, messageText);
  if (!success) {
    console.error(`[Admin Notification Failed] Unable to send alert to ${adminPhone}`);
  } else {
    console.log(`[Admin Notification Success] Alert delivered to ${adminPhone}`);
  }
  return success;
}
