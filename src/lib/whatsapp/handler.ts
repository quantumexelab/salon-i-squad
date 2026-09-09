/**
 * WhatsApp Chatbot Conversation Handler & State Machine
 * Advanced Suite: Stylist Selection, Rescheduling/Cancellation,
 * Admin Instant Alerts, Live Queue Turn & Rating, AI Assistant.
 */

import {
  sendWhatsAppButtons,
  sendWhatsAppList,
  sendWhatsAppText,
  sendAdminWhatsAppNotification,
  type WhatsAppButton,
} from "./api";
import {
  clearWhatsAppSession,
  createWhatsAppBookingRecord,
  getActiveServices,
  getActiveStaff,
  getAvailableTimeSlots,
  getUpcomingBookingsForPhone,
  getWhatsAppSession,
  saveWhatsAppSession,
  cancelWhatsAppBooking,
  rescheduleWhatsAppBooking,
  saveCustomerReview,
  type SalonServiceItem,
  type StaffItem,
  type WhatsAppSession,
} from "./db";
import { I18N, t, type SupportedLanguage } from "./i18n";
import {
  getSriLankaNow,
  parseNaturalTime,
  parseSlotMinutes,
  toDateKey,
} from "@/lib/calendar-utils";
import { answerCustomerInquiry } from "./ai";

export type IncomingWhatsAppMessage = {
  from: string; // sender phone (e.g. 94721238400)
  name?: string; // customer WhatsApp profile name
  type: string;
  text?: string;
  buttonPayload?: string;
  listId?: string;
};

/**
 * Parses raw Meta webhook JSON into normalized incoming messages.
 */
export function extractIncomingMessages(payload: Record<string, unknown>): IncomingWhatsAppMessage[] {
  const result: IncomingWhatsAppMessage[] = [];

  const entries = (payload.entry as Array<Record<string, unknown>>) || [];
  for (const entry of entries) {
    const changes = (entry.changes as Array<Record<string, unknown>>) || [];
    for (const change of changes) {
      const value = (change.value as Record<string, unknown>) || {};
      const contacts = (value.contacts as Array<Record<string, unknown>>) || [];
      const profileName = (contacts[0]?.profile as Record<string, string>)?.name;

      const messages = (value.messages as Array<Record<string, unknown>>) || [];
      for (const msg of messages) {
        const from = String(msg.from || "");
        const type = String(msg.type || "text");

        // Ignore emoji reactions on past messages so they don't trigger unwanted chat resets
        if (type === "reaction") continue;

        let text = "";
        let buttonPayload = "";
        let listId = "";

        if (type === "text") {
          text = String((msg.text as Record<string, string>)?.body || "").trim();
        } else if (type === "sticker") {
          // Stickers (waving hand, greetings, etc.) start/greet the bot
          text = "hi";
        } else if (type === "image") {
          const img = (msg.image as Record<string, string>) || {};
          text = String(img.caption || "hi").trim();
        } else if (type === "video") {
          const vid = (msg.video as Record<string, string>) || {};
          text = String(vid.caption || "hi").trim();
        } else if (type === "audio" || type === "voice") {
          text = "hi";
        } else if (type === "document") {
          const doc = (msg.document as Record<string, string>) || {};
          text = String(doc.caption || "hi").trim();
        } else if (type === "location") {
          text = "info";
        } else if (type === "interactive") {
          const interactive = (msg.interactive as Record<string, unknown>) || {};
          const itype = interactive.type;
          if (itype === "button_reply") {
            const btn = (interactive.button_reply as Record<string, string>) || {};
            buttonPayload = btn.id || "";
            text = btn.title || "";
          } else if (itype === "list_reply") {
            const list = (interactive.list_reply as Record<string, string>) || {};
            listId = list.id || "";
            text = list.title || "";
          }
        } else if (type === "button") {
          const btn = (msg.button as Record<string, string>) || {};
          buttonPayload = btn.payload || btn.text || "";
          text = btn.text || "";
        } else {
          // Fallback for any other customer media/message type
          text = "hi";
        }

        if (from) {
          result.push({
            from,
            name: profileName,
            type,
            text,
            buttonPayload,
            listId,
          });
        }
      }
    }
  }

  return result;
}

/**
 * Main dispatcher for customer messages
 */
export async function handleIncomingWhatsAppMessage(msg: IncomingWhatsAppMessage): Promise<void> {
  const phone = msg.from;
  const userText = msg.text?.toLowerCase() || "";
  const inputId = msg.buttonPayload || msg.listId || "";

  const session = await getWhatsAppSession(phone);
  if (msg.name && !session.customerName) {
    session.customerName = msg.name;
  }

  // 0. Handle Rating / Feedback responses from customer
  if (inputId.startsWith("rate_")) {
    const parts = inputId.split("_");
    const stars = parseInt(parts[1] || "5", 10);
    const bookingId = parts[2] || "";
    await saveCustomerReview({
      phone,
      rating: isNaN(stars) ? 5 : stars,
      bookingId,
    });
    const lang = session.language || "en";
    await sendWhatsAppText(phone, t("feedbackThankYou", lang, { stars }));
    return;
  }

  // Change language trigger
  const isChangeLang =
    inputId === "btn_change_lang" ||
    userText === "language" ||
    userText === "lang" ||
    userText === "භාෂාව" ||
    userText === "மொழி";

  if (isChangeLang) {
    await sendLanguageSelection(phone);
    session.step = "LANGUAGE_SELECT";
    await saveWhatsAppSession(phone, session);
    return;
  }

  // Global reset / greeting triggers (including stickers, hello, start, etc.)
  const isGreetingOrReset =
    msg.type === "sticker" ||
    msg.type === "audio" ||
    msg.type === "voice" ||
    userText === "hi" ||
    userText === "hello" ||
    userText === "hey" ||
    userText === "start" ||
    userText === "restart" ||
    userText === "help" ||
    userText === "hiya" ||
    userText === "hola" ||
    userText === "hai" ||
    userText === "yo" ||
    userText.includes("good morning") ||
    userText.includes("good afternoon") ||
    userText.includes("good evening") ||
    userText.includes("ආයුබෝවන්") ||
    userText.includes("வணக்கம்");

  if (isGreetingOrReset) {
    if (userText === "restart") {
      await clearWhatsAppSession(phone, "en");
    }

    // Auto-detect language if customer typed in Sinhala or Tamil
    if (userText.includes("ආයුබෝවන්") || /[\u0D80-\u0DFF]/.test(userText)) {
      session.language = "si";
    } else if (userText.includes("வணக்கம்") || /[\u0B80-\u0BFF]/.test(userText)) {
      session.language = "ta";
    } else if (!session.language) {
      session.language = "en";
    }

    session.step = "MAIN_MENU";
    await saveWhatsAppSession(phone, session);
    await sendMainMenu(phone, session.language);
    return;
  }

  const lang: SupportedLanguage = session.language || "en";

  // Step 1: Language selection response
  if (session.step === "LANGUAGE_SELECT" || inputId.startsWith("lang_")) {
    let chosenLang: SupportedLanguage = "en";
    if (inputId === "lang_si" || userText.includes("සිංහල") || userText === "2") {
      chosenLang = "si";
    } else if (inputId === "lang_ta" || userText.includes("தமிழ்") || userText === "3") {
      chosenLang = "ta";
    }

    session.language = chosenLang;
    session.step = "MAIN_MENU";
    await saveWhatsAppSession(phone, session);

    await sendMainMenu(phone, chosenLang);
    return;
  }

  // ============================================================
  // Step 2.0: Service Selection & Multi-Service Actions
  // Placed with highest priority so list selections, multi-select buttons,
  // and service names are never intercepted by generic commands.
  // ============================================================
  const isClearServices =
    inputId === "btn_clear_services" ||
    (session.step === "SERVICE_CONFIRM" &&
      (userText === "clear" ||
        userText === "reset" ||
        userText === "අලුතින්" ||
        userText.includes("අලුතින් තෝරන්න")));

  if (isClearServices) {
    session.selectedServices = [];
    session.selectedServiceId = undefined;
    session.selectedServiceName = undefined;
    session.selectedServicePrice = undefined;
    session.selectedServiceDuration = undefined;
    session.step = "SERVICE_SELECT";
    await saveWhatsAppSession(phone, session);
    await startServiceSelection(phone, session, lang, false);
    return;
  }

  const isDoneServices =
    inputId === "btn_done_services" ||
    (session.step === "SERVICE_CONFIRM" &&
      (userText === "done" ||
        userText === "next" ||
        userText === "continue" ||
        userText === "ok" ||
        userText === "hari" ||
        userText.includes("ඉදිරියට") ||
        userText.includes("තහවුරු")));

  if (isDoneServices) {
    if (session.selectedServices && session.selectedServices.length > 0) {
      session.step = "STAFF_SELECT";
      await saveWhatsAppSession(phone, session);
      await startStaffSelection(phone, session, lang);
    } else {
      await sendWhatsAppText(phone, t("noDraftServiceNotice", lang));
      await startServiceSelection(phone, session, lang, false);
    }
    return;
  }

  const isAddAnotherService =
    inputId === "btn_add_service" ||
    (session.step === "SERVICE_CONFIRM" &&
      (userText === "add" ||
        userText === "more" ||
        userText === "add more" ||
        userText === "තව" ||
        userText === "තවත්" ||
        userText.includes("තව සේවාවක්")));

  if (isAddAnotherService) {
    if (!session.selectedServices || session.selectedServices.length === 0) {
      await sendWhatsAppText(phone, t("noDraftServiceNotice", lang));
      await startServiceSelection(phone, session, lang, false);
      return;
    }

    if (session.selectedServices?.some((s) => s.requiresConsultation)) {
      await sendWhatsAppText(phone, t("consultationServiceNotice", lang));
      await sendSelectedServicesSummary(phone, session, lang);
      return;
    }
    await startServiceSelection(phone, session, lang, true);
    return;
  }

  // Handle service item selection (via interactive list row tap or typing service name/number)
  if (
    inputId.startsWith("svc_") ||
    session.step === "SERVICE_SELECT" ||
    session.step === "SERVICE_CONFIRM"
  ) {
    // If customer tapped a service from an older message out of order, reset any stale draft
    if (inputId.startsWith("svc_") && session.step !== "SERVICE_SELECT" && session.step !== "SERVICE_CONFIRM") {
      session.selectedServices = [];
      session.selectedServiceId = undefined;
      session.selectedServiceName = undefined;
      session.selectedServicePrice = undefined;
      session.selectedServiceDuration = undefined;
      session.selectedStaffId = undefined;
      session.selectedStaffName = undefined;
      session.selectedDateKey = undefined;
      session.selectedTime = undefined;
    }

    const services = await getActiveServices();
    const matchedServices: SalonServiceItem[] = [];

    if (inputId.startsWith("svc_")) {
      const targetId = inputId.replace(/^svc_/, "");
      const found = services.find(
        (s) =>
          s.id === targetId ||
          s.id === inputId ||
          `svc_${s.id}` === inputId ||
          s.id.replace(/^svc_/, "") === targetId,
      );
      if (found) matchedServices.push(found);
    }

    if (matchedServices.length === 0 && userText) {
      // Check for single number (e.g. "1", "2")
      const numMatch = userText.match(/^\s*(\d+)\s*$/);
      if (numMatch) {
        const idx = parseInt(numMatch[1]!, 10) - 1;
        if (services[idx]) {
          matchedServices.push(services[idx]!);
        }
      } else {
        // Check for service names mentioned in text (e.g. "haircut and beard" or "fade")
        for (const s of services) {
          const sNameLower = s.name.toLowerCase();
          if (
            sNameLower === userText ||
            (sNameLower.length >= 4 && userText.includes(sNameLower)) ||
            (userText.length >= 4 && sNameLower.includes(userText))
          ) {
            matchedServices.push(s);
          }
        }
      }
    }

    if (matchedServices.length > 0) {
      if (!session.selectedServices) {
        session.selectedServices = [];
      }

      for (const chosenService of matchedServices) {
        // Check consultation constraints
        if (
          chosenService.requiresConsultation &&
          session.selectedServices.length > 0
        ) {
          await sendWhatsAppText(phone, t("consultationServiceNotice", lang));
          await sendSelectedServicesSummary(phone, session, lang);
          return;
        }

        if (session.selectedServices.some((s) => s.requiresConsultation)) {
          await sendWhatsAppText(phone, t("consultationServiceNotice", lang));
          await sendSelectedServicesSummary(phone, session, lang);
          return;
        }

        const alreadyExists = session.selectedServices.some(
          (s) =>
            s.id === chosenService.id ||
            s.id.replace(/^svc_/, "") === chosenService.id.replace(/^svc_/, ""),
        );
        if (!alreadyExists) {
          session.selectedServices.push({
            id: chosenService.id,
            name: chosenService.name,
            price: chosenService.price,
            durationMinutes: chosenService.durationMinutes,
            requiresConsultation: chosenService.requiresConsultation,
          });
        }
      }

      session.selectedServiceId = session.selectedServices[0]?.id || matchedServices[0]!.id;
      session.selectedServiceName = session.selectedServices.map((s) => s.name).join(" + ");
      session.selectedServicePrice = session.selectedServices.reduce((sum, s) => sum + s.price, 0);
      session.selectedServiceDuration = session.selectedServices.reduce(
        (sum, s) => sum + s.durationMinutes,
        0,
      );
      session.step = "SERVICE_CONFIRM";
      await saveWhatsAppSession(phone, session);

      await sendSelectedServicesSummary(phone, session, lang);
      return;
    }
  }

  // Step 2: Main Menu handling

  // 2.1 My Bookings (Check first to prevent 'booking' from triggering 'book')
  const isMyBookings =
    inputId === "btn_my_bookings" ||
    userText.includes("my booking") ||
    userText.includes("my bookings") ||
    userText.includes("මගේ booking") ||
    userText.includes("මගේ bookings") ||
    userText.includes("මගේ බුකින්") ||
    userText.includes("මගේ වෙන්කිරීම්") ||
    userText.includes("என் பதிவு") ||
    userText.includes("என் பதிவுகள்") ||
    userText === "bookings" ||
    userText === "appointments";

  if (isMyBookings) {
    session.step = "MY_BOOKINGS_MENU";
    await saveWhatsAppSession(phone, session);
    await sendMyBookings(phone, lang);
    return;
  }

  // 2.2 Services Overview
  const isServices =
    inputId === "btn_services" ||
    userText === "services" ||
    userText === "service" ||
    userText === "සේවාවන්" ||
    userText === "සේවා" ||
    userText === "சேவைகள்" ||
    userText === "menu services" ||
    userText === "view services";

  if (isServices) {
    await sendServicesOverview(phone, lang);
    return;
  }

  // 2.3 Salon Info
  const isInfo =
    inputId === "btn_info" ||
    userText === "info" ||
    userText.includes("විස්තර") ||
    userText.includes("விவரங்கள்");

  if (isInfo) {
    await sendWhatsAppText(phone, t("salonInfo", lang));
    return;
  }

  // 2.4 Return to Main Menu
  const isMainMenu =
    inputId === "btn_menu" ||
    userText === "menu" ||
    userText === "main menu" ||
    userText.includes("ප්‍රධාන මෙනුව") ||
    userText.includes("முதன்மை மெனு");

  if (isMainMenu) {
    session.step = "MAIN_MENU";
    await saveWhatsAppSession(phone, session);
    await sendMainMenu(phone, lang);
    return;
  }

  // 2.5 Start Service / Booking Selection
  const isBook =
    inputId === "btn_book" ||
    (!isMyBookings &&
      !inputId.startsWith("svc_") && (
        userText === "book" ||
        userText === "book now" ||
        userText === "booking" ||
        userText === "appointment" ||
        userText === "වෙන්කරන්න" ||
        userText.includes("book now") ||
        userText.includes("වෙන්කර") ||
        userText.includes("முன்பதிவு")
      ));

  if (isBook) {
    session.selectedServices = [];
    session.selectedServiceId = undefined;
    session.selectedServiceName = undefined;
    session.selectedServicePrice = undefined;
    session.selectedServiceDuration = undefined;
    session.selectedStaffId = undefined;
    session.selectedStaffName = undefined;
    session.selectedDateKey = undefined;
    session.selectedTime = undefined;
    session.step = "SERVICE_SELECT";
    await saveWhatsAppSession(phone, session);
    await startServiceSelection(phone, session, lang, false);
    return;
  }

  // Manage individual booking selection
  if (inputId.startsWith("manage_")) {
    const bookingId = inputId.replace("manage_", "");
    const bookings = await getUpcomingBookingsForPhone(phone);
    const target = bookings.find((b) => b.id === bookingId);
    if (target) {
      await sendSingleBookingActions(phone, target, lang);
    } else {
      await sendWhatsAppText(phone, t("bookingAlreadyHandledNotice", lang));
      await sendMyBookings(phone, lang);
    }
    return;
  }

  // Step 2.1: Booking Cancellation Flow
  if (inputId.startsWith("cancel_") && !inputId.startsWith("confirm_cancel_")) {
    const bookingId = inputId.replace("cancel_", "");
    const bookings = await getUpcomingBookingsForPhone(phone);
    const target = bookings.find((b) => b.id === bookingId);

    if (!target) {
      await sendWhatsAppText(phone, t("bookingAlreadyHandledNotice", lang));
      await sendMyBookings(phone, lang);
      return;
    }

    session.step = "CANCEL_CONFIRM";
    await saveWhatsAppSession(phone, session);

    const promptText = t("confirmCancelPrompt", lang, {
      num: target.appointmentNumber ?? 1,
      service: target.serviceName ?? "Service",
      date: target.dateKey ?? "",
      time: target.selectedTime ?? "",
    });

    await sendWhatsAppButtons(
      phone,
      promptText,
      [
        { id: `confirm_cancel_${bookingId}`, title: t("confirmCancelBtn", lang) },
        { id: "keep_booking", title: t("keepBookingBtn", lang) },
      ],
      { headerText: "Cancel Appointment", footerText: "Confirm cancellation" },
    );
    return;
  }

  if (inputId.startsWith("confirm_cancel_")) {
    const bookingId = inputId.replace("confirm_cancel_", "");
    const result = await cancelWhatsAppBooking(bookingId);

    if (result.ok && result.booking) {
      await sendWhatsAppText(
        phone,
        t("cancelConfirmed", lang, {
          num: result.booking.appointmentNumber,
          service: result.booking.serviceName,
        }),
      );

      // Instant Admin Alert
      const adminAlert = `⚠️ *WhatsApp Booking Cancelled!*\n\n• *Appointment:* #${result.booking.appointmentNumber}\n• *Customer:* +${phone}\n• *Service:* ${result.booking.serviceName}\n• *Date:* ${result.booking.dateKey} at ${result.booking.selectedTime}`;
      await sendAdminWhatsAppNotification(adminAlert);

      await clearWhatsAppSession(phone, lang);
    } else {
      await sendWhatsAppText(
        phone,
        result.error ? `⚠️ ${result.error}` : t("bookingAlreadyHandledNotice", lang),
      );
      await sendMyBookings(phone, lang);
    }
    return;
  }

  if (inputId === "keep_booking") {
    await sendWhatsAppText(phone, "Your appointment remains confirmed! See you soon. ✨");
    await sendMainMenu(phone, lang);
    return;
  }

  // Step 2.2: Booking Reschedule Flow
  if (inputId.startsWith("reschedule_") && !inputId.startsWith("resched_date_") && !inputId.startsWith("resched_time_")) {
    const bookingId = inputId.replace("reschedule_", "");
    const bookings = await getUpcomingBookingsForPhone(phone);
    const target = bookings.find((b) => b.id === bookingId);

    if (!target) {
      await sendWhatsAppText(phone, t("bookingAlreadyHandledNotice", lang));
      await sendMyBookings(phone, lang);
      return;
    }

    session.rescheduleBookingId = bookingId;
    session.step = "RESCHEDULE_SELECT_DATE";
    session.selectedServiceDuration = target.duration || 30;
    session.selectedServiceName = target.serviceName || "Service";
    session.selectedServicePrice = target.price || 0;
    session.selectedServiceId = target.serviceId || "svc_resched";
    await saveWhatsAppSession(phone, session);

    await sendRescheduleDateSelection(phone, target.appointmentNumber ?? 1, target.serviceName ?? "Service", lang);
    return;
  }

  if (session.step === "RESCHEDULE_SELECT_DATE" || inputId.startsWith("resched_date_")) {
    if (!session.rescheduleBookingId) {
      await sendWhatsAppButtons(
        phone,
        t("expiredActionNotice", lang),
        [
          { id: "btn_book", title: t("btnBook", lang) },
          { id: "btn_my_bookings", title: t("btnMyBookings", lang) },
        ],
        { headerText: "Salon I Squad" },
      );
      return;
    }

    let newDateKey = "";
    const now = getSriLankaNow();

    if (inputId === "resched_date_today") {
      newDateKey = toDateKey(now);
    } else if (inputId === "resched_date_tomorrow") {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      newDateKey = toDateKey(tomorrow);
    } else if (inputId.startsWith("resched_date_")) {
      newDateKey = inputId.replace("resched_date_", "");
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(userText)) {
      newDateKey = userText;
    }

    if (newDateKey) {
      if (newDateKey < toDateKey(now)) {
        await sendWhatsAppText(phone, t("datePastNotice", lang));
        await sendRescheduleDateSelection(phone, 1, session.selectedServiceName || "Service", lang);
        return;
      }

      session.selectedDateKey = newDateKey;
      session.step = "RESCHEDULE_SELECT_TIME";
      await saveWhatsAppSession(phone, session);

      await sendAvailableTimeSlots(phone, session, lang, newDateKey, true);
      return;
    }
  }

  if (
    session.step === "RESCHEDULE_SELECT_TIME" ||
    inputId.startsWith("resched_time_") ||
    inputId.startsWith("resched_period_")
  ) {
    if (!session.rescheduleBookingId || !session.selectedDateKey) {
      await sendWhatsAppButtons(
        phone,
        t("expiredActionNotice", lang),
        [
          { id: "btn_book", title: t("btnBook", lang) },
          { id: "btn_my_bookings", title: t("btnMyBookings", lang) },
        ],
        { headerText: "Salon I Squad" },
      );
      return;
    }
    if (inputId.startsWith("resched_period_")) {
      const period = inputId.replace("resched_period_", "") as "morning" | "afternoon" | "evening";
      if (session.selectedDateKey) {
        await sendAvailableTimeSlots(phone, session, lang, session.selectedDateKey, true, period);
      }
      return;
    }

    let newTime = "";
    if (inputId.startsWith("resched_time_")) {
      newTime = inputId.replace("resched_time_", "");
    } else {
      const parsed = parseNaturalTime(userText);
      if (parsed) {
        newTime = parsed;
      }
    }

    if (newTime && session.rescheduleBookingId && session.selectedDateKey) {
      // Validate past time for today
      const slNow = getSriLankaNow();
      if (session.selectedDateKey === toDateKey(slNow)) {
        const slotStart = parseSlotMinutes(newTime);
        const nowMinutes = slNow.getHours() * 60 + slNow.getMinutes();
        if (!Number.isNaN(slotStart) && slotStart <= nowMinutes + 10) {
          await sendWhatsAppText(phone, t("timePassedError", lang));
          await sendAvailableTimeSlots(phone, session, lang, session.selectedDateKey, true);
          return;
        }
      }

      const result = await rescheduleWhatsAppBooking(
        session.rescheduleBookingId,
        session.selectedDateKey,
        newTime,
      );

      if (result.ok && result.booking) {
        await sendWhatsAppText(
          phone,
          t("rescheduleSuccess", lang, {
            num: result.newAppointmentNumber || 1,
            service: result.booking.serviceName,
            date: session.selectedDateKey,
            time: newTime,
            staff: result.booking.staffName || "Stylist",
          }),
        );

        // Instant Admin Alert
        const adminAlert = `🔄 *WhatsApp Booking Rescheduled!*\n\n• *New Appointment:* #${result.newAppointmentNumber}\n• *Customer:* +${phone}\n• *Service:* ${result.booking.serviceName}\n• *New Slot:* ${session.selectedDateKey} at ${newTime}`;
        await sendAdminWhatsAppNotification(adminAlert);

        await clearWhatsAppSession(phone, lang);
      } else {
        await sendWhatsAppText(
          phone,
          result.error
            ? `⚠️ ${result.error}`
            : "Sorry, unable to reschedule to this time. Please select another time from below.",
        );
        await sendAvailableTimeSlots(phone, session, lang, session.selectedDateKey, true);
      }
      return;
    }
  }

  // Step 3.5: Staff / Stylist Selection handling
  if (session.step === "STAFF_SELECT" || inputId.startsWith("staff_")) {
    const hasServices =
      (session.selectedServices && session.selectedServices.length > 0) ||
      Boolean(session.selectedServiceName);

    if (!hasServices) {
      await sendWhatsAppText(phone, t("noDraftServiceNotice", lang));
      session.step = "SERVICE_SELECT";
      await saveWhatsAppSession(phone, session);
      await startServiceSelection(phone, session, lang, false);
      return;
    }

    const staffList = await getActiveStaff();
    let selectedStaff: StaffItem | undefined;

    if (inputId === "staff_any" || userText.includes("any") || userText.includes("ඕනෑම")) {
      session.selectedStaffId = "any";
      session.selectedStaffName =
        lang === "si" ? "ඕනෑම Stylist කෙනෙක්" : lang === "ta" ? "எந்த ஒப்பனையாளரும்" : "Any Available Stylist";
    } else if (inputId.startsWith("staff_")) {
      const rawId = inputId.replace("staff_", "");
      selectedStaff = staffList.find((s) => s.id === rawId || s.id === inputId);
      session.selectedStaffId = selectedStaff ? selectedStaff.id : rawId;
      session.selectedStaffName = selectedStaff ? selectedStaff.name : "Stylist";
    } else {
      selectedStaff = staffList.find((s) => s.name.toLowerCase().includes(userText));
      session.selectedStaffId = selectedStaff ? selectedStaff.id : "any";
      session.selectedStaffName = selectedStaff ? selectedStaff.name : "Any Available Stylist";
    }

    session.step = "DATE_SELECT";
    await saveWhatsAppSession(phone, session);

    await sendDateSelection(phone, session, lang);
    return;
  }

  // Step 4: Date Selection handling
  if (session.step === "DATE_SELECT" || inputId.startsWith("date_")) {
    const hasServices =
      (session.selectedServices && session.selectedServices.length > 0) ||
      Boolean(session.selectedServiceName);

    if (!hasServices) {
      await sendWhatsAppText(phone, t("noDraftServiceNotice", lang));
      session.step = "SERVICE_SELECT";
      await saveWhatsAppSession(phone, session);
      await startServiceSelection(phone, session, lang, false);
      return;
    }

    let selectedDateKey = "";
    const now = getSriLankaNow();

    if (inputId === "date_today" || userText === "today" || userText === "අද") {
      selectedDateKey = toDateKey(now);
    } else if (inputId === "date_tomorrow" || userText === "tomorrow" || userText === "හෙට") {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      selectedDateKey = toDateKey(tomorrow);
    } else if (inputId.startsWith("date_")) {
      selectedDateKey = inputId.replace("date_", "");
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(userText)) {
      selectedDateKey = userText;
    }

    if (selectedDateKey) {
      if (selectedDateKey < toDateKey(now)) {
        await sendWhatsAppText(phone, t("datePastNotice", lang));
        await sendDateSelection(phone, session, lang);
        return;
      }

      session.selectedDateKey = selectedDateKey;
      session.step = "TIME_SELECT";
      await saveWhatsAppSession(phone, session);

      await sendAvailableTimeSlots(phone, session, lang, selectedDateKey);
      return;
    }
  }

  // Step 5: Time Selection handling
  if (
    session.step === "TIME_SELECT" ||
    inputId.startsWith("time_") ||
    inputId.startsWith("period_")
  ) {
    const hasServices =
      (session.selectedServices && session.selectedServices.length > 0) ||
      Boolean(session.selectedServiceName);
    const hasDate = Boolean(session.selectedDateKey);

    if (!hasServices || !hasDate) {
      await sendWhatsAppButtons(
        phone,
        t("expiredActionNotice", lang),
        [
          { id: "btn_book", title: t("btnBook", lang) },
          { id: "btn_my_bookings", title: t("btnMyBookings", lang) },
        ],
        { headerText: "Salon I Squad" },
      );
      return;
    }

    const now = getSriLankaNow();
    if (session.selectedDateKey && session.selectedDateKey < toDateKey(now)) {
      await sendWhatsAppText(phone, t("datePastNotice", lang));
      session.step = "DATE_SELECT";
      await saveWhatsAppSession(phone, session);
      await sendDateSelection(phone, session, lang);
      return;
    }

    if (inputId.startsWith("period_")) {
      const period = inputId.replace("period_", "") as "morning" | "afternoon" | "evening";
      if (session.selectedDateKey) {
        await sendAvailableTimeSlots(phone, session, lang, session.selectedDateKey, false, period);
      }
      return;
    }

    let selectedTime = "";
    if (inputId.startsWith("time_")) {
      selectedTime = inputId.replace("time_", "");
    } else {
      const parsed = parseNaturalTime(userText);
      if (parsed) {
        selectedTime = parsed;
      }
    }

    if (selectedTime && session.selectedServiceName && session.selectedDateKey) {
      // Validate past time for today
      if (session.selectedDateKey === toDateKey(now)) {
        const slotStart = parseSlotMinutes(selectedTime);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (!Number.isNaN(slotStart) && slotStart <= nowMinutes + 10) {
          await sendWhatsAppText(phone, t("timePassedError", lang));
          await sendAvailableTimeSlots(phone, session, lang, session.selectedDateKey);
          return;
        }
      }

      session.selectedTime = selectedTime;
      session.step = "CONFIRM_BOOKING";
      await saveWhatsAppSession(phone, session);

      await sendConfirmationPrompt(phone, session, lang);
      return;
    }
  }

  // Step 6: Confirmation handling
  const isConfirmAction =
    inputId === "btn_confirm" ||
    (session.step === "CONFIRM_BOOKING" &&
      (userText === "yes" ||
        userText === "ඔව්" ||
        userText === "ok" ||
        userText === "hari" ||
        userText === "හරි" ||
        userText === "confirm" ||
        userText === "👍" ||
        userText === "சரி" ||
        userText.includes("confirm")));

  const isCancelAction =
    inputId === "btn_cancel" ||
    (session.step === "CONFIRM_BOOKING" &&
      (userText === "no" ||
        userText === "නැත" ||
        userText === "නැහැ" ||
        userText === "cancel" ||
        userText === "අවලංගු"));

  if (isCancelAction) {
    await clearWhatsAppSession(phone, lang);
    await sendWhatsAppText(phone, t("bookingCancelled", lang));
    await sendMainMenu(phone, lang);
    return;
  }

  if (isConfirmAction) {
    const hasServices =
      (session.selectedServices && session.selectedServices.length > 0) ||
      Boolean(session.selectedServiceName);
    const hasDate = Boolean(session.selectedDateKey);
    const hasTime = Boolean(session.selectedTime);

    if (!hasServices || !hasDate || !hasTime) {
      await sendWhatsAppButtons(
        phone,
        t("expiredActionNotice", lang),
        [
          { id: "btn_book", title: t("btnBook", lang) },
          { id: "btn_my_bookings", title: t("btnMyBookings", lang) },
        ],
        { headerText: "Salon I Squad", footerText: "Appointment already processed" },
      );
      return;
    }

    const result = await createWhatsAppBookingRecord({
      phone,
      customerName: session.customerName,
      serviceId: session.selectedServiceId || "svc_default",
      serviceName: session.selectedServiceName || "Haircut",
      price: session.selectedServicePrice || 2500,
      durationMinutes: session.selectedServiceDuration || 30,
      dateKey: session.selectedDateKey || toDateKey(getSriLankaNow()),
      selectedTime: session.selectedTime || "10:00 AM",
      staffId: session.selectedStaffId || "any",
      staffName: session.selectedStaffName || "Any Available Stylist",
      services:
        session.selectedServices && session.selectedServices.length > 0
          ? session.selectedServices.map((s) => ({
              serviceId: s.id,
              name: s.name,
              price: s.price,
              duration: s.durationMinutes,
            }))
          : undefined,
    });

    if (result.ok) {
      await sendWhatsAppText(
        phone,
        t("bookingSuccess", lang, {
          num: result.appointmentNumber || 1,
          service: session.selectedServiceName || "Haircut",
          staff: session.selectedStaffName || "Any Stylist",
          date: session.selectedDateKey || "",
          time: session.selectedTime || "",
        }),
      );

      // Instant Salon Owner WhatsApp Alert
      const adminMsg = `🔔 *New WhatsApp Booking Alert!*\n\n• *Appointment:* #${result.appointmentNumber || 1}\n• *Customer:* ${session.customerName || "Customer"} (+${phone})\n• *Service:* ${session.selectedServiceName || "Service"}\n• *Stylist:* ${session.selectedStaffName || "Any Stylist"}\n• *Date:* ${session.selectedDateKey}\n• *Time:* ${session.selectedTime}\n• *Duration:* ~${session.selectedServiceDuration || 30} mins\n• *Price:* LKR ${(session.selectedServicePrice || 0).toLocaleString()}`;
      
      try {
        await sendAdminWhatsAppNotification(adminMsg);
      } catch (adminErr) {
        console.error("[sendAdminWhatsAppNotification Error]", adminErr);
      }

      await clearWhatsAppSession(phone, lang);
    } else {
      await sendWhatsAppText(
        phone,
        result.error
          ? `⚠️ ${result.error}`
          : "Sorry, there was an issue confirming your booking. Please choose another time from below.",
      );
      if (session.selectedDateKey) {
        await sendAvailableTimeSlots(phone, session, lang, session.selectedDateKey);
      }
    }
    return;
  }

  // Step 7: Natural language AI inquiry assistant fallback
  if (msg.text && msg.text.trim().length > 1) {
    const aiAnswer = await answerCustomerInquiry(msg.text, lang);
    if (aiAnswer.suggestBookButton) {
      await sendWhatsAppButtons(
        phone,
        aiAnswer.reply,
        [
          { id: "btn_book", title: t("btnBook", lang) },
          { id: "btn_services", title: t("btnServices", lang) },
          { id: "btn_info", title: t("btnInfo", lang) },
        ],
        { headerText: "Salon I Squad Assistant", footerText: "Ask questions or tap Book Now" },
      );
    } else {
      await sendWhatsAppText(phone, aiAnswer.reply);
    }
    return;
  }

  // Default fallback
  await sendMainMenu(phone, lang);
}

/**
 * 1. Language Selection Menu
 */
async function sendLanguageSelection(to: string) {
  await sendWhatsAppButtons(
    to,
    I18N.chooseLanguage.en,
    [
      { id: "lang_en", title: "English 🇬🇧" },
      { id: "lang_si", title: "සිංහල 🇱🇰" },
      { id: "lang_ta", title: "தமிழ் 🇱🇰" },
    ],
    { headerText: "Salon I Squad", footerText: "Select your language" },
  );
}

/**
 * 2. Main Menu
 */
async function sendMainMenu(to: string, lang: SupportedLanguage) {
  await sendWhatsAppButtons(
    to,
    t("welcome", lang),
    [
      { id: "btn_services", title: t("btnServices", lang) },
      { id: "btn_my_bookings", title: t("btnMyBookings", lang) },
      { id: "btn_change_lang", title: t("btnLanguage", lang) },
    ],
    { headerText: "Salon I Squad", footerText: "Choose an option below" },
  );
}

/**
 * 3. Service Selection (Supports selecting multiple services)
 */
async function startServiceSelection(
  to: string,
  session: WhatsAppSession,
  lang: SupportedLanguage,
  isAddingMore = false,
) {
  session.step = "SERVICE_SELECT";
  await saveWhatsAppSession(to, session);

  const services: SalonServiceItem[] = await getActiveServices();
  const alreadySelectedIds = new Set(
    (session.selectedServices || []).map((s) => s.id.replace(/^svc_/, "")),
  );

  // If adding more, filter out already selected services and consultation services
  const availableServices = isAddingMore
    ? services.filter(
        (s) =>
          !alreadySelectedIds.has(s.id.replace(/^svc_/, "")) &&
          !s.requiresConsultation,
      )
    : services;

  if (availableServices.length === 0) {
    if (session.selectedServices && session.selectedServices.length > 0) {
      await sendWhatsAppText(to, t("allServicesSelected", lang));
      session.step = "STAFF_SELECT";
      await saveWhatsAppSession(to, session);
      await startStaffSelection(to, session, lang);
      return;
    }
  }

  const rows = availableServices.slice(0, 10).map((s, idx) => ({
    id: s.id.startsWith("svc_") ? s.id : `svc_${s.id}`,
    title: `${idx + 1}. ${s.name}`.slice(0, 24),
    description: `LKR ${s.price.toLocaleString()} · ~${s.durationMinutes} mins`,
  }));

  const promptText = isAddingMore
    ? t("addMoreServicesPrompt", lang)
    : t("selectService", lang);

  const sectionTitle =
    lang === "si" ? "ලබාගත හැකි සේවාවන්" : lang === "ta" ? "கிடைக்கும் சேவைகள்" : "Available Services";
  const footerHint = isAddingMore
    ? lang === "si"
      ? "තවත් සේවාවක් තෝරන්න"
      : "Tap to add another service"
    : lang === "si"
      ? "සේවාවක් තෝරන්න"
      : "Tap View Services to select";

  await sendWhatsAppList(
    to,
    promptText,
    t("servicesButton", lang),
    [{ title: sectionTitle, rows }],
    { headerText: "Salon Services", footerText: footerHint },
  );
}

/**
 * 3.1 Multi-Service Selection Summary Card
 */
async function sendSelectedServicesSummary(
  to: string,
  session: WhatsAppSession,
  lang: SupportedLanguage,
) {
  const services = session.selectedServices || [];
  const count = services.length;
  if (count === 0) {
    await startServiceSelection(to, session, lang, false);
    return;
  }

  const itemsText = services
    .map((s, idx) => {
      const durationLabel =
        lang === "si"
          ? `විනාඩි ~${s.durationMinutes}`
          : lang === "ta"
            ? `~${s.durationMinutes} நிமி`
            : `~${s.durationMinutes}m`;
      return `${idx + 1}. *${s.name}*\n   💵 LKR ${s.price.toLocaleString()} · ⏱️ ${durationLabel}`;
    })
    .join("\n\n");

  const totalPrice = (session.selectedServicePrice || 0).toLocaleString();
  const totalDuration = session.selectedServiceDuration || 30;

  const body = t("servicesSelectedSummary", lang, {
    count,
    items: itemsText,
    totalPrice,
    totalDuration,
  });

  const hasConsultation = services.some((s) => s.requiresConsultation);
  const buttons: WhatsAppButton[] = [];

  if (!hasConsultation) {
    buttons.push({ id: "btn_add_service", title: t("btnAddMoreService", lang) });
  }

  buttons.push({ id: "btn_done_services", title: t("btnDoneServices", lang) });
  buttons.push({ id: "btn_clear_services", title: t("btnClearServices", lang) });

  await sendWhatsAppButtons(
    to,
    body,
    buttons.slice(0, 3),
    { headerText: "Salon I Squad", footerText: "Choose an option below" },
  );
}

/**
 * 3.5 Stylist Selection
 */
async function startStaffSelection(to: string, session: WhatsAppSession, lang: SupportedLanguage) {
  const staff = await getActiveStaff();

  const buttons = [
    { id: "staff_any", title: t("btnAnyStaff", lang) },
    ...staff
      .filter((s) => s.id !== "staff_any")
      .slice(0, 2)
      .map((s) => ({
        id: `staff_${s.id}`,
        title: s.name.slice(0, 20),
      })),
  ];

  if (staff.length <= 3) {
    await sendWhatsAppButtons(
      to,
      `${t("selectStaff", lang)}\n\n• Service: *${session.selectedServiceName}*`,
      buttons.slice(0, 3),
      { headerText: "Select Stylist", footerText: "Choose a stylist" },
    );
  } else {
    const rows = [
      { id: "staff_any", title: t("btnAnyStaff", lang), description: "First available specialist" },
      ...staff
        .filter((s) => s.id !== "staff_any")
        .slice(0, 9)
        .map((s) => ({
          id: `staff_${s.id}`,
          title: s.name.slice(0, 24),
          description: s.role.slice(0, 72),
        })),
    ];
    await sendWhatsAppList(
      to,
      `${t("selectStaff", lang)}\n\n• Service: *${session.selectedServiceName}*`,
      t("staffButton", lang),
      [{ title: "Our Stylists", rows }],
      { headerText: "Choose Stylist", footerText: "Tap to view stylists" },
    );
  }
}

/**
 * 4. Date Selection
 */
async function sendDateSelection(to: string, session: WhatsAppSession, lang: SupportedLanguage) {
  const now = getSriLankaNow();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const closeMinutes = 19 * 60; // 7:00 PM

  // If already past 6:30 PM in Sri Lanka, today has no slots left, so offer starting from tomorrow
  const canBookToday = currentMinutes < closeMinutes - 30;

  const dates: { id: string; title: string }[] = [];
  if (canBookToday) {
    const todayKey = toDateKey(now);
    dates.push({ id: `date_${todayKey}`, title: `Today (${todayKey.slice(5)})` });
  }

  const d1 = new Date(now.getTime() + (canBookToday ? 1 : 1) * 24 * 60 * 60 * 1000);
  const d1Key = toDateKey(d1);
  dates.push({ id: `date_${d1Key}`, title: `Tmrw (${d1Key.slice(5)})` });

  const d2 = new Date(now.getTime() + (canBookToday ? 2 : 2) * 24 * 60 * 60 * 1000);
  const d2Key = toDateKey(d2);
  dates.push({ id: `date_${d2Key}`, title: `${d2Key}` });

  if (dates.length < 3) {
    const d3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const d3Key = toDateKey(d3);
    dates.push({ id: `date_${d3Key}`, title: `${d3Key}` });
  }

  const staffLabel = session.selectedStaffName ? `\n• Stylist: *${session.selectedStaffName}*` : "";

  await sendWhatsAppButtons(
    to,
    `${t("selectDate", lang)}\n\n• Service: *${session.selectedServiceName}*${staffLabel}`,
    dates.slice(0, 3),
    { headerText: "Appointment Date", footerText: "Choose a date" },
  );
}

/**
 * 4.1 Reschedule Date Selection
 */
async function sendRescheduleDateSelection(
  to: string,
  appointmentNumber: number,
  serviceName: string,
  lang: SupportedLanguage,
) {
  const now = getSriLankaNow();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const closeMinutes = 19 * 60;
  const canBookToday = currentMinutes < closeMinutes - 30;

  const dates: { id: string; title: string }[] = [];
  if (canBookToday) {
    const todayKey = toDateKey(now);
    dates.push({ id: `resched_date_${todayKey}`, title: `Today (${todayKey.slice(5)})` });
  }

  const d1 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const d1Key = toDateKey(d1);
  dates.push({ id: `resched_date_${d1Key}`, title: `Tmrw (${d1Key.slice(5)})` });

  const d2 = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const d2Key = toDateKey(d2);
  dates.push({ id: `resched_date_${d2Key}`, title: `${d2Key}` });

  if (dates.length < 3) {
    const d3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const d3Key = toDateKey(d3);
    dates.push({ id: `resched_date_${d3Key}`, title: `${d3Key}` });
  }

  await sendWhatsAppButtons(
    to,
    t("rescheduleDatePrompt", lang, { num: appointmentNumber, service: serviceName }),
    dates.slice(0, 3),
    { headerText: "Reschedule Date", footerText: "Pick new date" },
  );
}

/**
 * 5. Time Slots Selection
 */
async function sendAvailableTimeSlots(
  to: string,
  session: WhatsAppSession,
  lang: SupportedLanguage,
  dateKey: string,
  isReschedule = false,
  periodFilter?: "morning" | "afternoon" | "evening",
) {
  const duration = session.selectedServiceDuration || 30;
  const availableSlots = await getAvailableTimeSlots(dateKey, duration);

  if (availableSlots.length === 0) {
    await sendWhatsAppText(to, t("noSlots", lang, { date: dateKey }));
    if (isReschedule) {
      await sendRescheduleDateSelection(to, 1, session.selectedServiceName || "Service", lang);
    } else {
      await sendDateSelection(to, session, lang);
    }
    return;
  }

  const prefix = isReschedule ? "resched_time_" : "time_";

  // Filter slots if a period is chosen
  let slotsToDisplay = availableSlots;
  if (periodFilter === "morning") {
    slotsToDisplay = availableSlots.filter((s) => (parseSlotMinutes(s) || 0) < 12 * 60);
  } else if (periodFilter === "afternoon") {
    slotsToDisplay = availableSlots.filter((s) => {
      const m = parseSlotMinutes(s) || 0;
      return m >= 12 * 60 && m < 16 * 60;
    });
  } else if (periodFilter === "evening") {
    slotsToDisplay = availableSlots.filter((s) => (parseSlotMinutes(s) || 0) >= 16 * 60);
  }

  // If day has more than 10 slots and user hasn't filtered by period yet, present period buttons
  if (!periodFilter && availableSlots.length > 10) {
    const periodPrefix = isReschedule ? "resched_period_" : "period_";
    const headerTitle = lang === "si" ? "ලබාගත හැකි වේලාවන්" : "Available Times";
    const footerHint = lang === "si" ? "කාල සීමාවක් තෝරන්න හෝ වේලාව type කරන්න" : "Select period or type time";

    await sendWhatsAppButtons(
      to,
      t("selectTime", lang, { date: dateKey }),
      [
        { id: `${periodPrefix}morning`, title: t("btnMorning", lang) },
        { id: `${periodPrefix}afternoon`, title: t("btnAfternoon", lang) },
        { id: `${periodPrefix}evening`, title: t("btnEvening", lang) },
      ],
      { headerText: headerTitle, footerText: footerHint },
    );
    return;
  }

  if (slotsToDisplay.length === 0) {
    await sendWhatsAppText(
      to,
      lang === "si"
        ? "මෙම කාල සීමාව තුළ ඉතිරි වේලාවන් නොමැත. කරුණාකර වෙනත් වේලාවක් තෝරන්න හෝ type කරන්න."
        : "No remaining times in this period. Please select another period or type your preferred time.",
    );
    await sendAvailableTimeSlots(to, session, lang, dateKey, isReschedule);
    return;
  }

  const displaySlots = slotsToDisplay.slice(0, 10);
  const rows = displaySlots.map((slot) => ({
    id: `${prefix}${slot}`,
    title: slot,
  }));

  const listHeader = lang === "si" ? "ලබාගත හැකි වේලාවන්" : "Available Times";
  const listFooter = lang === "si" ? "වේලාවක් තෝරන්න හෝ type කරන්න" : "Choose a time or type directly";
  const sectionTitle = lang === "si" ? `${dateKey} වේලාවන්` : `Times for ${dateKey}`;

  await sendWhatsAppList(
    to,
    t("selectTime", lang, { date: dateKey }),
    t("timesButton", lang),
    [{ title: sectionTitle, rows }],
    { headerText: listHeader, footerText: listFooter },
  );
}

/**
 * 6. Confirmation Prompt
 */
async function sendConfirmationPrompt(
  to: string,
  session: WhatsAppSession,
  lang: SupportedLanguage,
) {
  const prompt = t("confirmPrompt", lang, {
    service: session.selectedServiceName || "",
    staff: session.selectedStaffName || "Any Stylist",
    date: session.selectedDateKey || "",
    time: session.selectedTime || "",
    duration: session.selectedServiceDuration || 30,
    price: (session.selectedServicePrice || 0).toLocaleString(),
  });

  await sendWhatsAppButtons(
    to,
    prompt,
    [
      { id: "btn_confirm", title: t("btnConfirm", lang) },
      { id: "btn_cancel", title: t("btnCancel", lang) },
    ],
    { headerText: "Booking Confirmation", footerText: "Tap Confirm to finalize" },
  );
}

/**
 * Services Overview text
 */
async function sendServicesOverview(to: string, lang: SupportedLanguage) {
  const services = await getActiveServices();
  let text =
    lang === "si"
      ? "💇 *Salon I Squad සේවාවන් සහ මිල ගණන්:*\n\n"
      : lang === "ta"
        ? "💇 *Salon I Squad சேவைகள் மற்றும் கட்டணங்கள்:*\n\n"
        : "💇 *Salon I Squad Services & Pricing:*\n\n";

  for (const s of services) {
    const dur = lang === "si" ? `විනාඩි ~${s.durationMinutes}` : `~${s.durationMinutes} mins`;
    text += `• *${s.name}*\n  ⏱️ ${dur} | 💵 LKR ${s.price.toLocaleString()}\n\n`;
  }

  text +=
    lang === "si"
      ? "Booking එකක් දැමීමට පහත *Book Now* තට්ටු කරන්න:"
      : lang === "ta"
        ? "முன்பதிவு செய்ய கீழே உள்ள *Book Now* தட்டவும்:"
        : "To book an appointment, tap *Book Now* below:";

  await sendWhatsAppButtons(
    to,
    text,
    [
      { id: "btn_book", title: t("btnBook", lang) },
      { id: "btn_menu", title: t("btnMenu", lang) },
    ],
    { headerText: "Salon Services", footerText: "Salon I Squad" },
  );
}

/**
 * Single booking action buttons
 */
async function sendSingleBookingActions(
  to: string,
  b: { id: string; appointmentNumber: number; serviceName: string; staffName?: string; dateKey: string; selectedTime: string },
  lang: SupportedLanguage,
) {
  const text = `📋 *Appointment Details:*\n\n• *#${b.appointmentNumber}* — ${b.serviceName}\n• *Stylist:* ${b.staffName || "Any Stylist"}\n• *Date:* ${b.dateKey} at ${b.selectedTime}\n\nWould you like to reschedule or cancel this booking?`;

  await sendWhatsAppButtons(
    to,
    text,
    [
      { id: `reschedule_${b.id}`, title: t("btnReschedule", lang) },
      { id: `cancel_${b.id}`, title: t("btnCancelBooking", lang) },
      { id: "btn_menu", title: t("btnMenu", lang) },
    ],
    { headerText: "Manage Appointment", footerText: "Choose an option" },
  );
}

/**
 * My Bookings view with interactive cancellation and rescheduling
 */
async function sendMyBookings(to: string, lang: SupportedLanguage) {
  const bookings = await getUpcomingBookingsForPhone(to);

  if (bookings.length === 0) {
    await sendWhatsAppButtons(
      to,
      t("noActiveBookings", lang),
      [
        { id: "btn_book", title: t("btnBook", lang) },
        { id: "btn_menu", title: t("btnMenu", lang) },
      ],
      { headerText: "Salon I Squad", footerText: "My Bookings" },
    );
    return;
  }

  if (bookings.length === 1) {
    await sendSingleBookingActions(to, bookings[0]!, lang);
    return;
  }

  // Multiple bookings: Provide an interactive list so customer can select which one to manage
  const rows = bookings.slice(0, 10).map((b) => ({
    id: `manage_${b.id}`,
    title: `#${b.appointmentNumber} - ${b.serviceName}`.slice(0, 24),
    description: `${b.dateKey} at ${b.selectedTime}`,
  }));

  await sendWhatsAppList(
    to,
    t("myBookingsHeader", lang),
    t("selectBookingButton", lang) || "Select Booking",
    [{ title: "Your Bookings", rows }],
    { headerText: "My Bookings", footerText: "Tap Select Booking to manage" },
  );
}
