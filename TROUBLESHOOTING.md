# Troubleshooting Application Error on Shopify Installation

## Common Causes and Fixes

### 1. ✅ Update Application URL

**Problem**: `shopify.app.toml` still has example URL:
```toml
application_url = "https://shopify.dev/apps/default-app-home"
```

**Solution**: Update this to your actual Vercel deployment URL:
1. Get your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
2. Update `shopify.app.toml`:
   ```toml
   application_url = "https://your-app.vercel.app"
   ```
3. Update `SHOPIFY_APP_URL` environment variable in Vercel to match
4. Run `shopify app deploy` to update Shopify configuration

### 2. ⚠️ CRITICAL: SQLite Won't Work on Vercel

**Problem**: SQLite uses file-based storage, but Vercel serverless functions are ephemeral (no persistent file system).

**Solution**: You MUST use PostgreSQL for production:

1. **Set up PostgreSQL Database**:
   - Use Supabase PostgreSQL (recommended - you already have Supabase)
   - Or use Neon, Railway, Render, or any PostgreSQL provider

2. **Update `prisma/schema.prisma`**:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Add `DATABASE_URL` to Vercel Environment Variables**:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```

4. **Run migrations**:
   - Add to build script or run manually
   - `npx prisma migrate deploy`

### 3. ✅ Check Environment Variables in Vercel

Make sure ALL these are set in Vercel Dashboard → Settings → Environment Variables:

**Required:**
```
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://your-actual-vercel-url.vercel.app
SCOPES=read_products,write_products,read_inventory,write_inventory,read_locations,read_orders,write_orders,read_customers,write_customers,write_draft_orders,read_draft_orders,read_files,write_files,read_fulfillments,write_fulfillments
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
APP_JWT_SECRET=your_jwt_secret_minimum_32_characters
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/database
```

### 4. ✅ Check Vercel Function Logs

1. Go to Vercel Dashboard
2. Click on your deployment
3. Click "Functions" tab
4. Check logs for specific error messages
5. Look for:
   - Missing environment variables
   - Database connection errors
   - Authentication errors

### 5. ✅ Verify Authentication Route

Make sure the `/auth` route works:
- Visit: `https://your-app.vercel.app/auth`
- Should not show 404 or 500 error

### 6. ✅ Test API Endpoint

Test if the serverless function works:
- Visit: `https://your-app.vercel.app/api/sync/health`
- Should return JSON response, not error

## Quick Diagnostic Steps

1. **Check Vercel Logs** - Most important first step
2. **Verify Environment Variables** - All required vars set?
3. **Test Deployment URL** - Does it load?
4. **Check Database** - Is it accessible?
5. **Verify Application URL** - Matches Vercel URL?

## Most Likely Issues

Based on your setup, the most likely causes are:

1. **SQLite Database** (90% probability) - SQLite files can't persist on Vercel
2. **Missing Environment Variables** - Not all vars set in Vercel
3. **Wrong Application URL** - Still using example URL
4. **Database Connection** - DATABASE_URL not set or incorrect

## Immediate Action Required

**MOST CRITICAL**: Switch from SQLite to PostgreSQL before deployment will work!
