/**
 * Multi-language localization dictionary for Salon I Squad WhatsApp Chatbot.
 * Supports English (en), Sinhala (si), and Tamil (ta).
 */

export type SupportedLanguage = "en" | "si" | "ta";

export const I18N = {
  chooseLanguage: {
    en: "Welcome to Salon I Squad! Please choose your preferred language to continue:\n\nSalon I Squad වෙත සාදරයෙන් පිළිගනිමු! කරුණාකර ඔබ කැමති භාෂාව තෝරන්න:\n\nSalon I Squad-க்கு வரவேற்கிறோம்! தொடர உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்:",
    si: "කරුණාකර ඔබ කැමති භාෂාව තෝරන්න:",
    ta: "தொடர உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்:",
  },
  welcome: {
    en: "Welcome to *Salon I Squad*! ✨\nHow can we assist you today?",
    si: "*Salon I Squad* වෙත ඔබව සාදරයෙන් පිළිගනිමු! ✨\nඅද ඔබට අවශ්‍ය කුමන සේවාවක්ද?",
    ta: "*Salon I Squad*-க்கு உங்களை வரவேற்கிறோம்! ✨\nஇன்று நாங்கள் உங்களுக்கு எவ்வாறு உதவலாம்?",
  },
  btnBook: {
    en: "📅 Book Now",
    si: "📅 වෙන්කරන්න",
    ta: "📅 முன்பதிவு",
  },
  btnServices: {
    en: "💇 Services",
    si: "💇 සේවාවන්",
    ta: "💇 சேவைகள்",
  },
  btnMyBookings: {
    en: "📋 My Bookings",
    si: "📋 මගේ Booking",
    ta: "📋 என் பதிவுகள்",
  },
  btnLanguage: {
    en: "🌐 Language",
    si: "🌐 භාෂාව (Lang)",
    ta: "🌐 மொழி (Lang)",
  },
  btnInfo: {
    en: "ℹ️ Salon Info",
    si: "ℹ️ විස්තර",
    ta: "ℹ️ விவரங்கள்",
  },
  selectService: {
    en: "Please select a service from the list below:\n_(You can add multiple services!)_",
    si: "කරුණාකර පහත ලැයිස්තුවෙන් ඔබට අවශ්‍ය සේවාව තෝරන්න:\n_(සේවාවන් කිහිපයක් එකතු කළ හැක)_",
    ta: "கீழே உள்ள பட்டியலில் இருந்து ஒரு சேவையைத் தேர்ந்தெடுக்கவும்:\n_(பல சேவைகளைச் சேர்க்கலாம்)_",
  },
  servicesButton: {
    en: "View Services",
    si: "සේවාවන් බලන්න",
    ta: "சேவைகளைப் பார்க்க",
  },
  servicesSelectedSummary: {
    en: "💇 *Selected Services ({count}):*\n\n{items}\n\n💵 *Total Price:* LKR {totalPrice}\n⏱️ *Total Duration:* ~{totalDuration} mins\n\n➕ *To add another service:* Tap *Add Another* below\n➡️ *To pick stylist & time:* Tap *Continue*",
    si: "💇 *තෝරාගත් සේවාවන් ({count}):*\n\n{items}\n\n💵 *මුළු මුදල:* LKR {totalPrice}\n⏱️ *ගතවන කාලය:* විනාඩි ~{totalDuration}\n\n➕ *තවත් සේවාවක් එකතු කිරීමට:* පහත *තව සේවාවක්* ඔබන්න\n➡️ *දිනය සහ වේලාව තේරීමට:* පහත *ඉදිරියට* ඔබන්න",
    ta: "💇 *தேர்ந்தெடுக்கப்பட்ட சேவைகள் ({count}):*\n\n{items}\n\n💵 *மொத்த விலை:* LKR {totalPrice}\n⏱️ *மொத்த நேரம்:* ~{totalDuration} நிமிடங்கள்\n\n➕ *மற்றொரு சேவையைச் சேர்க்க:* கீழே *இன்னொன்று* தட்டவும்\n➡️ *தொடர:* கீழே *தொடரவும்* தட்டவும்",
  },
  btnAddMoreService: {
    en: "➕ Add Another",
    si: "➕ තව සේවාවක්",
    ta: "➕ இன்னொன்று",
  },
  btnDoneServices: {
    en: "➡️ Continue",
    si: "➡️ ඉදිරියට",
    ta: "➡️ தொடரவும்",
  },
  btnClearServices: {
    en: "🔄 Reset",
    si: "🔄 අලුතින්",
    ta: "🔄 அழிக்க",
  },
  addMoreServicesPrompt: {
    en: "Please select an additional service from the list below:",
    si: "කරුණාකර එකතු කිරීමට තවත් සේවාවක් තෝරන්න:",
    ta: "சேர்க்க மற்றொரு சேவையைத் தேர்ந்தெடுக்கவும்:",
  },
  allServicesSelected: {
    en: "You have selected all available services! Let's choose your stylist and date:",
    si: "ඔබ දැනටමත් සියලුම සේවාවන් තෝරාගෙන ඇත. ඉදිරියට යමු:",
    ta: "நீங்கள் ஏற்கனவே அனைத்து சேவைகளையும் தேர்ந்தெடுத்துள்ளீர்கள். தொடரலாம்:",
  },
  consultationServiceNotice: {
    en: "⚠️ Consultation services must be booked individually and cannot be combined with other services.",
    si: "⚠️ උපදේශන (Consultation) සේවාවන් වෙනම වෙන්කළ යුතු අතර අනෙක් සේවාවන් සමඟ එකතු කළ නොහැක.",
    ta: "⚠️ ஆலோசனை சேவைகளை தனியாக மட்டுமே முன்பதிவு செய்ய முடியும்.",
  },
  selectStaff: {
    en: "Would you like to select a preferred stylist, or choose Any Available Stylist?",
    si: "ඔබ කැමති Stylist / Barber කෙනෙක් තෝරාගැනීමට පහතින් තෝරන්න:",
    ta: "தயவுசெய்து நீங்கள் விரும்பும் ஒப்பனையாளரைத் தேர்ந்தெடுக்கவும்:",
  },
  btnAnyStaff: {
    en: "✨ Any Stylist",
    si: "✨ ඕනෑම අයෙක්",
    ta: "✨ எவரும்",
  },
  staffButton: {
    en: "Choose Stylist",
    si: "Stylist තෝරන්න",
    ta: "ஒப்பனையாளர்",
  },
  selectDate: {
    en: "Great choice! Please select an appointment date:",
    si: "නියමයි! කරුණාකර ඔබ පැමිණීමට කැමති දිනයක් තෝරන්න:",
    ta: "சிறந்தது! தயவுசெய்து உங்கள் முன்பதிவு தேதியைத் தேர்ந்தெடுக்கவும்:",
  },
  btnToday: {
    en: "Today",
    si: "අද (Today)",
    ta: "இன்று (Today)",
  },
  btnTomorrow: {
    en: "Tomorrow",
    si: "හෙට (Tomorrow)",
    ta: "நாளை (Tomorrow)",
  },
  btnMoreDates: {
    en: "Other Dates",
    si: "වෙනත් දිනයක්",
    ta: "மற்ற தேதிகள்",
  },
  selectTime: {
    en: "Available times for *{date}*:\nPlease select a time below, or type your desired time (e.g. *5:00 PM*):",
    si: "*{date}* දිනට ඇති වේලාවන්:\nපහතින් වේලාවක් තෝරන්න, නැතහොත් ඔබ කැමති වේලාව මෙහි type කර එවන්න (උදා: *5:00 PM*):",
    ta: "*{date}* தேதிக்கான நேரங்கள்:\nகீழே ஒரு நேரத்தைத் தேர்ந்தெடுக்கவும் அல்லது உங்கள் நேரத்தை தட்டச்சு செய்யவும் (எ.கா. *5:00 PM*):",
  },
  timesButton: {
    en: "Select Time",
    si: "වේලාවක් තෝරන්න",
    ta: "நேரத்தைத் தேர்ந்தெடுக்க",
  },
  btnMorning: {
    en: "🌅 Morning",
    si: "🌅 උදෑසන",
    ta: "🌅 காலை",
  },
  btnAfternoon: {
    en: "☀️ Afternoon",
    si: "☀️ දහවල්",
    ta: "☀️ மதியம்",
  },
  btnEvening: {
    en: "🌆 Evening",
    si: "🌆 සවස",
    ta: "🌆 மாலை",
  },
  noSlots: {
    en: "Sorry, all remaining times for {date} are taken or the salon is closed. Please choose another date.",
    si: "සමාවෙන්න, {date} දිනට ඉතිරි වේලාවන් නොමැත හෝ සැලෝන් එක වසා ඇත. කරුණාකර වෙනත් දිනයක් තෝරන්න.",
    ta: "மன்னிக்கவும், {date} அன்று அனைத்து நேரங்களும் முடிந்துவிட்டன. வேறு தேதியைத் தேர்ந்தெடுக்கவும்.",
  },
  timePassedError: {
    en: "⚠️ That time has already passed today or is outside opening hours (9:00 AM – 7:00 PM). Please select an available time from below:",
    si: "⚠️ එම වේලාව අද දිනයේ දැනටමත් පසුවී ඇත හෝ විවෘත වේලාවෙන් (පෙ.ව. 9 – ප.ව. 7) බැහැරය. කරුණාකර පහතින් වේලාවක් තෝරන්න:",
    ta: "⚠️ அந்த நேரம் ஏற்கனவே முடிந்துவிட்டது. தயவுசெய்து கிடைக்கக்கூடிய நேரத்தைத் தேர்ந்தெடுக்கவும்:",
  },
  confirmPrompt: {
    en: "📋 *Please Confirm Your Appointment:*\n\n• *Service:* {service}\n• *Stylist:* {staff}\n• *Date:* {date}\n• *Time:* {time}\n• *Duration:* ~{duration} mins\n• *Price:* LKR {price}\n\nWould you like to confirm this booking?",
    si: "📋 *ඔබගේ Booking විස්තර තහවුරු කරන්න:*\n\n• *සේවාව:* {service}\n• *Stylist:* {staff}\n• *දිනය:* {date}\n• *වේලාව:* {time}\n• *ගතවන කාලය:* විනාඩි ~{duration}\n• *මිල:* LKR {price}\n\nමෙම වෙන්කිරීම තහවුරු කරනවාද?",
    ta: "📋 *உங்கள் முன்பதிவை உறுதிப்படுத்தவும்:*\n\n• *சேவை:* {service}\n• *ஒப்பனையாளர்:* {staff}\n• *தேதி:* {date}\n• *நேரம்:* {time}\n• *கால அளவு:* ~{duration} நிமிடங்கள்\n• *விலை:* LKR {price}\n\nஇதை உறுதிப்படுத்த விரும்புகிறீர்களா?",
  },
  btnConfirm: {
    en: "✅ Confirm",
    si: "✅ තහවුරු කරන්න",
    ta: "✅ உறுதி செய்",
  },
  btnCancel: {
    en: "❌ Cancel",
    si: "❌ අවලංගු කරන්න",
    ta: "❌ ரத்து செய்",
  },
  bookingSuccess: {
    en: "🎉 *Appointment Confirmed!*\n\n• *Appointment Number:* #{num}\n• *Service:* {service}\n• *Stylist:* {staff}\n• *Date:* {date}\n• *Time:* {time}\n• *Location:* Salon I Squad\n\n⏰ We will send you a reminder 1 hour before your appointment. Thank you for choosing Salon I Squad!",
    si: "🎉 *ඔබගේ Booking එක සාර්ථකයි!*\n\n• *අංකය:* #{num}\n• *සේවාව:* {service}\n• *Stylist:* {staff}\n• *දිනය:* {date}\n• *වේලාව:* {time}\n• *ස්ථානය:* Salon I Squad\n\n⏰ ඔබගේ වේලාවට පැයකට පෙර අපි WhatsApp පණිවිඩයකින් මතක් කරන්නෙමු. ස්තූතියි!",
    ta: "🎉 *முன்பதிவு வெற்றிகரமாக முடிந்தது!*\n\n• *முன்பதிவு எண்:* #{num}\n• *சேவை:* {service}\n• *ஒப்பனையாளர்:* {staff}\n• *தேதி:* {date}\n• *நேரம்:* {time}\n• *இடம்:* Salon I Squad\n\n⏰ உங்கள் நேரத்திற்கு 1 மணி நேரத்திற்கு முன் நினைவூட்டுவோம். நன்றி!",
  },
  bookingCancelled: {
    en: "Your booking was cancelled. Send *Hi* anytime to start again.",
    si: "ඔබගේ Booking එක අවලංගු කරන ලදී. නැවත අවශ්‍ය ඕනෑම වේලාවක *Hi* කියා එවන්න.",
    ta: "முன்பதிவு ரத்து செய்யப்பட்டது. மீண்டும் தொடங்க எப்போது வேண்டுமானாலும் *Hi* என அனுப்பவும்.",
  },
  salonInfo: {
    en: "💈 *Salon I Squad*\n\n📍 *Address:* Negombo Road, Kurunegala\n🕒 *Hours:* 9:00 AM – 7:00 PM (Daily)\n📞 *Contact:* +94 72 123 8400\n🌐 *Website:* https://salon-i-squad.vercel.app\n\nSend *Hi* anytime to book an appointment!",
    si: "💈 *Salon I Squad*\n\n📍 *ලිපිනය:* මීගමුව පාර, කුරුණෑගල\n🕒 *විවෘත වේලාවන්:* පෙ.ව. 9:00 – ප.ව. 7:00 (දිනපතා)\n📞 *දුරකථන:* +94 72 123 8400\n🌐 *Website:* https://salon-i-squad.vercel.app\n\nBooking එකක් දාන්න ඕනෑම වෙලාවක *Hi* කියන්න!",
    ta: "💈 *Salon I Squad*\n\n📍 *முகவரி:* நீர்கொழும்பு வீதி, குருநாகல்\n🕒 *நேரம்:* காலை 9:00 – மாலை 7:00\n📞 *தொடர்பு:* +94 72 123 8400\n🌐 *இணையதளம்:* https://salon-i-squad.vercel.app\n\nமுன்பதிவு செய்ய எப்போது வேண்டுமானாலும் *Hi* என அனுப்பவும்!",
  },
  btnMenu: {
    en: "🏠 Main Menu",
    si: "🏠 ප්‍රධාන මෙනුව",
    ta: "🏠 பிரதான மெனு",
  },
  selectBookingButton: {
    en: "Select Booking",
    si: "Booking තෝරන්න",
    ta: "பதிவைத் தேர்வுசெய்",
  },
  noActiveBookings: {
    en: "You have no upcoming appointments with this phone number. Tap below to book now:",
    si: "මෙම දුරකථන අංකයට ඉදිරි Bookings කිසිවක් නොමැත. අලුත් Booking එකක් දැමීමට පහතින් තෝරන්න:",
    ta: "இந்த எண்ணுக்கு வரவிருக்கும் முன்பதிவுகள் இல்லை. புதிய முன்பதிவு செய்ய கீழே தட்டவும்:",
  },
  myBookingsHeader: {
    en: "📋 *Your Upcoming Appointments:*\nSelect an appointment to Reschedule or Cancel:",
    si: "📋 *ඔබගේ ඉදිරි Bookings:*\nවෙනස් කිරීමට (Reschedule) හෝ අවලංගු කිරීමට (Cancel) Booking එකක් තෝරන්න:",
    ta: "📋 *உங்கள் வரவிருக்கும் முன்பதிவுகள்:*\nமாற்ற அல்லது ரத்து செய்ய ஒரு முன்பதிவைத் தேர்ந்தெடுக்கவும்:",
  },
  btnReschedule: {
    en: "📅 Reschedule",
    si: "📅 මාරු කරන්න",
    ta: "📅 மாற்ற",
  },
  btnCancelBooking: {
    en: "❌ Cancel",
    si: "❌ අවලංගු කරන්න",
    ta: "❌ ரத்து",
  },
  confirmCancelPrompt: {
    en: "⚠️ *Are you sure you want to cancel Appointment #{num}?*\n\n• Service: {service}\n• Date: {date} at {time}",
    si: "⚠️ *Appointment #{num} අවලංගු කිරීමට අවශ්‍ය බව තහවුරු කරන්න:*\n\n• සේවාව: {service}\n• දිනය: {date} ({time})",
    ta: "⚠️ *முன்பதிவு #{num} ரத்து செய்ய உறுதிப்படுத்துங்கள்:*\n\n• சேவை: {service}\n• தேதி: {date} ({time})",
  },
  confirmCancelBtn: {
    en: "Yes, Cancel",
    si: "ඔව්, අවලංගු කරන්න",
    ta: "ஆம், ரத்து செய்",
  },
  keepBookingBtn: {
    en: "Keep Booking",
    si: "නැත, තබාගන්න",
    ta: "இல்லை, வைக்கவும்",
  },
  cancelConfirmed: {
    en: "✅ Appointment #{num} ({service}) has been cancelled. Send *Hi* anytime to book again.",
    si: "✅ Appointment #{num} ({service}) සාර්ථකව අවලංගු කරන ලදී. නැවත Booking එකක් දාන්න ඕනෑම වෙලාවක *Hi* එවන්න.",
    ta: "✅ முன்பதிவு #{num} ({service}) வெற்றிகரமாக ரத்து செய்யப்பட்டது. மீண்டும் முன்பதிவு செய்ய *Hi* என அனுப்பவும்.",
  },
  rescheduleDatePrompt: {
    en: "Select a new date for Appointment #{num} ({service}):",
    si: "Appointment #{num} ({service}) සඳහා අලුත් දිනයක් තෝරන්න:",
    ta: "முன்பதிவு #{num} ({service})-க்கான புதிய தேதியைத் தேர்ந்தெடுக்கவும்:",
  },
  rescheduleSuccess: {
    en: "🎉 *Appointment Rescheduled Successfully!*\n\n• *New Appointment Number:* #{num}\n• *Service:* {service}\n• *New Date:* {date}\n• *New Time:* {time}\n• *Stylist:* {staff}\n\nWe look forward to seeing you at Salon I Squad!",
    si: "🎉 *ඔබගේ Booking එක සාර්ථකව මාරු කරන ලදී!*\n\n• *අලුත් අංකය:* #{num}\n• *සේවාව:* {service}\n• *අලුත් දිනය:* {date}\n• *අලුත් වේලාව:* {time}\n• *Stylist:* {staff}\n\nස්තූතියි!",
    ta: "🎉 *முன்பதிவு வெற்றிகரமாக மாற்றப்பட்டது!*\n\n• *புதிய எண்:* #{num}\n• *சேவை:* {service}\n• *புதிய தேதி:* {date}\n• *புதிய நேரம்:* {time}\n• *ஒப்பனையாளர்:* {staff}\n\nநன்றி!",
  },
  reminder1Hour: {
    en: "⏰ *Salon I Squad Appointment Reminder*\n\nHi! Your appointment is coming up in *1 hour*:\n\n• *Appointment:* #{num}\n• *Service:* {service}\n• *Stylist:* {staff}\n• *Time:* {time} today\n• *Location:* Salon I Squad\n\nPlease arrive on time. We look forward to seeing you!",
    si: "⏰ *Salon I Squad — මතක් කිරීම*\n\nඔබගේ Booking එකට තව ඇත්තේ *පැය 1ක්* පමණි:\n\n• *අංකය:* #{num}\n• *සේවාව:* {service}\n• *Stylist:* {staff}\n• *වේලාව:* අද {time}\n• *ස්ථානය:* Salon I Squad\n\nකරුණාකර නියමිත වේලාවට පැමිණෙන්න. ස්තූතියි!",
    ta: "⏰ *Salon I Squad — நினைவூட்டல்*\n\nவணக்கம்! உங்கள் முன்பதிவுக்கு இன்னும் *1 மணி நேரம்* மட்டுமே உள்ளது:\n\n• *எண்:* #{num}\n• *சேவை:* {service}\n• *ஒப்பனையாளர்:* {staff}\n• *நேரம்:* இன்று {time}\n• *இடம்:* Salon I Squad\n\nதயவுசெய்து நேரத்திற்கு வரவும். நன்றி!",
  },
  queueTurnAlert: {
    en: "🚶‍♂️ *Salon I Squad — Your Turn is Next!*\n\nAppointment #{num} ({service}):\nWe are ready for you soon! Please arrive at the salon within 15 minutes. Thank you!",
    si: "🚶‍♂️ *Salon I Squad — ඔබගේ වාරය පැමිණ ඇත!*\n\nAppointment #{num} ({service}) සඳහා ඔබගේ වාරය ළඟයි.\nකරුණාකර විනාඩි 15ක් ඇතුළත සැලෝන් එකට පැමිණෙන්න. ස්තූතියි!",
    ta: "🚶‍♂️ *Salon I Squad — உங்கள் முறை வந்துவிட்டது!*\n\nமுன்பதிவு #{num} ({service}) அடுத்ததாக வருகிறது.\nதயவுசெய்து 15 நிமிடங்களுக்குள் வரவும். நன்றி!",
  },
  feedbackPrompt: {
    en: "⭐ *How was your styling experience at Salon I Squad today?*\n\nThank you for visiting! Please rate your experience:",
    si: "⭐ *අද Salon I Squad හි ඔබගේ අත්දැකීම කෙසේද?*\n\nඅප වෙත පැමිණි ඔබට ස්තූතියි! කරුණාකර ඔබගේ අදහස ලබාදෙන්න:",
    ta: "⭐ *இன்று Salon I Squad-ல் உங்கள் அனுபவம் எப்படி இருந்தது?*\n\nவருகைக்கு நன்றி! தயவுசெய்து உங்கள் மதிப்பீட்டை வழங்கவும்:",
  },
  feedbackThankYou: {
    en: "🙏 Thank you for your feedback ({stars} ⭐)! Your review helps us continue delivering the best styling experience in Kurunegala.",
    si: "🙏 ඔබගේ වටිනා අදහසට ({stars} ⭐) බෙහෙවින් ස්තූතියි! ඔබට තවත් විශිෂ්ට සේවාවක් සැපයීමට මෙය අපට මහත් රුකුලක් වේ.",
    ta: "🙏 உங்கள் கருத்துக்கு நன்றி ({stars} ⭐)! சிறந்த சேவையைத் தொடர்ந்து வழங்க இது எங்களுக்கு உதவும்.",
  },
  expiredActionNotice: {
    en: "⚠️ This message has expired or was already completed. Please choose an option below:",
    si: "⚠️ මෙම පණිවිඩය දැනටමත් සම්පූර්ණ කර ඇත හෝ කල් ඉකුත් වී ඇත. කරුණාකර පහතින් තෝරන්න:",
    ta: "⚠️ இந்த செய்தி காலாவதியாகிவிட்டது அல்லது ஏற்கனவே முடிக்கப்பட்டது. கீழே தேர்ந்தெடுக்கவும்:",
  },
  noDraftServiceNotice: {
    en: "⚠️ Please select a service first to book an appointment:",
    si: "⚠️ Appointment එකක් වෙන්කිරීමට කරුණාකර පළමුව සේවාවක් තෝරන්න:",
    ta: "⚠️ முன்பதிவு செய்ய முதலில் ஒரு சேவையைத் தேர்ந்தெடுக்கவும்:",
  },
  datePastNotice: {
    en: "⚠️ That date has already passed. Please select an upcoming date from below:",
    si: "⚠️ එම දිනය දැනටමත් පසුවී ඇත. කරුණාකර පහතින් ඉදිරි දිනයක් තෝරන්න:",
    ta: "⚠️ அந்த தேதி ஏற்கனவே முடிந்துவிட்டது. தயவுசெய்து வரவிருக்கும் தேதியைத் தேர்ந்தெடுக்கவும்:",
  },
  bookingAlreadyHandledNotice: {
    en: "⚠️ This appointment has already been completed, cancelled, or has passed.",
    si: "⚠️ මෙම Appointment එක දැනටමත් අවසන් වී ඇත, අවලංගු කර ඇත හෝ කාලය ඉකුත් වී ඇත.",
    ta: "⚠️ இந்த முன்பதிவு ஏற்கனவே முடிந்துவிட்டது அல்லது ரத்து செய்யப்பட்டுவிட்டது.",
  },
};

export function t(key: keyof typeof I18N, lang: SupportedLanguage, replacements?: Record<string, string | number>): string {
  const langEntry = I18N[key];
  if (!langEntry) return "";
  let text = langEntry[lang] || langEntry.en;
  if (replacements) {
    for (const [k, v] of Object.entries(replacements)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return text;
}
