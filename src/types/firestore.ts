export type UserRole = "client" | "admin" | "master";

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type ConsultationStatus = "not_required" | "pending" | "completed";

export type UserProfile = {
  uid: string;
  firstName: string;
  lastName: string;
  email?: string;
  /** Canonical contact number (also mirrored to `mobile` for older docs). */
  phoneNumber?: string;
  mobile: string;
  gender?: Gender;
  role: UserRole;
  isGuest: boolean;
  /** FCM web push device token (optional). */
  fcmToken?: string;
  createdAt: string;
  updatedAt: string;
};

export type Service = {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  requiresConsultation: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Booking = {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  consultationStatus: ConsultationStatus;
  consultationBookingId?: string;
  customerName: string;
  customerMobile: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type SalonSettings = {
  bufferMinutes: number;
  businessHours: {
    [day: string]: { open: string; close: string; isClosed: boolean };
  };
  rescheduleCutoffHours: number;
  updatedAt: string;
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
