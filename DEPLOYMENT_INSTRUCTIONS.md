# Azure Deployment Instructions for CPO Payment Portal

## Package Ready for Deployment

I've prepared your application for Azure deployment and created all necessary configuration files. Due to Git repository constraints in this environment, you'll need to manually upload the code to your GitHub repository.

## Files Created for Azure Deployment

### Core Azure Files
- `web.config` - IIS configuration for Azure App Service
- `deploy.cmd` - Custom deployment script for Azure
- `.deployment` - Tells Azure to use the custom deployment script
- `AZURE_DEPLOYMENT_NOTES.md` - Detailed configuration instructions

### Deployment Package
- `azure-deployment-package/` - Contains all files needed for deployment
- `azure-deployment-package/README.md` - Comprehensive deployment guide

## Step-by-Step Deployment Process

### 1. Upload to GitHub Repository

1. Download or copy all files from the `azure-deployment-package/` directory
2. Create a new repository or use existing: https://github.com/paulgridley/cpo-payment-portal
3. Upload all files to the repository
4. Commit and push to the main branch

### 2. Package.json Modifications Needed

Since I cannot modify package.json directly, you'll need to add these lines to your package.json after uploading:

```json
{
  "name": "cpo-payment-portal",
  "engines": {
    "node": ">=20.x"
  },
  "scripts": {
    "build:azure": "npm run build"
  }
}
```

### 3. Create Azure App Service

1. Go to Azure Portal
2. Create new App Service
3. Choose:
   - **Runtime stack**: Node.js 20 LTS
   - **Operating System**: Linux (recommended) or Windows

### 4. Configure Environment Variables

In Azure App Service > Configuration > Application settings, add:

**Required:**
```bash
DATABASE_URL=postgresql://username:password@host:port/database
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
WEBSITE_NODE_DEFAULT_VERSION=20.x
SCM_DO_BUILD_DURING_DEPLOYMENT=true
WEBSITES_PORT=5000
```

**Optional (for file processing):**
```bash
AZURE_STORAGE_CONNECTION_STRING=your_azure_storage_connection_string
```

### 5. Set Up Continuous Deployment

1. In Azure App Service > Deployment Center
2. Choose **GitHub** as source
3. Authorize Azure to access your GitHub account
4. Select repository: `paulgridley/cpo-payment-portal`
5. Select branch: `main`
6. Azure will automatically deploy when you push changes

### 6. Database Setup

1. Create Azure Database for PostgreSQL (recommended)
2. Update DATABASE_URL in App Service configuration
3. After first deployment, run database migration:
   - Go to Azure App Service > Console
   - Run: `npm run db:push`

### 7. Stripe Configuration

1. In your Stripe dashboard, create a webhook endpoint
2. URL: `https://your-app-name.azurewebsites.net/api/stripe-webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
4. Copy the webhook secret to STRIPE_WEBHOOK_SECRET

## Application Features

Your application includes these key features:

### ✅ **Deployment-Ready Features**
- **Graceful Azure Storage handling** - App starts successfully even without Azure Storage
- **Proper error handling** - Routes return 503 Service Unavailable when storage is missing
- **Stripe payment processing** - Works independently of file storage
- **Database integration** - PostgreSQL with Drizzle ORM
- **Production-ready build system** - Optimized for Azure deployment

### 📁 **File Processing Features** (Optional)
- Excel file upload and processing
- Penalty data search from uploaded files
- Automatic file processing workflows

If Azure Storage is not configured, these features will return user-friendly error messages instead of crashing the application.

## Testing the Deployment

After deployment, test these URLs:

1. **Main App**: `https://your-app-name.azurewebsites.net/`
2. **API Health**: `https://your-app-name.azurewebsites.net/api/search-penalties?ticketNo=test`
   - Should return either penalty data or "service unavailable" message
3. **File Upload**: Test with Excel file upload (if Azure Storage configured)

## Troubleshooting

- **Build failures**: Check that Node.js version is set to 20.x
- **Database errors**: Verify DATABASE_URL and run `npm run db:push`
- **Stripe errors**: Check webhook URL and secret configuration
- **File upload errors**: Ensure AZURE_STORAGE_CONNECTION_STRING is set (or expect 503 errors)

## Next Steps

1. Upload the deployment package to GitHub
2. Create Azure App Service
3. Configure environment variables
4. Set up continuous deployment
5. Test the application

The application is now ready for production deployment on Azure!