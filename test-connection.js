#!/usr/bin/env node

import { GoodmemClient } from './dist/goodmem-client.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log(chalk.blue('🔍 Testing Goodmem Connection...\n'));

// Check environment variables
const apiUrl = process.env.GOODMEM_API_URL || 'http://localhost:8080';
const apiKey = process.env.GOODMEM_API_KEY;

console.log(chalk.cyan('Configuration:'));
console.log(`  API URL: ${chalk.yellow(apiUrl)}`);
console.log(`  API Key: ${apiKey ? chalk.green('✓ Set') : chalk.red('✗ Not set')}`);
console.log(`  Default Space: ${chalk.yellow(process.env.GOODMEM_DEFAULT_SPACE || 'Not set')}\n`);

if (!apiKey) {
  console.error(chalk.red('❌ GOODMEM_API_KEY is not set in .env file'));
  process.exit(1);
}

// Create client
const client = new GoodmemClient({
  apiUrl,
  apiKey,
});

async function testConnection() {
  try {
    // Test 1: List spaces
    console.log(chalk.blue('📋 Testing: List Spaces...'));
    const spaces = await client.listSpaces();
    console.log(chalk.green(`✅ Success! Found ${spaces.length} space(s):`));
    spaces.forEach(space => {
      console.log(`   - ${space.name || 'Unnamed'} (${space.spaceId})`);
    });
    console.log();

    // Test 2: Create a test memory (if we have a space)
    if (spaces.length > 0) {
      const testSpaceId = spaces[0].spaceId;
      console.log(chalk.blue(`📝 Testing: Create Memory in space "${spaces[0].name || testSpaceId}"...`));
      
      const memory = await client.createMemory(
        'Test memory from MCP server connection test',
        testSpaceId,
        {
          source: 'mcp-test',
          timestamp: new Date().toISOString(),
        }
      );
      
      console.log(chalk.green(`✅ Success! Created memory with ID: ${memory.memoryId}`));
      console.log();

      // Test 3: Search for the memory
      console.log(chalk.blue('🔍 Testing: Search Memories...'));
      const results = await client.retrieveMemories('test memory MCP', [testSpaceId], 5);
      console.log(chalk.green(`✅ Success! Found ${results.length} result(s)`));
      console.log();

      // Test 4: Delete the test memory
      if (memory.memoryId) {
        console.log(chalk.blue('🗑️  Testing: Delete Memory...'));
        await client.deleteMemory(memory.memoryId);
        console.log(chalk.green('✅ Success! Test memory deleted'));
        console.log();
      }
    } else {
      console.log(chalk.yellow('⚠️  No spaces found. Create a space first to test memory operations.'));
      
      // Try to create a test space
      console.log(chalk.blue('\n📁 Testing: Create Space...'));
      try {
        const space = await client.createSpace('MCP Test Space', 'Test space for MCP server');
        console.log(chalk.green(`✅ Success! Created space with ID: ${space.spaceId}`));
      } catch (error) {
        console.log(chalk.yellow('⚠️  Could not create test space:', error.message));
      }
    }

    console.log(chalk.green('\n✨ All tests completed successfully!'));
    console.log(chalk.cyan('\nYour Goodmem MCP server is ready to use with Claude.'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Connection test failed:'));
    console.error(chalk.red(error.message));
    
    console.log(chalk.yellow('\n🔧 Troubleshooting tips:'));
    console.log('  1. Check if Goodmem server is running');
    console.log('  2. Verify the API URL is correct');
    console.log('  3. Ensure your API key is valid');
    console.log('  4. Check network connectivity to the server');
    console.log('\nTry running this curl command to test the API directly:');
    console.log(chalk.gray(`  curl -H "x-api-key: ${apiKey}" ${apiUrl}/v1/spaces`));
    
    process.exit(1);
  }
}

// Run the test
testConnection().catch(console.error);