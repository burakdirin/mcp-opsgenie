# OpsGenie MCP Server

[![npm version](https://badge.fury.io/js/mcp-opsgenie.svg)](https://badge.fury.io/js/mcp-opsgenie)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for [OpsGenie](https://www.atlassian.com/software/opsgenie) incident management. This server provides tools, resources, and prompts for managing alerts, conducting incident response, and performing post-incident analysis.

## Features

### 🛠️ Tools
- **Alert Management**: Create, acknowledge, close, assign, and escalate alerts
- **Note Management**: Add and retrieve notes/comments on alerts
- **Search & Discovery**: Search alerts using OpsGenie query syntax
- **Alert Actions**: Snooze alerts, manage tags, and perform bulk operations
- **Analytics**: Get alert counts and statistics

### 📄 Resources
- **Alert Details**: Access comprehensive alert information as structured data
- **Alert Notes**: Retrieve all notes and comments for specific alerts
- **Search Results**: Get search results as structured JSON data
- **Recent Alerts**: Access recently updated alerts

### 💬 Prompts
- **Incident Analysis**: Structured prompts for analyzing alert severity and impact
- **Incident Response**: Step-by-step incident response workflows
- **Alert Triage**: Guidance for prioritizing and categorizing multiple alerts
- **Post-Incident Review**: Templates for comprehensive incident retrospectives

## Installation

```bash
npm install mcp-opsgenie
```

## Quick Start

### 1. Get Your OpsGenie API Key

1. Log into your OpsGenie account
2. Go to Settings → API key management
3. Create a new API key with appropriate permissions
4. Copy the API key

### 2. Configure Environment

```bash
export OPSGENIE_API_KEY="your-api-key-here"
```

### 3. Use with Claude Desktop

Add the server to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "opsgenie": {
      "command": "npx",
      "args": ["mcp-opsgenie"],
      "env": {
        "OPSGENIE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### 4. Use with Other MCP Clients

```bash
# Run the server directly
npx mcp-opsgenie

# Or install globally
npm install -g mcp-opsgenie
mcp-opsgenie
```

## Configuration

The server requires the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPSGENIE_API_KEY` | Yes | Your OpsGenie API key |
| `OPSGENIE_BASE_URL` | No | OpsGenie API base URL (defaults to https://api.opsgenie.com) |

## Available Tools

### Alert Management

| Tool | Description |
|------|-------------|
| `get-alert-details` | Fetch comprehensive details for a specific alert |
| `get-alert-notes` | Retrieve notes/comments for an alert |
| `search-alerts` | Search alerts using OpsGenie query syntax |
| `get-alert-count` | Get count of alerts matching criteria |
| `create-alert` | Create a new alert |
| `close-alert` | Close an alert |
| `acknowledge-alert` | Acknowledge an alert |
| `unacknowledge-alert` | Remove acknowledgment from an alert |
| `assign-alert` | Assign alert to a responder |
| `escalate-alert` | Escalate alert to next level |
| `snooze-alert` | Snooze alert until specified time |
| `add-note-to-alert` | Add a note to an alert |
| `add-tags-to-alert` | Add tags to an alert |
| `remove-tags-from-alert` | Remove tags from an alert |

### Example Tool Usage

```typescript
// Search for critical alerts
await client.callTool({
  name: "search-alerts",
  arguments: {
    query: "priority:P1 AND status:open",
    limit: 10
  }
});

// Create a new alert
await client.callTool({
  name: "create-alert",
  arguments: {
    message: "Database connection timeout",
    description: "Multiple connection timeouts detected on prod-db-01",
    priority: "P2",
    tags: ["database", "production", "timeout"],
    entity: "prod-db-01"
  }
});

// Acknowledge with a note
await client.callTool({
  name: "acknowledge-alert", 
  arguments: {
    identifier: "alert-id-12345",
    note: "Investigating the issue, will update in 15 minutes"
  }
});
```

## Available Resources

| Resource | URI Pattern | Description |
|----------|-------------|-------------|
| Alert Details | `opsgenie://alerts/{alertId}` | Detailed alert information |
| Alert Notes | `opsgenie://alerts/{alertId}/notes` | All notes for an alert |
| Alert Search | `opsgenie://search?query={query}` | Search results |
| Recent Alerts | `opsgenie://alerts/recent` | Recently updated alerts |

### Example Resource Usage

```typescript
// Read alert details
const alertData = await client.readResource({
  uri: "opsgenie://alerts/12345-67890-abcdef"
});

// Search results as structured data
const searchResults = await client.readResource({
  uri: "opsgenie://search?query=status:open AND priority:P1"
});
```

## Available Prompts

| Prompt | Description | Arguments |
|--------|-------------|-----------|
| `analyze-incident` | Analyze alert severity and impact | `alertId` |
| `incident-response` | Guide through incident response workflow | `alertId`, `incidentType?` |
| `triage-alerts` | Help prioritize multiple alerts | `query?` |
| `post-incident-review` | Structure post-incident analysis | `alertId`, `resolutionSummary?` |

### Example Prompt Usage

```typescript
// Get incident analysis prompt
const prompt = await client.getPrompt({
  name: "analyze-incident",
  arguments: {
    alertId: "12345-67890-abcdef"
  }
});

// Get triage guidance for open alerts
const triagePrompt = await client.getPrompt({
  name: "triage-alerts",
  arguments: {
    query: "status:open"
  }
});
```

## Development

### Setup

```bash
git clone https://github.com/burakdirin/mcp-opsgenie.git
cd mcp-opsgenie
npm install
```

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Type Checking

```bash
npm run type-check
```

## API Documentation

The server implements the full OpsGenie REST API v2 for alert management. Key endpoints include:

- **GET** `/v2/alerts/{id}` - Get alert details
- **POST** `/v2/alerts` - Create alert
- **POST** `/v2/alerts/{id}/close` - Close alert
- **POST** `/v2/alerts/{id}/acknowledge` - Acknowledge alert
- **POST** `/v2/alerts/{id}/notes` - Add note
- **GET** `/v2/alerts/{id}/notes` - Get notes
- **GET** `/v2/alerts` - Search alerts

See the [OpsGenie API documentation](https://docs.opsgenie.com/docs/api-overview) for complete details.

## Error Handling

The server implements comprehensive error handling:

- **Authentication errors**: Invalid API key or permissions
- **Rate limiting**: Automatic backoff and retry logic
- **Network errors**: Connection timeouts and retries
- **Validation errors**: Input validation with descriptive messages

## Security

- API keys are passed via environment variables (never hardcoded)
- All requests use HTTPS
- Input validation using Zod schemas
- Proper error sanitization to prevent information leakage

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [GitHub Issues](https://github.com/burakdirin/mcp-opsgenie/issues)
- [OpsGenie Documentation](https://docs.opsgenie.com/)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.