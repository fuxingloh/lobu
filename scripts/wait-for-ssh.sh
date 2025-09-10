#!/bin/bash
# Wait for SSH to be available on servers before attempting provisioning

set -e

# Function to test SSH connectivity
test_ssh() {
    local ip=$1
    ssh -o ConnectTimeout=5 \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        -o PasswordAuthentication=no \
        -o PreferredAuthentications=publickey \
        -o LogLevel=ERROR \
        -i ~/.ssh/id_ed25519 \
        root@$ip "echo 'SSH is ready'" 2>/dev/null
}

# Function to wait for SSH on a single server
wait_for_server() {
    local ip=$1
    local max_attempts=60  # 5 minutes total
    local attempt=1
    
    echo "Waiting for SSH on $ip..."
    while [ $attempt -le $max_attempts ]; do
        if test_ssh $ip; then
            echo "✓ SSH is ready on $ip"
            return 0
        fi
        echo "  Attempt $attempt/$max_attempts - SSH not ready yet, waiting..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    echo "✗ SSH failed to become ready on $ip after $max_attempts attempts"
    return 1
}

# Main execution
echo "Checking SSH connectivity to Hetzner servers..."

# Get server IPs from terraform output or hcloud
if command -v terraform >/dev/null 2>&1; then
    # Try to get IPs from Terraform state
    SERVER_IPS=$(terraform output -json 2>/dev/null | jq -r '.control_plane_ips.value[]' 2>/dev/null || echo "")
fi

if [ -z "$SERVER_IPS" ] && command -v hcloud >/dev/null 2>&1; then
    # Fallback to hcloud CLI
    SERVER_IPS=$(hcloud server list -o columns=ipv4 -o noheader 2>/dev/null || echo "")
fi

if [ -z "$SERVER_IPS" ]; then
    echo "No server IPs found. Make sure servers are created first."
    exit 1
fi

# Wait for all servers
failed_servers=""
for ip in $SERVER_IPS; do
    if ! wait_for_server $ip; then
        failed_servers="$failed_servers $ip"
    fi
done

if [ -n "$failed_servers" ]; then
    echo "Failed to establish SSH connection to:$failed_servers"
    exit 1
fi

echo "All servers are accessible via SSH!"