# OPS-001: API Documentation (OpenAPI/Swagger)

## Priority: P2
## Category: Operations
## Status: ✅ Completed
## Epic: [EPIC-11: Operations & Observability](../epics/EPIC-11-operations.md)

## Description
Generate comprehensive API documentation using OpenAPI/Swagger specification to enable client SDK generation, improve developer experience, and ensure API contract clarity.

## Implementation Summary

### Files Created/Modified
- `web/lib/api/openapi.ts` - Central OpenAPI 3.0 configuration with swagger-jsdoc
- `web/lib/api/openapi-paths.ts` - JSDoc annotations for 30+ key API endpoints
- `web/app/api/openapi.json/route.ts` - JSON spec endpoint
- `web/app/platform/api-docs/page.tsx` - Documentation page
- `web/app/platform/api-docs/client.tsx` - Swagger UI client component
- `web/app/platform/layout.tsx` - Added API Docs nav link
- `web/tests/api/openapi.test.ts` - 21 unit tests

### Features Implemented
1. **OpenAPI 3.0 Spec Generation**
   - Uses `swagger-jsdoc` to generate spec from JSDoc annotations
   - 18 API tags covering all major resource categories
   - Complete security scheme definitions (Bearer auth, cron secret)

2. **Component Schemas**
   - Pet, Appointment, MedicalRecord, Vaccine schemas
   - Invoice, Product, Prescription schemas
   - LabOrder, Hospitalization, Service schemas
   - Error, Pagination, HealthCheck, PerformanceMetrics schemas

3. **Documented Endpoints**
   - Health check and metrics endpoints
   - CRUD operations for Pets, Appointments, Invoices
   - Medical Records and Vaccines management
   - Prescriptions and Hospitalizations
   - Lab orders and Kennel management
   - Services, Messages, Notifications
   - Client and Staff management
   - Cron job endpoints

4. **Swagger UI Dashboard**
   - Interactive documentation at `/platform/api-docs`
   - Download JSON spec functionality
   - Refresh and open in new tab options
   - API stats display (269 route files, 450+ methods, 18 tags)
   - Custom styled Swagger UI

5. **Common Parameters & Responses**
   - Pagination parameters (page, limit)
   - Standard error responses (401, 403, 404, 400, 500)

## Acceptance Criteria
- [x] OpenAPI 3.0 spec generated from routes
- [x] Swagger UI accessible at `/platform/api-docs`
- [x] Key endpoints documented (30+ endpoints across all categories)
- [x] Request/response schemas included
- [x] Authentication requirements documented
- [x] Rate limiting documented in API description
- [x] Spanish error messages documented

## Test Results
All 21 OpenAPI tests passing:
- Spec structure validation
- Tag completeness
- Schema definitions
- Security schemes
- Parameter definitions
- Response definitions

## Related Files
- `app/api/**/*.ts` - All API routes
- `lib/schemas/*.ts` - Zod schemas

## Completed
- January 2026
