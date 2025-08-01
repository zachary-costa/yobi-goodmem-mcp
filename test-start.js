#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing MCP server startup...');

const serverPath = path.join(__dirname, 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  env: {
    ...process.env,
    LOG_LEVEL: 'debug'
  }
});

// Capture server output
server.stdout.on('data', (data) => {
  console.log(`[STDOUT]: ${data}`);
});

server.stderr.on('data', (data) => {
  console.log(`[STDERR]: ${data}`);
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Give it a few seconds then kill it
setTimeout(() => {
  console.log('\nTest complete - shutting down server');
  server.kill();
}, 3000);

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});