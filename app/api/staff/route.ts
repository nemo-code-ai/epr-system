import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Keep the same-origin API used by the client, but delegate privileged account
// creation to Supabase. The Supabase secret key stays inside the Edge Function.
export async function POST(req: Request) {
  const authorization = req.headers.get("authorization");
  if (!authorization?.match(/^Bearer\s+\S+$/i)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  try {
    const functionUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/create-staff`;
    const upstream = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: publishableKey,
        Authorization: authorization,
      },
      body: await req.text(),
      cache: "no-store",
    });

    const responseBody = await upstream.text();
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "staff_service_unavailable" }, { status: 502 });
  }
}
