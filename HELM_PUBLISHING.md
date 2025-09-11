# Helm Chart Publishing to ArtifactHub

This document describes the automated Helm chart publishing setup for Peerbot, which publishes charts to both GitHub Pages and ArtifactHub.

## Overview

The Peerbot Helm chart is automatically published using GitHub Actions when changes are made to the `charts/` directory. The chart is published to:

1. **GitHub Pages** (https://buremba.github.io/peerbot) - Traditional Helm repository
2. **GitHub Container Registry** (ghcr.io/buremba/peerbot) - OCI registry
3. **ArtifactHub** - Public chart discovery and metadata

## Repository URLs

### GitHub Pages (Traditional Helm Repository)
```bash
helm repo add peerbot https://buremba.github.io/peerbot
helm repo update
helm install my-peerbot peerbot/peerbot
```

### OCI Registry (GitHub Container Registry)
```bash
helm install my-peerbot oci://ghcr.io/buremba/peerbot --version 1.0.1
```

### ArtifactHub
Visit: https://artifacthub.io/packages/search?repo=peerbot

## Automated Publishing Workflow

### Workflow Trigger
The publishing workflow (`/.github/workflows/helm-chart-release.yml`) is triggered on:
- Pushes to `main` branch
- Changes to `charts/**` paths

### Workflow Steps

1. **Chart Validation & Packaging**
   - Validates Helm chart syntax
   - Adds required Helm repositories (Bitnami for PostgreSQL)
   - Packages the chart using `helm/chart-releaser-action`

2. **GitHub Release Creation**
   - Creates a GitHub release with the packaged chart (.tgz)
   - Updates the GitHub Pages `index.yaml` file
   - Publishes to GitHub Pages via `gh-pages` branch

3. **OCI Registry Publishing**
   - Packages and pushes the chart to GitHub Container Registry
   - Enables OCI-based chart distribution

## ArtifactHub Configuration

### Repository Metadata (`artifacthub-repo.yml`)
Located on the `gh-pages` branch, this file contains:
- Repository ownership information
- Verified publisher configuration
- Repository description and links

### Chart Metadata (`Chart.yaml`)
Enhanced with ArtifactHub-specific annotations:
```yaml
annotations:
  artifacthub.io/license: MIT
  artifacthub.io/operator: "false" 
  artifacthub.io/containsSecurityUpdates: "false"
  artifacthub.io/images: |
    - name: peerbot-dispatcher
      image: ghcr.io/buremba/peerbot-dispatcher:latest
    - name: peerbot-orchestrator  
      image: ghcr.io/buremba/peerbot-orchestrator:latest
    - name: peerbot-worker
      image: ghcr.io/buremba/peerbot-worker:latest
  artifacthub.io/links: |
    - name: GitHub Repository
      url: https://github.com/buremba/peerbot
    - name: Documentation
      url: https://github.com/buremba/peerbot#readme
  artifacthub.io/recommendations: |
    - url: https://artifacthub.io/packages/helm/bitnami/postgresql
  artifacthub.io/changes: |
    - kind: added
      description: Initial Helm chart for Peerbot deployment
```

## Manual Publishing

If you need to manually publish a chart version:

1. **Update Chart Version**
   ```bash
   # Edit charts/peerbot/Chart.yaml
   version: 1.0.2  # Increment version
   ```

2. **Commit and Push**
   ```bash
   git add charts/peerbot/Chart.yaml
   git commit -m "bump: chart version to 1.0.2"
   git push origin main
   ```

3. **Monitor Workflow**
   ```bash
   gh run list --workflow=helm-chart-release.yml
   gh run watch [RUN_ID]
   ```

## Verification

After publishing, verify the chart is available:

### GitHub Pages Repository
```bash
helm repo add peerbot https://buremba.github.io/peerbot
helm search repo peerbot
```

### OCI Registry
```bash
helm show chart oci://ghcr.io/buremba/peerbot --version [VERSION]
```

### GitHub Releases
Visit: https://github.com/buremba/peerbot/releases

## ArtifactHub Integration

### Initial Setup
1. Chart is automatically discovered by ArtifactHub from GitHub Pages
2. Repository ownership can be claimed using the `artifacthub-repo.yml` file
3. Verified publisher status can be requested after ownership verification

### Metadata Updates
ArtifactHub metadata is updated automatically when:
- Chart version changes
- Chart.yaml annotations are modified
- Repository metadata file is updated

## Troubleshooting

### Common Issues

1. **Dependency Resolution Errors**
   - Ensure all chart dependencies are added to the workflow
   - Current dependencies: `bitnami/postgresql`

2. **GitHub Pages 404 Errors**
   - GitHub Pages may take a few minutes to deploy
   - Check the Pages deployment status in repository settings

3. **OCI Registry Authentication**
   - Uses `GITHUB_TOKEN` for authentication
   - No additional secrets required

### Workflow Logs
```bash
gh run list --workflow=helm-chart-release.yml
gh run view [RUN_ID] --log
```

## Files Created/Modified

- `/.github/workflows/helm-chart-release.yml` - Main publishing workflow
- `/cr.yaml` - Chart releaser configuration  
- `/charts/peerbot/Chart.yaml` - Enhanced with ArtifactHub metadata
- `gh-pages` branch with `artifacthub-repo.yml` - Repository metadata

## Next Steps

1. **Claim Repository Ownership** on ArtifactHub
   - Visit ArtifactHub repository page
   - Use the ownership claim feature
   - Repository ID will be added to `artifacthub-repo.yml` automatically

2. **Request Verified Publisher Status**
   - After ownership claim is approved
   - Status will be reflected on ArtifactHub listings

3. **Monitor Chart Discovery**
   - Charts should appear on ArtifactHub within 24 hours
   - Search for "peerbot" on https://artifacthub.io