# Shared Agent Instructions

## Package Overview
The shared package contains common utilities, types, and services used across all other packages. It provides the foundation for logging, database access, error handling, encryption, and testing infrastructure.

## Core Responsibilities

### Utilities and Infrastructure
- **Logging**: Centralized logging configuration with structured output
- **Database**: PostgreSQL connection pooling and query utilities
- **Configuration**: Environment-based configuration management
- **Encryption**: Secure encryption/decryption for sensitive data

### Error Management
- **Base Error Classes**: Standardized error types for different components
- **Error Handling**: Consistent error handling patterns across services
- **Service-Specific Errors**: Specialized error types for dispatcher, orchestrator, and worker

### Testing Support
- **Mock Factories**: Generate test data and mock objects
- **Test Helpers**: Common testing utilities and setup functions
- **Database Testing**: Test database setup and teardown utilities

### Session Management
- **Session Utils**: Utilities for managing user sessions and context
- **Conversation Types**: Type definitions for Claude conversations
- **Execution Options**: Configuration for Claude execution parameters

## Key Components

### Core Infrastructure (`src/`)
- `logger/index.ts`: Structured logging with configurable levels
- `config/index.ts`: Environment configuration management
- `database/`: PostgreSQL connection pooling and operations
- `sentry.ts`: Error monitoring and reporting integration

### Error Management (`src/errors/`)
- `base-error.ts`: Base error class with structured metadata
- `dispatcher-errors.ts`: Dispatcher-specific error types
- `orchestrator-errors.ts`: Orchestrator-specific error types
- `worker-errors.ts`: Worker-specific error types

### Security (`src/utils/`)
- `encryption.ts`: AES encryption for sensitive data storage

### Testing (`src/testing/`)
- `mock-factories.ts`: Factory functions for test data generation
- `test-helpers.ts`: Common testing utilities and setup
- Test database helpers for integration testing

## Implementation Guidelines

### Adding New Utilities
1. Create utility modules in appropriate `src/` subdirectories
2. Export from main `index.ts` for package consumers
3. Include comprehensive TypeScript types
4. Add unit tests in `src/__tests__/` directory
5. Document usage patterns and examples

### Error Handling
- Extend `BaseError` for new error types
- Include structured metadata for debugging
- Provide user-friendly error messages
- Implement proper error serialization for queue transport

### Database Operations
- Use connection pooling for all database access
- Implement proper transaction handling
- Handle connection failures gracefully
- Use parameterized queries to prevent SQL injection

### Logging Guidelines
- Use structured logging with consistent fields
- Include trace IDs for request correlation
- Log at appropriate levels (error, warn, info, debug)
- Avoid logging sensitive information

### Configuration Management
- Use environment variables for all configuration
- Provide sensible defaults where appropriate
- Validate configuration on startup
- Document all configuration options

### Encryption Practices
- Use AES-256-GCM for symmetric encryption
- Generate unique keys per encryption operation
- Store encrypted data with proper metadata
- Implement key rotation mechanisms

## Testing Infrastructure

### Mock Factories
- Provide factories for all major entity types
- Generate realistic test data with proper relationships
- Support parameterized mock generation
- Include edge cases and boundary conditions

### Test Helpers
- Database setup and teardown utilities
- Common assertion helpers
- Mock service implementations
- Test environment configuration

### Integration Testing
- Database transaction rollback for test isolation
- Service mock implementations
- End-to-end test utilities
- Performance testing helpers

## Environment Dependencies
- `DATABASE_URL`: PostgreSQL connection string
- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error)
- `NODE_ENV`: Environment type (development, production, test)
- `SENTRY_DSN`: Error monitoring endpoint (optional)

## Type Definitions
- Consistent type definitions across all packages
- Proper generic types for extensibility
- Comprehensive interface definitions
- Strict type checking configurations

## Usage Patterns
- Import utilities from package root: `import { createLogger } from '@peerbot/shared'`
- Use shared error types for consistent error handling
- Leverage test helpers in all package test suites
- Use database utilities for consistent data access patterns