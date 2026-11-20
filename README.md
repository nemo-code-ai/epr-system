# EPR System

A lightweight ERP app for managing products, stock, sales, receipts and staff.

## Stack

- Node.js 26.13.0
- Next.js 16
- Supabase Auth, Postgres and Edge Functions
- English and French interface

## Supabase configuration

Set these browser-safe environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never put a Supabase secret/service-role key in browser code or source control. Staff creation is handled by the `create-staff` Edge Function, which uses the server-side Supabase secret supplied by the Edge Runtime.

## Onboarding bug fix

Authenticated users must be granted table-level Data API privileges before Postgres row-level security policies can filter their rows. The SQL migration under `supabase/migrations` grants only the table/column operations the application needs. The client now distinguishes a missing profile from a failed profile read, so temporary permission/API errors cannot incorrectly send an existing shop owner to onboarding.

## Run locally

```bash
npm install
npm run dev
```
