#!/bin/bash

# GitHub Repository Setup for CPO Portal
# Run this in your local project directory

echo "📁 Setting up GitHub repository for CPO Portal..."

# Variables
REPO_NAME="cpo-portal"
GITHUB_USERNAME="paulgridley"

# 1. Create GitHub repository (requires GitHub CLI)
echo "🔨 Creating GitHub repository..."
gh repo create $REPO_NAME --public --description "CPO Payment Portal with Popup System and Stripe Integration"

# 2. Initialize Git repository
echo "📝 Initializing Git repository..."
git init
git add .
git commit -m "feat: initial CPO payment portal implementation

- Popup payment system for streamlined user experience
- Civil Parking Office design matching reference image
- Stripe Subscription Schedules for 3-payment system (day 1, 31, 61)
- URL parameter integration for external site integration
- British spelling throughout (Pay in Instalments)
- Azure deployment configuration included
- Complete TypeScript/React frontend with Express backend"

# 3. Set up remote and push
echo "🚀 Pushing to GitHub..."
git branch -M main
git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git

# Push with authentication
echo "🔐 Pushing code... (you may need to authenticate)"
git push -u origin main

echo "✅ GitHub repository setup complete!"
echo "🌐 Repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME"

# 4. Display next steps
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in Azure:"
echo "   - DATABASE_URL"
echo "   - STRIPE_SECRET_KEY"
echo "   - VITE_STRIPE_PUBLIC_KEY"
echo ""
echo "2. Deploy to Azure:"
echo "   az webapp deploy --resource-group pcn-payment-rg --name cpo-portal --src-path ./deployment.zip"
echo ""
echo "3. Test the application:"
echo "   - Main form: PCN, vehicle, amount input"
echo "   - Payment popup: Email collection and Stripe checkout"
echo "   - 3-payment schedule: Verify subscription creation"