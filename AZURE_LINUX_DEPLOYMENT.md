# Azure Linux App Service Deployment Guide

## Overview

This guide provides a streamlined deployment process for the CPO Payment Portal to Azure App Service (Linux) using Node.js 20.x.

## Prerequisites

- Azure subscription
- GitHub account
- Node.js 20.x application (this repository)

## Deployment Steps

### 1. Repository Setup

1. Upload all files from this package to: https://github.com/paulgridley/cpo-payment-portal
2. Ensure the main branch contains all application files

### 2. Package.json Requirements

**IMPORTANT**: Add these entries to your package.json:

```json
{
  "name": "cpo-payment-portal",
  "engines": {
    "node": ">=20.x"
  },
  "scripts": {
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js"
  }
}
```

### 3. Create Azure App Service

```bash
# Create resource group
az group create --name cpo-payment-portal-rg --location "East US"

# Create App Service plan (Linux)
az appservice plan create --name cpo-payment-portal-plan --resource-group cpo-payment-portal-rg --sku B1 --is-linux

# Create App Service
az webapp create --resource-group cpo-payment-portal-rg --plan cpo-payment-portal-plan --name cpo-payment-portal --runtime "NODE:20-lts"
```

### 4. Configure App Service Settings

Set these environment variables in Azure Portal > App Service > Configuration:

**Required:**
```bash
DATABASE_URL=postgresql://username:password@host:port/database
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

**Optional (for file processing):**
```bash
AZURE_STORAGE_CONNECTION_STRING=your_azure_storage_connection_string
```

**System Settings:**
```bash
SCM_DO_BUILD_DURING_DEPLOYMENT=true
WEBSITE_NODE_DEFAULT_VERSION=20-lts
```

### 5. GitHub Actions Deployment (Recommended)

1. In Azure Portal, go to your App Service
2. Navigate to Deployment Center
3. Choose GitHub as source
4. Select your repository: `paulgridley/cpo-payment-portal`
5. Azure will create a publish profile secret in your GitHub repository
6. The included `.github/workflows/azure-deploy.yml` will handle deployments

### 6. Manual Deployment (Alternative)

If not using GitHub Actions:

```bash
# Deploy using Azure CLI
az webapp deployment source config --name cpo-payment-portal --resource-group cpo-payment-portal-rg --repo-url https://github.com/paulgridley/cpo-payment-portal --branch main --manual-integration
```

### 7. Database Setup

1. Create Azure Database for PostgreSQL
2. Run migrations after first deployment:
   ```bash
   # In Azure App Service Console
   npm run db:push
   ```

### 8. Stripe Webhook Configuration

1. In Stripe Dashboard, create webhook endpoint:
   - URL: `https://cpo-payment-portal.azurewebsites.net/api/stripe-webhook`
   - Events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`
2. Copy webhook secret to `STRIPE_WEBHOOK_SECRET` in Azure App Service settings

## Application Features

### ✅ Production Ready Features
- **Graceful startup**: App starts without Azure Storage configured
- **Error handling**: File features return 503 when storage unavailable
- **Payment processing**: Stripe 3-month installment plans
- **Database integration**: PostgreSQL with automatic migrations
- **Health monitoring**: Built-in logging and error tracking

### 📁 File Processing (Optional)
- Excel file upload and processing
- Penalty charge notice data management
- Automated file processing workflows

*Note: File features require AZURE_STORAGE_CONNECTION_STRING to be configured*

## Testing Deployment

After deployment, test these endpoints:

1. **Application**: https://cpo-payment-portal.azurewebsites.net/
2. **API Health**: https://cpo-payment-portal.azurewebsites.net/api/search-penalties?ticketNo=test
3. **File Upload**: POST to /api/upload-penalties (if storage configured)

## Troubleshooting

### Common Issues

**Build Failures:**
- Ensure Node.js version is 20.x in Azure App Service
- Check that all dependencies are in package.json (not just devDependencies)
- Verify build script runs successfully locally

**Database Connection:**
- Confirm DATABASE_URL format: `postgresql://username:password@host:port/database`
- Check firewall rules on database server
- Run `npm run db:push` after deployment

**Stripe Integration:**
- Verify webhook URL matches deployed app URL
- Check that all required Stripe environment variables are set
- Test webhook endpoint responds to POST requests

**File Processing:**
- File features return 503 when AZURE_STORAGE_CONNECTION_STRING is not set (this is expected)
- If storage is configured, verify container 'cpo' exists
- Check storage account permissions

### Logs and Debugging

- Azure Portal > App Service > Log stream
- Azure Portal > App Service > Advanced Tools (Kudu) > Debug console
- Application Insights (enable in Azure Portal for detailed monitoring)

## Production Checklist

- [ ] Database created and migrated
- [ ] All environment variables configured
- [ ] Stripe webhook endpoint configured
- [ ] SSL certificate enabled (automatic with Azure App Service)
- [ ] Custom domain configured (optional)
- [ ] Monitoring and alerts set up
- [ ] Backup strategy implemented

## Security Notes

- All secrets are stored as Azure App Service application settings (encrypted at rest)
- Database connections use SSL by default
- Application follows secure coding practices
- File uploads are validated and sanitized

This deployment approach uses Azure's native Linux container with Oryx build system, providing the most reliable and maintainable deployment experience.