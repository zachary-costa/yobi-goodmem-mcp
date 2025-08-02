import axios, { AxiosInstance } from 'axios';
import { logger } from './logger.js';

// Goodmem API models based on documentation
export interface Memory {
  memoryId?: string;
  content?: string;
  metadata?: Record<string, any>;
  embeddingId?: string;
  spaceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Space {
  spaceId: string;
  name?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// MemoryCreationRequest interface removed - using inline object with originalContent

export interface RetrieveMemoryEvent {
  abstractReply?: {
    text: string;
  };
  retrievedItem?: {
    memory?: Memory;
    score?: number;
  };
}

export interface GoodmemConfig {
  apiUrl: string;
  apiKey: string;
}

export class GoodmemClient {
  private client: AxiosInstance;
  private config: GoodmemConfig;

  constructor(config: GoodmemConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Goodmem API error:', error.response?.data || error.message);
        throw error;
      }
    );
  }

  // Spaces API
  async listSpaces(): Promise<Space[]> {
    try {
      const response = await this.client.get('/v1/spaces');
      return response.data.spaces || [];
    } catch (error) {
      logger.error('List spaces failed:', error);
      throw new Error(`Failed to list spaces: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createSpace(name: string, description?: string): Promise<Space> {
    try {
      const payload = {
        name,
        description,
      };

      const response = await this.client.post('/v1/spaces', payload);
      return response.data;
    } catch (error) {
      logger.error('Create space failed:', error);
      throw new Error(`Failed to create space: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSpace(spaceId: string): Promise<Space> {
    try {
      const response = await this.client.get(`/v1/spaces/${spaceId}`);
      return response.data;
    } catch (error) {
      logger.error('Get space failed:', error);
      throw new Error(`Failed to get space: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Memories API
  async createMemory(content: string, spaceId: string, metadata?: Record<string, any>): Promise<Memory> {
    try {
      const payload = {
        originalContent: content,  // Changed from 'content' to 'originalContent'
        spaceId,
        metadata: metadata || {},
        contentType: 'text/plain', // Add contentType as required by API
      };

      const response = await this.client.post('/v1/memories', payload);
      return response.data;
    } catch (error) {
      logger.error('Create memory failed:', error);
      throw new Error(`Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMemory(memoryId: string): Promise<Memory> {
    try {
      const response = await this.client.get(`/v1/memories/${memoryId}`);
      return response.data;
    } catch (error) {
      logger.error('Get memory failed:', error);
      throw new Error(`Failed to get memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteMemory(memoryId: string): Promise<void> {
    try {
      await this.client.delete(`/v1/memories/${memoryId}`);
    } catch (error) {
      logger.error('Delete memory failed:', error);
      throw new Error(`Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listMemories(spaceId: string, limit: number = 20): Promise<Memory[]> {
    try {
      const response = await this.client.get(`/v1/spaces/${spaceId}/memories`, {
        params: { limit },
      });
      return response.data.memories || [];
    } catch (error) {
      logger.error('List memories failed:', error);
      throw new Error(`Failed to list memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Memory Retrieval (Semantic Search)
  async retrieveMemories(
    query: string,
    spaceIds?: string[],
    limit: number = 10
  ): Promise<RetrieveMemoryEvent[]> {
    try {
      // For now, we'll use the simple GET endpoint
      // In a full implementation, we'd use the streaming endpoint
      const params = new URLSearchParams({
        message: query,
        requestedSize: limit.toString(),
        fetchMemory: 'true',
      });

      if (spaceIds && spaceIds.length > 0) {
        spaceIds.forEach(id => params.append('spaceIds', id));
      }

      const response = await this.client.get(`/v1/memories/retrieve?${params}`);
      
      // Parse the response - this endpoint returns NDJSON
      const events: RetrieveMemoryEvent[] = [];
      const lines = response.data.split('\n').filter((line: string) => line.trim());
      
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          events.push(event);
        } catch (e) {
          // Skip invalid JSON lines
        }
      }

      return events;
    } catch (error) {
      logger.error('Retrieve memories failed:', error);
      throw new Error(`Failed to retrieve memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to format memories as context
  async getContext(query: string, spaceIds?: string[], limit: number = 5): Promise<string> {
    try {
      const events = await this.retrieveMemories(query, spaceIds, limit);
      
      if (events.length === 0) {
        return 'No relevant context found.';
      }

      const memories: string[] = [];
      let abstractText = '';

      for (const event of events) {
        if (event.abstractReply?.text) {
          abstractText = event.abstractReply.text;
        }
        if (event.retrievedItem?.memory) {
          const memory = event.retrievedItem.memory;
          const metadata = memory.metadata ? ` [${JSON.stringify(memory.metadata)}]` : '';
          memories.push(`- ${memory.content}${metadata}`);
        }
      }

      let context = '# Relevant Context from Team Knowledge:\n\n';
      
      if (abstractText) {
        context += `## Summary:\n${abstractText}\n\n`;
      }
      
      if (memories.length > 0) {
        context += `## Related Memories:\n${memories.join('\n')}`;
      }

      return context;
    } catch (error) {
      logger.error('Get context failed:', error);
      return 'Failed to retrieve context.';
    }
  }

  // Batch operations
  async batchCreateMemories(memories: Array<{originalContent: string; spaceId: string; metadata?: Record<string, any>; contentType?: string}>): Promise<Memory[]> {
    try {
      const response = await this.client.post('/v1/memories/batch', { memories });
      return response.data.memories || [];
    } catch (error) {
      logger.error('Batch create memories failed:', error);
      throw new Error(`Failed to batch create memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async batchDeleteMemories(memoryIds: string[]): Promise<void> {
    try {
      await this.client.post('/v1/memories/batch/delete', { memoryIds });
    } catch (error) {
      logger.error('Batch delete memories failed:', error);
      throw new Error(`Failed to batch delete memories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}