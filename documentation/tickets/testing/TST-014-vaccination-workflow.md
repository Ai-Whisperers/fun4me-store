# TST-014: Vaccination Complete Workflow Tests

## Summary

**Priority**: P1 - High
**Effort**: 6-8 hours
**Epic**: [EPIC-17](../epics/EPIC-17-comprehensive-test-coverage.md)
**Type**: Integration Testing
**Dependencies**: TST-006 (API Audit)

## Problem Statement

Vaccination is a core feature with moderate coverage but missing end-to-end workflow tests. Key gaps include:
- Complete vaccination cycle (schedule → administer → reminder)
- Reaction reporting and tracking
- Certificate generation
- Reminder automation
- Multi-dose vaccine series

## Workflows to Test

### Workflow 1: Single-Dose Vaccination (8 tests)

```
Schedule → Administer → Record → Generate Certificate → Schedule Booster
```

| Step | Test | Validation |
|------|------|------------|
| 1 | Schedule vaccine appointment | Appointment created |
| 2 | Vet administers vaccine | Vaccine record created |
| 3 | Record batch number | Batch stored for traceability |
| 4 | Calculate next due date | Based on vaccine protocol |
| 5 | Generate vaccination certificate | PDF with all required info |
| 6 | Schedule booster reminder | Reminder created |
| 7 | Owner views vaccine history | Chronological list |
| 8 | Download certificate | Valid PDF |

### Workflow 2: Multi-Dose Series (10 tests)

```
Puppy Series: 6wk → 9wk → 12wk → 16wk → Annual
```

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Create puppy vaccine protocol | 4-dose series scheduled |
| 2 | First dose at 6 weeks | Recorded, next at 9wk |
| 3 | Second dose at 9 weeks | Recorded, next at 12wk |
| 4 | Missed dose handling | Alert, reschedule |
| 5 | Third dose at 12 weeks | Recorded, next at 16wk |
| 6 | Final puppy dose | Series complete |
| 7 | Annual booster scheduled | 1 year from last |
| 8 | View series progress | % complete shown |
| 9 | Early dose warning | Within interval warning |
| 10 | Late dose handling | Gap noted in record |

### Workflow 3: Reaction Reporting (8 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Report mild reaction | Reaction logged |
| 2 | Report severe reaction | Alert triggered |
| 3 | Reaction within 24 hours | Onset time recorded |
| 4 | Reaction after 48 hours | Flagged as late onset |
| 5 | Link reaction to vaccine | Vaccine brand tracked |
| 6 | View pet's reaction history | All reactions shown |
| 7 | Reaction affects future vaccines | Warning displayed |
| 8 | Report to regulatory body | Export for reporting |

### Workflow 4: Reminder Automation (8 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | 30-day reminder sent | Email/SMS delivered |
| 2 | 7-day reminder sent | Second reminder |
| 3 | Day-of reminder sent | Final reminder |
| 4 | Overdue notification | Alert to clinic |
| 5 | Owner dismisses reminder | Status updated |
| 6 | Owner books from reminder | Linked to reminder |
| 7 | Reminder preferences respected | Channel matches pref |
| 8 | Multiple pets, single owner | Consolidated reminder |

### Workflow 5: Certificate Management (6 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Generate individual certificate | Valid PDF |
| 2 | Generate batch certificates | Zip download |
| 3 | Certificate includes batch number | Traceability data |
| 4 | Certificate includes vet signature | Digital signature |
| 5 | Certificate QR code | Scannable, links to record |
| 6 | Certificate language selection | Spanish/English |

### Workflow 6: Regulatory Compliance (6 tests)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | Rabies certificate format | Official format |
| 2 | Travel health certificate | Export requirements |
| 3 | Vaccine batch tracking | Full traceability |
| 4 | Expired vaccine warning | Cannot administer |
| 5 | Audit log for vaccines | All actions logged |
| 6 | Regulatory report generation | Compliance report |

## Test Implementation

### Vaccination Cycle Test

```typescript
// tests/integration/vaccination/vaccine-cycle.test.ts
describe('Vaccination Cycle', () => {
  let pet: Pet;
  let vet: User;
  let vaccine: VaccineCatalog;

  beforeEach(async () => {
    pet = await fixtures.createPet({ species: 'dog', date_of_birth: '2025-01-01' });
    vet = await fixtures.createVet();
    vaccine = await fixtures.createVaccineCatalog({
      name: 'Canine Distemper',
      species: ['dog'],
      dose_interval_days: 21,
      doses_required: 3,
    });
  });

  it('should complete single-dose vaccination', async () => {
    // Administer vaccine
    const adminRes = await api.post('/api/vaccines', {
      pet_id: pet.id,
      vaccine_name: vaccine.name,
      administered_date: new Date().toISOString(),
      batch_number: 'BATCH-2026-001',
      administered_by: vet.id,
    });
    expect(adminRes.status).toBe(201);
    const vaccineRecord = adminRes.data;

    // Verify next due date calculated
    expect(vaccineRecord.next_due_date).toBeTruthy();
    const dueDate = new Date(vaccineRecord.next_due_date);
    const expectedDue = addDays(new Date(), 21);
    expect(dueDate.toDateString()).toBe(expectedDue.toDateString());

    // Generate certificate
    const certRes = await api.get(`/api/vaccines/${vaccineRecord.id}/certificate`);
    expect(certRes.status).toBe(200);
    expect(certRes.headers['content-type']).toBe('application/pdf');

    // Verify reminder scheduled
    const remindersRes = await api.get(`/api/reminders?pet_id=${pet.id}&type=vaccine`);
    expect(remindersRes.data).toContainEqual(
      expect.objectContaining({
        type: 'vaccine',
        scheduled_at: expect.any(String),
      })
    );
  });
});
```

### Multi-Dose Series Test

```typescript
describe('Multi-Dose Vaccine Series', () => {
  let puppy: Pet;

  beforeEach(async () => {
    // Create 6-week old puppy
    puppy = await fixtures.createPet({
      species: 'dog',
      date_of_birth: subWeeks(new Date(), 6).toISOString(),
    });
  });

  it('should track puppy vaccine series progress', async () => {
    const doses = [
      { week: 6, administered: true },
      { week: 9, administered: true },
      { week: 12, administered: false },
      { week: 16, administered: false },
    ];

    // Administer first two doses
    for (const dose of doses.filter(d => d.administered)) {
      await api.post('/api/vaccines', {
        pet_id: puppy.id,
        vaccine_name: 'DHPP',
        administered_date: subWeeks(new Date(), 6 - dose.week).toISOString(),
      });
    }

    // Check series progress
    const progressRes = await api.get(`/api/pets/${puppy.id}/vaccine-series`);
    expect(progressRes.data.dhpp.completed).toBe(2);
    expect(progressRes.data.dhpp.total).toBe(4);
    expect(progressRes.data.dhpp.percentage).toBe(50);
    expect(progressRes.data.dhpp.next_due_week).toBe(12);
  });
});
```

### Reaction Reporting Test

```typescript
describe('Vaccine Reaction Reporting', () => {
  let vaccine: Vaccine;

  beforeEach(async () => {
    vaccine = await fixtures.createAdministeredVaccine();
  });

  it('should log and flag severe reaction', async () => {
    const reactionRes = await api.post(`/api/vaccines/${vaccine.id}/reactions`, {
      reaction_type: 'anaphylaxis',
      severity: 'severe',
      onset_hours: 0.5,
      description: 'Immediate facial swelling, difficulty breathing',
      treatment_given: 'Epinephrine administered',
    });
    expect(reactionRes.status).toBe(201);

    // Verify alert created
    const alertsRes = await api.get(`/api/alerts?type=vaccine_reaction`);
    expect(alertsRes.data).toContainEqual(
      expect.objectContaining({
        severity: 'critical',
        vaccine_id: vaccine.id,
      })
    );

    // Verify future vaccine warning
    const petRes = await api.get(`/api/pets/${vaccine.pet_id}`);
    expect(petRes.data.vaccine_warnings).toContainEqual(
      expect.objectContaining({
        vaccine_name: vaccine.vaccine_name,
        warning: 'Severe reaction history',
      })
    );
  });
});
```

## Data Fixtures

```typescript
// tests/__fixtures__/vaccination.ts
export const vaccinationFixtures = {
  async createVaccineCatalog(overrides = {}) {
    return {
      name: 'Rabies',
      species: ['dog', 'cat'],
      dose_interval_days: 365,
      doses_required: 1,
      is_required: true,
      ...overrides,
    };
  },

  async createAdministeredVaccine(overrides = {}) {
    const pet = await fixtures.createPet();
    const vet = await fixtures.createVet();

    return supabase.from('vaccines').insert({
      pet_id: pet.id,
      tenant_id: testTenantId,
      vaccine_name: 'Rabies',
      administered_date: new Date().toISOString(),
      batch_number: 'BATCH-2026-001',
      administered_by: vet.id,
      status: 'administered',
      next_due_date: addDays(new Date(), 365).toISOString(),
      ...overrides,
    }).select().single();
  },
};
```

## Acceptance Criteria

- [ ] 46 vaccination tests implemented
- [ ] Single-dose workflow coverage >= 95%
- [ ] Multi-dose series coverage >= 90%
- [ ] Reaction reporting coverage >= 85%
- [ ] Certificate generation tested
- [ ] Reminder automation verified
- [ ] Regulatory compliance verified

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Vaccine before minimum age | Warning, allow override |
| Expired vaccine batch | Block administration |
| Duplicate vaccine same day | Warning, allow |
| Species mismatch | Block |
| Reaction during series | Flag, suggest alternative |

---

**Created**: 2026-01-12
**Status**: Not Started
