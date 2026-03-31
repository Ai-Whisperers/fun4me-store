# Diagram Organization Plan

## Folder Structure

```
diagrams/
├── architecture/          # Core system architecture
│   ├── 01-system-architecture.md
│   ├── 02-multi-tenant-isolation.md
│   └── 08-entity-relationship.md
│
├── workflows/             # Feature workflows and processes
│   ├── 03-appointment-booking-flow.md
│   ├── 04-checkout-flow.md
│   ├── 09-prescription-workflow.md
│   ├── 10-invoice-creation-payment.md
│   ├── 11-inventory-management.md
│   ├── 12-medical-record-creation.md
│   ├── 18-hospitalization-flow.md
│   ├── 19-lab-order-workflow.md
│   ├── 23-vaccine-schedule-tracking.md
│   ├── 26-staff-invitation-flow.md
│   ├── 27-messaging-communication-flow.md
│   ├── 28-qr-tag-assignment-flow.md
│   ├── 29-store-shopping-flow.md
│   ├── 34-client-invitation-flow.md (NEW)
│   ├── 35-notification-system-flow.md (NEW)
│   ├── 36-lost-found-pet-flow.md (NEW)
│   ├── 37-pet-registration-flow.md (NEW)
│   ├── 38-consent-management-flow.md (NEW)
│   ├── 39-insurance-claim-flow.md (NEW)
│   ├── 40-payment-processing-flow.md (NEW)
│   ├── 41-whatsapp-integration-flow.md (NEW)
│   ├── 42-pet-photo-upload-flow.md (NEW)
│   ├── 43-refund-processing-flow.md (NEW)
│   ├── 44-time-off-request-flow.md (NEW)
│   ├── 45-reproductive-cycle-tracking.md (NEW)
│   ├── 46-euthanasia-assessment-flow.md (NEW)
│   ├── 47-loyalty-points-flow.md (NEW)
│   ├── 48-campaign-management-flow.md (NEW)
│   ├── 49-epidemiology-tracking-flow.md (NEW)
│   └── 50-pet-transfer-flow.md (NEW)
│
├── security/              # Security and authentication
│   ├── 05-rls-isolation-flow.md
│   ├── 06-authentication-flow.md
│   ├── 20-security-architecture.md
│   └── 31-role-based-access-control.md
│
├── user-journeys/        # User experience flows
│   ├── 16-user-journey-pet-owner.md
│   ├── 17-user-journey-veterinarian.md
│   └── 30-admin-user-journey.md
│
├── state-machines/       # State machine diagrams
│   ├── 13-appointment-state-machine.md
│   └── 14-invoice-state-machine.md
│
├── components/           # Component hierarchies
│   ├── 21-component-hierarchy-booking.md
│   └── 32-component-hierarchy-dashboard.md
│
├── data-flow/            # Data flow diagrams
│   ├── 07-page-load-flow.md
│   └── 22-data-flow-end-to-end.md
│
├── api/                  # API-related diagrams
│   ├── 15-api-request-lifecycle.md
│   ├── 24-server-action-vs-rest-api.md
│   └── 25-error-handling-flow.md
│
└── system/               # System and deployment
    └── 33-deployment-ci-cd-flow.md
```

## New Workflows Added (17 total)

1. **34-client-invitation-flow.md** - Client invitation and onboarding
2. **35-notification-system-flow.md** - Notification and reminder system
3. **36-lost-found-pet-flow.md** - Lost and found pet management
4. **37-pet-registration-flow.md** - Pet registration process
5. **38-consent-management-flow.md** - Medical consent workflow
6. **39-insurance-claim-flow.md** - Insurance claim processing
7. **40-payment-processing-flow.md** - Payment processing with multiple methods
8. **41-whatsapp-integration-flow.md** - WhatsApp messaging integration
9. **42-pet-photo-upload-flow.md** - Photo upload and processing
10. **43-refund-processing-flow.md** - Refund workflow
11. **44-time-off-request-flow.md** - Staff time-off management
12. **45-reproductive-cycle-tracking.md** - Breeding cycle tracking
13. **46-euthanasia-assessment-flow.md** - Quality of life assessment (HHHHHMM)
14. **47-loyalty-points-flow.md** - Loyalty points system
15. **48-campaign-management-flow.md** - Marketing campaign management
16. **49-epidemiology-tracking-flow.md** - Disease tracking and reporting
17. **50-pet-transfer-flow.md** - Pet transfer between owners/clinics

## Total Diagrams

- **Existing**: 33 diagrams
- **New**: 17 workflows
- **Total**: 50 diagrams

