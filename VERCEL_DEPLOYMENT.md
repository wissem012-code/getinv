# Deploying to Vercel

This guide will help you deploy your Shopify app to [Vercel](https://vercel.com/).

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. All required environment variables ready

## Step 1: Prepare Your Repository

Make sure your code is committed and pushed to your Git repository:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push
```

## Step 2: Connect to Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Vercel will automatically detect the project

## Step 3: Configure Build Settings

Vercel should auto-detect the settings from `vercel.json`, but verify:

- **Framework Preset**: Other
- **Root Directory**: `./` (or leave empty)
- **Build Command**: `npm run build && npm run setup`
- **Output Directory**: `build/client`
- **Install Command**: `npm install`

## Step 4: Configure Environment Variables

In the Vercel project settings, add all required environment variables:

### Required Variables:

```
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://your-app.vercel.app
SCOPES=read_products,write_products,read_inventory,write_inventory,read_locations,read_orders,write_orders,read_customers,write_customers
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
APP_JWT_SECRET=your_jwt_secret_min_32_chars
NODE_ENV=production
```

### Optional Variables:

```
SHOP_CUSTOM_DOMAIN=your-custom-domain.com
SUPABASE_FUNCTIONS_BASE=https://your-project.supabase.co/functions/v1
DATABASE_URL=your_database_url (if using Prisma with external DB)
```

**Important**: 
- Set `SHOPIFY_APP_URL` to your Vercel deployment URL after the first deploy
- Use a strong `APP_JWT_SECRET` (at least 32 characters)
- Never commit these values to Git

## Step 5: Database Setup

### For SQLite (Development):
The app will create a local SQLite database. This works for development but **not recommended for production**.

### For PostgreSQL (Production - Recommended):

1. Set up a PostgreSQL database (recommended providers):
   - [Supabase](https://supabase.com) (free tier available)
   - [Neon](https://neon.tech) (serverless PostgreSQL)
   - [Railway](https://railway.app) (easy PostgreSQL hosting)
   - [Render](https://render.com) (managed PostgreSQL)

2. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Add `DATABASE_URL` environment variable in Vercel:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```

4. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
   
   Or add to your build script:
   ```json
   "build": "prisma generate && react-router build && prisma migrate deploy"
   ```

## Step 6: Deploy

1. Click **"Deploy"** in Vercel
2. Wait for the build to complete
3. Copy your deployment URL (e.g., `https://your-app.vercel.app`)

## Step 7: Update Shopify App Configuration

1. Update `shopify.app.toml` with your Vercel URL:
   ```toml
   application_url = "https://your-app.vercel.app"
   
   [auth]
   redirect_urls = ["https://your-app.vercel.app/api/auth"]
   ```

2. Update the `SHOPIFY_APP_URL` environment variable in Vercel to match

3. Run Shopify CLI to update the app configuration:
   ```bash
   shopify app deploy
   ```

## Step 8: Update Shopify Partner Dashboard

1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Navigate to your app
3. Update **App URL** to: `https://your-app.vercel.app`
4. Update **Allowed redirection URL(s)** to include: `https://your-app.vercel.app/api/auth`

## Step 9: Verify Deployment

1. Visit your Vercel deployment URL
2. Test the app installation flow
3. Check Vercel logs for any errors:
   - Go to your project → **Deployments** → Click on deployment → **View Function Logs**

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify Node.js version (should be 20.x or 22.x)

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check database provider connection settings
- Ensure database allows connections from Vercel IPs

### Prisma Errors

- Make sure `DATABASE_URL` is set
- Run `npx prisma generate` before build
- For PostgreSQL, ensure migrations are run

### App Not Loading

- Verify `SHOPIFY_APP_URL` matches your Vercel URL
- Check Shopify app configuration
- Review Vercel function logs

### Environment Variables

- Double-check all required variables are set
- Ensure no typos in variable names
- Verify values don't have extra spaces

## Production Checklist

- [ ] All environment variables configured
- [ ] PostgreSQL database set up (not SQLite)
- [ ] `SHOPIFY_APP_URL` set to production URL
- [ ] Shopify app configuration updated
- [ ] All migrations run
- [ ] App tested in production
- [ ] Monitoring/logging configured
- [ ] Custom domain configured (optional)

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [React Router Deployment Guide](https://reactrouter.com/start/framework/react-router)
- [Shopify App Deployment](https://shopify.dev/docs/apps/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Shopify app logs
3. Verify all environment variables
4. Review this deployment guide
