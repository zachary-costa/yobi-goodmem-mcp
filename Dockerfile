# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S goodmem && \
    adduser -S goodmem -u 1001 -G goodmem

# Set ownership
RUN chown -R goodmem:goodmem /app

# Switch to non-root user
USER goodmem

# Expose the port (MCP uses stdio, so this is just for documentation)
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]