"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  getFirebaseAuth,
  initFirebase,
  isFirebaseConfigured,
} from "@/lib/firebase";
import { isMasterRole, isStaffRole } from "@/lib/roles";
import { getUserProfile } from "@/lib/users";
import type { UserProfile, UserRole } from "@/types/firestore";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isStaff: boolean;
  isMaster: boolean;
  loading: boolean;
  isConfigured: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const GUEST_PHONE_KEY = "salon_guest_phone";

export function rememberGuestPhone(phone: string) {
  try {
    const value = phone.trim();
    if (value) sessionStorage.setItem(GUEST_PHONE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function readRememberedGuestPhone(): string {
  try {
    return sessionStorage.getItem(GUEST_PHONE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function clearRememberedGuestPhone() {
  try {
    sessionStorage.removeItem(GUEST_PHONE_KEY);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isFirebaseConfigured();

  const loadProfile = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setProfile(null);
      return null;
    }

    try {
      let next = await getUserProfile(firebaseUser.uid);
      // Guest profile may be written just after auth — brief retry.
      if (!next) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        next = await getUserProfile(firebaseUser.uid);
      }
      setProfile(next);
      return next;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    initFirebase();
    const current = getFirebaseAuth().currentUser;
    return loadProfile(current);
  }, [loadProfile]);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    initFirebase();
    const auth = getFirebaseAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(true);
      await loadProfile(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, [isConfigured, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      role: profile?.role ?? null,
      isStaff: isStaffRole(profile?.role),
      isMaster: isMasterRole(profile?.role),
      loading,
      isConfigured,
      refreshProfile,
    }),
    [user, profile, loading, isConfigured, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
