/**
 * AI Salon Inquiry Assistant for Salon I Squad WhatsApp Chatbot
 * Answers customer questions conversationally in English, Sinhala, or Tamil.
 * Uses Google Gemini API / OpenAI API if configured, with a built-in intelligent knowledge base fallback.
 */

import { type SupportedLanguage } from "./i18n";
import { getActiveServices } from "./db";

export type AIResponse = {
  reply: string;
  suggestBookButton: boolean;
};

const SALON_CONTEXT = `
Salon Information:
- Name: Salon I Squad
- Location: Negombo Road, Kurunegala, Sri Lanka
- Opening Hours: 9:00 AM – 7:00 PM, open daily (including weekends and most holidays)
- Contact Phone: +94 72 123 8400
- Website: https://salon-i-squad.vercel.app
- Services offered: Men's & Unisex hair styling, skin fades, beard sculpting & hot towel shaving, hair coloring & highlights, express clean-up & herbal facials, keratin treatments & relaxing, head massage & hair spa.
- Policies:
  * Arrive at least 10 minutes prior to scheduled appointment.
  * Cancellation/rescheduling is free up to 2 hours in advance.
  * Walk-ins accepted when slots are open, but WhatsApp or online booking is highly recommended to skip wait times.
  * Parking available. Air conditioned.
`;

/**
 * Built-in intelligent FAQ responder when LLM API keys are not present
 */
function heuristicFallbackResponse(
  query: string,
  lang: SupportedLanguage,
  servicesList: string,
): AIResponse {
  const q = query.toLowerCase();

  // Location / Address
  if (
    q.includes("where") ||
    q.includes("location") ||
    q.includes("address") ||
    q.includes("koheda") ||
    q.includes("place") ||
    q.includes("එන්නේ කොහොමද") ||
    q.includes("කොහේද") ||
    q.includes("இடம்") ||
    q.includes("எங்கே")
  ) {
    if (lang === "si") {
      return {
        reply: "📍 *Salon I Squad පිහිටීම:*\nමීගමුව පාර, කුරුණෑගල.\n(Negombo Road, Kurunegala)\n\nඅපගේ විවෘත වේලාවන්: පෙ.ව. 9:00 සිට ප.ව. 7:00 දක්වා (දිනපතා).",
        suggestBookButton: true,
      };
    }
    if (lang === "ta") {
      return {
        reply: "📍 *Salon I Squad முகவரி:*\nநீர்கொழும்பு வீதி, குருநாகல் (Negombo Road, Kurunegala).\n\nவேலை நேரம்: தினமும் காலை 9:00 முதல் மாலை 7:00 வரை.",
        suggestBookButton: true,
      };
    }
    return {
      reply: "📍 *Salon I Squad Location:*\nNegombo Road, Kurunegala, Sri Lanka.\n\nOpen daily from 9:00 AM to 7:00 PM.",
      suggestBookButton: true,
    };
  }

  // Hours / Timing / Open
  if (
    q.includes("hour") ||
    q.includes("open") ||
    q.includes("close") ||
    q.includes("time") ||
    q.includes("welawa") ||
    q.includes("welaawa") ||
    q.includes("aralada") ||
    q.includes("sunday") ||
    q.includes("weekend") ||
    q.includes("වෙලාව") ||
    q.includes("විවෘත") ||
    q.includes("நேரம்")
  ) {
    if (lang === "si") {
      return {
        reply: "🕒 *විවෘත වේලාවන්:*\nඅපි සෑම දිනකම පෙ.ව. 9:00 සිට ප.ව. 7:00 දක්වා විවෘතයි (සති අන්තයේද ඇතුළුව).\n\nBooking එකක් දාන්න පහත 'Book Now' ඔබන්න!",
        suggestBookButton: true,
      };
    }
    if (lang === "ta") {
      return {
        reply: "🕒 *வேலை நேரம்:*\nநாங்கள் தினமும் காலை 9:00 மணி முதல் மாலை 7:00 மணி வரை திறந்திருக்கிறோம் (வார இறுதி நாட்கள் உட்பட).",
        suggestBookButton: true,
      };
    }
    return {
      reply: "🕒 *Opening Hours:*\nWe are open every day from 9:00 AM to 7:00 PM, including weekends.",
      suggestBookButton: true,
    };
  }

  // Prices / Services
  if (
    q.includes("price") ||
    q.includes("cost") ||
    q.includes("service") ||
    q.includes("rate") ||
    q.includes("mula") ||
    q.includes("ganan") ||
    q.includes("kiyada") ||
    q.includes("මිල") ||
    q.includes("ගාස්තු") ||
    q.includes("விலை") ||
    q.includes("கட்டணம்")
  ) {
    if (lang === "si") {
      return {
        reply: `💇 *Salon I Squad සේවාවන් සහ මිල ගණන්:*\n\n${servicesList}\n\nඔබට පහසු වේලාවක් වෙන්කරවා ගැනීමට 'Book Now' තෝරන්න!`,
        suggestBookButton: true,
      };
    }
    if (lang === "ta") {
      return {
        reply: `💇 *சேவைகள் & கட்டணங்கள்:*\n\n${servicesList}\n\nமுன்பதிவு செய்ய 'Book Now' என்பதைத் தட்டவும்!`,
        suggestBookButton: true,
      };
    }
    return {
      reply: `💇 *Salon I Squad Services & Pricing:*\n\n${servicesList}\n\nTap 'Book Now' below to choose your time slot!`,
      suggestBookButton: true,
    };
  }

  // Parking / AC / Waiting
  if (q.includes("parking") || q.includes("park") || q.includes("ac") || q.includes("වාහන")) {
    if (lang === "si") {
      return {
        reply: "🚗 ඔව්, අප සතුව පහසු වාහන නැවතුම් පහසුකම් (Parking) සහ සම්පූර්ණ වායුසමනය කළ (Air Conditioned) නවීන සැලෝන් පරිශ්‍රයක් ඇත.",
        suggestBookButton: true,
      };
    }
    return {
      reply: "🚗 Yes, we have convenient on-site parking and a fully air-conditioned modern salon space.",
      suggestBookButton: true,
    };
  }

  // General fallback
  if (lang === "si") {
    return {
      reply: `✨ *Salon I Squad වෙතින් සහය:*\nඅපි කුරුණෑගල මීගමුව පාරේ පිහිටා ඇති අතර දිනපතා පෙ.ව. 9:00 – ප.ව. 7:00 දක්වා විවෘතයි.\n\nඔබට කොණ්ඩය කැපීම, රැවුල සැකසීම, Facials, Keratin හෝ වෙනත් සේවාවක් සඳහා වේලාවක් වෙන්කරවා ගැනීමට 'Book Now' ඔබන්න!`,
      suggestBookButton: true,
    };
  }
  if (lang === "ta") {
    return {
      reply: `✨ *Salon I Squad உதவி:*\nநாங்கள் குருநாகல் நீர்கொழும்பு வீதியில் அமைந்துள்ளோம். தினமும் காலை 9:00 முதல் மாலை 7:00 வரை திறந்திருக்கும்.\n\nமுன்பதிவு செய்ய கீழே உள்ள 'Book Now' என்பதைத் தேர்ந்தெடுக்கவும்!`,
      suggestBookButton: true,
    };
  }
  return {
    reply: `✨ *Salon I Squad Assistance:*\nWe are located on Negombo Road, Kurunegala, open daily from 9:00 AM – 7:00 PM.\n\nHow can we help with your styling needs today? Feel free to book your appointment below:`,
    suggestBookButton: true,
  };
}

/**
 * Handle freeform customer inquiry using Gemini/OpenAI or fallback
 */
export async function answerCustomerInquiry(
  userQuery: string,
  lang: SupportedLanguage = "en",
): Promise<AIResponse> {
  const services = await getActiveServices();
  const servicesSummary = services
    .map((s) => `• ${s.name}: LKR ${s.price.toLocaleString()} (~${s.durationMinutes} mins)`)
    .join("\n");

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();

  // Try Google Gemini API if key is available
  if (geminiApiKey) {
    try {
      const prompt = `You are the friendly, professional AI concierge for "Salon I Squad", an upscale hair and grooming salon in Kurunegala, Sri Lanka.
Language: Reply in ${lang === "si" ? "Sinhala" : lang === "ta" ? "Tamil" : "English"} (or naturally matching the user's phrasing).
Keep responses concise, polite, under 80 words, and encourage the customer to book an appointment.

Salon Facts:
${SALON_CONTEXT}

Current Services & Prices:
${servicesSummary}

Customer says: "${userQuery}"

Provide a direct, friendly reply:`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 200, temperature: 0.4 },
          }),
        },
      );

      if (res.ok) {
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === "string" && text.trim().length > 0) {
          return {
            reply: text.trim(),
            suggestBookButton: true,
          };
        }
      }
    } catch (err) {
      console.warn("[Gemini API call error, falling back to heuristic]", err);
    }
  }

  // Try OpenAI API if key is available
  if (openAiApiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are the friendly AI assistant for "Salon I Squad" located on Negombo Road, Kurunegala, Sri Lanka. Reply concisely in ${
                lang === "si" ? "Sinhala" : lang === "ta" ? "Tamil" : "English"
              }. Keep response under 70 words. Encourage them to book.
${SALON_CONTEXT}
Services:
${servicesSummary}`,
            },
            { role: "user", content: userQuery },
          ],
          max_tokens: 150,
          temperature: 0.5,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json?.choices?.[0]?.message?.content;
        if (text && typeof text === "string" && text.trim().length > 0) {
          return {
            reply: text.trim(),
            suggestBookButton: true,
          };
        }
      }
    } catch (err) {
      console.warn("[OpenAI API call error, falling back to heuristic]", err);
    }
  }

  // Built-in intelligent heuristic fallback
  return heuristicFallbackResponse(userQuery, lang, servicesSummary);
}
