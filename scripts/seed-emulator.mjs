import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-salon-i-squad.firebaseapp.com",
  projectId: "demo-salon-i-squad",
  storageBucket: "demo-salon-i-squad.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const now = new Date().toISOString();

const services = [
  {
    id: "haircut",
    name: "Haircut",
    description: "Classic haircut and styling",
    durationMinutes: 30,
    price: 1500,
    requiresConsultation: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "beard-styling",
    name: "Beard Styling",
    description: "Beard trim and shape",
    durationMinutes: 15,
    price: 800,
    requiresConsultation: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "hair-coloring",
    name: "Hair Coloring",
    description: "Full hair color service",
    durationMinutes: 90,
    price: 4500,
    requiresConsultation: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

const salonSettings = {
  bufferMinutes: 10,
  businessHours: {
    monday: { open: "09:00", close: "19:00", isClosed: false },
    tuesday: { open: "09:00", close: "19:00", isClosed: false },
    wednesday: { open: "09:00", close: "19:00", isClosed: false },
    thursday: { open: "09:00", close: "19:00", isClosed: false },
    friday: { open: "09:00", close: "19:00", isClosed: false },
    saturday: { open: "09:00", close: "17:00", isClosed: false },
    sunday: { open: "09:00", close: "17:00", isClosed: true },
  },
  rescheduleCutoffHours: 12,
  updatedAt: now,
};

for (const service of services) {
  await setDoc(doc(db, "services", service.id), service);
}

await setDoc(doc(db, "salonSettings", "default"), salonSettings);

console.log("Emulator seed complete:");
console.log(`- ${services.length} services`);
console.log("- salon settings (default)");
