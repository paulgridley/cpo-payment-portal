#!/bin/bash

# Azure Clean Deployment Script for CPO Payment Portal
# This script will stop, clean, and redeploy the webapp

RESOURCE_GROUP="pcn-payment-rg"
APP_NAME="cpo-payment"

echo "🛑 Stopping webapp..."
az webapp stop --resource-group $RESOURCE_GROUP --name $APP_NAME

echo "🧹 Clearing deployment files..."
az webapp deployment source delete --resource-group $RESOURCE_GROUP --name $APP_NAME

echo "🔄 Restarting webapp..."
az webapp restart --resource-group $RESOURCE_GROUP --name $APP_NAME

echo "🚀 Deploying fresh package..."
az webapp deploy \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --src-path /Users/paulgridley/Downloads/cpo-webapp-complete.zip \
  --clean true

echo "✅ Clean deployment complete!"
echo "🌐 Check your app at: https://$APP_NAME.azurewebsites.net"