# Supabase Connection Strings Guide for Prisma

## Understanding Supabase Connection Types

Supabase offers different connection types. Here's what each is for:

### 1. Direct Connection (Port 5432) ✅ For Migrations
```
postgresql://postgres:[PASSWORD]@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require
```
- Host: `db.xxx.supabase.co` (direct database)
- Port: `5432`
- Use for: **Prisma migrations** (DIRECT_URL)
- Note: Requires IPv4 add-on if your environment doesn't support IPv6

### 2. Dedicated Pooler (Port 6543) ✅ For Runtime
```
postgresql://postgres:[PASSWORD]@db.utrprngboxriryrgetkp.supabase.co:6543/postgres?sslmode=require
```
- Host: `db.xxx.supabase.co` (same as direct, but pooled)
- Port: `6543`
- Use for: **Runtime queries** (DATABASE_URL) - Can work for serverless
- Note: This is what you showed me, but it's still a pooler

### 3. Transaction Pooler (Port 6543) ✅ For Runtime (Alternative)
```
postgresql://postgres.utrprngboxriryrgetkp:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=1
```
- Host: `aws-0-[REGION].pooler.supabase.com` (pooler hostname)
- Port: `6543`
- Use for: **Runtime queries** (DATABASE_URL) - Recommended for serverless

### 4. Session Pooler (Port 5432) ⚠️ Alternative for Migrations
```
postgresql://postgres.utrprngboxriryrgetkp:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```
- Host: `aws-0-[REGION].pooler.supabase.com` (pooler hostname)
- Port: `5432` (same as direct, but through pooler)
- Use for: **Alternative to direct connection** if direct doesn't work
- Note: Can work for migrations but not as reliable as true direct

## ✅ Correct Configuration for Your App

### DATABASE_URL (Runtime - Serverless)
**Option 1: Dedicated Pooler (What you have)**
```
postgresql://postgres:besemallah125@db.utrprngboxriryrgetkp.supabase.co:6543/postgres?sslmode=require
```

**Option 2: Transaction Pooler (Recommended)**
```
postgresql://postgres.utrprngboxriryrgetkp:besemallah125@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=1
```

### DIRECT_URL (Migrations) - MUST Use Port 5432
**Use TRUE Direct Connection:**
```
postgresql://postgres:besemallah125@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require
```

**Key:** Port must be **5432** (NOT 6543) for migrations.

## ⚠️ Important: Dedicated Pooler on Port 6543 ≠ Direct Connection

Your "Dedicated Pooler" connection string:
```
postgres://postgres:besemallah125@db.utrprngboxriryrgetkp.supabase.co:6543/postgres
```

**This is:**
- ✅ Good for **DATABASE_URL** (runtime queries)
- ❌ **NOT suitable for DIRECT_URL** (migrations) - uses port 6543 (pooled)

**For DIRECT_URL, you need port 5432:**
```
postgresql://postgres:besemallah125@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require
```

## Step-by-Step Setup in Vercel

1. **Set DATABASE_URL** (Runtime - Use Dedicated Pooler or Transaction Pooler):
   ```
   postgresql://postgres:besemallah125@db.utrprngboxriryrgetkp.supabase.co:6543/postgres?sslmode=require
   ```
   Or use Transaction Pooler:
   ```
   postgresql://postgres.utrprngboxriryrgetkp:besemallah125@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=1
   ```

2. **Set DIRECT_URL** (Migrations - MUST use port 5432):
   ```
   postgresql://postgres:besemallah125@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require
   ```
   ⚠️ **Important:** Change port from `6543` to `5432` for migrations!

3. **Get Direct Connection from Supabase:**
   - Go to Supabase Dashboard → Settings → Database
   - Find "Connection string" section
   - Click on "Direct connection" (NOT "Connection pooling")
   - Copy that string - it should show port **5432**

## Summary

| Variable | Connection Type | Port | Host Pattern |
|----------|----------------|------|--------------|
| **DATABASE_URL** | Dedicated Pooler or Transaction Pooler | `6543` | `db.xxx.supabase.co` or `aws-0-[REGION].pooler.supabase.com` |
| **DIRECT_URL** | True Direct Connection | `5432` | `db.xxx.supabase.co` |

**The Key Difference:**
- DATABASE_URL: Port **6543** (pooled, for runtime)
- DIRECT_URL: Port **5432** (direct, for migrations)

Even though both might use `db.xxx.supabase.co`, the **port** determines if it's pooled (6543) or direct (5432).
