# TST-008: Messaging API Tests

## Summary

**Priority**: P1 - High
**Effort**: 8-10 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Test Coverage
**Dependencies**: TST-006 (API Audit)

## Problem Statement

The messaging system (clinic ↔ owner communication) has ~53% test coverage. Missing tests for:
- Owner-initiated conversations
- Message attachments
- Quick replies
- WhatsApp integration
- Notification triggers

## Routes to Test

### Conversations (4 routes)

| Route | Methods | Tests Needed |
|-------|---------|--------------|
| /api/messages/conversations | GET, POST | 8 |
| /api/messages/conversations/[id] | GET, PUT | 6 |
| /api/messages/conversations/[id]/close | POST | 3 |
| /api/messages/conversations/[id]/reopen | POST | 3 |

### Messages (4 routes)

| Route | Methods | Tests Needed |
|-------|---------|--------------|
| /api/messages | POST | 8 |
| /api/messages/[id] | GET, DELETE | 4 |
| /api/messages/[id]/read | POST | 3 |
| /api/messages/attachments | POST | 5 |

### Templates (3 routes)

| Route | Methods | Tests Needed |
|-------|---------|--------------|
| /api/messages/templates | GET, POST | 6 |
| /api/messages/templates/[id] | GET, PUT, DELETE | 6 |
| /api/messages/quick-replies | GET | 3 |

### WhatsApp (4 routes)

| Route | Methods | Tests Needed |
|-------|---------|--------------|
| /api/whatsapp/send | POST | 5 |
| /api/whatsapp/webhook | POST | 4 |
| /api/whatsapp/status | GET | 2 |
| /api/whatsapp/templates | GET | 2 |

## Test Cases

### Owner Messaging (15 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Owner starts conversation | 201, conv created |
| 2 | Owner sends message | 201, message saved |
| 3 | Owner views conversation | 200, messages listed |
| 4 | Owner attaches image | 201, URL saved |
| 5 | Owner marks as read | 200, read_at updated |
| 6 | Owner cannot view other's conv | 404 |
| 7 | Owner cannot send to other's conv | 403 |
| 8 | Rate limit messages | 429 after limit |
| ... | ... | ... |

### Staff Messaging (12 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Staff replies to conversation | 201 |
| 2 | Staff uses template | 201, template content |
| 3 | Staff uses quick reply | 201 |
| 4 | Staff closes conversation | 200, status closed |
| 5 | Staff reopens conversation | 200, status open |
| ... | ... | ... |

### WhatsApp Integration (10 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Send WhatsApp message | 200, queued |
| 2 | Webhook receives message | 200, message created |
| 3 | Webhook signature validation | 401 on invalid |
| 4 | Template rendering | Correct placeholders |
| ... | ... | ... |

## Acceptance Criteria

- [ ] 52 messaging tests implemented
- [ ] Conversation CRUD coverage >= 90%
- [ ] Message operations coverage >= 85%
- [ ] WhatsApp integration coverage >= 80%
- [ ] Owner isolation verified
- [ ] Rate limiting tested

---

**Created**: 2026-01-12
**Status**: Not Started
