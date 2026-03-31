# Type Consolidation Summary

## Overview

This document summarizes the consolidation of duplicate type definitions and creation of missing Zod schemas for the veterinary clinic management platform.

## Files Created

### 1. `web/lib/types/status.ts`

**Purpose**: Single source of truth for all status types and state transitions.

**Contents**:
- `APPOINTMENT_STATUSES` and `AppointmentStatus` type
- `INVOICE_STATUSES` and `InvoiceStatus` type
- `HOSPITALIZATION_STATUSES` and `HospitalizationStatus` type
- `LAB_ORDER_STATUSES` and `LabOrderStatus` type
- `INSURANCE_CLAIM_STATUSES` and `InsuranceClaimStatus` type
- `MESSAGE_STATUSES` and `MessageStatus` type
- `PAYMENT_STATUSES` and `PaymentStatus` type
- `PRESCRIPTION_STATUSES` and `PrescriptionStatus` type

**State Transitions**:
- `APPOINTMENT_TRANSITIONS` - Valid appointment status flows
- `INVOICE_TRANSITIONS` - Valid invoice status flows
- `HOSPITALIZATION_TRANSITIONS` - Valid hospitalization status flows
- `LAB_ORDER_TRANSITIONS` - Valid lab order status flows
- `INSURANCE_CLAIM_TRANSITIONS` - Valid insurance claim status flows

**Helper Functions**:
- `canTransitionTo<T>()` - Generic transition validator
- `canTransitionAppointment()` - Appointment-specific validator
- `canTransitionInvoice()` - Invoice-specific validator
- `canTransitionHospitalization()` - Hospitalization-specific validator
- `canTransitionLabOrder()` - Lab order-specific validator
- `canTransitionInsuranceClaim()` - Insurance claim-specific validator

### 2. `web/lib/schemas/hospitalization.ts`

**Purpose**: Zod validation schemas for hospitalization module.

**Schemas**:
- `createHospitalizationSchema` - Admitting a patient
- `updateHospitalizationSchema` - Updating hospitalization details
- `dischargePatientSchema` - Discharging a patient
- `recordVitalsSchema` - Recording vital signs (temp, HR, RR, BP, pain score)
- `recordMedicationSchema` - Recording medication administration
- `recordFeedingSchema` - Recording feeding logs
- `recordTreatmentSchema` - Recording treatments (wound care, bandages, etc.)
- `createKennelSchema` - Creating kennel/cage records
- `hospitalizationQuerySchema` - Query parameters for filtering

**Enums**:
- `ACUITY_LEVELS` - Patient acuity levels (low, medium, high, critical)
- `MEDICATION_ROUTES` - Administration routes (oral, IV, IM, SC, topical, etc.)
- `FOOD_TYPES` - Food types for feeding logs
- `TREATMENT_TYPES` - Treatment categories
- `KENNEL_TYPES` - Kennel/cage types

### 3. `web/lib/schemas/laboratory.ts`

**Purpose**: Zod validation schemas for laboratory module.

**Schemas**:
- `createLabOrderSchema` - Creating lab test orders
- `updateLabOrderSchema` - Updating order status
- `createLabResultSchema` - Entering single test results
- `bulkLabResultsSchema` - Bulk result entry
- `updateLabResultSchema` - Updating results
- `createLabTestSchema` - Creating tests in catalog
- `updateLabTestSchema` - Updating catalog tests
- `createLabPanelSchema` - Creating test panels
- `updateLabPanelSchema` - Updating panels
- `uploadLabAttachmentSchema` - Uploading result files
- `createLabCommentSchema` - Adding comments to orders
- `labOrderQuerySchema` - Query parameters
- `labTestSearchSchema` - Test search parameters

**Enums**:
- `LAB_CATEGORIES` - Test categories (hematology, chemistry, urinalysis, etc.)
- `LAB_PRIORITIES` - Order priorities (routine, urgent, stat)
- `LAB_RESULT_FLAGS` - Result flags (normal, low, high, critical)
- `LAB_FILE_TYPES` - Attachment file types

### 4. `web/lib/schemas/insurance.ts`

**Purpose**: Zod validation schemas for insurance module.

**Schemas**:
- `createInsurancePolicySchema` - Creating insurance policies
- `updateInsurancePolicySchema` - Updating policies
- `createInsuranceClaimSchema` - Creating insurance claims
- `updateClaimStatusSchema` - Updating claim status
- `submitClaimAppealSchema` - Submitting appeals
- `createClaimItemSchema` - Adding items to claims
- `createInsuranceProviderSchema` - Creating providers
- `updateInsuranceProviderSchema` - Updating providers
- `createPreAuthSchema` - Creating pre-authorization requests
- `updatePreAuthSchema` - Updating pre-auth status
- `policyQuerySchema` - Policy query parameters
- `claimQuerySchema` - Claim query parameters

**Enums**:
- `COVERAGE_TYPES` - Policy coverage types
- `POLICY_STATUSES` - Policy statuses
- `CLAIM_TYPES` - Claim types (medical, surgical, preventive, etc.)
- `PREAUTH_STATUSES` - Pre-authorization statuses

### 5. `web/lib/schemas/messaging.ts`

**Purpose**: Zod validation schemas for messaging and communications.

**Schemas**:
- `createConversationSchema` - Creating conversations
- `updateConversationSchema` - Updating conversations
- `sendMessageSchema` - Sending messages
- `quickReplySchema` - Quick reply shortcuts
- `sendWhatsappMessageSchema` - WhatsApp message sending
- `whatsappWebhookSchema` - WhatsApp webhook validation
- `createTemplateSchema` - Creating message templates
- `updateTemplateSchema` - Updating templates
- `renderTemplateSchema` - Rendering templates with variables
- `sendNotificationSchema` - Sending notifications
- `sendBulkMessagesSchema` - Bulk messaging
- `conversationQuerySchema` - Conversation query parameters
- `messageQuerySchema` - Message query parameters

**Enums**:
- `CONVERSATION_CHANNELS` - Communication channels (internal, whatsapp, email, sms)
- `CONVERSATION_STATUSES` - Conversation statuses
- `CONVERSATION_PRIORITIES` - Priority levels
- `MESSAGE_TYPES` - Message types (text, image, file, cards, system)
- `SENDER_TYPES` - Sender types (staff, client, system)
- `WHATSAPP_DIRECTIONS` - Message directions (inbound, outbound)
- `TEMPLATE_CATEGORIES` - Template categories
- `NOTIFICATION_CHANNELS` - Notification channels

## Files Updated

### 1. `web/lib/schemas/index.ts`

Updated to export all new schemas:
- Added exports for hospitalization, laboratory, insurance, and messaging schemas
- Organized into logical groups (Core, Clinical, Business)

### 2. `web/lib/types/index.ts`

Updated to export all types including status types:
- Added status types export
- Added all business domain types
- Added database and utility types

### 3. `web/lib/schemas/common.ts`

Fixed Zod v4 compatibility issues:
- Updated `enumSchema()` helper to use new API (`message` instead of `errorMap`)
- Fixed `z.record()` calls to include key type parameter

## Migration Notes

### For Developers

When using status types, import from the centralized location:

```typescript
// Before (multiple locations)
import { AppointmentStatus } from '@/lib/types/appointments'
import { InvoiceStatus } from '@/lib/types/invoicing'

// After (single source)
import { AppointmentStatus, InvoiceStatus } from '@/lib/types/status'
```

When validating API inputs for new modules:

```typescript
// Hospitalization
import { createHospitalizationSchema } from '@/lib/schemas'
const result = createHospitalizationSchema.parse(data)

// Laboratory
import { createLabOrderSchema } from '@/lib/schemas'
const result = createLabOrderSchema.parse(data)

// Insurance
import { createInsuranceClaimSchema } from '@/lib/schemas'
const result = createInsuranceClaimSchema.parse(data)

// Messaging
import { sendMessageSchema } from '@/lib/schemas'
const result = sendMessageSchema.parse(data)
```

When checking valid state transitions:

```typescript
import { canTransitionAppointment } from '@/lib/types/status'

if (canTransitionAppointment('confirmed', 'checked_in')) {
  // Valid transition
}
```

### Breaking Changes

None. All new types and schemas are additive. Existing code will continue to work.

### Benefits

1. **Single Source of Truth**: Status types are now defined in one place
2. **Type Safety**: Comprehensive Zod schemas for all major modules
3. **State Machine Logic**: Explicit transition rules for status flows
4. **Better DX**: Centralized imports, autocomplete support
5. **Runtime Validation**: All API inputs can be validated with Zod
6. **Documentation**: Self-documenting schemas with Spanish error messages

## Testing

All new files have been type-checked and compile successfully:

```bash
npx tsc --noEmit --skipLibCheck lib/types/status.ts \
  lib/schemas/hospitalization.ts \
  lib/schemas/laboratory.ts \
  lib/schemas/insurance.ts \
  lib/schemas/messaging.ts
```

No compilation errors.

## Next Steps

1. Update API routes to use new schemas for validation
2. Update existing code to import status types from centralized location
3. Add unit tests for state transition logic
4. Document schema usage in API documentation
5. Consider adding OpenAPI/Swagger generation from schemas

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| `web/lib/types/status.ts` | 247 | Status type definitions and transitions |
| `web/lib/schemas/hospitalization.ts` | 204 | Hospitalization validation schemas |
| `web/lib/schemas/laboratory.ts` | 240 | Laboratory validation schemas |
| `web/lib/schemas/insurance.ts` | 270 | Insurance validation schemas |
| `web/lib/schemas/messaging.ts` | 330 | Messaging validation schemas |
| **Total** | **1,291** | New type-safe validation code |

---

*Generated: December 19, 2024*
