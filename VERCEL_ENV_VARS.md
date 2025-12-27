# Vercel Environment Variables Setup

Add these environment variables in your Vercel project settings:

## Required Variables

1. **VITE_SUPABASE_URL**
   - Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - Find it in: Supabase Dashboard → Project Settings → API → Project URL

2. **VITE_SUPABASE_ANON_KEY**
   - Value: Your Supabase anon/public key
   - Find it in: Supabase Dashboard → Project Settings → API → Project API keys → anon/public

## Optional Variables

3. **VITE_API_BASE_URL** (only if using backend API)
   - Value: Your backend API URL (e.g., `https://your-api.vercel.app/api` or your backend URL)
   - Default: `http://127.0.0.1:3001/api` (for local development)

## How to Add in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** tab
3. Click **Environment Variables** in the left sidebar
4. Click **Add New** or the **+** button
5. Enter the variable name and value
6. Select environments (Production, Preview, Development)
7. Click **Save**
8. **Redeploy** your project after adding variables

## Important Notes

- Variable names must start with `VITE_` for Vite to expose them to your React app
- After adding variables, you must redeploy for changes to take effect
- Variables are encrypted and only visible in Vercel dashboard



