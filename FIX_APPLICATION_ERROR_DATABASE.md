# Fix "Application Error" - Database Connection Issue

## Problem

You're seeing **"Application Error"** when opening the app inside Shopify. This is most commonly caused by a missing or incorrect `DATABASE_URL` environment variable in Vercel.

## Root Cause

The app uses Prisma for session management. When `DATABASE_URL` is missing or incorrect:
- Prisma Client cannot connect to the database
- Session storage fails
- The app shows "Application Error"

## Solution: Add DATABASE_URL to Vercel

### Step 1: Get Connection Pooling URL from Supabase

1. Go to **Supabase Dashboard** → Your Project
2. Go to **Settings** → **Database**
3. Scroll to **Connection string** section
4. Find **Connection Pooling** option (NOT Direct connection)
5. Select **Transaction** mode
6. Copy the connection string

**Format for eu-west-3 region:**
```
postgresql://postgres.utrprngboxriryrgetkp:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=1
```

**Important:**
- Replace `[PASSWORD]` with your actual database password
- Port must be **6543** (pooled connection, not 5432)
- Include `?pgbouncer=true&sslmode=require&connection_limit=1`

### Step 2: Add DATABASE_URL to Vercel

1. Go to **Vercel Dashboard** → Your Project
2. Go to **Settings** → **Environment Variables**
3. Click **Add New**
4. Set:
   - **Key**: `DATABASE_URL`
   - **Value**: (paste the connection pooling URL from Step 1)
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**

### Step 3: Add DIRECT_URL (Recommended for Enterprise Setup)

For migrations and schema operations, also add `DIRECT_URL`:

1. In Supabase Dashboard → **Settings** → **Database**
2. Find **Direct Connection** (port 5432)
3. Copy the connection string:

```
postgresql://postgres:[PASSWORD]@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require
```

4. Add to Vercel:
   - **Key**: `DIRECT_URL`
   - **Value**: (direct connection URL)
   - **Environment**: All

### Step 4: Redeploy

1. Go to **Vercel Dashboard** → **Deployments**
2. Click **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

## Verification

### Check Vercel Logs

1. Go to **Vercel Dashboard** → Your Project
2. Go to **Deployments** → Click on latest deployment
3. Click **Functions** tab
4. Look for any errors mentioning:
   - `DATABASE_URL`
   - `P1001`
   - `Can't reach database server`

### Test the App

1. Open the app in Shopify Admin
2. The app should load without "Application Error"
3. Check browser console (F12) for any errors

## Common Issues

### Issue: "DATABASE_URL not set"

**Solution**: Add `DATABASE_URL` to Vercel environment variables (see Step 2 above)

### Issue: "Can't reach database server" (P1001)

**Possible causes:**
1. **Wrong port**: Using 5432 (direct) instead of 6543 (pooled)
   - **Fix**: Use connection pooling URL (port 6543)

2. **Wrong region**: Connection string has wrong region
   - **Fix**: Ensure region is `eu-west-3` for your database

3. **Wrong password**: Database password is incorrect
   - **Fix**: Check password in Supabase Dashboard → Settings → Database

4. **Network restrictions**: Supabase blocks Vercel IPs
   - **Fix**: Check Supabase Dashboard → Settings → Network Restrictions

### Issue: "Prisma schema validation" error

**Solution**: This should be handled automatically by the build script. If you see this during build:
- Make sure `DATABASE_URL` is set (build script handles missing URL gracefully)
- Check build logs in Vercel to see if migrations ran

## Required Environment Variables

Make sure ALL these are set in Vercel:

```
DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=1
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://getinv.vercel.app
SCOPES=read_products,write_products,read_inventory,write_inventory,read_locations,read_orders,write_orders,read_customers,write_customers,write_draft_orders,read_draft_orders,read_files,write_files,read_fulfillments,write_fulfillments
SUPABASE_URL=https://utrprngboxriryrgetkp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing Database Connection

After adding `DATABASE_URL`, you can test it:

1. Visit: `https://getinv.vercel.app/api/sync/health`
2. Check if database connection is successful
3. Look for any error messages in the response

## Still Having Issues?

1. **Check Vercel Function Logs**:
   - Vercel Dashboard → Project → Deployments → Latest → Functions → Logs

2. **Check Database Password**:
   - Supabase Dashboard → Settings → Database → Database password

3. **Verify Supabase Project is Active**:
   - Make sure your Supabase project is not paused

4. **Check Network Access**:
   - Supabase Dashboard → Settings → Network Restrictions

5. **Test Connection String Locally** (optional):
   ```bash
   # Set DATABASE_URL in your local .env
   # Run: npx prisma db push
   ```

## Success Indicators

✅ No "Application Error" in Shopify  
✅ App loads successfully  
✅ Vercel logs show no database connection errors  
✅ Health endpoint (`/api/sync/health`) returns 200 OK  

After completing these steps, your app should work correctly!
