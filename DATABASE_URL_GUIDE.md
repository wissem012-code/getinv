# DATABASE_URL vs SUPABASE_URL - What's the Difference?

## They Are Different!

### SUPABASE_URL
- **What it is**: The HTTP API endpoint for Supabase
- **Format**: `https://xxxxx.supabase.co`
- **Used for**: Supabase REST API, Edge Functions, Storage API
- **Example**: `https://utrprngboxriryrgetkp.supabase.co`

### DATABASE_URL
- **What it is**: PostgreSQL database connection string
- **Format**: `postgresql://user:password@host:port/database`
- **Used for**: Direct database connection (Prisma, SQL queries)
- **Example**: `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`

## How to Get DATABASE_URL from Supabase

### Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll down to **Connection string**
5. You'll see different connection options:

   **Option A: Connection Pooling (Recommended for serverless)**
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   - Port: **6543** (pooled connection)
   - Best for Vercel serverless functions

   **Option B: Direct Connection**
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
   - Port: **5432** (direct connection)
   - Use if connection pooling doesn't work

6. **Important**: Replace `[PASSWORD]` with your actual database password
   - If you don't know it, go to **Settings** → **Database** → **Database password**
   - Or reset it if needed

### Method 2: From Connection Info

1. In Supabase Dashboard → **Settings** → **Database**
2. Look for **Connection info** section
3. You'll see:
   - Host: `db.xxxxx.supabase.co`
   - Database name: `postgres`
   - Port: `5432`
   - User: `postgres`
   - Password: (your database password)

4. Construct the connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

## Example

If your Supabase project details are:
- Project URL: `https://utrprngboxriryrgetkp.supabase.co`
- Project Ref: `utrprngboxriryrgetkp`
- Password: `your-db-password`

Then:
- **SUPABASE_URL**: `https://utrprngboxriryrgetkp.supabase.co`
- **DATABASE_URL**: `postgresql://postgres:your-db-password@db.utrprngboxriryrgetkp.supabase.co:5432/postgres`

## For Vercel Environment Variables

Add BOTH to Vercel:

```
SUPABASE_URL=https://utrprngboxriryrgetkp.supabase.co
DATABASE_URL=postgresql://postgres:your-password@db.utrprngboxriryrgetkp.supabase.co:5432/postgres
```

## Quick Check

- **SUPABASE_URL**: Starts with `https://` - used for API calls
- **DATABASE_URL**: Starts with `postgresql://` - used for database connection

## Security Note

⚠️ **Never commit DATABASE_URL to Git!** It contains your database password. Always use environment variables.
