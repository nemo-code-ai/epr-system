"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LanguageToggle from "@/components/LanguageToggle";
import { useApp } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const app = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (app.status === "ready" || app.status === "needs_business") router.replace("/");
  }, [app.status, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (res.error) setMsg(res.error.message);
    else if (mode === "up" && !res.data.session) setMsg(app.t("auth.checkEmail"));
  }

  return (
    <div className="auth-layout">
      <header className="top">
        <strong>EPR System</strong>
        <LanguageToggle locale={app.locale} onChange={app.setLocale} />
      </header>
      <main className="auth-main">
        <section className="auth-card">
          <h1>{mode === "in" ? app.t("auth.signIn") : app.t("auth.createAccount")}</h1>
          <form onSubmit={submit}>
            <label htmlFor="login-email">{app.t("auth.email")}</label>
            <input id="login-email" type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
            <label htmlFor="login-password">{app.t("auth.password")}</label>
            <input id="login-password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"}
              minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            {msg && <p className="err" role="status">{msg}</p>}
            <button className="btn" disabled={busy}>
              {mode === "in" ? app.t("auth.signIn") : app.t("auth.createAccount")}
            </button>
          </form>
          <p className="auth-switch">
            <button className="link" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }}>
              {mode === "in" ? app.t("auth.toCreate") : app.t("auth.toSignIn")}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}
