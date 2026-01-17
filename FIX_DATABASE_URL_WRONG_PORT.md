# Fix: Wrong DATABASE_URL - Using Direct Instead of Pooled Connection

## Problem

You added:
```
postgresql://postgres:besemallah125@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require
```

This is the **direct connection** (port 5432), which often doesn't work well with Vercel serverless functions.

## Solution: Use Pooled Connection (Port 6543)

For `DATABASE_URL` in Vercel, you MUST use the **pooled connection** (port 6543), not the direct connection (port 5432).

### Correct DATABASE_URL (Pooled Connection)

```
postgresql://postgres.utrprngboxriryrgetkp:besemallah125@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=1
```

### Differences:

| Wrong (Direct) | Correct (Pooled) |
|----------------|------------------|
| Port: `5432` | Port: `6543` |
| Host: `db.utrprngboxriryrgetkp.supabase.co` | Host: `aws-0-eu-west-3.pooler.supabase.com` |
| User: `postgres` | User: `postgres.utrprngboxriryrgetkp` |
| No `pgbouncer` param | Includes `?pgbouncer=true` |
| No `connection_limit` | Includes `&connection_limit=1` |

## How to Get the Correct URL from Supabase

1. Go to **Supabase Dashboard** → Your Project
2. **Settings** → **Database**
3. Scroll to **Connection string** section
4. Find **Connection Pooling** (NOT Direct connection)
5. Select **Transaction** mode
6. Copy the connection string
7. Replace `[YOUR-PASSWORD]` with `besemallah125`

## Update in Vercel

1. Go to **Vercel Dashboard** → Your Project
2. **Settings** → **Environment Variables**
3. Find `DATABASE_URL`
4. **Update** the value to the pooled connection URL:
   ```
   postgresql://postgres.utrprngboxriryrgetkp:besemallah125@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=1
   ```
5. Click **Save**
6. **Redeploy** your app

## Optional: Also Add DIRECT_URL

The direct connection (port 5432) you have is perfect for `DIRECT_URL`:

1. In Vercel Environment Variables, add a new variable:
   - **Key**: `DIRECT_URL`
   - **Value**: `postgresql://postgres:besemallah125@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require`
   - **Environment**: All
2. Click **Save**

This will be used for migrations, while `DATABASE_URL` (pooled) is used for runtime queries.

## About the Console Errors

The errors you see:
```
Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
monorail-edge.shopifysvc.com/unstable/produce_batch
```

**These are NOT real errors!** They're caused by:
- Ad blockers blocking Shopify analytics/telemetry
- Browser privacy extensions
- **They don't affect your app functionality**

You can safely ignore them. They won't cause the 500 error.

## After Updating DATABASE_URL

1. **Redeploy** on Vercel (after updating the environment variable)
2. Wait for deployment to complete
3. Try opening the app in Shopify Admin again
4. The 500 error should be resolved

## Verify It's Working

1. Check Vercel logs - no more `P1001` or connection errors
2. App loads without "Application Error"
3. Database connection works properly
