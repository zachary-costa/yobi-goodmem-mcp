#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testServer() {
  console.log('Starting Goodmem MCP server test...');

  // Start the server
  const serverProcess = spawn('node', ['dist/index.js'], {
    env: {
      ...process.env,
      GOODMEM_API_URL: 'http://yobi-code-goodmem.internal.yib.io:8081/api/v1',
      GOODMEM_API_KEY: 'gm_di7zgw3vuvpq7zp2jm6jgwini4',
    },
  });

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
  });

  const client = new Client({
    name: 'goodmem-test-client',
    version: '1.0.0',
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log('Connected to server');

    // List available tools
    const tools = await client.listTools();
    console.log('Available tools:', tools.tools.map(t => t.name));

    // Test search
    console.log('\nTesting search...');
    const searchResult = await client.callTool('goodmem_search', {
      query: 'test',
      limit: 5,
    });
    console.log('Search result:', searchResult);

    // List resources
    const resources = await client.listResources();
    console.log('\nAvailable resources:', resources.resources.map(r => r.uri));

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await client.close();
    serverProcess.kill();
  }
}

testServer().catch(console.error);