# Azure Deployment Notes

## Pre-deployment Configuration Required

Since the package.json cannot be modified directly in this environment, you'll need to make these changes after deployment:

### 1. Update package.json
Add the following to your package.json:

```json
{
  "engines": {
    "node": ">=20.x"
  },
  "scripts": {
    "build:azure": "npm run build"
  }
}
```

### 2. Azure App Service Settings

Set these environment variables in your Azure App Service:

```bash
# Node.js version
WEBSITE_NODE_DEFAULT_VERSION=20.x

# Enable build automation  
SCM_DO_BUILD_DURING_DEPLOYMENT=true

# Application port
WEBSITES_PORT=5000

# Required for the application
DATABASE_URL=your_postgres_connection_string
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Optional - Azure Storage (the app handles missing gracefully)
AZURE_STORAGE_CONNECTION_STRING=your_azure_storage_connection_string
```

### 3. Database Setup

Make sure to:
1. Set up a PostgreSQL database (Azure Database for PostgreSQL recommended)
2. Run database migrations: `npm run db:push`
3. Update the DATABASE_URL environment variable

### 4. Stripe Configuration

1. Set up your Stripe account
2. Configure webhook endpoint: `https://yourapp.azurewebsites.net/api/stripe-webhook`
3. Add the webhook secret to STRIPE_WEBHOOK_SECRET

### 5. Azure Storage (Optional)

If you want file upload/processing features:
1. Create an Azure Storage Account
2. Create a container named 'cpo'
3. Add the connection string to AZURE_STORAGE_CONNECTION_STRING

If not configured, the app will still work but file-related features will return 503 errors.

## Deployment Process

1. Connect your GitHub repository to Azure App Service
2. Configure continuous deployment
3. Azure will automatically build and deploy when you push to the main branch

## Health Check

After deployment, visit:
- `https://yourapp.azurewebsites.net/` - Should show the application
- `https://yourapp.azurewebsites.net/api/search-penalties?ticketNo=test` - Should return either data or a service unavailable message

## Troubleshooting

- Check the Azure App Service logs for any runtime errors
- Ensure all environment variables are properly set
- Verify the Node.js version is set to 20.x
- Check that the database connection is working