import { deleteApp, getApps, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  updateProfile,
} from "firebase/auth";
import { firebaseConfig } from "@/lib/firebase";
import { createStaffUserProfile } from "@/lib/users";

/**
 * Creates a staff Auth user on a temporary secondary Firebase app
 * so the master admin stays signed in on the primary app.
 */
export async function createStaffAccount(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const displayName = `${input.firstName} ${input.lastName}`.trim();

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const appName = `staff-creator-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password,
    );

    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }

    const uid = credential.user.uid;
    await signOut(secondaryAuth);

    const profile = await createStaffUserProfile({
      uid,
      email,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    return profile;
  } finally {
    const apps = getApps();
    if (apps.some((app) => app.name === appName)) {
      await deleteApp(secondaryApp);
    }
  }
}
