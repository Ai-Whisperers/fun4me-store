# API Reference

> Complete API documentation for growth strategy endpoints

## Overview

All growth strategy APIs follow REST conventions and return JSON responses.

### Base URL

```
Production: https://vetic.com/api
Development: http://localhost:3000/api
```

### Authentication

Most endpoints require authentication via Supabase Auth. Include the session cookie or Bearer token:

```bash
# With cookie (browser)
Cookie: sb-access-token=xxx; sb-refresh-token=xxx

# With Bearer token (API)
Authorization: Bearer <access_token>
```

### Error Responses

All errors follow this format:

```json
{
  "error": "Error message in Spanish",
  "code": "ERROR_CODE",
  "details": {}
}
```

Common HTTP status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

---

## Claim API

### Check Clinic Availability

Check if a pre-generated clinic is available to claim.

```http
GET /api/claim?slug={clinicSlug}
```

**Parameters:**

| Name | Type | Location | Required | Description |
|------|------|----------|----------|-------------|
| `slug` | string | query | Yes | Clinic slug/ID |

**Response (available):**

```json
{
  "available": true,
  "clinic": {
    "name": "Veterinaria ABC",
    "type": "general",
    "zone": "Villa Morra",
    "isPregenerated": true
  }
}
```

**Response (already claimed):**

```json
{
  "available": false,
  "message": "Esta clínica ya fue reclamada",
  "clinic": {
    "name": "Veterinaria ABC",
    "status": "claimed"
  }
}
```

**Response (not found):**

```json
{
  "available": false,
  "message": "Clínica no encontrada"
}
```

### Claim Clinic

Claim a pre-generated clinic and create owner account.

```http
POST /api/claim
Content-Type: application/json
```

**Request Body:**

```json
{
  "clinicSlug": "veterinaria-abc",
  "ownerName": "Dr. Juan Pérez",
  "ownerEmail": "juan@vetabc.com",
  "ownerPhone": "+595981123456",
  "password": "securepassword123"
}
```

**Validation Rules:**

| Field | Rules |
|-------|-------|
| `clinicSlug` | Required, non-empty |
| `ownerName` | Required, min 2 characters |
| `ownerEmail` | Required, valid email format |
| `ownerPhone` | Required, min 8 characters |
| `password` | Required, min 6 characters |

**Response (success):**

```json
{
  "success": true,
  "message": "¡Felicitaciones! Tu clínica fue reclamada exitosamente.",
  "clinicId": "veterinaria-abc",
  "redirectUrl": "/veterinaria-abc/dashboard"
}
```

**Error Responses:**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Validation error | Invalid input |
| 404 | "Clínica no encontrada" | Slug doesn't exist |
| 409 | "Esta clínica ya fue reclamada" | Already claimed |
| 409 | "Este email ya está registrado" | Email in use |
| 500 | "Error al crear cuenta" | Auth creation failed |

---

## Ambassador API

### Get Ambassador Profile

Get current user's ambassador profile.

```http
GET /api/ambassador
Authorization: Required
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "juan@universidad.edu.py",
  "full_name": "Juan Pérez",
  "phone": "+595981123456",
  "type": "student",
  "university": "Universidad Nacional de Asunción",
  "status": "active",
  "tier": "embajador",
  "referral_code": "JUAN1234",
  "referrals_count": 5,
  "conversions_count": 2,
  "commission_rate": 30.00,
  "total_earned": 1440000,
  "total_paid": 720000,
  "pending_payout": 720000,
  "bank_name": "Banco Continental",
  "bank_account": "1234567890",
  "created_at": "2026-01-01T10:00:00Z",
  "share_url": "https://vetic.com/signup?amb=JUAN1234",
  "share_message": "¡Únete a Vetic usando mi código JUAN1234 y obtén 2 meses extra de prueba!"
}
```

**Error Responses:**

| Status | Error | Cause |
|--------|-------|-------|
| 401 | "No autorizado" | Not logged in |
| 404 | "No eres embajador" | User not an ambassador |

### Register as Ambassador

Create new ambassador account.

```http
POST /api/ambassador
Content-Type: application/json
```

**Request Body:**

```json
{
  "fullName": "Juan Pérez",
  "email": "juan@universidad.edu.py",
  "phone": "+595981123456",
  "password": "securepass123",
  "type": "student",
  "university": "Universidad Nacional de Asunción",
  "institution": null
}
```

**Validation Rules:**

| Field | Rules | Required |
|-------|-------|----------|
| `fullName` | Min 2 characters | Yes |
| `email` | Valid email format | Yes |
| `phone` | Min 8 characters | Yes |
| `password` | Min 6 characters | Yes |
| `type` | One of: student, assistant, teacher, other | Yes |
| `university` | String | No |
| `institution` | String | No |

**Response (success):**

```json
{
  "success": true,
  "message": "Registro exitoso. Tu cuenta será revisada y activada pronto.",
  "ambassador": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "juan@universidad.edu.py",
    "referral_code": "JUAN1234",
    "status": "pending"
  }
}
```

**Error Responses:**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Validation error | Invalid input |
| 409 | "Este email ya está registrado como embajador" | Email exists |
| 500 | "Error al crear cuenta" | Auth failed |

---

## Ambassador Stats API

### Get Statistics

Get ambassador's referral statistics with tier info.

```http
GET /api/ambassador/stats
Authorization: Required
```

**Response:**

```json
{
  "total_referrals": 5,
  "pending_referrals": 2,
  "converted_referrals": 2,
  "total_earned": 1440000,
  "pending_payout": 720000,
  "tier": "embajador",
  "commission_rate": 30.00,
  "next_tier": "promotor",
  "referrals_to_next_tier": 3,
  "tier_info": {
    "name": "Embajador",
    "commission": 30,
    "color": "blue",
    "benefits": [
      "Lifetime Professional",
      "30% comisión"
    ]
  },
  "next_tier_info": {
    "name": "Promotor",
    "commission": 40,
    "color": "purple",
    "benefits": [
      "Lifetime Professional",
      "40% comisión",
      "Gs 50K bonus por referido"
    ]
  }
}
```

---

## Ambassador Referrals API

### List Referrals

Get paginated list of ambassador's referrals.

```http
GET /api/ambassador/referrals?status={status}&limit={limit}&offset={offset}
Authorization: Required
```

**Query Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `status` | string | - | Filter by status: pending, trial_started, converted, expired |
| `limit` | number | 20 | Results per page (max 100) |
| `offset` | number | 0 | Pagination offset |

**Response:**

```json
{
  "referrals": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "status": "converted",
      "referred_at": "2026-01-01T10:00:00Z",
      "trial_started_at": "2026-01-02T14:30:00Z",
      "converted_at": "2026-01-15T09:00:00Z",
      "subscription_amount": 2400000,
      "commission_rate": 30.00,
      "commission_amount": 720000,
      "payout_status": "pending",
      "tenant": {
        "id": "veterinaria-abc",
        "name": "Veterinaria ABC",
        "zone": "Villa Morra"
      }
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "status": "trial_started",
      "referred_at": "2026-01-05T11:00:00Z",
      "trial_started_at": "2026-01-06T08:00:00Z",
      "converted_at": null,
      "subscription_amount": null,
      "commission_rate": null,
      "commission_amount": null,
      "payout_status": "pending",
      "tenant": {
        "id": "pet-care-24h",
        "name": "Pet Care 24h",
        "zone": "Centro"
      }
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

---

## Ambassador Validation API

### Validate Code

Validate ambassador referral code during clinic signup.

```http
GET /api/ambassador/validate?code={code}
```

**Parameters:**

| Name | Type | Location | Required | Description |
|------|------|----------|----------|-------------|
| `code` | string | query | Yes | Ambassador referral code |

**Response (valid):**

```json
{
  "valid": true,
  "ambassador": {
    "name": "Juan Pérez",
    "tier": "embajador"
  },
  "benefits": {
    "trial_bonus_days": 60,
    "welcome_message": "Referido por Juan Pérez - Obtén 2 meses extra de prueba gratis!"
  }
}
```

**Response (invalid):**

```json
{
  "valid": false,
  "error": "Código no encontrado"
}
```

**Response (inactive ambassador):**

```json
{
  "valid": false,
  "error": "Este embajador no está activo"
}
```

---

## Ambassador Payouts API

### Get Payout History

Get payout history and current balance summary.

```http
GET /api/ambassador/payouts?limit={limit}&offset={offset}
Authorization: Required
```

**Query Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | number | 10 | Results per page |
| `offset` | number | 0 | Pagination offset |

**Response:**

```json
{
  "payouts": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "amount": 720000,
      "status": "completed",
      "bank_name": "Banco Continental",
      "bank_account": "****7890",
      "created_at": "2026-01-10T10:00:00Z",
      "approved_at": "2026-01-11T14:00:00Z",
      "completed_at": "2026-01-15T09:00:00Z",
      "failure_reason": null
    }
  ],
  "summary": {
    "pending_payout": 720000,
    "total_paid": 720000,
    "minimum_payout": 500000,
    "can_request_payout": true,
    "saved_bank_details": {
      "bank_name": "Banco Continental",
      "bank_account": "1234567890",
      "bank_holder_name": "Juan Alberto Pérez"
    }
  },
  "pagination": {
    "total": 1,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

### Request Payout

Request withdrawal of pending balance.

```http
POST /api/ambassador/payouts
Authorization: Required
Content-Type: application/json
```

**Request Body:**

```json
{
  "bankName": "Banco Continental",
  "bankAccount": "1234567890",
  "bankHolderName": "Juan Alberto Pérez"
}
```

**Validation Rules:**

| Field | Rules |
|-------|-------|
| `bankName` | Required, non-empty |
| `bankAccount` | Required, non-empty |
| `bankHolderName` | Required, non-empty |

**Business Rules:**

- Minimum payout: Gs 500,000
- Only one pending payout request at a time
- Bank details are saved for future use

**Response (success):**

```json
{
  "success": true,
  "message": "Solicitud de pago enviada. Será procesada en 3-5 días hábiles.",
  "payout": {
    "id": "550e8400-e29b-41d4-a716-446655440011",
    "amount": 720000,
    "status": "pending"
  }
}
```

**Error Responses:**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | "Monto mínimo para retiro es Gs 500.000..." | Below minimum |
| 409 | "Ya tienes una solicitud de pago pendiente" | Pending request exists |

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Check clinic availability
const checkAvailability = async (slug: string) => {
  const res = await fetch(`/api/claim?slug=${slug}`)
  return res.json()
}

// Claim clinic
const claimClinic = async (data: {
  clinicSlug: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  password: string
}) => {
  const res = await fetch('/api/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

// Get ambassador stats
const getAmbassadorStats = async () => {
  const res = await fetch('/api/ambassador/stats', {
    credentials: 'include', // Include cookies
  })
  return res.json()
}

// Validate ambassador code
const validateCode = async (code: string) => {
  const res = await fetch(`/api/ambassador/validate?code=${code}`)
  return res.json()
}

// Request payout
const requestPayout = async (bankDetails: {
  bankName: string
  bankAccount: string
  bankHolderName: string
}) => {
  const res = await fetch('/api/ambassador/payouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(bankDetails),
  })
  return res.json()
}
```

### cURL

```bash
# Check availability
curl "https://vetic.com/api/claim?slug=veterinaria-abc"

# Claim clinic
curl -X POST "https://vetic.com/api/claim" \
  -H "Content-Type: application/json" \
  -d '{
    "clinicSlug": "veterinaria-abc",
    "ownerName": "Dr. Juan",
    "ownerEmail": "juan@vet.com",
    "ownerPhone": "+595981123456",
    "password": "secure123"
  }'

# Validate ambassador code
curl "https://vetic.com/api/ambassador/validate?code=JUAN1234"

# Get ambassador profile (authenticated)
curl "https://vetic.com/api/ambassador" \
  -H "Authorization: Bearer <token>"

# Register as ambassador
curl -X POST "https://vetic.com/api/ambassador" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Juan Pérez",
    "email": "juan@uni.edu.py",
    "phone": "+595981123456",
    "password": "secure123",
    "type": "student",
    "university": "UNA"
  }'
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/claim | 5 requests | 15 minutes |
| POST /api/ambassador | 3 requests | 1 hour |
| POST /api/ambassador/payouts | 3 requests | 1 hour |
| GET endpoints | 60 requests | 1 minute |

Exceeded limits return:

```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

---

## Webhooks (Future)

Planned webhook events for integrations:

| Event | Trigger |
|-------|---------|
| `clinic.claimed` | Clinic claimed by owner |
| `ambassador.approved` | Ambassador account approved |
| `referral.converted` | Referral converted to paid |
| `payout.completed` | Payout successfully processed |

---

*Last updated: January 2026*
