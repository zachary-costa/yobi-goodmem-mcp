# Goodmem MCP Server Setup Guide

This guide will help you connect the MCP server to your Goodmem instance and configure Claude to use it.

## Prerequisites

- Running Goodmem server instance
- Goodmem API key
- Node.js 18+ installed
- Claude Desktop application

## Step 1: Get Your Goodmem API Credentials

### Option A: Using the Goodmem Python Client

If you have the Goodmem Python client installed:

```python
from goodmem_client.api import APIKeysApi, SpacesApi
from goodmem_client.configuration import Configuration
from goodmem_client.api_client import ApiClient
from goodmem_client.models import CreateApiKeyRequest

# Configure client
configuration = Configuration()
configuration.host = "http://your-goodmem-server:8080"  # Your Goodmem server URL

# Create API client with your existing credentials
api_client = ApiClient(configuration=configuration)
api_client.default_headers["x-api-key"] = "your-existing-api-key"

# Create a new API key for the MCP server
api_keys_api = APIKeysApi(api_client=api_client)
create_request = CreateApiKeyRequest(
    labels={
        "service": "mcp-server",
        "purpose": "claude-integration"
    }
)

response = api_keys_api.create_api_key(create_api_key_request=create_request)
print(f"New API Key: {response.raw_api_key}")
print(f"API Key ID: {response.api_key_metadata.api_key_id}")

# List available spaces
spaces_api = SpacesApi(api_client=api_client)
spaces = spaces_api.list_spaces()
for space in spaces.spaces:
    print(f"Space: {space.name} (ID: {space.space_id})")
```

### Option B: Using Direct API Calls

```bash
# List your spaces (using existing API key)
curl -H "x-api-key: your-existing-api-key" \
     http://your-goodmem-server:8080/v1/spaces

# Create a new API key
curl -X POST \
     -H "x-api-key: your-existing-api-key" \
     -H "Content-Type: application/json" \
     -d '{"labels": {"service": "mcp-server"}}' \
     http://your-goodmem-server:8080/v1/apikeys
```

Save the API key and note your preferred space ID.

## Step 2: Install the MCP Server

### Option A: Local Installation (Development)

```bash
# Clone the repository
git clone <repository-url>
cd goodmem-mcp-server

# Install dependencies
npm install

# Build the server
npm run build

# Configure environment
cp .env.example .env
```

Edit `.env`:
```env
GOODMEM_API_URL=http://your-goodmem-server:8080
GOODMEM_API_KEY=your-api-key-from-step-1
GOODMEM_DEFAULT_SPACE=your-default-space-id
LOG_LEVEL=info
```

### Option B: Install on Goodmem Server (Production)

SSH into your Goodmem server:

```bash
ssh user@your-goodmem-server

# Install Node.js if not present
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create directory for MCP server
sudo mkdir -p /opt/goodmem-mcp-server
cd /opt/goodmem-mcp-server

# Clone and build
git clone <repository-url> .
npm install
npm run build

# Create environment file
sudo tee .env << EOF
GOODMEM_API_URL=http://localhost:8080
GOODMEM_API_KEY=your-api-key
GOODMEM_DEFAULT_SPACE=your-default-space-id
LOG_LEVEL=info
EOF

# Create systemd service
sudo tee /etc/systemd/system/goodmem-mcp.service << EOF
[Unit]
Description=Goodmem MCP Server
After=network.target goodmem.service

[Service]
Type=simple
User=goodmem
WorkingDirectory=/opt/goodmem-mcp-server
EnvironmentFile=/opt/goodmem-mcp-server/.env
ExecStart=/usr/bin/node /opt/goodmem-mcp-server/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Set permissions
sudo chown -R goodmem:goodmem /opt/goodmem-mcp-server

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable goodmem-mcp
sudo systemctl start goodmem-mcp

# Check status
sudo systemctl status goodmem-mcp
```

## Step 3: Configure Claude

### Find Claude's Configuration File

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Add MCP Server Configuration

#### For Local Installation:

```json
{
  "mcpServers": {
    "goodmem": {
      "command": "node",
      "args": [
        "/path/to/goodmem-mcp-server/dist/index.js"
      ],
      "env": {
        "GOODMEM_API_URL": "http://your-goodmem-server:8080",
        "GOODMEM_API_KEY": "your-api-key",
        "GOODMEM_DEFAULT_SPACE": "your-default-space-id"
      }
    }
  }
}
```

#### For Server Installation (via SSH):

```json
{
  "mcpServers": {
    "goodmem": {
      "command": "ssh",
      "args": [
        "-t",
        "user@your-goodmem-server",
        "node /opt/goodmem-mcp-server/dist/index.js"
      ]
    }
  }
}
```

Note: For SSH access, make sure you have passwordless SSH configured:
```bash
ssh-copy-id user@your-goodmem-server
```

## Step 4: Test the Connection

1. **Restart Claude** after updating the configuration

2. **Test in Claude** by typing:
   - "List my Goodmem spaces"
   - "Search Goodmem for [your query]"
   - "Add to Goodmem: Test memory from Claude"

3. **Check server logs** (if installed on server):
   ```bash
   sudo journalctl -u goodmem-mcp -f
   ```

## Step 5: Usage Examples

Once configured, you can use natural language in Claude:

### Managing Spaces
```
"List all my Goodmem spaces"
"Create a new space called 'Project Documentation'"
"Switch to the 'Engineering' space"
```

### Adding Memories
```
"Add to Goodmem: Our API uses JWT tokens with 24-hour expiration"
"Store in Goodmem: Database connection string format is postgresql://..."
"Remember this: Deploy process requires approval from team lead"
```

### Searching Memories
```
"Search Goodmem for authentication setup"
"What do we have in Goodmem about deployment procedures?"
"Find memories about database configuration"
```

### Getting Context
```
"Get Goodmem context for implementing user authentication"
"What context does Goodmem have about our API design?"
```

## Troubleshooting

### Connection Issues

1. **Test Goodmem API directly**:
   ```bash
   curl -H "x-api-key: your-api-key" \
        http://your-goodmem-server:8080/v1/spaces
   ```

2. **Check MCP server logs**:
   - Local: Check console output
   - Server: `sudo journalctl -u goodmem-mcp -f`

3. **Verify Claude configuration**:
   - Ensure JSON is valid
   - Check file paths are absolute
   - Verify environment variables

### Common Problems

**"No space ID provided and no current space set"**
- Set a default space in .env: `GOODMEM_DEFAULT_SPACE=your-space-id`
- Or use: "Switch to space [space-id]" in Claude

**"Failed to connect to Goodmem"**
- Check GOODMEM_API_URL is correct
- Verify API key is valid
- Ensure Goodmem server is running

**"Command not found" in Claude**
- Restart Claude after config changes
- Check the config file syntax
- Verify Node.js is in PATH

## Security Best Practices

1. **API Key Management**:
   - Create dedicated API keys for MCP server
   - Use labels to identify keys
   - Rotate keys periodically

2. **Network Security**:
   - Use HTTPS if Goodmem supports it
   - Consider VPN for remote connections
   - Restrict API access by IP if possible

3. **Access Control**:
   - Use separate spaces for different projects
   - Limit API key permissions if Goodmem supports it
   - Monitor access logs

## Advanced Configuration

### Using Multiple Spaces

You can search across multiple spaces:
```
"Search spaces 'Engineering' and 'Documentation' for API info"
```

### Custom Metadata

When adding memories, you can include metadata:
```
"Add to Goodmem with high importance: Critical security update process"
```

### Filtering Results

The MCP server will return relevance scores with search results, helping Claude provide the most relevant information.

## Support

For issues specific to:
- **Goodmem API**: Check Goodmem documentation or contact support@goodmem.io
- **MCP Server**: File issues on the GitHub repository
- **Claude Integration**: Check Claude's MCP documentation