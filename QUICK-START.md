# Quick Start Guide - Deploy MCP Server on Your Goodmem Server

## 🚀 5-Minute Setup

### On Your Goodmem Server:

```bash
# 1. SSH into your server
ssh user@yobi-code-goodmem.internal.yib.io

# 2. Download and run installer
curl -O https://raw.githubusercontent.com/zachary-costa/yobi-goodmem-mcp/main/install.sh
chmod +x install.sh
./install.sh

# 3. Follow the prompts:
#    - Press Enter for default installation directory
#    - Enter your Goodmem API key (starts with gm_)
#    - Press Enter for other defaults
```

### On Your Local Machine:

The installer will show you the exact configuration to add to Claude. It will look like:

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

1. Copy this configuration
2. Edit `~/.claude/claude_desktop_config.json`
3. Add the configuration
4. Save and restart Claude Code

## 🔑 What You Need

1. **Goodmem API Key**: Get from your Goodmem instance
   ```bash
   # If you need to create one:
   curl -X POST -H "x-api-key: existing-key" \
        -H "Content-Type: application/json" \
        -d '{"labels": {"service": "mcp-server"}}' \
        http://localhost:8080/v1/apikeys
   ```

2. **SSH Access**: Make sure you can SSH to your server
   ```bash
   ssh user@yobi-code-goodmem.internal.yib.io
   ```

## 📝 Manual Steps Summary

If the installer doesn't work, here are the manual steps:

```bash
# On Goodmem server
git clone https://github.com/zachary-costa/yobi-goodmem-mcp.git
cd yobi-goodmem-mcp
npm install
npm run build
cp .env.example .env
nano .env  # Add your API key

# Create wrapper
echo '#!/bin/bash
cd /home/user/yobi-goodmem-mcp
exec node dist/index.js' > ~/goodmem-mcp-server
chmod +x ~/goodmem-mcp-server
```

## 🧪 Test Your Setup

1. **Test SSH**: 
   ```bash
   ssh user@your-server "echo 'SSH works'"
   ```

2. **Test MCP directly**:
   ```bash
   ssh user@your-server "/home/user/goodmem-mcp-server"
   # Should see "Goodmem MCP Server is running"
   ```

3. **Test in Claude**: Ask Claude:
   ```
   Can you list the available Goodmem spaces?
   ```

## 🔧 Troubleshooting

### SSH Issues
- Make sure you can SSH without password (setup SSH keys)
- Check hostname is correct
- Verify user has access to the server

### MCP Not Starting
- Check logs: `ssh user@server "cd yobi-goodmem-mcp && cat logs/mcp.log"`
- Verify API key is correct
- Ensure Goodmem is running on the server

### Claude Not Connecting
- Restart Claude Code completely
- Check Claude logs: `~/Library/Logs/Claude/`
- Verify the SSH command works manually

## 📍 File Locations

After installation:
- **MCP Server**: `~/yobi-goodmem-mcp/`
- **Wrapper Script**: `~/goodmem-mcp-server`
- **Environment**: `~/yobi-goodmem-mcp/.env`
- **Logs**: `~/yobi-goodmem-mcp/logs/`

## 🎯 What Happens Next

Once connected, Claude will:
1. **Proactively store** APIs, decisions, and important info
2. **Search before implementing** to find existing patterns
3. **Manage spaces intelligently** based on your organization
4. **Suggest storing** valuable information as you work

## Need Help?

- Full deployment guide: [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
- Troubleshooting: [DEPLOYMENT.md](DEPLOYMENT.md)
- Space strategies: [CLAUDE-INTELLIGENCE.md](CLAUDE-INTELLIGENCE.md)