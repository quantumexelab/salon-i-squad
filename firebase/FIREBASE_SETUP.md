# Firebase setup (Salon I Squad)

## Blaze plan (required for)

- **Cloud Storage** — service image uploads
- **Cloud Functions** — push notifications, reminders, no-show auto-cancel

Upgrade: [Firebase Console → Usage and billing](https://console.firebase.google.com/project/salon-i-squad/usage)

Small salon usage typically stays within free tier limits.

## Enable Storage

1. Console → **Storage** → **Get started**
2. Deploy rules: `npx firebase-tools deploy --only storage`

## Deploy Firestore rules & indexes

```powershell
npx firebase-tools deploy --only firestore
```

## Deploy Cloud Functions

```powershell
cd functions
npm install
npm run build
cd ..
npx firebase-tools deploy --only functions
```

## FCM

Set `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in `.env.local` (Firebase Console → Project settings → Cloud Messaging → Web push certificates).
