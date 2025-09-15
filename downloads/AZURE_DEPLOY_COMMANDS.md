# Azure Deployment Commands for PCN Payment Portal

## Your Deployment Package
**File**: `pcn-payment-portal.zip` (UPDATED with latest popup system)
**Location**: `/Downloads/pcn-payment-portal.zip`

## Deployment Command
```bash
az webapp deploy \
  --resource-group pcn-payment-rg \
  --name pcn-payment-portal \
  --src-path /Users/paulgridley/Downloads/pcn-payment-portal.zip
```

## Package Contents - UPDATED VERSION
✅ **NEW: Popup payment system** - Email collection in secure popup
✅ **NEW: Streamlined main form** - Only PCN, vehicle, amount required
✅ **NEW: /payment route** - Dedicated payment page with terms
✅ Civil Parking Office (CPO) design implementation
✅ Stripe Subscription Schedules (3-payment system)
✅ URL parameter integration for external sites
✅ Azure-specific deployment files (web.config, deploy.cmd)
✅ All latest popup system changes included

## Environment Variables to Set in Azure
```bash
# Required environment variables
DATABASE_URL=postgresql://username:password@server:5432/dbname
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Optional
NODE_ENV=production
PORT=8080
```

## Azure App Service Configuration
- **Runtime**: Node.js 18 or 20
- **Startup Command**: `node dist/index.js`
- **Always On**: Enabled (recommended)

## Post-Deployment Verification
1. Check application logs in Azure portal
2. Test payment flow:
   - Main form accepts PCN details
   - Payment buttons open popup
   - Stripe integration works
3. Verify database connections

## Features Included in This Package
- **Popup Payment System** (latest feature)
- **Streamlined Main Form** (no email/terms on main page)
- **British Spelling** throughout
- **3-Payment Subscription Schedule** (day 1, 31, 61)
- **URL Parameter Support** for external integration
- **CPO Design Match** from WhatsApp reference

Ready for deployment! 🚀