#!/bin/bash

# Script to set R2 credentials in GitHub Secrets

set -e

echo "🔐 Setting R2 Access Credentials in GitHub Secrets"
echo "=================================================="
echo ""

# Prompt for R2 Access Key ID
echo "Enter R2 Access Key ID:"
read -r R2_ACCESS_KEY_ID

# Prompt for R2 Secret Access Key
echo "Enter R2 Secret Access Key:"
read -rs R2_SECRET_ACCESS_KEY
echo ""

# Set the secrets
echo ""
echo "Setting GitHub secrets..."
gh secret set R2_ACCESS_KEY_ID --body "$R2_ACCESS_KEY_ID" --repo buremba/peerbot
echo "✅ Set R2_ACCESS_KEY_ID"

gh secret set R2_SECRET_ACCESS_KEY --body "$R2_SECRET_ACCESS_KEY" --repo buremba/peerbot
echo "✅ Set R2_SECRET_ACCESS_KEY"

echo ""
echo "✨ R2 credentials have been set in GitHub Secrets!"
echo ""
echo "You can now run the upload-tfstate-to-r2.sh script with these credentials."