# Goodmem MCP Server Deployment Guide

## Overview

The Goodmem MCP server can be deployed in several ways depending on your infrastructure and security requirements.

## Deployment Options

### Option 1: Local Development (Recommended for Testing)

Run the MCP server on your local machine, connecting to remote Goodmem API:

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run the server
npm start
```

Then configure Claude:
```json
{
  "mcpServers": {
    "goodmem": {
      "command": "node",
      "args": ["/path/to/goodmem-mcp-server/dist/index.js"]
    }
  }
}
```

### Option 2: Co-located with Goodmem (Recommended for Production)

Deploy the MCP server on the same machine as Goodmem:

```bash
# SSH to your Goodmem server
ssh user@goodmem-server

# Install Node.js if needed
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and install
git clone <repo-url>
cd goodmem-mcp-server
npm install
npm run build

# Create systemd service
sudo tee /etc/systemd/system/goodmem-mcp.service << EOF
[Unit]
Description=Goodmem MCP Server
After=network.target

[Service]
Type=simple
User=goodmem
WorkingDirectory=/opt/goodmem-mcp-server
Environment="GOODMEM_API_URL=http://localhost:8081/api/v1"
Environment="GOODMEM_API_KEY=gm_di7zgw3vuvpq7zp2jm6jgwini4"
ExecStart=/usr/bin/node /opt/goodmem-mcp-server/dist/index.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl enable goodmem-mcp
sudo systemctl start goodmem-mcp
```

Configure Claude with SSH:
```json
{
  "mcpServers": {
    "goodmem": {
      "command": "ssh",
      "args": [
        "-t",
        "user@goodmem-server",
        "node /opt/goodmem-mcp-server/dist/index.js"
      ]
    }
  }
}
```

### Option 3: Docker Container

Create a Dockerfile:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

Run with Docker:
```bash
docker build -t goodmem-mcp .
docker run -e GOODMEM_API_URL=http://goodmem:8081/api/v1 \
           -e GOODMEM_API_KEY=gm_di7zgw3vuvpq7zp2jm6jgwini4 \
           goodmem-mcp
```

### Option 4: Standalone Server with Network Access

Deploy on a separate server with network access to Goodmem:

```bash
# Install as global package
npm install -g @yobi/goodmem-mcp-server

# Run with environment variables
GOODMEM_API_URL=http://goodmem.internal:8081/api/v1 \
GOODMEM_API_KEY=gm_di7zgw3vuvpq7zp2jm6jgwini4 \
goodmem-mcp
```

## Security Considerations

### SSH Key Authentication

For production deployments using SSH, configure key-based authentication:

```bash
# On your local machine
ssh-copy-id user@goodmem-server

# Test connection
ssh user@goodmem-server "echo 'SSH key auth working'"
```

### API Key Management

1. **Never commit API keys** to version control
2. Use environment variables or secure key management systems
3. Rotate keys regularly
4. Use different keys for different environments

### Network Security

1. **Firewall Rules**: Only allow necessary connections
2. **VPN**: Consider using VPN for remote access
3. **TLS**: Use HTTPS for Goodmem API if possible

## Monitoring

### Logs

Check server logs:
```bash
# Systemd
sudo journalctl -u goodmem-mcp -f

# Docker
docker logs goodmem-mcp -f

# File logs (if configured)
tail -f /var/log/goodmem-mcp.log
```

### Health Checks

Create a health check endpoint:
```bash
# Add to your monitoring system
curl http://localhost:3000/health
```

## Troubleshooting

### Connection Issues

1. Check network connectivity:
```bash
curl -H "Authorization: Bearer gm_di7zgw3vuvpq7zp2jm6jgwini4" \
     http://goodmem-server:8081/api/v1/memories
```

2. Verify MCP server is running:
```bash
ps aux | grep goodmem-mcp
```

3. Test with MCP client:
```bash
node test-server.js
```

### Performance Tuning

1. **Caching**: Enable memory caching for frequent queries
2. **Connection Pooling**: Use persistent connections
3. **Rate Limiting**: Implement rate limits to prevent overload

## Updating

1. **Backup** configuration first
2. **Test** in development environment
3. **Deploy** during maintenance window
4. **Monitor** for issues after deployment

```bash
# Update process
git pull
npm install
npm run build
sudo systemctl restart goodmem-mcp
```