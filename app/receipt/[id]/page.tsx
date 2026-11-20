"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Shell from "@/components/Shell";
import { useApp } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase";

export default function Receipt() {
  return <Shell><ReceiptInner /></Shell>;
}

function ReceiptInner() {
  const { id } = useParams<{ id: string }>();
  const { t, money, business, locale } = useApp();
  const [s, setS] = useState<any>(null);

  useEffect(() => {
    supabase.from("sales").select("*, sale_items(*), profiles(full_name)").eq("id", id).single()
      .then(({ data }) => setS(data));
  }, [id]);

  if (!s) return <p className="center">{t("common.loading")}</p>;

  const text = [
    business?.name,
    t("receipt.number", { no: s.receipt_no }),
    new Date(s.created_at).toLocaleString(locale),
    ...s.sale_items.map((i: any) => `${i.quantity} × ${i.item_name} — ${money(i.sold_price * i.quantity)}`),
    `${t("receipt.total")}: ${money(s.total)}`,
  ].join("\n");

  const share = () => {
    if (navigator.share) navigator.share({ title: t("receipt.title"), text }).catch(() => {});
    else navigator.clipboard?.writeText(text);
  };

  return (
    <>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>{business?.name}</h1>
        <div className="muted">{t("receipt.number", { no: s.receipt_no })} · {new Date(s.created_at).toLocaleString(locale)}</div>
        {s.status === "voided" && <p className="flag">{t("history.voided")}</p>}
        {s.sale_items.map((i: any) => (
          <div className="row" key={i.id}>
            <span>{i.quantity} × {i.item_name}</span>
            <strong>{money(i.sold_price * i.quantity)}</strong>
          </div>
        ))}
        <div className="row"><strong>{t("receipt.total")}</strong><strong className="big" style={{ fontSize: 24 }}>{money(s.total)}</strong></div>
      </div>
      <div className="seg noprint">
        <button className="btn" onClick={share}>{t("receipt.share")}</button>
        <button className="btn ghost" onClick={() => window.print()}>{t("receipt.print")}</button>
      </div>
    </>
  );
}
