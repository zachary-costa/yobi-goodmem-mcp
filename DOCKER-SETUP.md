# Docker Setup for Goodmem MCP Server

## Quick Start

On your Goodmem server:

```bash
# 1. Navigate to the project directory
cd /home/yobi-goodmem-mcp

# 2. Create .env file with your credentials
cat > .env << EOF
GOODMEM_API_KEY=gm_di7zgw3vuvpq7zp2jm6jgwini4
GOODMEM_DEFAULT_SPACE=default
EOF

# 3. Build and start the container
docker-compose up -d

# 4. Check if it's running
docker ps | grep goodmem-mcp-server

# 5. Test the connection
docker exec goodmem-mcp-server node test-connection.js
```

## Container Network Configuration

Since your Goodmem server is already running in Docker, the MCP container will:
- Connect to the same Docker network
- Access Goodmem via `http://goodmem-server:8080` (internal Docker networking)
- No need to expose ports since MCP uses stdio

## Claude Configuration

### Option 1: Docker Exec (Recommended)

Create a wrapper script on your server:
```bash
# On the server
nano ~/goodmem-mcp-docker

# Add this content:
#!/bin/bash
docker exec -it goodmem-mcp-server node dist/index.js

# Make it executable
chmod +x ~/goodmem-mcp-docker
```

Then in your local Claude config:
```json
{
  "mcpServers": {
    "goodmem": {
      "command": "ssh",
      "args": [
        "-t",
        "root@yobi",
        "/root/goodmem-mcp-docker"
      ]
    }
  }
}
```

### Option 2: Direct Docker Command

In your local Claude config:
```json
{
  "mcpServers": {
    "goodmem": {
      "command": "ssh",
      "args": [
        "-t",
        "root@yobi",
        "docker exec -it goodmem-mcp-server node dist/index.js"
      ]
    }
  }
}
```

## Managing the Container

### View logs
```bash
docker logs goodmem-mcp-server
docker logs -f goodmem-mcp-server  # Follow logs
```

### Restart the container
```bash
docker-compose restart
```

### Stop the container
```bash
docker-compose down
```

### Update the code
```bash
git pull
docker-compose build
docker-compose up -d
```

### Execute commands in the container
```bash
# Test connection
docker exec goodmem-mcp-server node test-connection.js

# View environment
docker exec goodmem-mcp-server env | grep GOODMEM

# Interactive shell
docker exec -it goodmem-mcp-server /bin/sh
```

## Troubleshooting

### Container not starting
```bash
# Check logs
docker logs goodmem-mcp-server

# Check if build succeeded
docker-compose build
```

### Network issues
```bash
# List networks
docker network ls

# Inspect the network
docker network inspect bridge

# Check if containers can communicate
docker exec goodmem-mcp-server ping goodmem-server
```

### API connection issues
```bash
# Test from inside the container
docker exec goodmem-mcp-server curl -H "x-api-key: $GOODMEM_API_KEY" http://goodmem-server:8080/v1/spaces
```

## Docker Compose Override

For development, create `docker-compose.override.yml`:
```yaml
version: '3.8'

services:
  goodmem-mcp:
    volumes:
      - ./src:/app/src
      - ./dist:/app/dist
    environment:
      - LOG_LEVEL=debug
```

## Production Considerations

1. **Memory limits**: Add to docker-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         memory: 512M
   ```

2. **Health checks**: Add to docker-compose.yml:
   ```yaml
   healthcheck:
     test: ["CMD", "node", "-e", "process.exit(0)"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

3. **Logging**: Configure Docker logging driver:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

## Integration with Existing Goodmem Stack

If you have a `docker-compose.yml` for your Goodmem stack, you can add the MCP service to it:

```yaml
services:
  # ... existing Goodmem services ...
  
  goodmem-mcp:
    build: ./yobi-goodmem-mcp
    container_name: goodmem-mcp-server
    environment:
      - GOODMEM_API_URL=http://goodmem-server:8080
      - GOODMEM_API_KEY=${GOODMEM_API_KEY}
    depends_on:
      - goodmem-server
    restart: unless-stopped
    stdin_open: true
    tty: true
```

This ensures the MCP server starts with your Goodmem stack.