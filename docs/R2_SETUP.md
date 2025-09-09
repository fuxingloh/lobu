# Cloudflare R2 Setup for Terraform State

This document explains how to set up Cloudflare R2 as the backend for Terraform state storage.

## Prerequisites

1. Cloudflare account with R2 enabled
2. R2 bucket created (we use `peerbot-tfstate`)
3. R2 API credentials (Access Key ID and Secret Access Key)
4. AWS CLI installed locally

## Getting R2 Credentials

1. Log in to Cloudflare Dashboard
2. Navigate to R2 > Overview
3. Click "Manage R2 API Tokens"
4. Create a new API token with:
   - Permission: Object Read & Write
   - Bucket: peerbot-tfstate (or select "All buckets")
5. Save the Access Key ID and Secret Access Key

## Local Setup

### Upload Existing State to R2

If you have an existing local Terraform state file, upload it to R2:

```bash
# Run the manual upload script
./scripts/upload-tfstate-manual.sh

# Or use the automated script with environment variables
export R2_BUCKET_NAME="peerbot-tfstate"
export R2_ENDPOINT="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
export R2_ACCESS_KEY_ID="your-access-key-id"
export R2_SECRET_ACCESS_KEY="your-secret-access-key"
./scripts/upload-tfstate-to-r2.sh
```

## GitHub Actions Setup

### 1. Set GitHub Secrets

The following secrets must be set in your GitHub repository:

```bash
# R2 Backend Configuration
R2_BUCKET_NAME          # R2 bucket name (e.g., peerbot-tfstate)
R2_ENDPOINT            # R2 endpoint URL (e.g., https://ACCOUNT_ID.r2.cloudflarestorage.com)
R2_ACCESS_KEY_ID       # R2 Access Key ID
R2_SECRET_ACCESS_KEY   # R2 Secret Access Key

# Hetzner Cloud
HCLOUD_TOKEN           # Hetzner Cloud API token

# Application Secrets
GITHUB_CLIENT_ID       # GitHub OAuth App Client ID
GITHUB_CLIENT_SECRET   # GitHub OAuth App Client Secret
ENCRYPTION_KEY         # Encryption key for sensitive data
SLACK_BOT_TOKEN       # Slack bot token
SLACK_APP_TOKEN       # Slack app token
SLACK_SIGNING_SECRET  # Slack signing secret
SLACK_CLIENT_ID       # Slack OAuth Client ID
SLACK_CLIENT_SECRET   # Slack OAuth Client Secret
SLACK_STATE_SECRET    # Slack state secret for OAuth
```

### 2. Using the Setup Script

Run the provided script to set GitHub secrets interactively:

```bash
# Set all secrets interactively
./scripts/setup-github-secrets.sh

# Or set R2 secrets only
./scripts/set-r2-secrets.sh
```

### 3. Manual Secret Setting

Alternatively, set secrets manually using GitHub CLI:

```bash
# Set R2 backend secrets
gh secret set R2_BUCKET_NAME --body "peerbot-tfstate" --repo OWNER/REPO
gh secret set R2_ENDPOINT --body "https://ACCOUNT_ID.r2.cloudflarestorage.com" --repo OWNER/REPO
gh secret set R2_ACCESS_KEY_ID --body "your-access-key-id" --repo OWNER/REPO
gh secret set R2_SECRET_ACCESS_KEY --body "your-secret-key" --repo OWNER/REPO

# Set Hetzner token
gh secret set HCLOUD_TOKEN --body "your-hcloud-token" --repo OWNER/REPO
```

## Terraform Backend Configuration

The GitHub Actions workflow automatically configures the S3 backend for R2:

```hcl
terraform {
  backend "s3" {
    bucket = "peerbot-tfstate"
    key    = "hetzner/terraform.tfstate"
    region = "auto"
    endpoint = "https://ACCOUNT_ID.r2.cloudflarestorage.com"
    skip_credentials_validation = true
    skip_metadata_api_check = true
    skip_region_validation = true
    skip_requesting_account_id = true
    force_path_style = true
  }
}
```

## Triggering Deployment

Once secrets are configured, trigger the deployment workflow:

```bash
# Using GitHub CLI
gh workflow run deploy-community.yml --ref main

# Or from GitHub UI
# Go to Actions > Deploy to Community Kubernetes > Run workflow
```

## Troubleshooting

### State Lock Issues

If you encounter state lock issues, R2 doesn't support DynamoDB-style locking. Consider:
1. Sequential deployments only
2. Manual coordination for concurrent changes
3. Using a different backend with locking support if needed

### Permission Errors

Ensure your R2 API token has:
- Object Read & Write permissions
- Access to the specific bucket or all buckets

### SSL Certificate Errors

If you encounter SSL errors with R2:
- The scripts automatically retry with `--no-verify-ssl` flag
- This is generally safe for R2 as it uses Cloudflare's infrastructure

## Next Steps

1. Verify state upload: `aws s3 ls s3://peerbot-tfstate/hetzner/ --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com`
2. Run GitHub Actions workflow to test deployment
3. Monitor the Actions tab for deployment status