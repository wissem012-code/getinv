# Vercel Environment Variables Guide

## Valid Environment Variable Names

When setting environment variables in Vercel, **the variable name** must:
- Only contain letters, digits, and underscores
- NOT start with a digit
- Use underscores (`_`) instead of hyphens (`-`)

## Required Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

### ✅ Valid Variable Names:

```
SHOPIFY_API_KEY
SHOPIFY_API_SECRET
SHOPIFY_APP_URL
SCOPES
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_FUNCTIONS_BASE
APP_JWT_SECRET
NODE_ENV
SHOP_CUSTOM_DOMAIN
DATABASE_URL
```

### ❌ Common Mistakes to Avoid:

- ❌ `SHOPIFY-API-KEY` (has hyphens - use underscores)
- ❌ `2SHOPIFY_API_KEY` (starts with digit)
- ❌ `SHOPIFY.API.KEY` (has dots - use underscores)
- ❌ `SHOPIFY_API_KEY!` (has special characters)

### ✅ Correct Format:

All variable names use UPPERCASE with underscores.

## How to Set in Vercel:

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. **Variable Name**: Use only uppercase letters, digits, and underscores
   - ✅ `SHOPIFY_API_KEY`
   - ❌ `shopify-api-key` or `SHOPIFY-API-KEY`
5. **Value**: Enter the actual value
6. Select environments (Production, Preview, Development)
7. Click **Save**

## Example Values:

```
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://your-app.vercel.app
SCOPES=read_products,write_products,read_inventory,write_inventory,read_locations,read_orders,write_orders,read_customers,write_customers,write_draft_orders,read_draft_orders,read_files,write_files,read_fulfillments,write_fulfillments
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
APP_JWT_SECRET=your_jwt_secret_minimum_32_characters_long
NODE_ENV=production
```

## Troubleshooting:

If you get the error "The name contains invalid characters", check:

1. **Variable Name**: Make sure it only has uppercase letters, numbers, and underscores
2. **No Hyphens**: Replace any hyphens with underscores
3. **Starts with Letter**: Make sure it starts with a letter, not a number
4. **No Special Characters**: Remove any dots, dashes, spaces, or special characters

## Valid Naming Examples:

✅ `API_KEY`
✅ `SHOPIFY_API_KEY`
✅ `SUPABASE_SERVICE_ROLE_KEY`
✅ `APP_JWT_SECRET`
✅ `DATABASE_URL`
✅ `NODE_ENV`

## Invalid Naming Examples:

❌ `API-KEY` (hyphen)
❌ `api-key` (lowercase + hyphen)
❌ `API.KEY` (dot)
❌ `API KEY` (space)
❌ `2API_KEY` (starts with number)
❌ `API_KEY!` (special character)
