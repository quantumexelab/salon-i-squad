export type UserRole = "client" | "admin" | "master";

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

/** Gender captured on a booking (client-facing). */
export type BookingGender = "male" | "female";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type ConsultationStatus = "not_required" | "pending" | "completed";

export type PaymentMethod = "cash" | "card";

export type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  mobile: string;
  whatsappNumber?: string;
  gender?: Gender;
  role: UserRole;
  isGuest: boolean;
  /** VIP member — admin promoted loyal client. */
  isMember?: boolean;
  memberSince?: string;
  memberNotes?: string;
  hairType?: string;
  conditions?: string;
  registrationComplete?: boolean;
  fcmToken?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type Service = {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  imageUrl?: string;
  requiresConsultation: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Runtime booking shape (matches Firestore docs). */
export type Booking = {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  duration: number;
  price: number;
  selectedDate: string;
  selectedTime: string;
  dateKey?: string;
  appointmentNumber?: number;
  phoneNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerGender?: BookingGender;
  paymentMethod?: PaymentMethod;
  notes?: string;
  isConsultation?: boolean;
  googleCalendarEventId?: string;
  status: BookingStatus | string;
  cancelReason?: string;
  cancelledBy?: "client" | "admin" | "system";
  adminNotes?: string;
  hairType?: string;
  conditions?: string;
  checkedInAt?: string;
  noShowDeadlineAt?: string;
  reminderSentAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type SalonSettings = {
  bufferMinutes: number;
  businessHours: {
    [day: string]: { open: string; close: string; isClosed: boolean };
  };
  rescheduleCutoffHours: number;
  updatedAt: string;
};

export type SalonPolicySettings = {
  rescheduleCutoffHours: number;
  updatedAt?: string;
};

export type StaffProfile = {
  id: string;
  name: string;
  role: string;
  photoUrl?: string;
  qualifications: string[];
  specialties: string[];
  yearsExperience?: number;
  bio?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  bookingId?: string;
  read: boolean;
  createdAt: string;
};

export type DayClose = {
  id: string;
  date: string;
  expectedIncome: number;
  realizedIncome: number;
  cashTotal: number;
  cardTotal: number;
  appointmentCount: number;
  closedAt: string;
  closedBy: string;
};
