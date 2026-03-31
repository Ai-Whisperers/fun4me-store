# Phase 3: API & Component Testing

> **Duration:** 2 weeks (10 working days)
> **Goal:** 60% API coverage, critical components tested
> **Entry Criteria:** Phase 2 complete (50% statement coverage)
> **Exit Criteria:** API routes tested, components have basic tests

---

## 📊 Phase Overview

This phase expands testing to API routes and React components. API tests verify request/response contracts. Component tests verify rendering and user interactions.

---

## 🎯 Objectives

| Objective | Current | Target |
|-----------|---------|--------|
| API Route Coverage | ~3% | 60% |
| Critical Component Tests | ~20% | 80% |
| Form Component Tests | ~15% | 90% |

---

## 📋 Epics

| Epic | Title | Tickets | Est. Hours |
|------|-------|---------|------------|
| [EPIC-P3-01](./EPIC-P3-01-api-route-tests.md) | API Route Tests | 15 | 40-50h |
| [EPIC-P3-02](./EPIC-P3-02-component-tests.md) | Component Tests | 12 | 30-40h |
| [EPIC-P3-03](./EPIC-P3-03-form-tests.md) | Form Tests | 10 | 25-35h |

**Total Estimated Hours:** 95-125h (~2 weeks)

---

## 📁 API Route Testing

### Priority 1: Financial & Medical (Must Test)

| Route Group | Routes | Priority | Est. |
|-------------|--------|----------|------|
| `/api/billing/*` | 8 | P0 | 6h |
| `/api/prescriptions/*` | 5 | P0 | 4h |
| `/api/appointments/*` | 12 | P0 | 6h |
| `/api/medical-records/*` | 6 | P0 | 4h |

### Priority 2: Core CRUD

| Route Group | Routes | Priority | Est. |
|-------------|--------|----------|------|
| `/api/pets/*` | 8 | P1 | 4h |
| `/api/inventory/*` | 10 | P1 | 5h |
| `/api/lab-orders/*` | 6 | P1 | 4h |
| `/api/store/*` | 12 | P1 | 6h |

### Priority 3: Support Routes

| Route Group | Routes | Priority | Est. |
|-------------|--------|----------|------|
| `/api/portal/*` | 8 | P2 | 4h |
| `/api/cron/*` | 5 | P2 | 3h |
| `/api/user/*` | 6 | P2 | 3h |
| `/api/health/*` | 3 | P2 | 2h |

---

## 📝 API Test Template

```typescript
// tests/api/[route]/route.test.ts

describe('POST /api/resource', () => {
  describe('authentication', () => {
    it('rejects unauthenticated requests', async () => {
      const response = await POST(mockRequest({ auth: false }));
      expect(response.status).toBe(401);
    });

    it('rejects expired tokens', async () => {
      const response = await POST(mockRequest({ tokenExpired: true }));
      expect(response.status).toBe(401);
    });
  });

  describe('authorization', () => {
    it('rejects insufficient permissions', async () => {
      const response = await POST(mockRequest({ role: 'viewer' }));
      expect(response.status).toBe(403);
    });

    it('rejects cross-tenant access', async () => {
      const response = await POST(mockRequest({ 
        tenantId: 'tenant-a',
        resourceTenantId: 'tenant-b' 
      }));
      expect(response.status).toBe(403);
    });
  });

  describe('validation', () => {
    it('rejects missing required fields', async () => {
      const response = await POST(mockRequest({ body: {} }));
      expect(response.status).toBe(400);
    });

    it('rejects invalid field formats', async () => {
      const response = await POST(mockRequest({ 
        body: { email: 'not-an-email' } 
      }));
      expect(response.status).toBe(400);
    });
  });

  describe('success cases', () => {
    it('creates resource with valid data', async () => {
      const response = await POST(mockRequest({ body: validData }));
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('returns 500 for database errors', async () => {
      mockDb.throwError();
      const response = await POST(mockRequest({ body: validData }));
      expect(response.status).toBe(500);
    });
  });
});
```

---

## 📁 Component Testing

### Priority 1: Critical UI Components

| Component | Tests Needed | Priority | Est. |
|-----------|--------------|----------|------|
| DataTable | render, sort, filter, paginate | P0 | 4h |
| AppointmentForm | validation, submission | P0 | 3h |
| InvoiceForm | calculations, validation | P0 | 4h |
| PrescriptionForm | medications, validation | P0 | 3h |

### Priority 2: Common Components

| Component | Tests Needed | Priority | Est. |
|-----------|--------------|----------|------|
| Modal | open, close, focus trap | P1 | 2h |
| Sidebar | navigation, active state | P1 | 2h |
| Header | user menu, notifications | P1 | 2h |
| Card | render, actions | P1 | 1h |

### Priority 3: Form Fields

| Component | Tests Needed | Priority | Est. |
|-----------|--------------|----------|------|
| DatePicker | selection, validation | P2 | 2h |
| Select | options, search | P2 | 2h |
| FileUpload | upload, preview | P2 | 3h |
| RichTextEditor | formatting | P2 | 2h |

---

## 📝 Component Test Template

```typescript
// tests/components/ComponentName.test.tsx

describe('ComponentName', () => {
  describe('rendering', () => {
    it('renders with required props', () => {
      render(<Component required="value" />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(<Component loading />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders error state', () => {
      render(<Component error="Something went wrong" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    });
  });

  describe('interactions', () => {
    it('calls onClick when clicked', async () => {
      const onClick = vi.fn();
      render(<Component onClick={onClick} />);
      await userEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('has accessible name', () => {
      render(<Component aria-label="Action" />);
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      render(<Component />);
      await userEvent.tab();
      expect(screen.getByRole('button')).toHaveFocus();
    });
  });
});
```

---

## 📈 Progress

```
EPIC-P3-01 (API):        ░░░░░░░░░░ 0%
EPIC-P3-02 (Components): ░░░░░░░░░░ 0%
EPIC-P3-03 (Forms):      ░░░░░░░░░░ 0%
```

---

## 📊 Deliverables

| Deliverable | Location | Status |
|-------------|----------|--------|
| API tests | `tests/api/**/*.test.ts` | Pending |
| Component tests | `tests/components/**/*.test.tsx` | Pending |
| Form tests | `tests/components/forms/**/*.test.tsx` | Pending |

---

*Created: 2026-02-03 | Owner: AI Agent*
