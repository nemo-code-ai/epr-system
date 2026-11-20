"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import { useApp } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase";

export default function Home() {
  return <Shell ownerOnly><HomeInner /></Shell>;
}

function HomeInner() {
  const { t, money, storeId, locale } = useApp();
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    if (!storeId) return;
    (async () => {
      const [home, low, recent, prod] = await Promise.all([
        supabase.rpc("owner_home", { p_store_id: storeId }),
        supabase.from("stock").select("quantity, variants(size,color,products(name))")
          .eq("store_id", storeId).lte("quantity", 2).order("quantity").limit(8),
        supabase.from("sales").select("id,total,created_at,status,profiles(full_name),sale_items(below_min)")
          .eq("store_id", storeId).order("created_at", { ascending: false }).limit(5),
        supabase.from("products").select("id", { count: "exact", head: true }),
      ]);
      setD({ home: home.data, low: low.data ?? [], recent: recent.data ?? [], products: prod.count ?? 0 });
    })();
  }, [storeId]);

  if (!d) return <p className="center">{t("common.loading")}</p>;

  if (d.products === 0) {
    return (
      <div className="card center">
        <h1>{t("home.emptyTitle")}</h1>
        <p>{t("home.emptyText")}</p>
        <Link href="/stock"><button className="btn">{t("stock.addProduct")}</button></Link>
      </div>
    );
  }

  const label = (v: any) => [v?.products?.name, v?.size, v?.color].filter(Boolean).join(" ");

  return (
    <>
      <div className="card">
        <div className="muted">{t("home.todaySales")}</div>
        <div className="big">{money(d.home?.today_total ?? 0)}</div>
        <div className="muted">{t("home.salesCount", { count: d.home?.today_count ?? 0 })}</div>
      </div>

      <div className="card">
        <strong>{t("home.lowStock")}</strong>
        {d.low.length === 0 && <p className="muted">{t("home.lowStockNone")}</p>}
        {d.low.map((s: any, i: number) => (
          <div className="row" key={i}><span>{label(s.variants)}</span><strong>{s.quantity}</strong></div>
        ))}
      </div>

      <div className="card">
        <strong>{t("home.recent")}</strong>
        {d.recent.map((s: any) => (
          <Link key={s.id} href={`/receipt/${s.id}`} className="rowlink">
            <div className="row">
              <span>
                {new Date(s.created_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}{" "}
                {s.profiles?.full_name}
                {s.sale_items?.some((i: any) => i.below_min) && <div className="flag">{t("history.belowMin")}</div>}
              </span>
              <strong>{s.status === "voided" ? t("history.voided") : money(s.total)}</strong>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
