# How to Run the Baseline Script (Step-by-Step)

## Where to Run These Commands

**Run these commands on your LOCAL Windows computer, in your project folder.**

NOT in Vercel. NOT in GitHub. On YOUR computer where you have the code.

---

## Step-by-Step Instructions

### Step 1: Open PowerShell

1. Press `Windows Key + X`
2. Click "Windows PowerShell" or "Terminal"
3. Or search "PowerShell" in Windows search

### Step 2: Navigate to Your Project Folder

In PowerShell, type:

```powershell
cd C:\getinv-shopify-app\getinv
```

Press Enter.

**Verify you're in the right folder:**
```powershell
pwd
```

Should show: `C:\getinv-shopify-app\getinv`

**Or check files:**
```powershell
ls
```

Should show: `package.json`, `prisma/`, `scripts/`, etc.

### Step 3: Pull Latest Code from GitHub (Optional but Recommended)

Make sure you have the baseline script:

```powershell
git pull
```

This downloads the latest code including the baseline script.

### Step 4: Set DIRECT_URL Environment Variable

**In the same PowerShell window**, type:

```powershell
$env:DIRECT_URL="postgresql://postgres:besemallah125@db.utrprngboxriryrgetkp.supabase.co:5432/postgres"
```

Press Enter.

**Verify it's set:**
```powershell
echo $env:DIRECT_URL
```

Should show your connection string (password will be visible).

### Step 5: Run the Baseline Script

**Still in the same PowerShell window**, type:

```powershell
npm run baseline
```

Press Enter.

**What you should see:**
```
🔧 Baslining Prisma migration...
   Migration: 20240530213853_create_session_table
   Connection: postgresql://postgres:****@db.utrprngboxriryrgetkp.supabase.co:5432/postgres

✅ Migration baselined successfully!

📋 Next steps:
   1. Commit and push to GitHub
   2. Vercel will auto-redeploy
   3. Build should now succeed
   4. Future migrations will work correctly
```

### Step 6: Commit and Push

After successful baseline:

```powershell
git add .
git commit -m "Baseline migration complete"
git push
```

---

## Visual Guide

```
┌─────────────────────────────────────────┐
│ Windows PowerShell                      │
├─────────────────────────────────────────┤
│ PS C:\Users\YourName>                   │
│                                         │
│ PS C:\Users\YourName> cd C:\getinv... │
│ PS C:\getinv-shopify-app\getinv>       │
│                                         │
│ PS C:\getinv-shopify-app\getinv>       │
│     $env:DIRECT_URL="postgresql://..." │
│                                         │
│ PS C:\getinv-shopify-app\getinv>       │
│     npm run baseline                    │
│     ✅ Migration baselined!             │
│                                         │
│ PS C:\getinv-shopify-app\getinv>       │
│     git push                            │
└─────────────────────────────────────────┘
```

---

## Alternative: Run All in One Command

If you want to do it all at once:

```powershell
cd C:\getinv-shopify-app\getinv; $env:DIRECT_URL="postgresql://postgres:besemallah125@db.utrprngboxriryrgetkp.supabase.co:5432/postgres"; npm run baseline
```

---

## Troubleshooting

**"npm: command not found"**
- Make sure Node.js is installed
- Try: `node --version` (should show v24.x)

**"Cannot find module"**
- Run: `npm install` first
- Then: `npm run baseline`

**"DIRECT_URL not set"**
- Make sure you set it in the same PowerShell window
- Type: `echo $env:DIRECT_URL` to verify

**"Cannot reach database server"**
- Check your DIRECT_URL is correct (port 5432)
- Verify IPv4 add-on is enabled in Supabase

---

## Summary

1. ✅ Open PowerShell on YOUR computer
2. ✅ Go to project folder: `cd C:\getinv-shopify-app\getinv`
3. ✅ Set DIRECT_URL: `$env:DIRECT_URL="..."`
4. ✅ Run baseline: `npm run baseline`
5. ✅ Push to GitHub: `git push`

That's it! 🎉
