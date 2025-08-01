# Complete Deployment Guide for Goodmem MCP Server

This guide walks through deploying the MCP server on your Goodmem server and configuring Claude Code to connect to it.

## Prerequisites

- Goodmem server already running (e.g., at `yobi-code-goodmem.internal.yib.io:8081`)
- SSH access to the server
- Node.js 18+ installed on the server
- Claude Code installed on your local machine

## Step 1: Deploy MCP Server to Your Goodmem Server

### Option A: Direct Deployment

```bash
# 1. SSH into your Goodmem server
ssh user@yobi-code-goodmem.internal.yib.io

# 2. Clone the repository
git clone https://github.com/zachary-costa/yobi-goodmem-mcp.git
cd yobi-goodmem-mcp

# 3. Install dependencies
npm install

# 4. Build the TypeScript code
npm run build

# 5. Create environment file
cp .env.example .env

# 6. Edit the environment file
nano .env
```

Configure `.env` with your actual values:
```env
# Since MCP is on same server as Goodmem, use localhost
GOODMEM_API_URL=http://localhost:8080
GOODMEM_API_KEY=gm_your_actual_api_key_here
GOODMEM_DEFAULT_SPACE=default
LOG_LEVEL=info
```

### Option B: Docker Deployment

```bash
# 1. SSH into your server
ssh user@yobi-code-goodmem.internal.yib.io

# 2. Clone and enter directory
git clone https://github.com/zachary-costa/yobi-goodmem-mcp.git
cd yobi-goodmem-mcp

# 3. Create .env file
cp .env.example .env
nano .env  # Configure as above

# 4. Build and run with Docker
docker-compose up -d
```

## Step 2: Set Up as a System Service (Recommended)

Create a systemd service for automatic startup:

```bash
# 1. Create service file
sudo nano /etc/systemd/system/goodmem-mcp.service
```

Add this content:
```ini
[Unit]
Description=Goodmem MCP Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/yobi-goodmem-mcp
ExecStart=/usr/bin/node /home/your-username/yobi-goodmem-mcp/dist/index.js
Restart=always
RestartSec=10

# Environment
Environment="NODE_ENV=production"
Environment="GOODMEM_API_URL=http://localhost:8080"
Environment="GOODMEM_API_KEY=gm_your_api_key"
Environment="GOODMEM_DEFAULT_SPACE=default"

# Logging
StandardOutput=append:/var/log/goodmem-mcp/output.log
StandardError=append:/var/log/goodmem-mcp/error.log

[Install]
WantedBy=multi-user.target
```

```bash
# 2. Create log directory
sudo mkdir -p /var/log/goodmem-mcp
sudo chown your-username:your-username /var/log/goodmem-mcp

# 3. Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable goodmem-mcp
sudo systemctl start goodmem-mcp

# 4. Check status
sudo systemctl status goodmem-mcp
```

## Step 3: Configure Claude Code (Local Machine)

### Option 1: Direct SSH Connection (Simplest)

Edit your Claude configuration file:
```bash
# On your local machine
nano ~/.claude/claude_desktop_config.json
```

Add this configuration:
```json
{
  "mcpServers": {
    "goodmem": {
      "command": "ssh",
      "args": [
        "-t",
        "user@yobi-code-goodmem.internal.yib.io",
        "cd /home/user/yobi-goodmem-mcp && node dist/index.js"
      ]
    }
  }
}
```

### Option 2: SSH with Environment Variables

```json
{
  "mcpServers": {
    "goodmem": {
      "command": "ssh",
      "args": [
        "-t",
        "user@yobi-code-goodmem.internal.yib.io",
        "cd /home/user/yobi-goodmem-mcp && GOODMEM_API_URL=http://localhost:8080 GOODMEM_API_KEY=gm_your_key node dist/index.js"
      ]
    }
  }
}
```

### Option 3: Create SSH Wrapper Script (Most Flexible)

On the Goodmem server, create a wrapper:
```bash
# On Goodmem server
nano ~/goodmem-mcp-server
```

Add:
```bash
#!/bin/bash
cd /home/user/yobi-goodmem-mcp
export GOODMEM_API_URL=http://localhost:8080
export GOODMEM_API_KEY=gm_your_api_key
export GOODMEM_DEFAULT_SPACE=default
exec node dist/index.js
```

Make it executable:
```bash
chmod +x ~/goodmem-mcp-server
```

Then in Claude config:
```json
{
  "mcpServers": {
    "goodmem": {
      "command": "ssh",
      "args": [
        "-t",
        "user@yobi-code-goodmem.internal.yib.io",
        "/home/user/goodmem-mcp-server"
      ]
    }
  }
}
```

## Step 4: Test the Connection

### 1. Test SSH Connection
```bash
# From your local machine
ssh user@yobi-code-goodmem.internal.yib.io "echo 'SSH works'"
```

### 2. Test MCP Server Directly
```bash
# SSH into server and test
ssh user@yobi-code-goodmem.internal.yib.io
cd yobi-goodmem-mcp
node dist/index.js
# Should see: "Goodmem MCP Server is running"
# Press Ctrl+C to exit
```

### 3. Restart Claude Code
After updating the configuration:
1. Quit Claude Code completely
2. Start Claude Code again
3. Check if Goodmem tools are available

### 4. Verify in Claude Code
Type in Claude:
```
Can you list the available Goodmem spaces?
```

Claude should use the `goodmem_list_spaces` tool.

## Step 5: SSH Key Setup (Recommended)

For passwordless access:

```bash
# On your local machine
# 1. Generate SSH key if you don't have one
ssh-keygen -t ed25519 -C "your-email@example.com"

# 2. Copy to server
ssh-copy-id user@yobi-code-goodmem.internal.yib.io

# 3. Test passwordless login
ssh user@yobi-code-goodmem.internal.yib.io
```

## Troubleshooting

### MCP Not Connecting

1. **Check SSH works**:
   ```bash
   ssh -v user@yobi-code-goodmem.internal.yib.io
   ```

2. **Check MCP server runs**:
   ```bash
   ssh user@yobi-code-goodmem.internal.yib.io "cd yobi-goodmem-mcp && node dist/index.js"
   ```

3. **Check Claude logs**:
   - On macOS: `~/Library/Logs/Claude/`
   - Look for MCP connection errors

### Permission Issues

```bash
# Fix permissions on server
chmod -R 755 ~/yobi-goodmem-mcp
chmod 600 ~/yobi-goodmem-mcp/.env
```

### API Connection Issues

Test Goodmem API directly:
```bash
# On the Goodmem server
curl -H "x-api-key: gm_your_key" http://localhost:8080/v1/spaces
```

### Service Issues

```bash
# Check service logs
sudo journalctl -u goodmem-mcp -f

# Restart service
sudo systemctl restart goodmem-mcp
```

## Security Considerations

1. **API Key Security**:
   - Store API key in environment variables or `.env` file
   - Never commit `.env` to git
   - Set proper file permissions (600)

2. **SSH Security**:
   - Use SSH keys instead of passwords
   - Consider restricting SSH to specific commands
   - Use firewall rules if needed

3. **Network Security**:
   - MCP server only needs to access Goodmem locally
   - No external ports need to be opened
   - Communication happens over SSH tunnel

## Advanced Configuration

### Custom SSH Port
```json
{
  "mcpServers": {
    "goodmem": {
      "command": "ssh",
      "args": [
        "-p", "2222",
        "-t",
        "user@yobi-code-goodmem.internal.yib.io",
        "/home/user/goodmem-mcp-server"
      ]
    }
  }
}
```

### Multiple Environments
```json
{
  "mcpServers": {
    "goodmem-prod": {
      "command": "ssh",
      "args": ["user@prod-server", "goodmem-mcp-server"]
    },
    "goodmem-dev": {
      "command": "ssh",
      "args": ["user@dev-server", "goodmem-mcp-server"]
    }
  }
}
```

## Quick Checklist

- [ ] MCP server code deployed to Goodmem server
- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript compiled (`npm run build`)
- [ ] Environment configured (`.env` file)
- [ ] SSH access working
- [ ] Claude configuration updated
- [ ] Claude Code restarted
- [ ] Goodmem tools appearing in Claude

## Next Steps

Once connected, Claude will:
1. Proactively store important information
2. Search for context before implementing features
3. Manage spaces intelligently
4. Suggest when to save valuable knowledge

Ask Claude to "List Goodmem spaces" to verify the connection is working!