#!/bin/bash

# Script to upload local Terraform state to R2 bucket
# This syncs the local state with the remote backend

set -e

echo "📦 Uploading Terraform state to R2"
echo "==================================="

# Check if terraform.tfstate exists
if [ ! -f "terraform.tfstate" ]; then
    echo "❌ terraform.tfstate not found in current directory"
    echo "   Please run this script from the Terraform directory"
    exit 1
fi

# Get R2 credentials
echo "Enter your R2 configuration:"
echo ""

if [ -n "$R2_ENDPOINT" ]; then
    echo "Using R2_ENDPOINT from environment"
else
    echo "Enter R2 endpoint (e.g., https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com):"
    read R2_ENDPOINT
fi

if [ -n "$R2_BUCKET_NAME" ]; then
    echo "Using R2_BUCKET_NAME from environment"
else
    echo "Enter R2 bucket name:"
    read R2_BUCKET_NAME
fi

if [ -n "$R2_ACCESS_KEY_ID" ]; then
    echo "Using R2_ACCESS_KEY_ID from environment"
else
    echo "Enter R2 Access Key ID:"
    read R2_ACCESS_KEY_ID
fi

if [ -n "$R2_SECRET_ACCESS_KEY" ]; then
    echo "Using R2_SECRET_ACCESS_KEY from environment"
else
    echo "Enter R2 Secret Access Key:"
    read -s R2_SECRET_ACCESS_KEY
    echo ""
fi

# Configure AWS CLI with R2 credentials
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

# Remove https:// from endpoint for AWS CLI
R2_ENDPOINT_CLEAN=$(echo "$R2_ENDPOINT" | sed 's|https://||')

echo ""
echo "📤 Uploading state files to R2..."

# Upload the current state file
aws s3 cp terraform.tfstate "s3://${R2_BUCKET_NAME}/hetzner/terraform.tfstate" \
    --endpoint-url "https://${R2_ENDPOINT_CLEAN}" \
    --no-verify-ssl 2>/dev/null || aws s3 cp terraform.tfstate "s3://${R2_BUCKET_NAME}/hetzner/terraform.tfstate" \
    --endpoint-url "https://${R2_ENDPOINT_CLEAN}"

if [ $? -eq 0 ]; then
    echo "✅ Successfully uploaded terraform.tfstate"
else
    echo "❌ Failed to upload terraform.tfstate"
    exit 1
fi

# Also upload the backup if it exists
if [ -f "terraform.tfstate.backup" ]; then
    aws s3 cp terraform.tfstate.backup "s3://${R2_BUCKET_NAME}/hetzner/terraform.tfstate.backup" \
        --endpoint-url "https://${R2_ENDPOINT_CLEAN}" \
        --no-verify-ssl 2>/dev/null || aws s3 cp terraform.tfstate.backup "s3://${R2_BUCKET_NAME}/hetzner/terraform.tfstate.backup" \
        --endpoint-url "https://${R2_ENDPOINT_CLEAN}"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully uploaded terraform.tfstate.backup"
    fi
fi

echo ""
echo "📋 Verifying upload..."

# List the uploaded files
aws s3 ls "s3://${R2_BUCKET_NAME}/hetzner/" \
    --endpoint-url "https://${R2_ENDPOINT_CLEAN}" \
    --no-verify-ssl 2>/dev/null || aws s3 ls "s3://${R2_BUCKET_NAME}/hetzner/" \
    --endpoint-url "https://${R2_ENDPOINT_CLEAN}"

echo ""
echo "✨ State upload complete!"
echo ""
echo "Next steps:"
echo "1. Configure Terraform to use the S3 backend:"
echo ""
echo "terraform {"
echo "  backend \"s3\" {"
echo "    bucket = \"$R2_BUCKET_NAME\""
echo "    key    = \"hetzner/terraform.tfstate\""
echo "    region = \"auto\""
echo "    endpoint = \"$R2_ENDPOINT\""
echo "    skip_credentials_validation = true"
echo "    skip_metadata_api_check = true"
echo "    skip_region_validation = true"
echo "    skip_requesting_account_id = true"
echo "    force_path_style = true"
echo "  }"
echo "}"
echo ""
echo "2. Run 'terraform init -reconfigure' to switch to the remote backend"
echo "3. GitHub Actions should now work with the existing state"