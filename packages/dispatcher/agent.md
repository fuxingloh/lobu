# Dispatcher Agent Instructions

## Package Overview
The dispatcher is the entry point for all Slack events and interactions. It acts as the message router and communication hub that receives Slack events, processes them, and coordinates with other services.

## Core Responsibilities

### Event Processing
- **Slack Event Handling**: Processes all Slack events including messages, reactions, button clicks, and modal submissions
- **Message Routing**: Routes different types of messages and events to appropriate handlers
- **User Authentication**: Manages GitHub OAuth integration and user authentication flows
- **Repository Management**: Handles repository selection and management for users

### Queue Management
- **Task Queue Producer**: Publishes messages to task queues for worker processing
- **Thread Response Consumer**: Consumes and processes responses from workers
- **Message Coordination**: Ensures proper message threading and response handling

### HTTP Services
- **Slack Webhook Endpoint**: Receives Slack events via HTTP (when not using Socket Mode)
- **Anthropic Proxy**: Provides proxy capabilities for Anthropic API requests
- **Health Endpoints**: Exposes health check and status endpoints

## Key Components

### Event Handlers (`src/slack/event-handlers/`)
- `message-handlers.ts`: Processes direct messages and channel messages
- `block-actions.ts`: Handles Slack interactive components (buttons, menus)
- `file-handlers.ts`: Processes file uploads and attachments
- `form-handlers.ts`: Manages modal form submissions
- `user-handlers.ts`: Handles user-related events

### Queue Integration (`src/queue/`)
- `task-queue-producer.ts`: Publishes tasks to PostgreSQL-based queues
- `slack-thread-processor.ts`: Consumes worker responses and updates Slack

### GitHub Integration (`src/github/`)
- `repository-manager.ts`: Manages GitHub repositories and user access

## Implementation Guidelines

### Adding New Event Types
1. Create handler in appropriate `src/slack/event-handlers/` file
2. Register event listener in `SlackEventHandlers` class
3. Use `queueProducer` to send tasks to workers if processing is required
4. Implement proper error handling and user feedback

### Queue Communication
- Use PostgreSQL-based queues (pg-boss) for reliability
- Always include proper metadata (user ID, channel, thread timestamp)
- Handle queue failures gracefully with user notifications
- Implement proper retry mechanisms

### GitHub Integration
- Use OAuth for user authentication (prefer over personal tokens)
- Store encrypted tokens using shared encryption utilities
- Validate repository access before operations
- Handle GitHub API rate limits appropriately

### Error Handling
- Log all errors with appropriate context
- Provide user-friendly error messages in Slack
- Use centralized error handling from `@peerbot/shared`
- Implement graceful degradation for service failures

## Environment Dependencies
- `SLACK_BOT_TOKEN`: Required for Slack API access
- `DATABASE_URL`: PostgreSQL connection for queues and storage
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`: For OAuth integration
- `ANTHROPIC_API_KEY`: For proxy functionality

## Testing Considerations
- Mock Slack API calls using test helpers from `@peerbot/shared`
- Test event handling flows end-to-end
- Verify queue message publishing and consumption
- Test OAuth flows with GitHub integration