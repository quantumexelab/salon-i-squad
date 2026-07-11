"use client";

import {
  createContext,
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
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isFirebaseConfigured();

  async function loadProfile(firebaseUser: User | null) {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }

    try {
      const next = await getUserProfile(firebaseUser.uid);
      setProfile(next);
    } catch {
      setProfile(null);
    }
  }

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
  }, [isConfigured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      role: profile?.role ?? null,
      isStaff: isStaffRole(profile?.role),
      isMaster: isMasterRole(profile?.role),
      loading,
      isConfigured,
      refreshProfile: async () => {
        await loadProfile(user);
      },
    }),
    [user, profile, loading, isConfigured],
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
