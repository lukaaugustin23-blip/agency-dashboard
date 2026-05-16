# Deployment Guide

## Prerequisites
- Supabase project: https://wrjehgtrhtkyecqkhgbl.supabase.co
- GitHub repo with the `main` branch
- Vercel account connected to GitHub

---

## Step 1 — Run the DB schema

1. Go to https://supabase.com/dashboard/project/wrjehgtrhtkyecqkhgbl
2. Click **SQL Editor** in the left sidebar
3. Open a new query, paste the full contents of `web/src/db/schema.sql`
4. Click **Run**

All tables (`leads`, `meetings`, `client_data`, `activity_log`), RLS policies, triggers, and realtime publications will be created.

---

## Step 2 — Get the anon key

1. In the Supabase dashboard, go to **Settings** → **API**
2. Copy the **anon public** key (the long `eyJ...` string under "Project API keys")

---

## Step 3 — Create `.env.local`

In the `web/` directory create a file named `.env.local`:

```
VITE_SUPABASE_URL=https://wrjehgtrhtkyecqkhgbl.supabase.co
VITE_SUPABASE_ANON_KEY=<paste the anon key from Step 2>
```

This file is git-ignored and never committed.

---

## Step 4 — Push to GitHub

```bash
git add .
git commit -m "feat: add supabase backend + vercel config"
git push origin main
```

The GitHub Actions CI workflow will run automatically on every push/PR to `main` (type-check + build).

---

## Step 5 — Connect Vercel

1. Go to https://vercel.com/new
2. Click **Import** and select your GitHub repository
3. In the project settings:
   - **Root Directory**: `web`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **Deploy**

---

## Step 6 — Add environment variables in Vercel

After the initial deploy (it may fail without the keys — that's fine):

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add the following for **Production**, **Preview**, and **Development**:
   - `VITE_SUPABASE_URL` = `https://wrjehgtrhtkyecqkhgbl.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<the anon key>`
3. Trigger a redeploy from the **Deployments** tab

---

## Step 7 — Enable Google OAuth in Supabase

1. In the Supabase dashboard go to **Authentication** → **Providers** → **Google**
2. Toggle **Enable Sign in with Google**
3. Enter your Google OAuth **Client ID** and **Client Secret**
   - Get these from https://console.cloud.google.com → APIs & Services → Credentials
4. Add your Vercel production URL as an **Authorized redirect URI** in Google Console:
   ```
   https://YOUR_VERCEL_URL/auth/callback
   ```
5. Back in Supabase, add the same URL to **Redirect URLs** under **Authentication** → **URL Configuration**:
   ```
   https://YOUR_VERCEL_URL/auth/callback
   ```
6. Save

---

## CI secrets (optional but recommended)

For the GitHub Actions build to pass without exposing the anon key in the repo:

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

The CI workflow (`/.github/workflows/ci.yml`) already references these secrets.
