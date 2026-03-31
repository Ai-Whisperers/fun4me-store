# Error Scenario Coverage

Audit tests for comprehensive error handling coverage.

## Find Error Paths

1. Search for try/catch blocks in API routes:
   ```bash
   grep -rn "catch" web/app/api/ --include="*.ts"
   ```

2. Search for error responses:
   ```bash
   grep -rn "status: 4\|status: 5" web/app/api/ --include="*.ts"
   ```

## Error Types to Test

### Authentication Errors (401)
- Missing auth header
- Expired token
- Invalid token format

### Authorization Errors (403)
- Wrong role for endpoint
- Missing profile record
- Accessing other tenant's data

### Validation Errors (400)
- Missing required fields
- Invalid field types
- Zod schema failures
- Business rule violations (overpayment, etc.)

### Database Errors (500)
- Connection failures
- RPC errors
- Constraint violations

### Rate Limiting (429)
- Too many requests

## Test Patterns

```typescript
// Database error
it('should handle database errors gracefully', async () => {
  mockState.setTableError('invoices', new Error('Connection failed'))

  const response = await handler(request, context)

  expect(response.status).toBe(500)
  const json = await response.json()
  expect(json.code).toBe('DATABASE_ERROR')
})

// Validation error
it('should reject invalid amount', async () => {
  const request = createRequest({ amount: -100 })

  const response = await handler(request, context)

  expect(response.status).toBe(400)
  const json = await response.json()
  expect(json.code).toBe('VALIDATION_ERROR')
})
```

## Verify Error Contract

All errors should return:
```json
{
  "error": "Human-readable message in Spanish",
  "code": "ERROR_CODE",
  "details": { /* optional context */ }
}
```

## Output

Create `docs/testing/ERROR-COVERAGE.md` with coverage status per error type.
