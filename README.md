# EPR System

A lightweight ERP app for managing products, stock, sales, receipts, and staff.

## Requirements

- Node.js 26 LTS (26.13.0)
- npm
- A Supabase project with the SQL in `schema.sql` applied

## Local setup

1. Install Node.js 26.13.0 (the repository pins it in `.nvmrc` and `.node-version`).
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and set the Supabase URL and publishable key.
4. Run `npm run dev` and open `http://localhost:3000`.

## Supabase configuration

The app uses these browser-safe environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The `create-staff` Supabase Edge Function performs the privileged Supabase Auth operation. Supabase injects the project's publishable and secret key maps into Edge Function runtime variables. The function checks the caller's publishable key, validates the user's access token, and verifies the caller is an active business owner before creating a salesperson.

Deploy the function from this repository with the Supabase CLI:

```bash
supabase functions deploy create-staff --no-verify-jwt
```

`--no-verify-jwt` is intentional because the function uses the new non-JWT publishable key. The function performs its own API-key and user-token verification before any privileged action.

Never put a Supabase secret key or service-role key in `.env.local`, `NEXT_PUBLIC_*` variables, GitHub, or browser code.

## Build

```bash
npm run build
npm start
```
