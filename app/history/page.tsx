"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { useApp } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase";

export default function History() {
  return <Shell><HistoryInner /></Shell>;
}

function HistoryInner() {
  const { t, money, storeId, profile, locale } = useApp();
  const isOwner = profile?.role === "owner";
  const [sales, setSales] = useState<any[] | null>(null);

  const reload = () => {
    if (!storeId) return;
    supabase.from("sales")
      .select("id,receipt_no,total,status,created_at,customer_name,profiles(full_name),sale_items(below_min)")
      .eq("store_id", storeId).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setSales(data ?? []));
  };
  useEffect(reload, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function cancel(id: string) {
    if (!confirm(t("history.confirmCancel"))) return;
    await supabase.rpc("void_sale", { p_sale_id: id });
    reload();
  }

  if (!sales) return <p className="center">{t("common.loading")}</p>;

  return (
    <>
      <h1>{t("history.title")}</h1>
      <div className="card">
        {sales.map((s) => (
          <div className="row" key={s.id} style={{ flexWrap: "wrap" }}>
            <Link href={`/receipt/${s.id}`} className="rowlink" style={{ flex: 1 }}>
              <div>#{s.receipt_no} · {new Date(s.created_at).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
              <div className="muted">{t("history.soldBy", { name: s.profiles?.full_name ?? "" })}</div>
              {s.sale_items?.some((i: any) => i.below_min) && <div className="flag">{t("history.belowMin")}</div>}
            </Link>
            <strong style={s.status === "voided" ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>{money(s.total)}</strong>
            {s.status === "voided" && <span className="flag">{t("history.voided")}</span>}
            {isOwner && s.status === "completed" && (
              <button className="link" onClick={() => cancel(s.id)}>{t("history.cancelSale")}</button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
