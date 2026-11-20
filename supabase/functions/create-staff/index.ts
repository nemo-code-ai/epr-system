import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const apiKey = req.headers.get("apikey");
  if (!token || !apiKey) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKeysRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!supabaseUrl || !publishableKeysRaw || !secretKeysRaw) {
    return json({ error: "supabase_function_not_configured" }, 503);
  }

  let publishableKeys: Record<string, string>;
  let secretKeys: Record<string, string>;
  try {
    publishableKeys = JSON.parse(publishableKeysRaw);
    secretKeys = JSON.parse(secretKeysRaw);
  } catch {
    return json({ error: "supabase_function_not_configured" }, 503);
  }

  // New Supabase publishable/secret keys are not JWTs. Because this function
  // uses verify_jwt=false, verify the incoming publishable key explicitly and
  // verify the user's access token with Supabase Auth before admin operations.
  const validPublishableKey = Object.values(publishableKeys).some((key) => key === apiKey);
  if (!validPublishableKey) return json({ error: "unauthorized" }, 401);

  const secretKey = secretKeys.default;
  if (!secretKey) return json({ error: "supabase_function_not_configured" }, 503);

  const userClient = createClient(supabaseUrl, apiKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);

  const { data: owner, error: ownerError } = await admin
    .from("profiles")
    .select("business_id, role, active")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (ownerError) return json({ error: "owner_lookup_failed" }, 500);
  if (!owner || owner.role !== "owner" || !owner.active) {
    return json({ error: "forbidden" }, 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_input" }, 400);
  }

  const input = body as Record<string, unknown>;
  const fullName = typeof input.full_name === "string" ? input.full_name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const language = input.language === "en" ? "en" : "fr";

  if (!fullName || fullName.length > 120 || !email || !email.includes("@") || password.length < 6) {
    return json({ error: "invalid_input" }, 400);
  }

  const { data: store, error: storeError } = await admin
    .from("stores")
    .select("id")
    .eq("business_id", owner.business_id)
    .order("created_at")
    .limit(1)
    .single();

  if (storeError || !store) return json({ error: "no_store" }, 500);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return json({ error: createError?.message ?? "create_failed" }, 400);
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    business_id: owner.business_id,
    store_id: store.id,
    role: "salesperson",
    full_name: fullName,
    language,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return json({ error: "profile_create_failed" }, 500);
  }

  return json({ ok: true });
});
