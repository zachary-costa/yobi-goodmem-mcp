# Single Space Strategy for Goodmem

## Overview

This document outlines how to optimize Goodmem and Claude for a single-space strategy.

## Enhanced Metadata Structure

When using a single space, rich metadata becomes critical for organization:

```typescript
interface EnhancedMetadata {
  // Primary categorization
  category: 'api' | 'architecture' | 'operations' | 'team' | 'documentation';
  
  // Service/component association
  service?: string;  // "auth-service", "user-api", "frontend"
  
  // Specific type within category
  type: 'endpoint' | 'decision' | 'config' | 'process' | 'troubleshooting' | 'pattern';
  
  // Hierarchical tags for better search
  tags: string[];
  
  // Temporal context
  project?: string;     // "migration-2024", "project-phoenix"
  version?: string;     // "v2.0", "2024-Q1"
  deprecated?: boolean;
  
  // Importance and ownership
  importance: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;       // Team or person responsible
  lastUpdated: string;  // ISO date
}
```

## Search Strategies for Single Space

### 1. **Metadata-First Search**
```typescript
// Instead of searching by space, search by metadata
search("authentication", {
  filters: {
    category: "api",
    service: "auth-service"
  }
})
```

### 2. **Progressive Filtering**
```typescript
// Start broad, then filter
1. search("login endpoint")
2. Filter by: category="api"
3. Filter by: service="auth-service"
4. Sort by: importance, lastUpdated
```

### 3. **Tag-Based Navigation**
```typescript
// Use hierarchical tags
tags: [
  "auth",
  "auth/jwt",
  "auth/jwt/refresh-token"
]
```

## Claude Prompts for Single Space

```typescript
const SINGLE_SPACE_PROMPTS = {
  storage: `
When storing in the single Goodmem space, ALWAYS include rich metadata:

1. **Category** (required):
   - "api" for endpoints, contracts, API docs
   - "architecture" for design decisions, patterns
   - "operations" for deployment, config, infrastructure
   - "team" for processes, ownership, contacts
   - "documentation" for guides, tutorials

2. **Service** (when applicable):
   - Include the specific service/component name
   - Use consistent naming: "user-service", "auth-api"

3. **Tags** (minimum 3):
   - Use hierarchical tags: "auth", "auth/jwt", "auth/jwt/refresh"
   - Include technology tags: "nodejs", "postgres", "redis"
   - Add context tags: "production", "security", "performance"

4. **Importance**:
   - "critical": Core functionality, security, data integrity
   - "high": Important features, key decisions
   - "medium": Standard features, common patterns
   - "low": Nice-to-have, experimental
`,

  search: `
When searching the single Goodmem space:

1. **Use metadata filters** to narrow results:
   - Category + service for specific component info
   - Tags for cross-cutting concerns
   - Importance for critical information

2. **Search patterns**:
   - API info: filter by category="api"
   - Decisions: filter by category="architecture"
   - Errors: filter by type="troubleshooting"
   - Team info: filter by category="team"

3. **Combine filters** for precision:
   - "login API" + category="api" + service="auth-service"
   - "database decision" + category="architecture" + tags=["postgres"]
`
}
```

## Implementation Changes

### 1. **Modified Tool Descriptions**

```typescript
{
  name: 'goodmem_add',
  description: 'Add memory with REQUIRED rich metadata for single-space organization',
  inputSchema: {
    properties: {
      metadata: {
        required: ['category', 'type', 'tags', 'importance'],
        properties: {
          category: {
            enum: ['api', 'architecture', 'operations', 'team', 'documentation']
          },
          // ... rest of enhanced schema
        }
      }
    }
  }
}
```

### 2. **Search Enhancement**

```typescript
{
  name: 'goodmem_search',
  description: 'Search with metadata filters for precise results in single space',
  inputSchema: {
    properties: {
      filters: {
        type: 'object',
        description: 'Metadata filters to narrow search',
        properties: {
          category: { type: 'string' },
          service: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          importance: { type: 'string' }
        }
      }
    }
  }
}
```

## Best Practices

### 1. **Consistent Naming**
- Services: "user-service", "auth-api", "payment-gateway"
- Projects: "project-phoenix", "migration-2024"
- Tags: Use kebab-case, hierarchical structure

### 2. **Regular Maintenance**
- Mark deprecated entries
- Update lastUpdated timestamps
- Consolidate duplicate entries
- Review and update tags

### 3. **Search Optimization**
- Always include category in searches
- Use multiple tags for better findability
- Include temporal context (version, project)

## Advantages of Enhanced Single Space

1. **Simplicity**: One space to rule them all
2. **No fragmentation**: Everything searchable in one place
3. **Rich context**: Metadata provides organization
4. **Flexible evolution**: Can always split later if needed
5. **Better for Claude**: No space selection logic needed

## When to Migrate to Multiple Spaces

Consider multiple spaces when:
- Searches regularly return >50 results
- Clear organizational boundaries emerge
- Need access control between teams
- Performance degradation (>5000 memories)
- Distinct projects with no overlap