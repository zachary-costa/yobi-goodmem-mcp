# Integrating Goodmem MCP Server with Claude

## Quick Start

### 1. Build the Server

```bash
cd goodmem-mcp-server
npm install
npm run build
```

### 2. Configure Claude

Add to your Claude configuration file:

**Mac/Linux**: `~/.config/claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "goodmem": {
      "command": "node",
      "args": [
        "/Users/zackcosta/Desktop/workspace/claude-code/goodmem-mcp-server/dist/index.js"
      ],
      "env": {
        "GOODMEM_API_URL": "http://yobi-code-goodmem.internal.yib.io:8081/api/v1",
        "GOODMEM_API_KEY": "gm_di7zgw3vuvpq7zp2jm6jgwini4"
      }
    }
  }
}
```

### 3. Restart Claude

After updating the configuration, restart Claude Code for the changes to take effect.

## Usage in Claude

Once configured, you can use Goodmem directly in Claude:

### Searching Memories
```
"Search our team knowledge for authentication patterns"
"What do we know about JWT implementation?"
"Find memories related to database optimization"
```

### Adding Memories
```
"Add to team knowledge: Our API uses JWT tokens with 24h expiration"
"Remember that we use PostgreSQL with Prisma ORM"
"Store this information: Production deployment uses Docker"
```

### Managing Spaces
```
"List all memory spaces"
"Create a new space called 'API Documentation'"
"Switch to the 'Backend' memory space"
```

### Getting Context
```
"Get context about our authentication system"
"What's the relevant context for implementing user profiles?"
```

## How It Works

1. **Claude detects** keywords related to memory/knowledge operations
2. **MCP Server** receives the request from Claude
3. **Goodmem API** is called to perform the operation
4. **Results** are returned to Claude and included in the response

## Features

### Automatic Context Injection
When enabled, Claude will automatically search for relevant context based on your queries.

### Space Management
Organize memories into different spaces for different projects or domains.

### Metadata Support
Add tags, importance levels, and other metadata to memories.

## Troubleshooting

### Check MCP Server Status
In Claude, you can check if the server is running:
```
"Show me the available MCP tools"
```

### View Logs
Check the server logs for debugging:
```bash
# If running locally
tail -f ~/.claude/logs/goodmem-mcp.log

# Or check console output when running manually
node /path/to/goodmem-mcp-server/dist/index.js
```

### Test Connection
Test the Goodmem API connection:
```bash
curl -H "Authorization: Bearer gm_di7zgw3vuvpq7zp2jm6jgwini4" \
     http://yobi-code-goodmem.internal.yib.io:8081/api/v1/memories
```

## Advanced Configuration

### Custom Tenant/Space
```json
{
  "env": {
    "GOODMEM_TENANT_ID": "your-tenant-id",
    "GOODMEM_DEFAULT_SPACE": "your-default-space"
  }
}
```

### SSH Access (for remote server)
```json
{
  "mcpServers": {
    "goodmem": {
      "command": "ssh",
      "args": [
        "user@goodmem-server",
        "node /opt/goodmem-mcp-server/dist/index.js"
      ]
    }
  }
}
```

## Best Practices

1. **Organize with Spaces**: Create spaces for different projects or domains
2. **Use Clear Descriptions**: When adding memories, be descriptive
3. **Tag Important Info**: Use metadata to mark critical information
4. **Regular Updates**: Keep team knowledge current

## Example Workflow

1. **Start a project**: "Create a new space for our e-commerce project"
2. **Add knowledge**: "Remember: We're using Stripe for payments with webhook validation"
3. **Search when needed**: "What payment integration details do we have?"
4. **Get context**: "Give me context for implementing the checkout flow"