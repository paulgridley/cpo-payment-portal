# CPO Payment Portal - Azure Deployment Package

This is a Node.js application for processing Charge Port Operator (CPO) penalty payments via Stripe installments.

## Features

- **Payment Processing**: 3-month installment plans via Stripe
- **Excel File Processing**: Upload and process penalty data from Excel files (with Azure Storage)
- **Database Integration**: PostgreSQL for data persistence
- **Graceful Degradation**: Application works without Azure Storage (file features will be unavailable)

## Quick Start

1. **Clone/Upload to GitHub**: Upload this package to https://github.com/paulgridley/cpo-payment-portal
2. **Azure App Service**: Create a new Azure App Service (Node.js 20.x)
3. **Configure Environment Variables** (see Configuration section)
4. **Deploy**: Connect GitHub repo to Azure App Service for continuous deployment

## Configuration

### Required Environment Variables

```bash
# Database (Required)
DATABASE_URL=postgresql://username:password@host:port/database

# Stripe (Required)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Azure Storage (Optional - app works without this)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
```

### Azure App Service Settings

```bash
# Node.js version
WEBSITE_NODE_DEFAULT_VERSION=20.x

# Build automation
SCM_DO_BUILD_DURING_DEPLOYMENT=true

# Port configuration
WEBSITES_PORT=5000
```

## Database Setup

1. Create PostgreSQL database (Azure Database for PostgreSQL recommended)
2. After deployment, run: `npm run db:push`
3. Update DATABASE_URL environment variable

## Stripe Integration

1. Create webhook endpoint: `https://yourapp.azurewebsites.net/api/stripe-webhook`
2. Configure webhook to listen for: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`
3. Add webhook secret to STRIPE_WEBHOOK_SECRET

## File Processing (Optional)

If AZURE_STORAGE_CONNECTION_STRING is configured:
- Upload Excel files via `/api/upload-penalties`
- Process existing files via `/api/process-files`
- Search penalties from Excel via `/api/search-penalties`

If not configured, these endpoints return 503 Service Unavailable.

## API Endpoints

- `GET /` - Frontend application
- `GET /api/search-penalties` - Search penalties by ticket number or VRM
- `POST /api/upload-penalties` - Upload and process Excel files
- `POST /api/create-checkout-session` - Create Stripe payment session
- `POST /api/stripe-webhook` - Stripe webhook handler

## Architecture

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Payments**: Stripe for installment processing
- **File Storage**: Azure Blob Storage (optional)

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm start
```

## Deployment Files

- `web.config` - IIS configuration for Azure App Service
- `deploy.cmd` - Azure deployment script
- `.deployment` - Deployment configuration

## Support

For deployment issues, check the Azure App Service logs and ensure all environment variables are properly configured.