"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

export type Locale = "en" | "fr";
type Profile = {
  id: string; business_id: string; store_id: string | null;
  role: "owner" | "salesperson"; full_name: string; language: Locale | null;
};
type Status = "loading" | "signed_out" | "needs_business" | "ready" | "error";
type Vars = Record<string, string | number>;

type Ctx = {
  status: Status;
  loadError: string | null;
  profile: Profile | null;
  business: { id: string; name: string } | null;
  storeId: string | null;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Vars) => string;
  money: (n: number) => string;
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
};

const dict: Record<Locale, any> = { en, fr };
const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used inside AppProvider");
  return c;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Ctx["business"]>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [locale, setLocaleState] = useState<Locale>("fr");

  const load = useCallback(async () => {
    setLoadError(null);
    setStatus("loading");

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Unable to read the Supabase session:", sessionError);
      setLoadError("We couldn't read your sign-in session. Please sign in again.");
      setStatus("error");
      return;
    }
    if (!session) {
      setProfile(null);
      setBusiness(null);
      setStoreId(null);
      setStatus("signed_out");
      return;
    }

    // Important: a failed SELECT is not the same as a missing profile.
    // Treating permission errors as a new account makes the app call
    // create_business for a user who already owns a shop.
    const { data: p, error: profileError } = await supabase
      .from("profiles")
      .select("id,business_id,store_id,role,full_name,language,active")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Unable to load the signed-in user's profile:", profileError);
      setLoadError("We couldn't load your shop profile. Check your connection and try again.");
      setStatus("error");
      return;
    }

    if (!p) {
      setProfile(null);
      setBusiness(null);
      setStoreId(null);
      setStatus("needs_business");
      return;
    }

    if (!p.active) {
      setLoadError("This account is inactive. Please contact your shop owner.");
      setStatus("error");
      return;
    }

    const [{ data: b, error: businessError }, { data: stores, error: storesError }] = await Promise.all([
      supabase.from("businesses").select("id,name").eq("id", p.business_id).single(),
      supabase.from("stores").select("id").eq("business_id", p.business_id).order("created_at").limit(1),
    ]);

    if (businessError || storesError || !b) {
      console.error("Unable to load the shop or its stores:", businessError ?? storesError);
      setLoadError("We found your account but couldn't load its shop details. Please try again.");
      setStatus("error");
      return;
    }

    const selectedStoreId = p.store_id ?? stores?.[0]?.id ?? null;
    if (!selectedStoreId) {
      setLoadError("Your shop doesn't have a store configured. Please contact support.");
      setStatus("error");
      return;
    }

    setProfile(p as Profile);
    setBusiness(b);
    setStoreId(selectedStoreId);
    if (p.language) setLocaleState(p.language);
    setStatus("ready");
  }, []);

  useEffect(() => {
    const m = document.cookie.match(/lang=(en|fr)/);
    if (m) setLocaleState(m[1] as Locale);
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => subscription.unsubscribe();
  }, [load]);

  const setLocale = async (l: Locale) => {
    setLocaleState(l);
    document.cookie = `lang=${l}; path=/; max-age=31536000`;
    if (profile) {
      const { error } = await supabase.from("profiles").update({ language: l }).eq("id", profile.id);
      if (error) console.error("Unable to save language preference:", error);
    }
  };

  const t = (key: string, vars?: Vars) => {
    const raw = key.split(".").reduce((o: any, k) => o?.[k], dict[locale]);
    if (typeof raw !== "string") return key;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ""));
  };

  // XOF has no decimals: whole numbers only.
  const money = (n: number) =>
    `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 0 }).format(n)} ${t("currency")}`;

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AppCtx.Provider value={{ status, loadError, profile, business, storeId, locale, setLocale, t, money, reload: load, signOut }}>
      {children}
    </AppCtx.Provider>
  );
}
