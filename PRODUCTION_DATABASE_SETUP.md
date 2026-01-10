# Production Database Setup Guide

## 🎯 Goal
Separate your production database from UAT/development database so your published app uses real production data.

---

## ⚡ Quick Steps (5 minutes)

### **Step 1: Create Production Database in Replit**

1. **Open Database Tool** in your Replit workspace (left sidebar)
2. **Click "Create a database"** or "Add Database"
3. **Select PostgreSQL**
4. **Name it:** `airea-production` (or any name you prefer)
5. **Copy the DATABASE_URL** from the Commands tab → Environment variables section

### **Step 2: Run Migration Script**

In your Replit Shell, run these commands:

```bash
# Set your production database URL (paste the URL you copied)
export DATABASE_URL_PROD='postgresql://user:password@host/database'

# Make the script executable
chmod +x migrate-to-production.sh

# Run the migration
./migrate-to-production.sh
```

This will create all tables in your production database.

### **Step 3: Configure Deployment**

1. **Go to Deployments tab** in Replit
2. **Click on your published deployment**
3. **Open Settings/Secrets tab**
4. **Find DATABASE_URL** and click "Edit" or "Override"
5. **Paste your production DATABASE_URL** (from Step 1)
6. **Save changes**

### **Step 4: Redeploy**

1. **Click "Redeploy"** or "Publish" button
2. **Wait 2-3 minutes** for deployment to complete
3. **Test your published app** - it should now use production database!

---

## 🔍 How to Verify It's Working

### Check 1: Different Databases
- **Development**: Should still have UAT data
- **Production**: Should be empty or have only production data

### Check 2: Environment Check
Your published app should show different data than your development workspace.

### Check 3: Database Tool
In Replit Database tool, you should see TWO databases:
- Original database (development/UAT)
- New production database (`airea-production`)

---

## 📊 Current vs Target Setup

### ❌ BEFORE (Current - Not Good)
```
Development Workspace → DATABASE_URL → UAT Database
                                           ↑
Published App         → DATABASE_URL ------┘ (SAME DATABASE - BAD!)
```

### ✅ AFTER (Target - Correct)
```
Development Workspace → DATABASE_URL      → UAT Database
Published App         → DATABASE_URL_PROD → Production Database (SEPARATE!)
```

---

## 🚨 Important Notes

1. **Two Databases = Two Datasets**
   - Development data and production data are now separate
   - Changes in dev won't affect production
   - You'll need to manage both databases

2. **Data Migration**
   - If you need to copy UAT data to production, let me know
   - I can create a data export/import script

3. **Future Updates**
   - Schema changes require running migration on BOTH databases
   - Or update the migration script to handle both

4. **Cost Considerations**
   - Two databases may have different costs
   - Check Replit's pricing for database usage

---

## 🆘 Troubleshooting

### "Migration failed"
- Check that DATABASE_URL_PROD is set correctly
- Ensure the production database URL is valid
- Try: `echo $DATABASE_URL_PROD` to verify

### "Deployment still uses UAT data"
- Verify DATABASE_URL is overridden in deployment settings
- Check that you redeployed after changing the variable
- Wait a few minutes for DNS/changes to propagate

### "Can't find Database tool"
- Look for database icon in left sidebar
- Or ask Replit Agent: "Create a PostgreSQL database"

---

## 🎉 Success Checklist

- [ ] Created new production database in Replit
- [ ] Copied production DATABASE_URL
- [ ] Ran migration script successfully
- [ ] Configured deployment with production DATABASE_URL
- [ ] Redeployed the app
- [ ] Verified published app uses production database

---

## Need Help?

If you encounter any issues:
1. Check the error messages carefully
2. Verify all URLs and credentials
3. Ask for assistance with specific error details
