# Fix: 404 NOT_FOUND Error on Vercel

## Problem

Getting `404: NOT_FOUND` on the main page after successful deployment.

## Debugging Steps

### Step 1: Check Vercel Function Logs

1. Go to Vercel Dashboard → Your Project
2. Click **Deployments** → Latest deployment
3. Click **Functions** tab
4. Look for `/api/index` function logs

**What to check:**
- Is the function being invoked? (Should see `[api/index] Request received` logs)
- Are there any errors in the function logs?
- What headers is Vercel sending? (Check for `x-vercel-matched-path`, etc.)

### Step 2: Check Build Output

Verify the build created the serverless function:

1. Vercel Dashboard → Deployments → Latest
2. Check **Build Logs**
3. Should see: `Output directory: build/client`
4. Should see: Serverless function `/api/index` detected

### Step 3: Test Direct Function Access

Try accessing the function directly:
```
https://getinv.vercel.app/api/index
```

**Expected:**
- If it works: Routing issue (rewrite problem)
- If it fails: Function deployment issue

## Potential Fixes

### Fix 1: Ensure Serverless Function is Detected

The `/api/index.js` file must export a default function:

```javascript
export default async function handler(req, res) {
  // ...
}
```

✅ This is correct in your `api/index.js`

### Fix 2: Check Vercel.json Rewrite Pattern

Current configuration:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index"
    }
  ]
}
```

**Alternative pattern (try this):**
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index"
    }
  ],
  "functions": {
    "api/index.js": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

### Fix 3: Verify Build Output Directory

Make sure `build/client` exists after build:

```bash
# After build, check:
ls -la build/client
```

Should contain `index.html` and other assets.

### Fix 4: Check React Router Routes

Verify your root route exists:
- `app/routes/_index/route.tsx` or
- `app/routes/app._index.tsx`

## Most Likely Issue

The **rewrite is not preserving the original path**. When Vercel rewrites `/(.*)` → `/api/index`, the original path might not be in headers.

**Solution:** The `api/index.js` should extract the path from:
1. `x-vercel-matched-path` (from source pattern)
2. `x-vercel-original-url` (full original URL)
3. Fallback to `/` if both missing

## Next Steps

1. ✅ Check Vercel function logs to see what's happening
2. ✅ Verify function is being invoked
3. ✅ Check what headers Vercel is sending
4. ✅ Update path extraction logic if needed

## If Function Logs Show Path Issues

If logs show `originalPath` is always `/` or missing, we need to:
1. Update the rewrite pattern
2. Or change how we extract the path
3. Or use a different Vercel configuration

---

**Check the Vercel function logs first** - they'll tell us exactly what's happening! 🔍
