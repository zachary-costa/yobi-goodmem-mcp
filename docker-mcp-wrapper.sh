#!/bin/bash
# Docker wrapper for Goodmem MCP Server
# This script allows SSH access to the MCP server running in Docker

# Execute the MCP server inside the container
docker exec -it goodmem-mcp-server node dist/index.js