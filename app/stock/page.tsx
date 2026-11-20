"use client";

import { FormEvent, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { useApp } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase";
import { Item, loadVariants } from "@/lib/queries";

export default function Stock() {
  return <Shell><StockInner /></Shell>;
}

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function StockInner() {
  const { t, money, storeId, business, profile } = useApp();
  const isOwner = profile?.role === "owner";
  const [items, setItems] = useState<Item[]>([]);
  const [add, setAdd] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ name: "", price: "", min: "", cost: "", sizes: "", colors: "", qty: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => { if (storeId) loadVariants(storeId).then(setItems); };
  useEffect(reload, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function restock(id: string) {
    const n = Number(add[id]);
    if (!storeId || !(n > 0)) return;
    const { error } = await supabase.rpc("restock", { p_store_id: storeId, p_variant_id: id, p_quantity: n });
    if (error) { setErr(t("errors.generic")); return; }
    setAdd((a) => ({ ...a, [id]: "" }));
    reload();
  }

  async function createProduct(e: FormEvent) {
    e.preventDefault();
    if (!storeId || !business) return;
    setBusy(true); setErr("");
    try {
      const { data: p, error } = await supabase.from("products")
        .insert({ business_id: business.id, name: f.name.trim(), list_price: Number(f.price), min_price: f.min ? Number(f.min) : null })
        .select("id").single();
      if (error || !p) throw error;
      if (f.cost) {
        const { error: ce } = await supabase.from("product_costs")
          .insert({ product_id: p.id, business_id: business.id, cost_price: Number(f.cost) });
        if (ce) throw ce;
      }
      const sizes: (string | null)[] = split(f.sizes).length ? split(f.sizes) : [null];
      const colors: (string | null)[] = split(f.colors).length ? split(f.colors) : [null];
      const rows = sizes.flatMap((size) => colors.map((color) => ({ product_id: p.id, business_id: business.id, size, color })));
      const { data: vs, error: ve } = await supabase.from("variants").insert(rows).select("id");
      if (ve) throw ve;
      const qty = Number(f.qty);
      if (qty > 0) {
        await Promise.all((vs ?? []).map((v) =>
          supabase.rpc("restock", { p_store_id: storeId, p_variant_id: v.id, p_quantity: qty })));
      }
      setF({ name: "", price: "", min: "", cost: "", sizes: "", colors: "", qty: "" });
      setShowForm(false);
      reload();
    } catch {
      setErr(t("errors.generic"));
    }
    setBusy(false);
  }

  const num = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value.replace(/\D/g, "") });
  const txt = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <h1>{t("stock.title")}</h1>
      {isOwner && !showForm && (
        <button className="btn" style={{ marginTop: 0, marginBottom: 12 }} onClick={() => setShowForm(true)}>{t("stock.addProduct")}</button>
      )}

      {showForm && (
        <form className="card" onSubmit={createProduct}>
          <strong>{t("product.title")}</strong>
          <label>{t("product.name")}</label><input value={f.name} onChange={txt("name")} required />
          <label>{t("product.listPrice")}</label><input inputMode="numeric" value={f.price} onChange={num("price")} required />
          <label>{t("product.minPrice")}</label><input inputMode="numeric" value={f.min} onChange={num("min")} />
          <label>{t("product.costPrice")}</label><input inputMode="numeric" value={f.cost} onChange={num("cost")} />
          <label>{t("product.sizes")}</label><input value={f.sizes} onChange={txt("sizes")} placeholder="S, M, L" />
          <label>{t("product.colors")}</label><input value={f.colors} onChange={txt("colors")} placeholder="Blue, Black" />
          <label>{t("product.qty")}</label><input inputMode="numeric" value={f.qty} onChange={num("qty")} />
          {err && <p className="err">{err}</p>}
          <button className="btn" disabled={busy}>{t("product.save")}</button>
          <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</button>
        </form>
      )}

      <div className="card">
        {items.map((i) => (
          <div className="row" key={i.id} style={{ flexWrap: "wrap" }}>
            <span>
              {i.name}
              <div className="muted">{money(i.list_price)}</div>
            </span>
            <strong>{i.quantity === 0 ? t("stock.outOfStock") : t("stock.inStock", { count: i.quantity })}</strong>
            {isOwner && (
              <div style={{ display: "flex", gap: 8, width: "100%" }}>
                <input inputMode="numeric" placeholder="+" value={add[i.id] ?? ""}
                  onChange={(e) => setAdd({ ...add, [i.id]: e.target.value.replace(/\D/g, "") })} />
                <button type="button" className="btn small" onClick={() => restock(i.id)}>{t("stock.addStock")}</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {!showForm && err && <p className="err">{err}</p>}
    </>
  );
}
