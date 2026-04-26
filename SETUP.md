# Agency Dashboard — Setup Guide

## 1. Supabase Project

1. Go to supabase.com → New Project
2. Note your **Project URL** and **anon/public API key** (Settings → API)

## 2. Environment Variables

```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL and anon key
```

## 3. Database

Run the migration in Supabase SQL Editor:
- Go to: your project → SQL Editor
- Paste contents of `supabase/migrations/001_init.sql`
- Click Run

## 4. Google OAuth

In Supabase Dashboard:
1. Authentication → Providers → Google → Enable
2. Add OAuth credentials from Google Cloud Console
3. Set redirect URL to: `https://your-domain.com/auth/callback`
   (for local dev: `http://localhost:3000/auth/callback`)

## 5. Run Locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## 6. Deploy to Vercel

```bash
npx vercel
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel env vars
```

Then update Supabase Auth → URL Configuration → Site URL to your Vercel URL.

## Access

Only these emails can log in:
- luka.augustin23@gmail.com
- samvittapuriah@gmail.com

Anyone else gets redirected to /access-denied.
