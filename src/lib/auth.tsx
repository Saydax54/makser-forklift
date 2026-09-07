import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "technician" | null;

type AuthValue = {
  user: User | null;
  session: Session | null;
  role: Role;
  technicianId: string | null;
  fullName: string;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  user: null,
  session: null,
  role: null,
  technicianId: null,
  fullName: "",
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const [{ data: roles }, { data: tech }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("technicians").select("id, full_name").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    ]);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    setRole(isAdmin ? "admin" : (roles ?? []).length ? "technician" : null);
    setTechnicianId(tech?.id ?? null);
    setFullName(profile?.full_name ?? tech?.full_name ?? "");
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) await loadProfile(data.session.user.id);
    else {
      setRole(null);
      setTechnicianId(null);
      setFullName("");
    }
    setLoading(false);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_OUT") {
        setRole(null);
        setTechnicianId(null);
        setFullName("");
        setLoading(false);
        return;
      }
      if (newSession?.user) {
        setTimeout(() => {
          void loadProfile(newSession.user.id).then(() => setLoading(false));
        }, 0);
      }
    });
    void refresh();
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        role,
        technicianId,
        fullName,
        loading,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
