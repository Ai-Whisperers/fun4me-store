# Integration Expansion Tickets

**Epic:** [EPIC-15: Integration Expansion](../epics/EPIC-15-integrations.md)

## Overview

This category contains tickets focused on third-party integrations tailored for the Paraguay market, including payment gateways, calendar sync, SMS providers, accounting software, and lab equipment.

## Tickets

| ID | Title | Priority | Status | Effort |
|----|-------|----------|--------|--------|
| [INT-001](./INT-001-payment-gateways.md) | Payment Gateway Expansion | P2 | Not Started | 16h |
| [INT-002](./INT-002-calendar-sync.md) | Calendar Synchronization | P2 | Not Started | 14h |
| [INT-003](./INT-003-sms-providers.md) | SMS Provider Integration | P2 | Not Started | 12h |
| [INT-004](./INT-004-accounting-export.md) | Accounting Software Export | P3 | Not Started | 10h |
| [INT-005](./INT-005-lab-equipment.md) | Lab Equipment Integration | P3 | Not Started | 20h |

**Total Effort:** 72 hours

## Goals

1. **Local Payments**: Support Paraguay payment methods (Bancard, Tigo Money)
2. **Calendar Sync**: Bi-directional sync with Google/Outlook calendars
3. **SMS Delivery**: Reliable SMS via local carriers with failover
4. **Accounting**: Export to local accounting software formats
5. **Lab Automation**: Auto-import results from lab equipment

## Key Deliverables

### Payment Gateways (INT-001)
- Bancard integration (Paraguay cards)
- Tigo Money QR payments
- Payment provider abstraction layer

### Calendar Sync (INT-002)
- Google Calendar OAuth integration
- Outlook Calendar integration
- iCal export endpoint

### SMS Providers (INT-003)
- Tigo SMS integration
- Personal SMS integration
- Provider failover logic
- Delivery tracking

### Accounting Export (INT-004)
- Contap fixed-width format
- Marangatu XML format (SET Paraguay)
- Excel/CSV export

### Lab Equipment (INT-005)
- IDEXX VetLab integration
- HL7 v2.x message parsing
- Result matching to lab orders

## Paraguay Market Integrations

| Service | Provider | Status |
|---------|----------|--------|
| Card payments | Bancard | Planned |
| Mobile money | Tigo Money | Planned |
| SMS | Tigo, Personal | Planned |
| Accounting | Contap, Marangatu | Planned |

## Dependencies

- Payment provider API credentials
- Google/Microsoft OAuth app setup
- SMS provider contracts
- Lab equipment API access

## Success Metrics

| Metric | Target |
|--------|--------|
| Payment success rate | 95%+ |
| Calendar sync latency | < 5 min |
| SMS delivery rate | 98%+ |
| Lab result auto-import | 90%+ |

---

*Part of [EPIC-15: Integration Expansion](../epics/EPIC-15-integrations.md)*
