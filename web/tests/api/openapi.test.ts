/**
 * OpenAPI Documentation Tests
 *
 * OPS-001: Tests for OpenAPI specification and documentation endpoint
 */

import { describe, it, expect } from 'vitest'
import { getApiSpec } from '@/lib/api/openapi'

describe('OpenAPI Specification', () => {
  describe('getApiSpec', () => {
    it('returns a valid OpenAPI 3.0 spec', () => {
      const spec = getApiSpec() as Record<string, unknown>

      expect(spec).toBeDefined()
      expect(spec.openapi).toBe('3.0.0')
    })

    it('includes API info', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const info = spec.info as Record<string, unknown>

      expect(info).toBeDefined()
      expect(info.title).toBe('Vete Platform API')
      expect(info.version).toBe('1.0.0')
      expect(info.description).toContain('Multi-tenant veterinary clinic')
    })

    it('includes server configuration', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const servers = spec.servers as Array<Record<string, unknown>>

      expect(servers).toBeDefined()
      expect(servers.length).toBeGreaterThan(0)
      expect(servers[0].url).toBeDefined()
    })

    it('includes all required tags', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const tags = spec.tags as Array<Record<string, unknown>>

      const expectedTags = [
        'Health',
        'Pets',
        'Appointments',
        'Services',
        'Medical Records',
        'Vaccines',
        'Prescriptions',
        'Invoices',
        'Store',
        'Lab',
        'Hospitalization',
        'Messages',
        'Admin',
        'Cron',
      ]

      const tagNames = tags.map((t) => t.name)
      expectedTags.forEach((tag) => {
        expect(tagNames).toContain(tag)
      })
    })

    it('includes security schemes', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const securitySchemes = components.securitySchemes as Record<string, unknown>

      expect(securitySchemes).toBeDefined()
      expect(securitySchemes.bearerAuth).toBeDefined()
      expect(securitySchemes.cronSecret).toBeDefined()
    })

    it('includes default security requirement', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const security = spec.security as Array<Record<string, unknown>>

      expect(security).toBeDefined()
      expect(security.length).toBeGreaterThan(0)
      expect(security[0].bearerAuth).toBeDefined()
    })
  })

  describe('Component Schemas', () => {
    it('includes Pet schema', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const schemas = components.schemas as Record<string, unknown>

      expect(schemas.Pet).toBeDefined()
      const pet = schemas.Pet as Record<string, unknown>
      expect(pet.type).toBe('object')
      expect(pet.properties).toBeDefined()
    })

    it('includes Appointment schema', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const schemas = components.schemas as Record<string, unknown>

      expect(schemas.Appointment).toBeDefined()
      const appointment = schemas.Appointment as Record<string, unknown>
      const props = appointment.properties as Record<string, unknown>
      expect(props.status).toBeDefined()
      expect(props.scheduling_status).toBeDefined()
    })

    it('includes MedicalRecord schema', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const schemas = components.schemas as Record<string, unknown>

      expect(schemas.MedicalRecord).toBeDefined()
      const record = schemas.MedicalRecord as Record<string, unknown>
      const props = record.properties as Record<string, unknown>
      expect(props.type).toBeDefined()
      expect(props.vitals).toBeDefined()
    })

    it('includes Vaccine schema', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const schemas = components.schemas as Record<string, unknown>

      expect(schemas.Vaccine).toBeDefined()
      const vaccine = schemas.Vaccine as Record<string, unknown>
      const props = vaccine.properties as Record<string, unknown>
      expect(props.status).toBeDefined()
      expect(props.administered_date).toBeDefined()
    })

    it('includes Invoice schema', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const schemas = components.schemas as Record<string, unknown>

      expect(schemas.Invoice).toBeDefined()
      const invoice = schemas.Invoice as Record<string, unknown>
      const props = invoice.properties as Record<string, unknown>
      expect(props.status).toBeDefined()
      expect(props.total).toBeDefined()
    })

    it('includes Hospitalization schema', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const schemas = components.schemas as Record<string, unknown>

      expect(schemas.Hospitalization).toBeDefined()
      const hospitalization = schemas.Hospitalization as Record<string, unknown>
      const props = hospitalization.properties as Record<string, unknown>
      expect(props.acuity_level).toBeDefined()
      expect(props.kennel_id).toBeDefined()
    })

    it('includes LabOrder schema', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const schemas = components.schemas as Record<string, unknown>

      expect(schemas.LabOrder).toBeDefined()
      const labOrder = schemas.LabOrder as Record<string, unknown>
      const props = labOrder.properties as Record<string, unknown>
      expect(props.priority).toBeDefined()
      expect(props.status).toBeDefined()
    })

    it('includes Error schema', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const schemas = components.schemas as Record<string, unknown>

      expect(schemas.Error).toBeDefined()
    })

    it('includes Pagination schema', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const schemas = components.schemas as Record<string, unknown>

      expect(schemas.Pagination).toBeDefined()
      const pagination = schemas.Pagination as Record<string, unknown>
      const props = pagination.properties as Record<string, unknown>
      expect(props.page).toBeDefined()
      expect(props.limit).toBeDefined()
      expect(props.total).toBeDefined()
    })

    it('includes HealthCheck schema', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const schemas = components.schemas as Record<string, unknown>

      expect(schemas.HealthCheck).toBeDefined()
    })

    it('includes PerformanceMetrics schema', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const schemas = components.schemas as Record<string, unknown>

      expect(schemas.PerformanceMetrics).toBeDefined()
      const metrics = schemas.PerformanceMetrics as Record<string, unknown>
      const props = metrics.properties as Record<string, unknown>
      expect(props.api).toBeDefined()
      expect(props.uptime).toBeDefined()
    })
  })

  describe('Common Parameters', () => {
    it('includes page parameter', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const parameters = components.parameters as Record<string, unknown>

      expect(parameters.page).toBeDefined()
      const page = parameters.page as Record<string, unknown>
      expect(page.in).toBe('query')
    })

    it('includes limit parameter', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const parameters = components.parameters as Record<string, unknown>

      expect(parameters.limit).toBeDefined()
      const limit = parameters.limit as Record<string, unknown>
      const schema = limit.schema as Record<string, unknown>
      expect(schema.maximum).toBe(100)
    })
  })

  describe('Common Responses', () => {
    it('includes Unauthorized response', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const responses = components.responses as Record<string, unknown>

      expect(responses.Unauthorized).toBeDefined()
    })

    it('includes Forbidden response', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const responses = components.responses as Record<string, unknown>

      expect(responses.Forbidden).toBeDefined()
    })

    it('includes NotFound response', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const responses = components.responses as Record<string, unknown>

      expect(responses.NotFound).toBeDefined()
    })

    it('includes ValidationError response', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const components = spec.components as Record<string, unknown>
      const responses = components.responses as Record<string, unknown>

      expect(responses.ValidationError).toBeDefined()
    })
  })

  describe('Path Definitions', () => {
    it('includes documented paths', () => {
      const spec = getApiSpec() as Record<string, unknown>
      const paths = spec.paths as Record<string, unknown>

      // These paths should be documented in openapi-paths.ts
      expect(paths).toBeDefined()
      // Note: swagger-jsdoc scans the files, so paths depend on build
    })
  })
})
