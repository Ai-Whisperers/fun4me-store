#!/usr/bin/env node

/**
 * Vete Supabase Tenant-Aware MCP Server
 * 
 * Provides multi-tenant safe database operations for the Vete platform.
 * All queries automatically filter by tenant_id to enforce isolation.
 * 
 * Tools:
 * - query_with_tenant: Query tables with automatic tenant filtering
 * - verify_rls_compliance: Check RLS policies on tables
 * - list_tenant_tables: List all multi-tenant tables
 * 
 * Resources:
 * - mcp://vete/tenant-tables: List of tables with tenant_id column
 * 
 * Usage:
 *   node dist/supabase-tenant-wrapper.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Tool input schemas
const QueryWithTenantSchema = z.object({
  table: z.string().describe('Table name to query'),
  tenant_id: z.string().describe('Tenant ID (clinic slug)'),
  columns: z.string().default('*').describe('Columns to select (default: *)'),
  filters: z.record(z.string(), z.any()).optional().describe('Additional filters as key-value pairs'),
  limit: z.number().optional().describe('Maximum number of rows to return'),
});

const VerifyRLSSchema = z.object({
  table_name: z.string().describe('Table name to check'),
});

// Initialize MCP server
const server = new Server({
  name: 'vete-supabase-tenant',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
  },
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'query_with_tenant',
        description: 'Query Supabase table with automatic tenant_id filtering (safe multi-tenant queries)',
        inputSchema: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'Table name to query',
            },
            tenant_id: {
              type: 'string',
              description: 'Tenant ID (clinic slug like "terrapet" or "petlife")',
            },
            columns: {
              type: 'string',
              description: 'Columns to select (default: *)',
              default: '*',
            },
            filters: {
              type: 'object',
              description: 'Additional filters as key-value pairs',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of rows',
            },
          },
          required: ['table', 'tenant_id'],
        },
      },
      {
        name: 'verify_rls_compliance',
        description: 'Check if table has RLS enabled and policies configured',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Table name to check',
            },
          },
          required: ['table_name'],
        },
      },
      {
        name: 'list_tenant_tables',
        description: 'List all tables with tenant_id column (multi-tenant tables)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'mcp://vete/tenant-tables',
        mimeType: 'application/json',
        name: 'Multi-tenant tables',
        description: 'List of all tables with tenant_id column',
      },
    ],
  };
});

// Read resource handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri.toString();

  if (uri === 'mcp://vete/tenant-tables') {
    // Query information_schema for tables with tenant_id column
    const { data, error } = await supabase.rpc('list_tenant_tables');

    if (error) {
      throw new Error(`Failed to list tenant tables: ${error.message}`);
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data || [], null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'query_with_tenant') {
      const { table, tenant_id, columns, filters, limit } = QueryWithTenantSchema.parse(args);

      // Build query with tenant filter
      let query = supabase
        .from(table)
        .select(columns)
        .eq('tenant_id', tenant_id);

      // Apply additional filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: true,
                message: `Error querying ${table}: ${error.message}`,
                details: error,
              }, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              table,
              tenant_id,
              count: data?.length || 0,
              data,
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'verify_rls_compliance') {
      const { table_name } = VerifyRLSSchema.parse(args);

      // Check RLS status using PostgreSQL system catalogs
      const { data: rlsData, error: rlsError } = await supabase
        .rpc('check_rls_enabled', { table_name });

      if (rlsError) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: true,
                message: `Error checking RLS: ${rlsError.message}`,
              }, null, 2),
            },
          ],
        };
      }

      // Check policies
      const { data: policies, error: policiesError } = await supabase
        .rpc('list_table_policies', { table_name });

      if (policiesError) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: true,
                message: `Error listing policies: ${policiesError.message}`,
              }, null, 2),
            },
          ],
        };
      }

      const rls_enabled = rlsData?.[0]?.rls_enabled || false;
      const policies_count = policies?.length || 0;
      const compliant = rls_enabled && policies_count > 0;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              table: table_name,
              rls_enabled,
              policies_count,
              policies: policies || [],
              compliant,
              message: compliant
                ? '✅ Table is RLS compliant'
                : '⚠️ Table is NOT RLS compliant',
              issues: [
                ...(!rls_enabled ? ['RLS not enabled'] : []),
                ...(policies_count === 0 ? ['No RLS policies found'] : []),
              ],
            }, null, 2),
          },
        ],
      };
    }

    if (name === 'list_tenant_tables') {
      // Query information_schema for tables with tenant_id
      const { data, error } = await supabase
        .rpc('list_tenant_tables');

      if (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: true,
                message: `Error listing tables: ${error.message}`,
              }, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              count: data?.length || 0,
              tables: data || [],
            }, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: errorMessage,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Vete Supabase Tenant MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
