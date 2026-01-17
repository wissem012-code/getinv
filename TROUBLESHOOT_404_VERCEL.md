# Troubleshooting 404 on Vercel

## Current Status
- ✅ `api/index.js` file exists
- ✅ Function exports default handler
- ✅ `vercel.json` has rewrite rule
- ❌ Vercel returning 404 (function not detected)

## Possible Issues

### Issue 1: Function Not Being Deployed
**Check:** Is the `api` directory being included in the deployment?

**Solution:** Verify in Vercel build logs that `api/index.js` is present.

### Issue 2: Function Format Issue
**Check:** Does Vercel recognize the function export format?

**Current format:**
```javascript
export default async function handler(req, res) {
  // ...
}
```

This should work with `"type": "module"` in package.json (which we have).

### Issue 3: Build Artifacts Not Available
**Check:** The function imports from `../build/server/index.js`

**Problem:** If `build` directory isn't available during function execution, the import will fail.

**Verify:** Check if `.vercelignore` excludes something needed, or if the build output is in the right location.

## Immediate Action Items

### 1. Check Vercel Deployment Logs
In Vercel Dashboard → Deployments → Latest:
- Look for "Detected serverless functions" message
- Check if `api/index.js` is listed
- Check for any build warnings or errors

### 2. Test Direct Function Access
Try accessing the function directly:
```
https://getinv.vercel.app/api/index
```

**Expected:**
- If function is detected: Should see function response or error
- If not detected: Still 404

### 3. Verify Build Output
In build logs, check:
- Is `build/server/index.js` being created?
- Is `build/client` directory being created?
- Any errors during the build?

### 4. Check .vercelignore
Make sure `.vercelignore` doesn't exclude:
- `api/` directory (it doesn't in current config ✅)
- But it does exclude `build/` - this might be the issue!

**The Problem:** `.vercelignore` has `build` which excludes the build directory, but the serverless function needs `build/server/index.js`!

## Solution: Fix .vercelignore

The function needs the `build` directory, but `.vercelignore` is excluding it!

**Fix:** We need to either:
1. Copy `build` to the deployment, or
2. Change how the function accesses the build artifacts

Actually, wait - Vercel rebuilds everything, so the `build` directory should be created during the build process. The issue is that after build, Vercel needs to have access to both:
- `build/client` (for static files)
- `build/server` (for the serverless function)

But `.vercelignore` excludes `build`, which might be preventing the server directory from being available.

However, Vercel's build process should make `build` available during function execution. The real issue might be something else.

## Next Steps

1. Check Vercel build logs for function detection
2. Test `/api/index` directly
3. Check if function logs show any errors
4. Verify the function is being deployed correctly
