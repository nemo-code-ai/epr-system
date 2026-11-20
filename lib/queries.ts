import { supabase } from "./supabase";

export type Item = { id: string; name: string; list_price: number; quantity: number };

// All active variants of the store with their current quantity (0 if no stock row yet).
export async function loadVariants(storeId: string): Promise<Item[]> {
  const { data } = await supabase
    .from("variants")
    .select("id,size,color,products(name,list_price),stock(quantity,store_id)")
    .eq("active", true);
  return (data ?? [])
    .map((v: any) => ({
      id: v.id as string,
      name: [v.products?.name, v.size, v.color].filter(Boolean).join(" "),
      list_price: (v.products?.list_price ?? 0) as number,
      quantity: ((v.stock ?? []).find((s: any) => s.store_id === storeId)?.quantity ?? 0) as number,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
