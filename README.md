# Goodmem MCP Server

An MCP (Model Context Protocol) server that provides Claude with direct access to your Goodmem vector database for enhanced context-aware AI assistance.

## Overview

This MCP server allows Claude Code to:
- Search and retrieve relevant memories from Goodmem
- Add new memories to the knowledge base
- Manage memory spaces
- Automatically include context in conversations

## Architecture

The MCP server can be deployed in two ways:

### 1. Local Deployment (Development)
```
Your Machine
├── Claude Code (with MCP client)
└── Goodmem MCP Server → Goodmem API (remote)
```

### 2. Server Deployment (Production)
```
Your Machine
└── Claude Code (with MCP client)
    ↓
Remote Server
├── Goodmem MCP Server
└── Goodmem Database
```

## Installation

### Quick Start

```bash
# Clone the repository
git clone <repo>
cd goodmem-mcp-server

# Install and build
npm install
npm run build

# Configure
cp .env.example .env
# Edit .env with your Goodmem API credentials

# Test connection
node test-connection.js

# Configure Claude (see below)
```

### Getting Your Goodmem Credentials

1. **Find your Goodmem API URL** - Usually `http://your-server:8080`
2. **Get an API key** - Use existing key or create new one:
   ```bash
   curl -X POST -H "x-api-key: existing-key" \
        -H "Content-Type: application/json" \
        -d '{"labels": {"service": "mcp-server"}}' \
        http://your-goodmem:8080/v1/apikeys
   ```
3. **List available spaces**:
   ```bash
   curl -H "x-api-key: your-key" \
        http://your-goodmem:8080/v1/spaces
   ```

### Deployment Options

#### Option 1: Local Development
Run on your machine, connect to remote Goodmem:
```bash
npm run dev  # Development mode with auto-reload
# or
npm start    # Production mode
```

#### Option 2: Docker
```bash
docker-compose up -d
```

#### Option 3: On Goodmem Server
See [GOODMEM-SETUP.md](GOODMEM-SETUP.md) for detailed server installation.

#### Option 4: Systemd Service
See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment.

## Claude Configuration

Add to your Claude Code settings (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "goodmem": {
      "command": "node",
      "args": ["/path/to/goodmem-mcp-server/dist/index.js"],
      "env": {
        "GOODMEM_API_URL": "http://yobi-code-goodmem.internal.yib.io:8081/api/v1",
        "GOODMEM_API_KEY": "gm_di7zgw3vuvpq7zp2jm6jgwini4"
      }
    }
  }
}
```

For remote server deployment:

```json
{
  "mcpServers": {
    "goodmem": {
      "command": "ssh",
      "args": [
        "user@your-goodmem-server",
        "goodmem-mcp-server"
      ]
    }
  }
}
```

## Available Tools

### `goodmem_search`
Search for relevant memories using semantic search.
- `query`: Search query
- `limit`: Maximum results (default: 10)
- `space_ids`: Optional list of space IDs to search

### `goodmem_add`
Add new memories to the knowledge base.
- `content`: Memory content
- `metadata`: Optional metadata object
- `space_id`: Target space (uses current if not specified)

### `goodmem_delete`
Delete a memory by ID.
- `memory_id`: ID of memory to delete

### `goodmem_list_spaces`
List all available memory spaces.

### `goodmem_create_space`
Create a new memory space.
- `name`: Space name
- `description`: Optional description

### `goodmem_set_current_space`
Set the current active space for memory operations.
- `space_id`: ID of space to set as current

### `goodmem_get_context`
Get relevant context for a query.
- `query`: Topic to get context for
- `limit`: Maximum items (default: 5)
- `space_ids`: Optional space IDs

### `goodmem_list_memories`
List memories in a specific space.
- `space_id`: Space to list from (uses current if not specified)
- `limit`: Maximum memories (default: 20)

## Resources

The server also provides resources that Claude can access:

### `goodmem://spaces`
List of all available memory spaces.

### `goodmem://current-space`
Information about the currently active space.

## Development

```bash
# Run tests
npm test

# Build for production
npm run build

# Watch mode for development
npm run dev
```

## Security

- API keys are never exposed to Claude
- All communication uses the MCP protocol
- Supports SSH tunneling for secure remote access

## License

MIT