# Fix: Functions Not Detected by Vercel

## Problem
- Functions tab is missing (it's now called "Resources" tab)
- `api/index.js` and `api/test.js` exist but aren't detected
- All routes return 404

## Root Cause
When `outputDirectory` is set in `vercel.json`, Vercel might **only deploy files from the output directory** and **not scan the root directory** for serverless functions in `api/`.

## Solution: Check Resources Tab First

Vercel changed "Functions" tab to **"Resources" tab**.

1. Go to Vercel Dashboard → Deployment → **Resources** tab
2. Look for "Functions" section
3. Check if `api/index` and `api/test` are listed

**If Resources tab shows functions:** ✅ Functions are detected, but maybe not working
**If Resources tab is empty or no functions:** ❌ Functions aren't being detected

## If Functions Still Not Detected

The issue is that `outputDirectory` might prevent Vercel from scanning root `api/` directory.

**Option 1: Remove outputDirectory (Not Recommended)**
- Forces Vercel to scan entire project
- But might break static asset serving

**Option 2: Copy api/ to outputDirectory (Better)**
- Ensure `api/` is included in deployment
- Modify build process to copy `api/` to `build/`

**Option 3: Use different approach**
- Move serverless function logic elsewhere
- Or use Vercel Edge Functions instead

## Next Steps

**First, check the Resources tab:**
1. Open deployment → **Resources** tab (not "Functions")
2. Look for "Functions" section
3. Report what you see

**Then we'll fix the detection issue if needed!**
