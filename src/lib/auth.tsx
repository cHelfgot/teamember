import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "member";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  fullName: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        setRole(null);
        setFullName("");
      } else {
        // fetch role + profile (deferred to avoid blocking)
        setTimeout(async () => {
          const [{ data: roles }, { data: profile }] = await Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", s.user.id).maybeSingle(),
            supabase.from("profiles").select("full_name").eq("id", s.user.id).maybeSingle(),
          ]);
          setRole((roles?.role as AppRole) ?? "member");
          setFullName(profile?.full_name ?? s.user.email ?? "");
        }, 0);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, fullName, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
