/**
 * Chatbot client config — swap `sendChatMessage` body when the API is ready.
 */

export const chatbotConfig = {
  /** Set when backend is live, e.g. "/api/chat". Empty = local stub replies. */
  apiPath: "" as string,
  botName: "Salon I Squad",
  welcome:
    "Hi! Ask about services, prices, or booking — we’ll help you get sorted.",
} as const;

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

function stubReply(userText: string): string {
  const q = userText.toLowerCase();
  if (q.includes("book") || q.includes("appointment")) {
    return "You can book anytime from Book Appointment — pick services, date, and time in a few steps.";
  }
  if (q.includes("price") || q.includes("cost") || q.includes("rs")) {
    return "Popular options start around Rs. 1,000–1,500 for grooming. Open Book Appointment to see live prices for each service.";
  }
  if (q.includes("hour") || q.includes("open") || q.includes("time")) {
    return "Opening hours are managed by the salon. The booking calendar only shows available slots.";
  }
  if (q.includes("colour") || q.includes("color") || q.includes("facial")) {
    return "We offer hair colour, facials, cuts, beard grooming, and more. Browse services on the home page or in booking.";
  }
  return "Thanks for your message. For bookings, use Book Appointment — or call us from the Contact section. Full chat replies will connect once the API is live.";
}

/**
 * Send a user message and return the assistant reply.
 * When `chatbotConfig.apiPath` is set, POSTs `{ message }` and expects `{ reply: string }`.
 */
export async function sendChatMessage(message: string): Promise<string> {
  const trimmed = message.trim();
  if (!trimmed) return "Please type a short question.";

  const path = chatbotConfig.apiPath.trim();
  if (!path) {
    await new Promise((r) => setTimeout(r, 450));
    return stubReply(trimmed);
  }

  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: trimmed }),
  });

  if (!res.ok) {
    throw new Error("Chat is temporarily unavailable. Please try again.");
  }

  const data = (await res.json()) as { reply?: string; message?: string };
  const reply = (data.reply ?? data.message ?? "").trim();
  if (!reply) throw new Error("Empty reply from chat API.");
  return reply;
}
