"use client";

import { FormEvent, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { useApp } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase";

export default function Staff() {
  return <Shell ownerOnly><StaffInner /></Shell>;
}

function StaffInner() {
  const { t, business, locale } = useApp();
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => {
    if (!business) return;
    supabase.from("profiles").select("id,full_name,active").eq("business_id", business.id).eq("role", "salesperson")
      .then(({ data }) => setList(data ?? []));
  };
  useEffect(reload, [business]); // eslint-disable-line react-hooks/exhaustive-deps

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ full_name: name, email, password, language: locale }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(body.error ?? t("errors.generic")); return; }
    setName(""); setEmail(""); setPassword(""); setMsg(t("staff.created"));
    reload();
  }

  return (
    <>
      <h1>{t("staff.title")}</h1>
      <div className="card">
        {list.length === 0 && <span className="muted">{t("staff.empty")}</span>}
        {list.map((p) => <div className="row" key={p.id}><span>{p.full_name}</span></div>)}
      </div>
      <form className="card" onSubmit={create}>
        <strong>{t("staff.add")}</strong>
        <label>{t("staff.name")}</label><input value={name} onChange={(e) => setName(e.target.value)} required />
        <label>{t("staff.email")}</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>{t("staff.password")}</label><input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
        {msg && <p className="err">{msg}</p>}
        <button className="btn" disabled={busy}>{t("staff.create")}</button>
      </form>
    </>
  );
}
