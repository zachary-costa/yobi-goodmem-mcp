#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the compiled server
const serverPath = path.join(__dirname, '..', 'dist', 'index.js');

// Start the server
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env,
});

server.on('error', (error) => {
  console.error('Failed to start Goodmem MCP server:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  process.exit(code || 0);
});