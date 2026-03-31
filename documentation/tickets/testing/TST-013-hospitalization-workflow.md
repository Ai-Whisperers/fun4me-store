# TST-013: Hospitalization Complete Workflow Tests

## Summary

**Priority**: P1 - High
**Effort**: 8-10 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Integration Testing
**Dependencies**: TST-006 (API Audit)

## Problem Statement

The hospitalization module has ~60% coverage but lacks complete workflow tests. Critical gaps include:
- Admission to discharge flow
- Vital sign monitoring accuracy
- Medication administration tracking
- Feeding log completeness
- Kennel management
- Billing integration

## Workflows to Test

### Workflow 1: Admission Process (10 tests)

```
Check Pet In → Assign Kennel → Record Initial Vitals → Create Treatment Plan
```

| Step | Test | Validation |
|------|------|------------|
| 1 | Admit pet to hospitalization | Admission created |
| 2 | Check kennel availability | Available kennels listed |
| 3 | Assign kennel | Kennel status updated |
| 4 | Assign to occupied kennel | 400, kennel occupied |
| 5 | Record initial vitals | Vitals saved with timestamp |
| 6 | Set acuity level | Level stored (critical/high/medium/low) |
| 7 | Create treatment plan | Medications scheduled |
| 8 | Notify owner | Notification sent |
| 9 | Admit second pet to same kennel | Depends on kennel type |
| 10 | Admission with incomplete data | Validation errors |

### Workflow 2: Daily Care Cycle (12 tests)

```
Morning Vitals → Medications → Feeding → Afternoon Vitals → Notes → Evening Meds
```

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Record morning vitals | All fields saved |
| 2 | Record vitals with abnormal values | Alert triggered |
| 3 | Administer scheduled medication | Logged with timestamp |
| 4 | Skip medication with reason | Reason stored |
| 5 | Record feeding | Amount and type logged |
| 6 | Record feeding refusal | Refusal noted |
| 7 | Record afternoon vitals | Second set saved |
| 8 | Compare vitals trend | Trend calculated |
| 9 | Add clinical notes | Notes saved |
| 10 | Administer PRN medication | Logged as unscheduled |
| 11 | View daily summary | All activities shown |
| 12 | View 24-hour timeline | Chronological events |

### Workflow 3: Monitoring & Alerts (8 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Temperature > threshold | Alert created |
| 2 | Heart rate abnormal | Alert created |
| 3 | Pain score high | Vet notified |
| 4 | Missed medication | Alert after grace period |
| 5 | No vitals in 8 hours | Reminder triggered |
| 6 | Acknowledge alert | Alert marked resolved |
| 7 | Critical patient flag | Priority in dashboard |
| 8 | Multiple alerts same patient | Grouped display |

### Workflow 4: Discharge Process (8 tests)

```
Vet Clears → Generate Summary → Create Invoice → Release Kennel → Owner Pickup
```

| Step | Test | Validation |
|------|------|------------|
| 1 | Vet marks ready for discharge | Status updated |
| 2 | Generate discharge summary | PDF with all records |
| 3 | Create hospitalization invoice | Line items from treatments |
| 4 | Discharge without payment | Allowed (bill later) |
| 5 | Release kennel | Kennel available |
| 6 | Discharge incomplete records | Warning shown |
| 7 | Owner acknowledges discharge | Signature captured |
| 8 | Post-discharge follow-up scheduled | Reminder created |

### Workflow 5: Kennel Management (8 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | View kennel grid | All kennels shown with status |
| 2 | Filter by kennel type | Correct filtering |
| 3 | Mark kennel for cleaning | Status: cleaning |
| 4 | Complete cleaning | Status: available |
| 5 | Kennel maintenance mode | Not assignable |
| 6 | Daily rate calculation | Correct billing |
| 7 | Extended stay billing | Per-day charges |
| 8 | Kennel history | Previous occupants shown |

### Workflow 6: Billing Integration (6 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Daily kennel charges | Auto-added to invoice |
| 2 | Medication charges | Per-administration |
| 3 | Lab test charges | Added when ordered |
| 4 | Professional services | Vet time billed |
| 5 | Running total accurate | Real-time calculation |
| 6 | Final invoice generation | All charges included |

## Test Implementation

### Admission Flow Test

```typescript
// tests/integration/hospitalization/admission.test.ts
describe('Hospitalization Admission', () => {
  let pet: Pet;
  let kennel: Kennel;
  let vet: User;

  beforeEach(async () => {
    pet = await fixtures.createPet();
    kennel = await fixtures.createKennel({ status: 'available' });
    vet = await fixtures.createVet();
  });

  it('should complete admission flow', async () => {
    // Admit pet
    const admitRes = await api.post('/api/hospitalizations', {
      pet_id: pet.id,
      kennel_id: kennel.id,
      admitted_by: vet.id,
      reason: 'Post-surgery observation',
      acuity_level: 'medium',
    });
    expect(admitRes.status).toBe(201);
    const hospitalization = admitRes.data;

    // Verify kennel status updated
    const kennelRes = await api.get(`/api/kennels/${kennel.id}`);
    expect(kennelRes.data.current_status).toBe('occupied');
    expect(kennelRes.data.current_patient_id).toBe(pet.id);

    // Record initial vitals
    const vitalsRes = await api.post(
      `/api/hospitalizations/${hospitalization.id}/vitals`,
      {
        temperature: 38.5,
        heart_rate: 80,
        respiratory_rate: 20,
        pain_score: 2,
        notes: 'Stable post-op',
      }
    );
    expect(vitalsRes.status).toBe(201);

    // Verify vitals recorded
    const hospRes = await api.get(`/api/hospitalizations/${hospitalization.id}`);
    expect(hospRes.data.vitals).toHaveLength(1);
    expect(hospRes.data.status).toBe('admitted');
  });

  it('should reject admission to occupied kennel', async () => {
    // First admission
    await api.post('/api/hospitalizations', {
      pet_id: pet.id,
      kennel_id: kennel.id,
      admitted_by: vet.id,
    });

    // Second pet, same kennel
    const pet2 = await fixtures.createPet();
    const res = await api.post('/api/hospitalizations', {
      pet_id: pet2.id,
      kennel_id: kennel.id,
      admitted_by: vet.id,
    });

    expect(res.status).toBe(400);
    expect(res.data.error).toContain('ocupado');
  });
});
```

### Vitals Monitoring Test

```typescript
describe('Vitals Monitoring', () => {
  let hospitalization: Hospitalization;

  beforeEach(async () => {
    hospitalization = await fixtures.createActiveHospitalization();
  });

  it('should trigger alert for abnormal temperature', async () => {
    const res = await api.post(
      `/api/hospitalizations/${hospitalization.id}/vitals`,
      {
        temperature: 41.0, // High fever
        heart_rate: 120,
        respiratory_rate: 30,
        pain_score: 5,
      }
    );
    expect(res.status).toBe(201);

    // Check for alert
    const alertsRes = await api.get(
      `/api/hospitalizations/${hospitalization.id}/alerts`
    );
    expect(alertsRes.data).toContainEqual(
      expect.objectContaining({
        type: 'high_temperature',
        severity: 'critical',
      })
    );
  });

  it('should calculate vitals trend', async () => {
    // Record multiple vitals over time
    const vitalsData = [
      { temperature: 39.0, heart_rate: 100 },
      { temperature: 38.8, heart_rate: 95 },
      { temperature: 38.5, heart_rate: 85 },
    ];

    for (const v of vitalsData) {
      await api.post(
        `/api/hospitalizations/${hospitalization.id}/vitals`,
        v
      );
      await delay(100);
    }

    const trendRes = await api.get(
      `/api/hospitalizations/${hospitalization.id}/vitals/trend`
    );
    expect(trendRes.data.temperature_trend).toBe('improving');
    expect(trendRes.data.heart_rate_trend).toBe('improving');
  });
});
```

## Data Fixtures

```typescript
// tests/__fixtures__/hospitalization.ts
export const hospitalizationFixtures = {
  async createKennel(overrides = {}) {
    return supabase.from('kennels').insert({
      tenant_id: testTenantId,
      name: `Kennel-${Date.now()}`,
      code: `K${Date.now()}`,
      kennel_type: 'standard',
      daily_rate: 50000,
      current_status: 'available',
      ...overrides,
    }).select().single();
  },

  async createActiveHospitalization(overrides = {}) {
    const pet = await fixtures.createPet();
    const kennel = await this.createKennel();
    const vet = await fixtures.createVet();

    const hosp = await supabase.from('hospitalizations').insert({
      tenant_id: testTenantId,
      pet_id: pet.id,
      kennel_id: kennel.id,
      admitted_by: vet.id,
      admitted_at: new Date().toISOString(),
      status: 'admitted',
      acuity_level: 'medium',
      ...overrides,
    }).select().single();

    return hosp;
  },
};
```

## Acceptance Criteria

- [ ] 52 hospitalization tests implemented
- [ ] Admission flow coverage >= 90%
- [ ] Vitals tracking coverage >= 85%
- [ ] Discharge flow coverage >= 90%
- [ ] Kennel management coverage >= 85%
- [ ] Billing integration verified
- [ ] Alert system tested
- [ ] Multi-tenant isolation verified

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Admit deceased pet | Reject |
| Discharge during treatment | Warning, allow override |
| Kennel overflow | Waitlist or reject |
| Midnight billing cutoff | Correct day attribution |
| Transfer between kennels | History preserved |

---

**Created**: 2026-01-12
**Status**: Not Started
