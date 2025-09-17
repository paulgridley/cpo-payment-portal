# CPO Payment Portal - Quick Deployment

## Deployment Command
```bash
az webapp deploy \
  --resource-group pcn-payment-rg \
  --name cpo-payment \
  --src-path /Users/paulgridley/Downloads/pcn-payment-portal.zip
```

## Post-Deployment Setup

### Set Environment Variables in Azure Portal
1. Go to Azure Portal → App Services → cpo-payment
2. Navigate to Configuration → Application settings
3. Add these required variables:

```
DATABASE_URL=postgresql://username:password@server:5432/dbname
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...
NODE_ENV=production
```

### App Service Configuration
- **Runtime**: Node.js 18 LTS
- **Startup Command**: `node dist/index.js`
- **Always On**: Enable for production

## Features Deployed
- Popup payment system (email collection in secure popup)
- Streamlined main form (PCN, vehicle, amount only)
- Civil Parking Office design
- Stripe Subscription Schedules (3 payments: day 1, 31, 61)
- URL parameter integration
- British spelling throughout

## App URL
https://cpo-payment.azurewebsites.net

## Verification Steps
1. Check deployment logs in Azure Portal
2. Test main form with sample PCN data
3. Verify payment popup opens correctly
4. Test Stripe integration with test cards