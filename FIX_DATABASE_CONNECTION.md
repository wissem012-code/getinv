# Fix Database Connection Error (P1001)

## Problem

You're getting this error during Vercel build:
```
P1001: Can't reach database server at `db.utrprngboxriryrgetkp.supabase.co:5432`
```

## Root Cause

Direct PostgreSQL connections (port 5432) are often **blocked by Supabase** from serverless environments like Vercel. You need to use **Connection Pooling** (port 6543) instead.

## Solution: Use Connection Pooling URL

### Step 1: Get Connection Pooling URL from Supabase

1. Go to **Supabase Dashboard** → Your Project
2. Go to **Settings** → **Database**
3. Scroll to **Connection string** section
4. Find **Connection Pooling** option (NOT Direct connection)
5. Select **Transaction** mode (recommended for Prisma)

The URL should look like this (for eu-west-3 region):
```
postgresql://postgres.utrprngboxriryrgetkp:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Key differences:**
- ✅ Port **6543** (not 5432)
- ✅ Host: `aws-0-[REGION].pooler.supabase.com` (not `db.xxxxx.supabase.co`)
- ✅ User: `postgres.utrprngboxriryrgetkp` (includes project ref)
- ✅ Includes `?pgbouncer=true`

### Step 2: Update DATABASE_URL in Vercel

1. Go to **Vercel Dashboard** → Your Project
2. Go to **Settings** → **Environment Variables**
3. Find `DATABASE_URL`
4. Update it with the **Connection Pooling URL** (port 6543)
5. Make sure to replace `[PASSWORD]` with your actual database password
6. Save and redeploy

### Step 3: Verify Your Password

If you don't know your database password:
1. Go to **Supabase Dashboard** → **Settings** → **Database**
2. Scroll to **Database password**
3. Copy or reset your password
4. Include it in the DATABASE_URL

## Alternative: If Connection Pooling Doesn't Work

If you still get connection errors with pooling:

1. Check if your Supabase project is active (not paused)
2. Verify the region in the connection string matches your Supabase region
3. Try the **Session** mode connection pooler instead of **Transaction** mode
4. Make sure your Supabase project allows connections from Vercel's IPs

## Example Connection Strings

### ❌ WRONG (Direct Connection - Port 5432)
```
postgresql://postgres:besemallah125@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require
```

### ✅ CORRECT (Connection Pooling - Port 6543)
```
postgresql://postgres.utrprngboxriryrgetkp:besemallah125@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
```

**Note:** Your Supabase region is `eu-west-3`. If your region is different, replace `eu-west-3` with your actual Supabase region.

## Testing the Connection

After updating DATABASE_URL:
1. Trigger a new Vercel deployment
2. The build should succeed (even if migrations skip, that's OK)
3. On first app request, migrations will run automatically
4. The app should connect successfully

## Migration Behavior

The updated setup script now:
- ✅ Always generates Prisma Client (required for build)
- ⚠️ Attempts migrations during build but doesn't fail if they can't connect
- ✅ Migrations will run automatically on first app request if they failed during build

This is better for serverless environments where network access during build can be unreliable.
