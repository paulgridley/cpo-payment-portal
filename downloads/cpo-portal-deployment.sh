#!/bin/bash

# CPO Portal Deployment Script
# Complete setup for new Azure web app and GitHub repository

echo "🚀 Starting CPO Portal deployment setup..."

# Variables (update these)
RESOURCE_GROUP="pcn-payment-rg"
APP_NAME="cpo-portal"
GITHUB_USERNAME="paulgridley"
REPO_NAME="cpo-portal"

# 1. Create Azure Web App
echo "📦 Creating Azure Web App..."
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan <YOUR_APP_SERVICE_PLAN> \
  --name $APP_NAME \
  --runtime "NODE|18-lts"

# 2. Configure Environment Variables
echo "⚙️ Setting environment variables..."
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings NODE_ENV="production" \
             WEBSITE_NODE_DEFAULT_VERSION="18.17.0"

# Note: Add your actual secrets manually:
echo "🔐 Remember to set these secrets in Azure Portal:"
echo "  - DATABASE_URL"
echo "  - STRIPE_SECRET_KEY" 
echo "  - VITE_STRIPE_PUBLIC_KEY"

# 3. Deploy from ZIP file
echo "🚀 Deploying application..."
az webapp deploy \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --src-path /Users/paulgridley/Downloads/pcn-payment-portal.zip

echo "✅ Deployment complete!"
echo "🌐 Your app will be available at: https://$APP_NAME.azurewebsites.net"

# 4. Optional: Set up GitHub integration
read -p "Set up GitHub integration? (y/n): " setup_github

if [ "$setup_github" = "y" ]; then
    echo "🔗 Setting up GitHub integration..."
    az webapp deployment source config \
      --resource-group $RESOURCE_GROUP \
      --name $APP_NAME \
      --repo-url https://github.com/$GITHUB_USERNAME/$REPO_NAME \
      --branch main \
      --manual-integration
    
    echo "✅ GitHub integration configured!"
fi

echo "🎉 CPO Portal setup complete!"