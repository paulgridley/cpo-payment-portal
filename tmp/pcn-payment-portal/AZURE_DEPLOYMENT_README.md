# PCN Payment Portal - Azure Deployment Package

## Package Contents
This deployment package contains the complete PCN payment portal with:

- ✅ Popup payment system (latest feature)
- ✅ Streamlined main form (no email/terms required on main page)
- ✅ Civil Parking Office (CPO) design implementation
- ✅ Stripe Subscription Schedules (3-payment system)
- ✅ URL parameter integration for external site integration
- ✅ British spelling throughout ("Pay in Instalments")

## Deployment Command
```bash
az webapp deploy \
  --resource-group pcn-payment-rg \
  --name pcn-payment-portal \
  --src-path pcn-payment-portal.zip
```

## Environment Variables Required
Set these in Azure App Service Configuration:

```
DATABASE_URL=postgresql://username:password@server:5432/dbname
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

## Azure App Service Configuration
1. **Node.js version**: 18 or 20
2. **Startup command**: `node dist/index.js`
3. **Always On**: Enabled (recommended)
4. **Port**: Application will auto-detect Azure's PORT environment variable

## Post-Deployment Steps
1. Verify environment variables are set
2. Test the payment flow:
   - Main form accepts PCN, vehicle registration, amount
   - Payment buttons open popup for email collection
   - Stripe integration creates 3-payment subscription schedule
3. Check logs for any connection issues

## Features Included
- **Main Form**: PCN number, vehicle registration, penalty amount input
- **Payment Popup**: Email collection, terms acceptance, Stripe checkout
- **Payment Schedule**: Automatic 3-payment system (day 1, 31, 61)
- **Integration Tools**: URL parameters, bookmarklet, widget support

## Database Schema
The application will automatically create required tables on first run:
- customers: Stores customer data and Stripe integration IDs
- sessions: Express session storage

## Support
For deployment issues, check Azure App Service logs and ensure all environment variables are properly configured.