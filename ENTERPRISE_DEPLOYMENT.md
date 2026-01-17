# Enterprise-Grade Deployment Configuration

This document outlines the enterprise-grade configuration for deploying the GetInv Shopify app to Vercel with Supabase PostgreSQL.

## Architecture Overview

```
┌─────────────────┐         ┌──────────────┐         ┌──────────────────┐
│   Shopify App   │────────▶│   Vercel     │────────▶│   Supabase       │
│                 │         │  (Serverless)│         │   PostgreSQL     │
└─────────────────┘         └──────────────┘         └──────────────────┘
                                      │
                                      │
                            ┌─────────┴─────────┐
                            │                   │
                      DATABASE_URL         DIRECT_URL
                    (Pooled 6543)      (Direct 5432)
                    Runtime           Migrations
```

## Environment Variables Configuration

### Required Environment Variables in Vercel

Set these in **Vercel Dashboard** → **Project Settings** → **Environment Variables**:

#### 1. DATABASE_URL (Pooled Connection - Runtime)
**Purpose**: Used by Prisma Client for runtime database queries  
**Type**: Connection Pooling (PgBouncer)  
**Port**: `6543`  
**Region**: `eu-west-3`

```
postgresql://postgres.utrprngboxriryrgetkp:[PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connection_limit=1
```

**Why**: Serverless functions need pooled connections to avoid connection limits. Pooling reuses connections efficiently.

#### 2. DIRECT_URL (Direct Connection - Migrations)
**Purpose**: Used by Prisma CLI for migrations and schema operations  
**Type**: Direct PostgreSQL connection  
**Port**: `5432`  
**Region**: `eu-west-3`

```
postgresql://postgres:[PASSWORD]@db.utrprngboxriryrgetkp.supabase.co:5432/postgres?sslmode=require
```

**Why**: Migrations require stable, non-pooled connections. Direct connection ensures schema changes are applied correctly.

#### 3. Shopify Configuration
```env
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://getinv.vercel.app
SCOPES=read_products,write_products,read_inventory,write_inventory,read_locations,read_orders,write_orders,read_customers,write_customers,write_draft_orders,read_draft_orders,read_files,write_files,read_fulfillments,write_fulfillments
```

#### 4. Supabase Configuration
```env
SUPABASE_URL=https://utrprngboxriryrgetkp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_EDGE_BASE_URL=https://utrprngboxriryrgetkp.supabase.co/functions/v1
```

## Enterprise Best Practices

### ✅ 1. Connection Pooling (DATABASE_URL)
- **Use pooled connection** (`:6543`) for runtime queries
- Prevents connection exhaustion in serverless environments
- Includes `connection_limit=1` to limit connections per function invocation
- Includes `pgbouncer=true` parameter for proper pooling behavior

### ✅ 2. Direct Connection for Migrations (DIRECT_URL)
- **Use direct connection** (`:5432`) for migrations
- Prisma migrations need stable connections for schema changes
- Separated from runtime to prevent conflicts

### ✅ 3. SSL/TLS Security
- **Always require SSL**: `sslmode=require` in both URLs
- Encrypts all database communications
- Production security requirement

### ✅ 4. Region Alignment
- **Database Region**: `eu-west-3` (Paris)
- **Vercel Function Region**: `fra1` (Frankfurt - closest to eu-west-3)
- Minimizes latency between Vercel functions and Supabase database

### ✅ 5. React Router Configuration
- **Custom serverless handler**: `api/index.js` handles Vercel request/response conversion
- **React Router config**: `react-router.config.ts` suppresses vercelPreset warning
- Explicit configuration prevents build warnings

### ✅ 6. Prisma Client Generation
- **Always generates**: Even if DATABASE_URL is missing (uses placeholder)
- **Graceful migration handling**: Migrations can fail during build without breaking deployment
- **Runtime migration**: Falls back to running migrations on first request if build-time fails

### ✅ 7. Error Handling
- **Sanitized error messages**: Production errors don't expose sensitive details
- **Comprehensive logging**: Detailed logs for debugging without exposing secrets
- **Graceful degradation**: App continues to work even if non-critical operations fail

## Deployment Checklist

### Pre-Deployment
- [ ] Set `DATABASE_URL` (pooled connection, port 6543) in Vercel
- [ ] Set `DIRECT_URL` (direct connection, port 5432) in Vercel
- [ ] Verify all Shopify environment variables are set
- [ ] Verify all Supabase environment variables are set
- [ ] Check Node.js version matches `.nvmrc` (24.x)
- [ ] Verify `shopify.app.toml` has correct `application_url`

### Post-Deployment
- [ ] Test Shopify app installation
- [ ] Verify database migrations ran successfully (check logs)
- [ ] Test database connection via app UI
- [ ] Check Vercel function logs for any errors
- [ ] Verify SSL connections to database
- [ ] Test app functionality end-to-end

## Troubleshooting

### Migration Errors During Build
**Symptom**: `P1001: Can't reach database server` during build

**Solution**:
1. Ensure `DIRECT_URL` is set to direct connection (port 5432)
2. Check that Supabase project is active (not paused)
3. Verify database password is correct
4. Check Supabase network restrictions allow Vercel IPs

**Note**: If migrations fail during build, they will run automatically on first app request.

### Runtime Connection Errors
**Symptom**: `P1001` or connection timeouts at runtime

**Solution**:
1. Ensure `DATABASE_URL` uses pooled connection (port 6543)
2. Verify connection string includes `pgbouncer=true`
3. Check `connection_limit=1` is set (prevents too many connections)
4. Verify Supabase connection pooling is enabled

### React Router vercelPreset Warning
**Symptom**: `WARN: The vercelPreset() Preset was not detected`

**Status**: ✅ **Fixed** - `react-router.config.ts` explicitly configures the build, suppressing this warning

## Security Considerations

1. **Environment Variables**: Never commit secrets to Git
2. **SSL Required**: All database connections use `sslmode=require`
3. **Service Role Key**: Only used server-side, never exposed to client
4. **Connection Limits**: `connection_limit=1` prevents resource exhaustion
5. **Input Validation**: All user inputs are validated server-side

## Performance Optimization

1. **Connection Pooling**: Reuses connections efficiently
2. **Region Alignment**: Vercel functions in `fra1` close to database `eu-west-3`
3. **Prisma Client**: Generated at build time for faster cold starts
4. **Streaming Responses**: Uses streaming for better UX
5. **Error Timeouts**: 30-second max duration prevents hanging requests

## Monitoring

### Key Metrics to Monitor
- Database connection pool usage
- Vercel function execution time
- Error rates (especially P1001 connection errors)
- Migration success/failure rates
- Shopify API response times

### Log Locations
- **Vercel Logs**: Dashboard → Project → Deployments → Function Logs
- **Supabase Logs**: Dashboard → Logs → Database
- **Shopify Logs**: Partner Dashboard → App → Analytics

## Support

For issues:
1. Check Vercel deployment logs
2. Check Supabase database logs
3. Verify environment variables are set correctly
4. Review this guide's troubleshooting section
5. Check `FIX_DATABASE_CONNECTION.md` for specific database issues
