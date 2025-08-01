import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
  TextContent,
  ImageContent,
  EmbeddedResource,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  PromptMessage,
  Prompt
} from '@modelcontextprotocol/sdk/types.js';
import { GoodmemClient } from './goodmem-client.js';
import { logger } from './logger.js';
import { GOODMEM_PROMPTS } from './prompts.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Goodmem client
const goodmemClient = new GoodmemClient({
  apiUrl: process.env.GOODMEM_API_URL || 'http://localhost:8080',
  apiKey: process.env.GOODMEM_API_KEY || '',
});

// Keep track of current space ID
let currentSpaceId: string | undefined = process.env.GOODMEM_DEFAULT_SPACE;

// Create MCP server
const server = new Server(
  {
    name: 'goodmem-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      resources: { subscribe: false },
      tools: {},
      prompts: {},
    },
  }
);

// Tool definitions with enhanced descriptions
const TOOLS: Tool[] = [
  {
    name: 'goodmem_search',
    description: 'Search for relevant memories using semantic search. Use this to find existing knowledge about APIs, patterns, decisions, or solutions before implementing new features.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find relevant memories',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10,
        },
        space_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of space IDs to search in (optional, uses current space if not provided)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'goodmem_add',
    description: 'Add a new memory to the knowledge base. Use this to store important information like API endpoints, technical decisions, configuration details, team knowledge, or code patterns that should be remembered.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content of the memory to add (e.g., "User API endpoint: POST /api/v1/users/login accepts {email, password}")',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata for categorization and search',
          properties: {
            type: { 
              type: 'string', 
              enum: ['api', 'config', 'architecture', 'team', 'pattern', 'decision', 'url', 'debug'],
              description: 'Type of information being stored'
            },
            service: { 
              type: 'string',
              description: 'Related service or component name'
            },
            tags: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Tags for categorization'
            },
            importance: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Importance level of this information'
            },
            owner: {
              type: 'string',
              description: 'Person or team responsible'
            },
            date_added: {
              type: 'string',
              description: 'ISO date when this was added'
            }
          },
        },
        space_id: {
          type: 'string',
          description: 'Space ID to add memory to (optional, uses current space if not provided)',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'goodmem_delete',
    description: 'Delete a memory by ID',
    inputSchema: {
      type: 'object',
      properties: {
        memory_id: {
          type: 'string',
          description: 'ID of the memory to delete',
        },
      },
      required: ['memory_id'],
    },
  },
  {
    name: 'goodmem_list_spaces',
    description: 'List all available memory spaces',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'goodmem_create_space',
    description: 'Create a new memory space for organizing related knowledge',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the new space (e.g., "API Documentation", "Architecture Decisions", "Team Processes")',
        },
        description: {
          type: 'string',
          description: 'Description of what this space contains',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'goodmem_set_current_space',
    description: 'Set the current active space for memory operations',
    inputSchema: {
      type: 'object',
      properties: {
        space_id: {
          type: 'string',
          description: 'ID of the space to set as current',
        },
      },
      required: ['space_id'],
    },
  },
  {
    name: 'goodmem_get_context',
    description: 'Get relevant context for a given query or topic. Use this before implementing features or answering questions to leverage existing team knowledge.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Query or topic to get context for',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of context items',
          default: 5,
        },
        space_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of space IDs to search in (optional)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'goodmem_list_memories',
    description: 'List memories in a specific space',
    inputSchema: {
      type: 'object',
      properties: {
        space_id: {
          type: 'string',
          description: 'Space ID to list memories from (optional, uses current space if not provided)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of memories to return',
          default: 20,
        },
      },
    },
  },
];

// Prompt definitions
const PROMPTS: Prompt[] = [
  {
    name: 'goodmem_instructions',
    description: 'Instructions for using Goodmem proactively',
    arguments: [
      {
        name: 'context',
        description: 'Current context (spaces, recent queries)',
        required: false,
      },
    ],
  },
];

// Handle prompt listing
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: PROMPTS,
}));

// Handle prompt retrieval
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'goodmem_instructions') {
    // Get current spaces for context
    const spaces = await goodmemClient.listSpaces();
    const spaceList = spaces.map(s => s.name || s.spaceId).join(', ');

    const messages: PromptMessage[] = [
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: GOODMEM_PROMPTS.instructions,
        },
      },
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: GOODMEM_PROMPTS.contextPrompt
            .replace('{currentSpace}', currentSpaceId || 'none')
            .replace('{spaceList}', spaceList || 'none'),
        },
      },
    ];

    return {
      description: GOODMEM_PROMPTS.description,
      messages,
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'goodmem_search': {
        const spaceIds = args?.space_ids as string[] || (currentSpaceId ? [currentSpaceId] : undefined);
        const events = await goodmemClient.retrieveMemories(
          args?.query as string || '',
          spaceIds,
          args?.limit as number || 10
        );
        
        // Format the results
        const results = events.map(event => {
          if (event.retrievedItem?.memory) {
            return {
              content: event.retrievedItem.memory.content,
              metadata: event.retrievedItem.memory.metadata,
              score: event.retrievedItem.score,
              memoryId: event.retrievedItem.memory.memoryId,
            };
          }
          return null;
        }).filter(Boolean);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'goodmem_add': {
        if (!args?.content) {
          throw new Error('Content is required');
        }
        
        const spaceId = args?.space_id as string || currentSpaceId;
        if (!spaceId) {
          throw new Error('No space ID provided and no current space set');
        }
        
        // Add automatic metadata
        const metadata = {
          ...args?.metadata as any,
          date_added: new Date().toISOString(),
        };
        
        const result = await goodmemClient.createMemory(
          args.content as string,
          spaceId,
          metadata
        );
        
        return {
          content: [
            {
              type: 'text',
              text: `Memory added successfully with ID: ${result.memoryId}`,
            },
          ],
        };
      }

      case 'goodmem_delete': {
        if (!args?.memory_id) {
          throw new Error('Memory ID is required');
        }
        
        await goodmemClient.deleteMemory(args.memory_id as string);
        
        return {
          content: [
            {
              type: 'text',
              text: `Memory deleted successfully`,
            },
          ],
        };
      }

      case 'goodmem_list_spaces': {
        const spaces = await goodmemClient.listSpaces();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(spaces, null, 2),
            },
          ],
        };
      }

      case 'goodmem_create_space': {
        if (!args?.name) {
          throw new Error('Space name is required');
        }
        
        const space = await goodmemClient.createSpace(
          args.name as string,
          args?.description as string
        );
        
        return {
          content: [
            {
              type: 'text',
              text: `Space created successfully: ${space.spaceId}`,
            },
          ],
        };
      }

      case 'goodmem_set_current_space': {
        if (!args?.space_id) {
          throw new Error('Space ID is required');
        }
        
        currentSpaceId = args.space_id as string;
        
        return {
          content: [
            {
              type: 'text',
              text: `Current space set to: ${currentSpaceId}`,
            },
          ],
        };
      }

      case 'goodmem_get_context': {
        const spaceIds = args?.space_ids as string[] || (currentSpaceId ? [currentSpaceId] : undefined);
        const context = await goodmemClient.getContext(
          args?.query as string || '',
          spaceIds,
          args?.limit as number || 5
        );
        
        return {
          content: [
            {
              type: 'text',
              text: context,
            },
          ],
        };
      }

      case 'goodmem_list_memories': {
        const spaceId = args?.space_id as string || currentSpaceId;
        if (!spaceId) {
          throw new Error('No space ID provided and no current space set');
        }
        
        const memories = await goodmemClient.listMemories(
          spaceId,
          args?.limit as number || 20
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(memories, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error(`Tool execution error: ${error}`);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// Resource definitions
server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: 'goodmem://spaces',
      name: 'Memory Spaces',
      description: 'Available memory spaces',
      mimeType: 'application/json',
    },
    {
      uri: 'goodmem://current-space',
      name: 'Current Space',
      description: 'Currently active space',
      mimeType: 'text/plain',
    },
    {
      uri: 'goodmem://instructions',
      name: 'Goodmem Usage Instructions',
      description: 'Instructions for proactive knowledge management',
      mimeType: 'text/markdown',
    },
  ],
}));

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    switch (uri) {
      case 'goodmem://spaces': {
        const spaces = await goodmemClient.listSpaces();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(spaces, null, 2),
            },
          ],
        };
      }

      case 'goodmem://current-space': {
        if (!currentSpaceId) {
          return {
            contents: [
              {
                uri,
                mimeType: 'text/plain',
                text: 'No current space set',
              },
            ],
          };
        }
        
        try {
          const space = await goodmemClient.getSpace(currentSpaceId);
          return {
            contents: [
              {
                uri,
                mimeType: 'text/plain',
                text: `Current space: ${space.name || space.spaceId} (${space.spaceId})`,
              },
            ],
          };
        } catch {
          return {
            contents: [
              {
                uri,
                mimeType: 'text/plain',
                text: `Current space ID: ${currentSpaceId}`,
              },
            ],
          };
        }
      }

      case 'goodmem://instructions': {
        return {
          contents: [
            {
              uri,
              mimeType: 'text/markdown',
              text: GOODMEM_PROMPTS.instructions,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  } catch (error) {
    logger.error(`Resource reading error: ${error}`);
    throw error;
  }
});

// Start the server
async function main() {
  logger.info('Starting Goodmem MCP Server...');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logger.info('Goodmem MCP Server is running');
  logger.info(`API URL: ${process.env.GOODMEM_API_URL || 'http://localhost:8080'}`);
  if (currentSpaceId) {
    logger.info(`Default space: ${currentSpaceId}`);
  }
  
  // Log available features
  logger.info('Features enabled:');
  logger.info('- Proactive storage suggestions for APIs, configs, and decisions');
  logger.info('- Automatic context retrieval before implementation');
  logger.info('- Enhanced metadata for better searchability');
  logger.info('- Instructional prompts for Claude');
}

main().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});