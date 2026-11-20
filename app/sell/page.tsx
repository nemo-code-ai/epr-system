"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { useApp } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase";
import { Item, loadVariants } from "@/lib/queries";

type Line = { id: string; name: string; qty: number; price: string; max: number };

export default function Sell() {
  return <Shell><SellInner /></Shell>;
}

function SellInner() {
  const { t, money, storeId } = useApp();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [pay, setPay] = useState<"cash" | "mobile_money" | "other">("cash");
  const [customer, setCustomer] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (storeId) loadVariants(storeId).then(setItems); }, [storeId]);

  const matches = items
    .filter((i) => i.quantity > 0 && i.name.toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 8);

  const add = (i: Item) => {
    setQ("");
    setLines((ls) => {
      const found = ls.find((l) => l.id === i.id);
      if (found) return ls.map((l) => (l.id === i.id ? { ...l, qty: Math.min(l.qty + 1, l.max) } : l));
      return [...ls, { id: i.id, name: i.name, qty: 1, price: String(i.list_price), max: i.quantity }];
    });
  };
  const patch = (id: string, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const total = lines.reduce((s, l) => s + l.qty * (Number(l.price) || 0), 0);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!storeId || lines.length === 0) return;
    setBusy(true); setErr("");
    const { data, error } = await supabase.rpc("create_sale", {
      p_store_id: storeId,
      p_payment_method: pay,
      p_customer_name: customer.trim() || null,
      p_customer_phone: null,
      p_items: lines.map((l) => ({ variant_id: l.id, quantity: l.qty, sold_price: Math.round(Number(l.price) || 0) })),
    });
    setBusy(false);
    if (error) {
      const m = error.message.match(/not_enough_stock: (.*)/);
      setErr(m ? t("errors.notEnoughStock", { item: m[1] }) : t("errors.generic"));
      return;
    }
    router.push(`/receipt/${data}`);
  }

  return (
    <form onSubmit={save}>
      <h1>{t("sell.title")}</h1>
      <input placeholder={t("sell.searchItem")} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card" style={{ marginTop: 8 }}>
        {matches.length === 0 && <span className="muted">{t("sell.noItems")}</span>}
        {matches.map((i) => (
          <div className="row" key={i.id} onClick={() => add(i)} style={{ cursor: "pointer" }}>
            <span>{i.name}</span>
            <span className="muted">{t("stock.inStock", { count: i.quantity })}</span>
          </div>
        ))}
      </div>

      {lines.map((l) => (
        <div className="card" key={l.id}>
          <div className="row" style={{ borderBottom: 0 }}>
            <strong>{l.name}</strong>
            <button type="button" className="link" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}>
              {t("sell.remove")}
            </button>
          </div>
          <label>{t("sell.quantity")}</label>
          <div className="qty">
            <button type="button" onClick={() => patch(l.id, { qty: Math.max(1, l.qty - 1) })}>−</button>
            <strong style={{ minWidth: 32, textAlign: "center" }}>{l.qty}</strong>
            <button type="button" onClick={() => patch(l.id, { qty: Math.min(l.max, l.qty + 1) })}>+</button>
          </div>
          <label>{t("sell.price")}</label>
          <input inputMode="numeric" value={l.price} onChange={(e) => patch(l.id, { price: e.target.value.replace(/\D/g, "") })} required />
        </div>
      ))}

      {lines.length > 0 && (
        <>
          <label>{t("sell.payment")}</label>
          <div className="seg">
            {(["cash", "mobile_money", "other"] as const).map((m) => (
              <button type="button" key={m} className={`btn small ${pay === m ? "" : "ghost"}`} onClick={() => setPay(m)}>
                {t(`sell.${m === "mobile_money" ? "mobileMoney" : m}`)}
              </button>
            ))}
          </div>
          <label>{t("sell.customerOptional")}</label>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} />
          <div className="card" style={{ marginTop: 16 }}>
            <div className="muted">{t("sell.total")}</div>
            <div className="big">{money(total)}</div>
          </div>
          {err && <p className="err">{err}</p>}
          <button className="btn" disabled={busy}>{t("sell.done")}</button>
        </>
      )}
    </form>
  );
}
