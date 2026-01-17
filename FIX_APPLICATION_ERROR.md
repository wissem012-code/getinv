# Fix Application Error on Shopify Installation

## Critical Issues Fixed

1. ✅ **Database Configuration** - Changed from SQLite to PostgreSQL (SQLite doesn't work on Vercel)
2. ✅ **API Handler** - Improved error handling and streaming
3. ✅ **Migrations** - Added automatic migration deployment

## Required Actions to Fix Application Error

### 1. ⚠️ CRITICAL: Set Up PostgreSQL Database

**SQLite won't work on Vercel!** You MUST use PostgreSQL.

#### Option A: Use Supabase PostgreSQL (Recommended - You Already Have Supabase)

1. Go to your Supabase project
2. Go to **Settings** → **Database**
3. Copy the **Connection String** (use the one that includes password)
4. It should look like: `postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres`

#### Option B: Use Another PostgreSQL Provider

- [Neon](https://neon.tech) - Free tier available
- [Railway](https://railway.app) - Easy PostgreSQL setup
- [Render](https://render.com) - Managed PostgreSQL

### 2. ✅ Add DATABASE_URL to Vercel Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

**Add this variable:**
```
DATABASE_URL=postgresql://user:password@host:5432/database
```

Replace with your actual PostgreSQL connection string.

### 3. ✅ Run Database Migrations

After setting up PostgreSQL, you need to create the database tables:

**Option A: Run locally and push to database:**
```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:password@host:5432/database"

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

**Option B: Run from Vercel build (already configured):**
The build script now includes `prisma migrate deploy`, so it will run automatically on deployment.

### 4. ✅ Update Application URL

Your `shopify.app.toml` still has the example URL. You need to:

1. **Get your Vercel deployment URL**:
   - Go to Vercel Dashboard
   - Find your deployment
   - Copy the URL (e.g., `https://your-app-name.vercel.app`)

2. **Update in two places**:

   **A. Update `SHOPIFY_APP_URL` in Vercel Environment Variables:**
   ```
   SHOPIFY_APP_URL=https://your-actual-vercel-url.vercel.app
   ```

   **B. Update `shopify.app.toml`** (or let Shopify CLI update it):
   ```toml
   application_url = "https://your-actual-vercel-url.vercel.app"
   ```

3. **Update Shopify App Configuration:**
   ```bash
   shopify app deploy
   ```

### 5. ✅ Verify All Environment Variables in Vercel

Make sure ALL these are set correctly:

```
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://your-actual-vercel-url.vercel.app
SCOPES=read_products,write_products,read_inventory,write_inventory,read_locations,read_orders,write_orders,read_customers,write_customers,write_draft_orders,read_draft_orders,read_files,write_files,read_fulfillments,write_fulfillments
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
APP_JWT_SECRET=your_jwt_secret_minimum_32_characters_long
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/database
```

### 6. ✅ Test Your Deployment

1. Visit your Vercel URL directly: `https://your-app.vercel.app`
2. Should load (may show an error, but shouldn't be 500)
3. Check Vercel Function Logs for specific errors

### 7. ✅ Check Vercel Deployment Logs

1. Go to Vercel Dashboard
2. Click on your latest deployment
3. Click **"Logs"** or **"Functions"** tab
4. Look for:
   - Missing environment variables
   - Database connection errors
   - Authentication errors

## Quick Fix Checklist

- [ ] Set up PostgreSQL database (Supabase or other provider)
- [ ] Add `DATABASE_URL` to Vercel environment variables
- [ ] Run `npx prisma migrate deploy` to create database tables
- [ ] Get your actual Vercel deployment URL
- [ ] Update `SHOPIFY_APP_URL` in Vercel environment variables
- [ ] Update `shopify.app.toml` with actual URL (or run `shopify app deploy`)
- [ ] Verify all environment variables are set in Vercel
- [ ] Redeploy on Vercel
- [ ] Check Vercel logs for any errors
- [ ] Try installing the app on Shopify again

## Most Common Causes

1. **Missing DATABASE_URL** (90% probability)
2. **SQLite instead of PostgreSQL** (Fixed in code, but you need to set up DB)
3. **Missing environment variables**
4. **Wrong SHOPIFY_APP_URL**
5. **Database tables not created** (need to run migrations)

## After Fixing

Once you've:
1. Set up PostgreSQL
2. Added DATABASE_URL to Vercel
3. Run migrations
4. Updated application URLs

Then:
1. Commit and push the code changes
2. Redeploy on Vercel
3. Try installing the app on Shopify again
