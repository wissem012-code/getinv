# Fix: DIRECT_URL Using Wrong Connection Type

## Problem

You're using **Session pooler** format for `DIRECT_URL`, but Prisma migrations need a **TRUE direct connection** (not any pooler).

## Your Current DIRECT_URL (WRONG):

```
postgresql://postgres.utrprngboxriryrgetkp:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

**Issues:**
- Uses `.pooler.supabase.com` host (this is still a pooler, even though port is 5432)
- Prisma migrations need a **direct connection** to the database, not any pooler
- Session pooler might work, but **direct connection is more reliable** for migrations

## ✅ Correct DIRECT_URL Format:

### Use Direct Connection (NOT Pooler)

```
postgresql://postgres:[PASSWORD]@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require
```

**Key Differences:**
- Host: `db.utrprngboxriryrgetkp.supabase.co` (NOT `.pooler.supabase.com`)
- Port: `5432` (direct connection)
- User: `postgres` (NOT `postgres.utrprngboxriryrgetkp`)
- No `pgbouncer` parameter

## How to Get Direct Connection URL from Supabase

1. Go to **Supabase Dashboard** → Your Project
2. **Settings** → **Database**
3. Scroll to **Connection string** section
4. Find **Direct connection** (NOT Connection pooling, NOT Session pooler)
5. It should show: `db.[PROJECT-REF].supabase.co:5432`
6. Copy that connection string

**Format:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require
```

## Updated Environment Variables

### DATABASE_URL (Pooled - Port 6543) ✅ CORRECT
```
postgresql://postgres.utrprngboxriryrgetkp:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=1
```

### DIRECT_URL (Direct - Port 5432) ⚠️ NEEDS FIX
**Current (WRONG - Session Pooler):**
```
postgresql://postgres.utrprngboxriryrgetkp:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

**Should be (CORRECT - Direct Connection):**
```
postgresql://postgres:[PASSWORD]@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require
```

## Region Note

You're using `eu-central-1` (Frankfurt) instead of `eu-west-3` (Paris). Make sure this matches your actual Supabase database region. If your database is in `eu-west-3`, update the region in the URLs.

## Connection Types Explained

| Type | Host Pattern | Port | Use For |
|------|-------------|------|---------|
| **Direct** | `db.[PROJECT].supabase.co` | `5432` | Migrations, CLI |
| **Transaction Pooler** | `aws-0-[REGION].pooler.supabase.com` | `6543` | Runtime (serverless) |
| **Session Pooler** | `aws-0-[REGION].pooler.supabase.com` | `5432` | Alternative runtime option |

**For Prisma migrations:** Always use **Direct connection**, not Session pooler.

## Step-by-Step Fix

1. **Get Direct Connection URL from Supabase:**
   - Dashboard → Settings → Database → Direct connection
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

2. **Update DIRECT_URL in Vercel:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Find `DIRECT_URL`
   - Update to direct connection URL (host: `db.utrprngboxriryrgetkp.supabase.co`)
   - Save

3. **Verify DATABASE_URL:**
   - Should use `aws-0-eu-central-1.pooler.supabase.com:6543` (Transaction pooler)
   - Should have `?pgbouncer=true&sslmode=require&connection_limit=1`

4. **Redeploy:**
   - Vercel will auto-redeploy after environment variable changes
   - Check build logs to verify migrations run successfully

## Expected Result

After fixing DIRECT_URL:
- ✅ Migrations run successfully during build
- ✅ DATABASE_URL works for runtime queries
- ✅ No more "Session pooler" warnings
- ✅ App initializes correctly

## Summary

**The issue:** `DIRECT_URL` is using Session pooler format instead of true direct connection.

**Fix:** Change `DIRECT_URL` host from `aws-0-eu-central-1.pooler.supabase.com` to `db.utrprngboxriryrgetkp.supabase.co`
