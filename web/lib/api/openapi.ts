/**
 * OpenAPI Specification Configuration
 *
 * OPS-001: Central OpenAPI/Swagger configuration for API documentation
 *
 * Generates OpenAPI 3.0 spec from JSDoc annotations in API route handlers.
 */

import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Vete Platform API',
      version: '1.0.0',
      description: `
# Vete Platform API

Multi-tenant veterinary clinic management platform API.

## Authentication

Most endpoints require authentication via Supabase Auth. Include the JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

## Multi-tenancy

All data is isolated by tenant. Users can only access data within their clinic.

## Rate Limiting

API endpoints are rate-limited. See individual endpoint documentation for limits.

## Error Responses

All errors follow a standard format:

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message in Spanish"
  }
}
\`\`\`

Common error codes:
- \`UNAUTHORIZED\`: Missing or invalid authentication
- \`FORBIDDEN\`: User lacks permission for this action
- \`NOT_FOUND\`: Resource not found
- \`VALIDATION_ERROR\`: Invalid request data
- \`RATE_LIMITED\`: Too many requests
- \`SERVER_ERROR\`: Internal server error
      `.trim(),
      contact: {
        name: 'Vete Platform Support',
        email: 'soporte@vete.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    tags: [
      { name: 'Health', description: 'Health check and monitoring endpoints' },
      { name: 'Auth', description: 'Authentication and authorization' },
      { name: 'Pets', description: 'Pet management' },
      { name: 'Appointments', description: 'Appointment scheduling' },
      { name: 'Services', description: 'Clinic services catalog' },
      { name: 'Medical Records', description: 'Medical records and history' },
      { name: 'Vaccines', description: 'Vaccination tracking' },
      { name: 'Prescriptions', description: 'Prescription management' },
      { name: 'Invoices', description: 'Billing and invoicing' },
      { name: 'Store', description: 'E-commerce and products' },
      { name: 'Inventory', description: 'Inventory management' },
      { name: 'Lab', description: 'Laboratory orders and results' },
      { name: 'Hospitalization', description: 'Patient hospitalization' },
      { name: 'Messages', description: 'Messaging and communication' },
      { name: 'Analytics', description: 'Reports and analytics' },
      { name: 'Admin', description: 'Administrative operations' },
      { name: 'Platform', description: 'Platform administration' },
      { name: 'Cron', description: 'Background job endpoints' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supabase Auth JWT token',
        },
        cronSecret: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'Bearer token with CRON_SECRET for cron job endpoints',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message (Spanish)',
                  example: 'Datos de entrada inválidos',
                },
              },
            },
          },
        },
        Pet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Max' },
            species: {
              type: 'string',
              enum: ['dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other'],
            },
            breed: { type: 'string', nullable: true, example: 'Labrador' },
            birth_date: { type: 'string', format: 'date', nullable: true },
            photo_url: { type: 'string', format: 'uri', nullable: true },
            owner_id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            pet_id: { type: 'string', format: 'uuid' },
            service_id: { type: 'string', format: 'uuid' },
            vet_id: { type: 'string', format: 'uuid', nullable: true },
            start_time: { type: 'string', format: 'date-time' },
            end_time: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'],
            },
            scheduling_status: {
              type: 'string',
              enum: ['pending_scheduling', 'scheduled', 'rescheduling'],
            },
            notes: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            invoice_number: { type: 'string', example: 'INV-2024-0001' },
            client_id: { type: 'string', format: 'uuid' },
            subtotal: { type: 'number', format: 'float' },
            tax_amount: { type: 'number', format: 'float' },
            total: { type: 'number', format: 'float' },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'],
            },
            due_date: { type: 'string', format: 'date', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            sku: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            base_price: { type: 'number', format: 'float' },
            category_id: { type: 'string', format: 'uuid', nullable: true },
            is_active: { type: 'boolean' },
            is_prescription_required: { type: 'boolean' },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'unhealthy'],
            },
            timestamp: { type: 'string', format: 'date-time' },
            checks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  healthy: { type: 'boolean' },
                  latency: { type: 'number' },
                },
              },
            },
            version: { type: 'string', nullable: true },
          },
        },
        PerformanceMetrics: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'degraded', 'critical'],
            },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: {
              type: 'object',
              properties: {
                serverStart: { type: 'string', format: 'date-time' },
                uptimeMs: { type: 'integer' },
                uptimeFormatted: { type: 'string' },
              },
            },
            api: {
              type: 'object',
              properties: {
                responseTime: {
                  type: 'object',
                  properties: {
                    p50: { type: 'number' },
                    p95: { type: 'number' },
                    p99: { type: 'number' },
                    avg: { type: 'number' },
                  },
                },
                requestsPerMinute: { type: 'number' },
                errorRate: { type: 'number' },
                totalRequests: { type: 'integer' },
                totalErrors: { type: 'integer' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        MedicalRecord: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            pet_id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string' },
            performed_by: { type: 'string', format: 'uuid' },
            type: {
              type: 'string',
              enum: [
                'consultation',
                'exam',
                'surgery',
                'hospitalization',
                'wellness',
                'emergency',
                'follow_up',
                'vaccination',
                'lab_result',
                'imaging',
              ],
            },
            title: { type: 'string' },
            diagnosis: { type: 'string', nullable: true },
            diagnosis_code_id: { type: 'string', format: 'uuid', nullable: true },
            notes: { type: 'string', nullable: true },
            vitals: {
              type: 'object',
              nullable: true,
              properties: {
                weight: { type: 'number', nullable: true },
                temp: { type: 'number', nullable: true },
                hr: { type: 'integer', nullable: true },
                rr: { type: 'integer', nullable: true },
              },
            },
            attachments: {
              type: 'array',
              items: { type: 'string', format: 'uri' },
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Vaccine: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            pet_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Rabies' },
            administered_date: { type: 'string', format: 'date' },
            next_due_date: { type: 'string', format: 'date', nullable: true },
            batch_number: { type: 'string', nullable: true },
            status: {
              type: 'string',
              enum: ['pending', 'verified', 'expired'],
            },
            administered_by: { type: 'string', format: 'uuid', nullable: true },
            verified_by: { type: 'string', format: 'uuid', nullable: true },
            verified_at: { type: 'string', format: 'date-time', nullable: true },
            notes: { type: 'string', nullable: true },
            certificate_url: { type: 'string', format: 'uri', nullable: true },
            photos: {
              type: 'array',
              items: { type: 'string', format: 'uri' },
              nullable: true,
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Prescription: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            pet_id: { type: 'string', format: 'uuid' },
            vet_id: { type: 'string', format: 'uuid' },
            medications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  dose: { type: 'string' },
                  frequency: { type: 'string' },
                  duration: { type: 'string' },
                },
              },
            },
            valid_until: { type: 'string', format: 'date' },
            signature_url: { type: 'string', format: 'uri', nullable: true },
            notes: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        LabOrder: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string' },
            pet_id: { type: 'string', format: 'uuid' },
            ordered_by: { type: 'string', format: 'uuid' },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
            },
            priority: {
              type: 'string',
              enum: ['routine', 'urgent', 'stat'],
            },
            notes: { type: 'string', nullable: true },
            ordered_at: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Hospitalization: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string' },
            pet_id: { type: 'string', format: 'uuid' },
            kennel_id: { type: 'string', format: 'uuid' },
            admitted_at: { type: 'string', format: 'date-time' },
            discharged_at: { type: 'string', format: 'date-time', nullable: true },
            status: {
              type: 'string',
              enum: ['admitted', 'discharged', 'transferred'],
            },
            acuity_level: {
              type: 'string',
              enum: ['critical', 'high', 'medium', 'low'],
            },
            diagnosis: { type: 'string', nullable: true },
            treatment_plan: { type: 'string', nullable: true },
          },
        },
        Service: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tenant_id: { type: 'string' },
            name: { type: 'string' },
            category: { type: 'string' },
            base_price: { type: 'number', format: 'float' },
            duration_minutes: { type: 'integer' },
            is_active: { type: 'boolean' },
            description: { type: 'string', nullable: true },
          },
        },
      },
      parameters: {
        tenantId: {
          name: 'tenant_id',
          in: 'query',
          description: 'Tenant/clinic identifier',
          required: false,
          schema: { type: 'string' },
        },
        page: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          schema: { type: 'integer', default: 1, minimum: 1 },
        },
        limit: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: { code: 'UNAUTHORIZED', message: 'No autorizado' },
              },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: { code: 'FORBIDDEN', message: 'Acceso denegado' },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: { code: 'NOT_FOUND', message: 'Recurso no encontrado' },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Datos de entrada inválidos',
                },
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                error: {
                  code: 'SERVER_ERROR',
                  message: 'Error interno del servidor',
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  // API routes to scan for JSDoc annotations
  apis: [
    './app/api/**/*.ts',
    './lib/api/openapi-paths.ts', // Manual path definitions
  ],
}

/**
 * Generate the OpenAPI specification
 */
export function getApiSpec(): object {
  return swaggerJsdoc(options)
}

/**
 * Export spec for external tools
 */
export const apiSpec = getApiSpec()
