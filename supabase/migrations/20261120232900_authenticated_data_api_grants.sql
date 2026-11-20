grant usage on schema public to authenticated;

grant select on table
  public.businesses, public.stores, public.profiles, public.products,
  public.product_costs, public.variants, public.stock, public.sales,
  public.sale_items, public.stock_movements, public.audit_log
to authenticated;

grant insert, update, delete on table
  public.products, public.product_costs, public.variants
to authenticated;

grant update (language) on table public.profiles to authenticated;

revoke execute on function public.auth_business_id() from public, anon;
revoke execute on function public.auth_role() from public, anon;
revoke execute on function public.create_business(text, text, text) from public, anon;
revoke execute on function public.create_sale(uuid, text, text, text, jsonb) from public, anon;
revoke execute on function public.restock(uuid, uuid, integer, text) from public, anon;
revoke execute on function public.void_sale(uuid, text) from public, anon;
revoke execute on function public.owner_home(uuid) from public, anon;

grant execute on function public.auth_business_id() to authenticated;
grant execute on function public.auth_role() to authenticated;
grant execute on function public.create_business(text, text, text) to authenticated;
grant execute on function public.create_sale(uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.restock(uuid, uuid, integer, text) to authenticated;
grant execute on function public.void_sale(uuid, text) to authenticated;
grant execute on function public.owner_home(uuid) to authenticated;
