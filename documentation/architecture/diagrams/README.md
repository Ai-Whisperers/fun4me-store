# Architecture Diagrams

This directory contains Mermaid diagrams visualizing the Vete platform architecture, flows, and interactions.

## Directory Structure

```
diagrams/
├── architecture/          # Core system architecture (3 diagrams)
├── workflows/             # Feature workflows and processes (25 diagrams)
├── security/              # Security and authentication (4 diagrams)
├── user-journeys/         # User experience flows (3 diagrams)
├── state-machines/        # State machine diagrams (2 diagrams)
├── components/            # Component hierarchies (2 diagrams)
├── data-flow/             # Data flow diagrams (2 diagrams)
├── api/                   # API-related diagrams (3 diagrams)
└── system/                # System and deployment (1 diagram)
```

## Quick Navigation

### Architecture
- [System Architecture](architecture/01-system-architecture.md) - High-level system overview
- [Multi-Tenant Isolation](architecture/02-multi-tenant-isolation.md) - How tenants are isolated
- [Entity Relationship Diagram](architecture/08-entity-relationship.md) - Database schema

### Workflows (25 diagrams)
- [Appointment Booking](workflows/03-appointment-booking-flow.md)
- [Checkout Flow](workflows/04-checkout-flow.md)
- [Prescription Workflow](workflows/09-prescription-workflow.md)
- [Invoice Creation & Payment](workflows/10-invoice-creation-payment.md)
- [Inventory Management](workflows/11-inventory-management.md)
- [Medical Record Creation](workflows/12-medical-record-creation.md)
- [Hospitalization Flow](workflows/18-hospitalization-flow.md)
- [Lab Order Workflow](workflows/19-lab-order-workflow.md)
- [Vaccine Schedule Tracking](workflows/23-vaccine-schedule-tracking.md)
- [Staff Invitation Flow](workflows/26-staff-invitation-flow.md)
- [Messaging & Communication](workflows/27-messaging-communication-flow.md)
- [QR Tag Assignment](workflows/28-qr-tag-assignment-flow.md)
- [Store Shopping Flow](workflows/29-store-shopping-flow.md)
- [Client Invitation Flow](workflows/34-client-invitation-flow.md) ⭐ NEW
- [Notification System](workflows/35-notification-system-flow.md) ⭐ NEW
- [Lost & Found Pet Flow](workflows/36-lost-found-pet-flow.md) ⭐ NEW
- [Pet Registration Flow](workflows/37-pet-registration-flow.md) ⭐ NEW
- [Consent Management](workflows/38-consent-management-flow.md) ⭐ NEW
- [Insurance Claim Flow](workflows/39-insurance-claim-flow.md) ⭐ NEW
- [Payment Processing](workflows/40-payment-processing-flow.md) ⭐ NEW
- [WhatsApp Integration](workflows/41-whatsapp-integration-flow.md) ⭐ NEW
- [Pet Photo Upload](workflows/42-pet-photo-upload-flow.md) ⭐ NEW
- [Refund Processing](workflows/43-refund-processing-flow.md) ⭐ NEW
- [Time-Off Request](workflows/44-time-off-request-flow.md) ⭐ NEW
- [Reproductive Cycle Tracking](workflows/45-reproductive-cycle-tracking.md) ⭐ NEW
- [Euthanasia Assessment](workflows/46-euthanasia-assessment-flow.md) ⭐ NEW
- [Loyalty Points](workflows/47-loyalty-points-flow.md) ⭐ NEW
- [Campaign Management](workflows/48-campaign-management-flow.md) ⭐ NEW
- [Epidemiology Tracking](workflows/49-epidemiology-tracking-flow.md) ⭐ NEW
- [Pet Transfer Flow](workflows/50-pet-transfer-flow.md) ⭐ NEW

### Security
- [RLS Isolation Flow](security/05-rls-isolation-flow.md)
- [Authentication Flow](security/06-authentication-flow.md)
- [Security Architecture](security/20-security-architecture.md)
- [Role-Based Access Control](security/31-role-based-access-control.md)

### User Journeys
- [Pet Owner Journey](user-journeys/16-user-journey-pet-owner.md)
- [Veterinarian Journey](user-journeys/17-user-journey-veterinarian.md)
- [Admin User Journey](user-journeys/30-admin-user-journey.md)

### State Machines
- [Appointment State Machine](state-machines/13-appointment-state-machine.md)
- [Invoice State Machine](state-machines/14-invoice-state-machine.md)

### Components
- [Component Hierarchy - Booking](components/21-component-hierarchy-booking.md)
- [Component Hierarchy - Dashboard](components/32-component-hierarchy-dashboard.md)

### Data Flow
- [Page Load Flow](data-flow/07-page-load-flow.md)
- [End-to-End Data Flow](data-flow/22-data-flow-end-to-end.md)

### API
- [API Request Lifecycle](api/15-api-request-lifecycle.md)
- [Server Action vs REST API](api/24-server-action-vs-rest-api.md)
- [Error Handling Flow](api/25-error-handling-flow.md)

### System
- [Deployment & CI/CD Flow](system/33-deployment-ci-cd-flow.md)

## Total Diagrams

- **Architecture**: 3 diagrams
- **Workflows**: 25 diagrams (13 existing + 12 new)
- **Security**: 4 diagrams
- **User Journeys**: 3 diagrams
- **State Machines**: 2 diagrams
- **Components**: 2 diagrams
- **Data Flow**: 2 diagrams
- **API**: 3 diagrams
- **System**: 1 diagram

**Total: 45 diagrams**

## Viewing Diagrams

### In Cursor
The `markdown-mermaid` extension is installed. Diagrams render automatically in:
- Markdown preview
- Hover tooltips
- Documentation views

### Online
Copy Mermaid code to [Mermaid Live Editor](https://mermaid.live/) for interactive viewing.

### VS Code
Install the [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension.

## Creating New Diagrams

1. **Start Small**: Begin with a single feature or component
2. **Use Templates**: Reference existing diagrams for structure
3. **Follow Naming**: Use `##-description.md` format
4. **Add Context**: Include explanation of what the diagram shows
5. **Update README**: Add new diagrams to this list

## Diagram Types Used

- **flowchart TD/LR**: Process flows, decision trees
- **sequenceDiagram**: Time-based interactions
- **graph TB/LR**: Component relationships
- **erDiagram**: Database entity relationships
- **stateDiagram-v2**: State machines
- **journey**: User journey maps

## Reference

- [Mermaid Documentation](https://mermaid.js.org/)
- [Cursor Mermaid Cookbook](https://cursor.com/docs/cookbook/mermaid-diagrams)
- [Organization Plan](ORGANIZATION_PLAN.md) - Complete folder structure
