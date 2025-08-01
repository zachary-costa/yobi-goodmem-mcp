#!/bin/bash
# Goodmem MCP Server Installation Script

set -e

echo "==================================="
echo "Goodmem MCP Server Installation"
echo "==================================="

# Check if running on the server
if [ ! -f /etc/hostname ]; then
    echo "This script should be run on your Goodmem server"
    exit 1
fi

# Get installation directory
read -p "Installation directory [~/yobi-goodmem-mcp]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-~/yobi-goodmem-mcp}
INSTALL_DIR=$(eval echo $INSTALL_DIR)

# Clone repository
if [ -d "$INSTALL_DIR" ]; then
    echo "Directory exists. Updating..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "Cloning repository..."
    git clone https://github.com/zachary-costa/yobi-goodmem-mcp.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Configure environment
if [ ! -f .env ]; then
    echo ""
    echo "==================================="
    echo "Environment Configuration"
    echo "==================================="
    
    # Get Goodmem URL
    read -p "Goodmem API URL [http://localhost:8080]: " GOODMEM_URL
    GOODMEM_URL=${GOODMEM_URL:-http://localhost:8080}
    
    # Get API key
    read -p "Goodmem API Key (gm_...): " GOODMEM_KEY
    while [ -z "$GOODMEM_KEY" ]; do
        echo "API Key is required!"
        read -p "Goodmem API Key (gm_...): " GOODMEM_KEY
    done
    
    # Get default space
    read -p "Default Space [default]: " DEFAULT_SPACE
    DEFAULT_SPACE=${DEFAULT_SPACE:-default}
    
    # Create .env file
    cat > .env << EOF
GOODMEM_API_URL=$GOODMEM_URL
GOODMEM_API_KEY=$GOODMEM_KEY
GOODMEM_DEFAULT_SPACE=$DEFAULT_SPACE
LOG_LEVEL=info
EOF
    
    chmod 600 .env
    echo "Environment configured!"
fi

# Test connection
echo ""
echo "Testing Goodmem connection..."
if node test-connection.js; then
    echo "✅ Connection successful!"
else
    echo "❌ Connection failed. Please check your configuration."
    exit 1
fi

# Create wrapper script
echo ""
echo "Creating wrapper script..."
WRAPPER_PATH="$HOME/goodmem-mcp-server"
cat > "$WRAPPER_PATH" << EOF
#!/bin/bash
cd $INSTALL_DIR
exec node dist/index.js
EOF
chmod +x "$WRAPPER_PATH"

# Optional: Setup systemd service
echo ""
read -p "Setup as system service? (y/n): " SETUP_SERVICE
if [ "$SETUP_SERVICE" = "y" ]; then
    SERVICE_FILE="/tmp/goodmem-mcp.service"
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Goodmem MCP Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) $INSTALL_DIR/dist/index.js
Restart=always
RestartSec=10
EnvironmentFile=$INSTALL_DIR/.env

[Install]
WantedBy=multi-user.target
EOF
    
    echo "Service file created at $SERVICE_FILE"
    echo "To install, run:"
    echo "  sudo cp $SERVICE_FILE /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable goodmem-mcp"
    echo "  sudo systemctl start goodmem-mcp"
fi

# Show Claude configuration
echo ""
echo "==================================="
echo "Claude Configuration"
echo "==================================="
echo ""
echo "Add this to your ~/.claude/claude_desktop_config.json:"
echo ""
cat << EOF
{
  "mcpServers": {
    "goodmem": {
      "command": "ssh",
      "args": [
        "-t",
        "$USER@$(hostname -f)",
        "$WRAPPER_PATH"
      ]
    }
  }
}
EOF

echo ""
echo "==================================="
echo "Installation Complete!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Copy the Claude configuration above"
echo "2. Update your local ~/.claude/claude_desktop_config.json"
echo "3. Restart Claude Code"
echo "4. Test by asking Claude to 'list Goodmem spaces'"
echo ""
echo "Wrapper script location: $WRAPPER_PATH"
echo "Installation directory: $INSTALL_DIR"