"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import LanguageToggle from "@/components/LanguageToggle";
import { useApp } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase";

export default function Shell({ children, ownerOnly = false }: { children: ReactNode; ownerOnly?: boolean }) {
  const app = useApp();
  const router = useRouter();
  const path = usePathname();
  const isOwner = app.profile?.role === "owner";

  useEffect(() => {
    if (app.status === "signed_out") router.replace("/login");
    if (app.status === "ready" && ownerOnly && !isOwner) router.replace("/sell");
  }, [app.status, ownerOnly, isOwner, router]);

  if (app.status === "loading" || app.status === "signed_out") return <div className="loading-screen" role="status">…</div>;
  if (app.status === "error") return <AccountLoadError message={app.loadError} onRetry={app.reload} onSignOut={app.signOut} />;
  if (app.status === "needs_business") return <Onboarding />;
  if (ownerOnly && !isOwner) return <div className="loading-screen" role="status">…</div>;

  const tabs = isOwner
    ? [["/", "nav.home"], ["/sell", "nav.sell"], ["/stock", "nav.stock"], ["/history", "nav.history"], ["/staff", "nav.staff"]]
    : [["/sell", "nav.sell"], ["/history", "nav.history"]];

  return (
    <>
      <header className="top noprint">
        <strong>{app.business?.name ?? "EPR System"}</strong>
        <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LanguageToggle locale={app.locale} onChange={app.setLocale} />
          <button className="link" onClick={app.signOut}>{app.t("auth.signOut")}</button>
        </span>
      </header>
      <main className="app-main"><div className="app-page">{children}</div></main>
      <nav className="tabs noprint">
        {tabs.map(([href, key]) => (
          <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{app.t(key)}</Link>
        ))}
      </nav>
    </>
  );
}

function AccountLoadError({ message, onRetry, onSignOut }: { message: string | null; onRetry: () => Promise<void>; onSignOut: () => Promise<void> }) {
  const app = useApp();
  const [busy, setBusy] = useState(false);
  async function retry() {
    setBusy(true);
    await onRetry();
    setBusy(false);
  }
  return (
    <div className="auth-layout">
      <header className="top"><strong>EPR System</strong><LanguageToggle locale={app.locale} onChange={app.setLocale} /></header>
      <main className="auth-main">
        <section className="auth-card" role="alert">
          <h1>{app.t("auth.loadErrorTitle")}</h1>
          <p>{message ?? app.t("auth.loadErrorText")}</p>
          <button className="btn" disabled={busy} onClick={retry}>{busy ? app.t("common.loading") : app.t("auth.tryAgain")}</button>
          <button className="btn ghost" onClick={onSignOut}>{app.t("auth.signOut")}</button>
        </section>
      </main>
    </div>
  );
}

// First login with no shop yet: creates the business, its single store and the owner profile.
function Onboarding() {
  const app = useApp();
  const [biz, setBiz] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const { error } = await supabase.rpc("create_business", {
      p_business_name: biz, p_owner_name: name, p_language: app.locale,
    });
    if (error?.message?.includes("already_has_business")) {
      // Another tab/session may have completed onboarding. Load that existing profile.
      await app.reload();
      setBusy(false);
      return;
    }
    setBusy(false);
    if (error) setErr(app.t("auth.createShopError")); else await app.reload();
  }

  return (
    <div className="auth-layout">
      <header className="top">
        <strong>EPR System</strong>
        <LanguageToggle locale={app.locale} onChange={app.setLocale} />
      </header>
      <main className="auth-main">
        <section className="auth-card">
          <h1>{app.t("auth.welcome")}</h1>
          <form onSubmit={go}>
            <label htmlFor="business-name">{app.t("auth.businessName")}</label>
            <input id="business-name" value={biz} onChange={(e) => setBiz(e.target.value)} required />
            <label htmlFor="owner-name">{app.t("auth.yourName")}</label>
            <input id="owner-name" value={name} onChange={(e) => setName(e.target.value)} required />
            {err && <p className="err" role="status">{err}</p>}
            <button className="btn" disabled={busy}>{app.t("auth.start")}</button>
          </form>
        </section>
      </main>
    </div>
  );
}
