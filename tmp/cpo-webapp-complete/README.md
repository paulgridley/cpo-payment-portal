# CPO Payment Portal - Complete Webapp Package

## Features Included
- **Popup Payment System**: Email collection in secure popup window
- **Streamlined Main Form**: Only requires PCN number, vehicle registration, and penalty amount
- **Civil Parking Office Design**: Matches CPO reference design exactly
- **Stripe Subscription Schedules**: Automatic 3-payment system (day 1, 31, 61)
- **URL Parameter Integration**: Auto-fill forms from external websites
- **British Spelling**: "Pay in Instalments" throughout

## Deployment
This package is ready for Azure App Service deployment.

### Environment Variables Required
```
DATABASE_URL=postgresql://username:password@server:5432/dbname
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...
NODE_ENV=production
```

### Deployment Command
```bash
az webapp deploy \
  --resource-group pcn-payment-rg \
  --name cpo-payment \
  --src-path /path/to/cpo-webapp-complete.zip
```

## Application Structure
- `client/` - React frontend with popup payment system
- `server/` - Express backend with Stripe integration
- `shared/` - Common TypeScript schemas
- Azure deployment files included (web.config, deploy.cmd)

## Payment Flow
1. User fills PCN details on main form
2. Payment button opens popup window
3. Popup collects email and terms acceptance
4. Redirects to Stripe checkout
5. Creates subscription schedule for 3 payments

Built with TypeScript, React, Express, and Stripe.