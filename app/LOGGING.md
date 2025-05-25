# AI Agent Logging System

This document describes the comprehensive logging system implemented for debugging AI agent interactions.

## Overview

The logging system captures all AI agent messages, tool executions, and system events to help debug issues with AI interactions. It supports both file and console logging with configurable log levels.

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure these variables:

```bash
# Enable/disable all logging (default: false)
LOG_ENABLED=true

# Enable AI-specific logging for debugging agent interactions (default: false)
AI_LOGGING_ENABLED=true

# Log to file (default: true when logging is enabled)
LOG_TO_FILE=true

# Log to console (default: true)
LOG_TO_CONSOLE=true

# Log level: debug, info, warn, error (default: info)
LOG_LEVEL=debug
```

### No .env File Handling

The logging system gracefully handles cases where no `.env` file exists:
- Uses default values (logging disabled)
- Logs a warning about missing configuration
- Continues normal operation

## What Gets Logged

### 1. AI Requests
- User messages sent to the AI
- Message content and metadata
- Thread information
- Request timestamps

### 2. AI Responses
- Complete AI responses
- Processing time
- Response metadata
- Thread state

### 3. Tool Executions
- Tool name and parameters
- Execution results
- Success/failure status
- Processing time

### 4. System Events
- Session start/end
- Configuration changes
- Error conditions
- Debug information

## Log Files

When `LOG_TO_FILE=true`, logs are stored in:
```
app/logs/ai-debug-YYYY-MM-DD.log
```

### Log Format
```
[timestamp] [session_id] [LEVEL] [category] message
Data: {json object with additional details}
```

Example:
```
[2024-01-15T10:30:45.123Z] [session_1705312245123_abc123] [INFO] [ai-request] Received AI message request
Data: {
  "threadId": "thread-123",
  "message": "Create a new slide",
  "contentType": "text",
  "contentLength": 16
}
```

## Usage

### Basic Usage

The logging system is automatically initialized and works transparently:

1. **Enable logging** in your `.env` file:
   ```bash
   LOG_ENABLED=true
   AI_LOGGING_ENABLED=true
   ```

2. **Run your application** - logs will automatically be created

3. **View logs** in the console or check the `logs/` directory

### Log Categories

- `ai-request` - Incoming requests to the AI service
- `ai-response` - Responses from the AI service
- `tool-execution` - AI tool executions and results
- `system` - System events and debug information
- `user-action` - User interactions (future expansion)

### Log Levels

- `debug` - Detailed debugging information
- `info` - General information
- `warn` - Warning conditions
- `error` - Error conditions

## API Reference

### Logger Methods

```typescript
import { logger } from '../utils/logger';

// Log AI requests
logger.logAIRequest('Received request', { threadId, message });

// Log AI responses
logger.logAIResponse('Response generated', { threadId, response });

// Log tool executions
logger.logToolExecution('toolName', params, result);

// Log system events
logger.logSystem('Event occurred', 'info', { data });

// Log user actions
logger.logUserAction('User clicked button', { buttonId });
```

### Utility Methods

```typescript
// Check if logging is enabled
if (logger.isLoggingEnabled()) {
  // Perform expensive logging operations
}

// Get current session ID
const sessionId = logger.getCurrentSessionId();

// Start new session
const newSessionId = logger.startNewSession();

// Export session logs
const sessionLogs = logger.exportSessionLogs(sessionId);

// Clean up old logs (older than 7 days)
logger.cleanupOldLogs(7);

// Reload configuration
logger.reloadConfiguration();
```

## Debugging AI Issues

### Common Debugging Scenarios

1. **AI not responding**
   - Check `ai-request` logs for message format
   - Verify `ai-response` logs for errors
   - Look for tool execution failures

2. **Tool execution issues**
   - Check `tool-execution` logs for parameters
   - Verify tool results and error messages
   - Look for validation failures

3. **Performance problems**
   - Check processing times in logs
   - Look for repeated tool calls
   - Monitor message sizes

### Log Analysis Tips

1. **Filter by session ID** to track a specific interaction:
   ```bash
   grep "session_1705312245123_abc123" logs/ai-debug-*.log
   ```

2. **Filter by category** to focus on specific aspects:
   ```bash
   grep "\[tool-execution\]" logs/ai-debug-*.log
   ```

3. **Filter by error level**:
   ```bash
   grep "\[ERROR\]" logs/ai-debug-*.log
   ```

## Security Considerations

- **API keys** are not logged
- **Personal data** should be filtered (implement custom filtering if needed)
- **Log rotation** prevents disk space issues
- **File permissions** should be restricted in production

## Performance Impact

- **Minimal overhead** when logging is disabled
- **Configurable verbosity** via log levels
- **Asynchronous file writing** (where possible)
- **Automatic cleanup** of old log files

## Troubleshooting

### Common Issues

1. **Logs not appearing**
   - Check `LOG_ENABLED=true` in `.env`
   - Verify log directory permissions
   - Check console for error messages

2. **Log files not created**
   - Ensure `LOG_TO_FILE=true`
   - Check disk space
   - Verify write permissions for `logs/` directory

3. **Too many logs**
   - Increase `LOG_LEVEL` (e.g., from `debug` to `info`)
   - Enable `cleanupOldLogs()` automation
   - Use `LOG_TO_CONSOLE=false` for file-only logging

### Testing the System

Run the test script to verify setup:
```bash
node test-logging.js
```

This will verify:
- Logger module exists and is properly configured
- AI service integration is working
- Tool logging is enabled
- Configuration files are present

## Future Enhancements

- **Structured logging** with better query capabilities
- **Log aggregation** for distributed deployments  
- **Real-time log streaming** for debugging
- **Automatic anonymization** of sensitive data
- **Integration with external logging services**