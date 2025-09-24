# Orchestrator Agent Instructions

## Package Overview
The orchestrator is the deployment and lifecycle management service that handles worker container orchestration. It manages the creation, scaling, and cleanup of worker deployments across Docker and Kubernetes environments.

## Core Responsibilities

### Deployment Management
- **Worker Lifecycle**: Creates, scales, and destroys worker deployments based on demand
- **Environment Detection**: Auto-detects Docker vs Kubernetes environments and chooses appropriate deployment strategy
- **Resource Management**: Manages CPU/memory limits and persistent storage for workers
- **Multi-Platform Support**: Supports both Docker Compose (local dev) and Kubernetes (production)

### Queue Processing
- **Task Queue Consumer**: Consumes deployment requests from PostgreSQL queues
- **Deployment Coordination**: Orchestrates worker creation in response to user requests
- **Status Tracking**: Monitors deployment status and reports back to dispatcher

### Resource Reconciliation
- **Idle Cleanup**: Automatically removes idle worker deployments to conserve resources
- **Health Monitoring**: Monitors worker health and performs cleanup of failed deployments
- **Scaling Operations**: Handles dynamic scaling of worker deployments based on load

## Key Components

### Deployment Managers (`src/base/`, `src/docker/`, `src/k8s/`)
- `BaseDeploymentManager.ts`: Abstract interface for deployment operations
- `DockerDeploymentManager.ts`: Docker-specific deployment implementation
- `K8sDeploymentManager.ts`: Kubernetes-specific deployment implementation

### Secret Management
- `BaseSecretManager.ts`: Abstract interface for secret operations
- `PostgresSecretManager.ts`: Database-backed secret storage
- `K8sSecretManager.ts`: Kubernetes-native secret management

### Queue Integration (`src/task-queue-consumer.ts`)
- Consumes deployment requests from PostgreSQL queues
- Coordinates with deployment managers for worker lifecycle

## Implementation Guidelines

### Adding New Deployment Types
1. Extend `BaseDeploymentManager` for new platform support
2. Implement platform-specific resource creation/deletion
3. Add environment detection logic in main orchestrator class
4. Ensure proper cleanup and resource management

### Resource Management
- Always set appropriate CPU/memory limits for workers
- Use persistent volumes for stateful workloads
- Implement proper cleanup to prevent resource leaks
- Monitor resource usage and implement alerting

### Queue Integration
- Process deployment requests reliably using pg-boss
- Handle queue failures with proper retry mechanisms
- Update deployment status back to queues for dispatcher consumption
- Implement proper error reporting and notification

### Secret Management
- Store sensitive data (GitHub tokens, API keys) securely
- Use environment-appropriate secret storage (K8s secrets vs encrypted DB)
- Rotate secrets when needed
- Audit secret access and usage

### Platform-Specific Considerations

#### Docker Mode (Local Development)
- Use Docker Compose network for service communication
- Mount host volumes for development workflow
- Handle Docker daemon availability and errors
- Support hot reloading for development

#### Kubernetes Mode (Production)
- Use appropriate namespaces and RBAC
- Implement proper pod security policies
- Handle node scheduling and resource allocation
- Support rolling updates and blue-green deployments

## Environment Dependencies
- `DATABASE_URL`: PostgreSQL connection for queues and secrets
- `DEPLOYMENT_MODE`: Force specific deployment mode (docker/kubernetes)
- `KUBERNETES_NAMESPACE`: Target namespace for K8s deployments
- `WORKER_IMAGE_*`: Worker container image configuration
- `WORKER_IDLE_CLEANUP_MINUTES`: Cleanup interval for idle workers

## Testing Considerations
- Test deployment managers in isolation using mock platforms
- Verify resource cleanup and garbage collection
- Test queue processing with various failure scenarios
- Validate secret management across different storage backends
- Test scaling operations under load