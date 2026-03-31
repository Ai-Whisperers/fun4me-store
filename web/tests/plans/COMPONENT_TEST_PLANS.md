# Component Test Plans

Complete test plans for key React components in the Vete platform.

## Table of Contents

1. [UI Components](#ui-components)
2. [Form Components](#form-components)
3. [Layout Components](#layout-components)
4. [Feature Components](#feature-components)
5. [Dashboard Components](#dashboard-components)

---

## UI Components

### Component: Button

**File:** `components/ui/button.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Renders with correct variant
- [ ] Renders with correct size
- [ ] Renders with correct children
- [ ] Click handler called
- [ ] Disabled state works
- [ ] Loading state works
- [ ] Icon rendering

#### Test Cases

1. **Render:** Render button → Correct variant/size displayed
2. **Click:** Click button → Handler called
3. **Disabled:** Disabled button → Not clickable
4. **Loading:** Loading button → Spinner displayed → Not clickable

---

### Component: Input

**File:** `components/ui/input.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Renders with value
- [ ] Change handler called
- [ ] Placeholder displays
- [ ] Error state displays
- [ ] Disabled state works
- [ ] Type validation

#### Test Cases

1. **Input:** Type in input → Value updates → Change handler called
2. **Error:** Input with error → Error message displays
3. **Disabled:** Disabled input → Not editable

---

### Component: Card

**File:** `components/ui/card.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Renders children
- [ ] Header renders
- [ ] Footer renders
- [ ] Variants work

#### Test Cases

1. **Render:** Render card → Children display
2. **With Header:** Card with header → Header displays
3. **With Footer:** Card with footer → Footer displays

---

## Form Components

### Component: PetForm

**File:** `components/forms/pet-form.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Form fields render
- [ ] Validation works
- [ ] Photo upload works
- [ ] Submit handler called
- [ ] Error messages display

#### Integration Tests

- [ ] Form submission works
- [ ] Photo upload works
- [ ] Validation errors returned
- [ ] Success callback called

#### Test Cases

1. **Fill Form:** Fill all fields → Submit → Handler called with data
2. **Validation:** Submit empty form → Validation errors display
3. **Photo Upload:** Upload photo → Photo preview displays
4. **Edit Mode:** Form in edit mode → Fields pre-populated

---

### Component: AppointmentForm

**File:** `components/forms/appointment-form.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Service selection works
- [ ] Pet selection works
- [ ] Date picker works
- [ ] Time slot selection works
- [ ] Validation works

#### Integration Tests

- [ ] Form submission works
- [ ] Available slots fetched
- [ ] Validation errors returned

#### Test Cases

1. **Complete Form:** Select service → Select pet → Select date/time → Submit
2. **Validation:** Submit without required fields → Errors display
3. **Slot Selection:** Select date → Available slots display → Select slot

---

## Layout Components

### Component: MainNav

**File:** `components/layout/main-nav.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Navigation items render
- [ ] Active route highlighted
- [ ] Cart badge displays
- [ ] User menu renders
- [ ] Mobile menu toggle works

#### Integration Tests

- [ ] Navigation works
- [ ] Cart count updates
- [ ] User menu works
- [ ] Mobile menu works

#### Test Cases

1. **Navigation:** Click nav item → Navigate to route
2. **Cart Badge:** Add item to cart → Badge updates
3. **Mobile Menu:** Click hamburger → Menu opens → Click item → Navigate

---

### Component: DashboardSidebar

**File:** `components/dashboard/dashboard-sidebar.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Menu items render
- [ ] Active item highlighted
- [ ] Role-based items display
- [ ] Collapse/expand works

#### Integration Tests

- [ ] Navigation works
- [ ] Role filtering works

#### Test Cases

1. **Navigation:** Click menu item → Navigate
2. **Role-Based:** Different roles → Different menu items
3. **Collapse:** Click collapse → Sidebar collapses

---

## Feature Components

### Component: BookingWizard

**File:** `components/booking/booking-wizard.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Step navigation works
- [ ] Step validation works
- [ ] Progress indicator updates
- [ ] Back button works

#### Integration Tests

- [ ] Complete wizard flow works
- [ ] Data persists between steps
- [ ] Final submission works

#### Test Cases

1. **Complete Flow:** Step 1 → Step 2 → Step 3 → Step 4 → Submit
2. **Back Navigation:** Step 3 → Back → Step 2 → Data preserved
3. **Validation:** Step 2 → Try to proceed without selection → Error

---

### Component: ProductCard

**File:** `components/store/product-card.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Product data displays
- [ ] Stock status displays
- [ ] Price displays
- [ ] Add to cart button works
- [ ] Out of stock state works

#### Integration Tests

- [ ] Add to cart works
- [ ] Stock validation works

#### Test Cases

1. **Display:** Render card → Product data displays
2. **Add to Cart:** Click add → Item added → Cart updates
3. **Out of Stock:** Out of stock product → Button disabled

---

### Component: PetCard

**File:** `components/pets/pet-card.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Pet data displays
- [ ] Photo displays
- [ ] Age displays
- [ ] Click handler works

#### Integration Tests

- [ ] Navigation works
- [ ] Photo loads

#### Test Cases

1. **Display:** Render card → Pet data displays
2. **Click:** Click card → Navigate to profile
3. **Photo:** Pet with photo → Photo displays

---

### Component: AppointmentCard

**File:** `components/appointments/appointment-card.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Appointment data displays
- [ ] Status badge displays
- [ ] Action buttons render
- [ ] Status-based buttons work

#### Integration Tests

- [ ] Status update works
- [ ] Actions work

#### Test Cases

1. **Display:** Render card → Appointment data displays
2. **Check-in:** Click check-in → Status updates
3. **Cancel:** Click cancel → Confirmation → Appointment cancelled

---

### Component: InvoiceForm

**File:** `components/invoices/invoice-form.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Line items render
- [ ] Calculations update
- [ ] Add/remove line items works
- [ ] Validation works

#### Integration Tests

- [ ] Form submission works
- [ ] Calculations correct

#### Test Cases

1. **Add Line Item:** Add item → Calculations update
2. **Remove Line Item:** Remove item → Calculations update
3. **Submit:** Fill form → Submit → Invoice created

---

## Dashboard Components

### Component: StatsCards

**File:** `components/dashboard/stats-cards.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Stats display correctly
- [ ] Icons render
- [ ] Trends display
- [ ] Click handlers work

#### Integration Tests

- [ ] Stats load correctly
- [ ] Navigation works

#### Test Cases

1. **Display:** Render cards → Stats display
2. **Click:** Click card → Navigate to related page
3. **Trends:** Stats with trends → Arrows display

---

### Component: AppointmentsChart

**File:** `components/dashboard/appointments-chart.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Chart renders
- [ ] Data displays correctly
- [ ] Date range filtering works
- [ ] Tooltips work

#### Integration Tests

- [ ] Chart data loads
- [ ] Filtering works

#### Test Cases

1. **Render:** Render chart → Data displays
2. **Filter:** Change date range → Chart updates
3. **Hover:** Hover over data point → Tooltip displays

---

### Component: InventoryAlerts

**File:** `components/dashboard/inventory-alerts.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Alerts render
- [ ] Low stock items display
- [ ] Click handlers work

#### Integration Tests

- [ ] Alerts load correctly
- [ ] Navigation works

#### Test Cases

1. **Display:** Render alerts → Low stock items display
2. **Click:** Click alert → Navigate to inventory

---

### Component: VaccineSchedule

**File:** `components/pets/vaccine-schedule.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] Vaccines display
- [ ] Status badges display
- [ ] Due dates highlight
- [ ] Add vaccine button works

#### Integration Tests

- [ ] Vaccines load
- [ ] Navigation works

#### Test Cases

1. **Display:** Render schedule → Vaccines display
2. **Status:** Vaccines with different statuses → Badges display
3. **Add:** Click add → Navigate to vaccine form

---

### Component: QRGenerator

**File:** `components/pets/qr-generator.tsx`

**Test Coverage Required:**

#### Unit Tests

- [ ] QR code generates
- [ ] QR code displays
- [ ] Download works
- [ ] Print works

#### Integration Tests

- [ ] QR code data correct
- [ ] Download generates file

#### Test Cases

1. **Generate:** Generate QR → Code displays
2. **Download:** Click download → File downloads
3. **Print:** Click print → Print dialog opens

---

## Testing Strategy

### Component Testing Approach

1. **Unit Tests:** Test component logic, rendering, props
2. **Integration Tests:** Test component interactions, API calls
3. **Visual Tests:** Test component appearance (optional, with tools like Chromatic)

### Test Tools

- **Vitest:** Unit and integration tests
- **@testing-library/react:** Component rendering and interaction
- **@testing-library/user-event:** User interaction simulation

### Test Patterns

```typescript
// Example component test structure
describe('ComponentName', () => {
  it('renders correctly', () => {
    // Test rendering
  })

  it('handles user interactions', () => {
    // Test interactions
  })

  it('validates props', () => {
    // Test validation
  })

  it('handles errors', () => {
    // Test error states
  })
})
```

---

_This document should be updated as new components are added or existing components are modified._
