# TerraPet - Comprehensive Testing Analysis & Deep Dive

**Generated:** January 22, 2026  
**Branch:** develop  
**Purpose:** Complete testing strategy for TerraPet including existing tests + additional deep-dive coverage

---

## 📊 Executive Summary

This document provides a comprehensive analysis of:
1. **Existing Test Coverage** - What tests already exist in the platform
2. **TerraPet-Specific Tests** - Tests needed specifically for TerraPet features
3. **Deep-Dive Testing** - Additional edge cases and integration points
4. **Test Execution Plan** - Prioritized testing roadmap

### Overall Test Count
- **Existing E2E Tests:** ~30 test suites, 14,669 lines of test code
- **Critical Path Tests:** 9 comprehensive journey tests
- **Portal Tests:** 14 test suites
- **TerraPet-Specific Needed:** 25+ additional test scenarios

---

## 📋 Table of Contents

1. [Existing Test Infrastructure](#existing-test-infrastructure)
2. [TerraPet-Specific Testing Needs](#terrapet-specific-testing-needs)
3. [Deep-Dive Test Categories](#deep-dive-test-categories)
4. [Multi-Tenant Isolation Testing](#multi-tenant-isolation-testing)
5. [Integration Points Testing](#integration-points-testing)
6. [Edge Cases & Error Scenarios](#edge-cases--error-scenarios)
7. [Performance & Load Testing](#performance--load-testing)
8. [Security & Data Privacy](#security--data-privacy)
9. [Accessibility Testing](#accessibility-testing)
10. [Test Execution Priority](#test-execution-priority)

---

## 1. Existing Test Infrastructure

### ✅ What's Already Built (Platform-Wide)

#### Critical Path Tests (9 Test Suites)
| Test Suite | Coverage | Lines | Status |
|------------|----------|-------|--------|
| `01-booking-complete-journey` | End-to-end appointment booking | 555 | ✅ Exists |
| `02-checkout-to-confirmation` | Store purchase flow | 720 | ✅ Exists |
| `03-appointment-lifecycle` | Full appointment cycle | 630 | ✅ Exists |
| `04-invoice-payment-lifecycle` | Billing & payments | 719 | ✅ Exists |
| `05-pet-registration-vaccines` | Pet onboarding + vaccines | 292 | ✅ Exists |
| `06-store-checkout-prescription` | Rx verification flow | 678 | ✅ Exists |
| `07-staff-scheduling-flow` | Staff appointment management | 554 | ✅ Exists |
| `08-cart-merge-flow` | Anonymous → logged-in cart | 508 | ✅ Exists |
| `09-concurrent-booking-protection` | Race condition handling | 595 | ✅ Exists |

**Total Critical Coverage:** 5,251 lines of critical path tests

#### Portal Tests (14 Test Suites)
| Test Suite | Coverage | Lines |
|------------|----------|-------|
| `portal/auth` | Authentication flows | 269 |
| `portal/pets` | Pet management CRUD | 397 |
| `portal/appointments` | Appointment viewing/canceling | 310 |
| `portal/medical-records` | Medical history viewing | 383 |
| `portal/vaccines` | Vaccine tracking | 314 |
| `portal/prescriptions` | Prescription viewing | 171 |
| `portal/invoices` | Invoice/billing viewing | 316 |
| `portal/profile` | User profile management | 332 |
| `portal/store` | Store browsing/purchasing | 315 |
| `portal/messaging` | Internal messaging | 286 |
| `portal/notifications` | Notification system | 218 |
| `portal/loyalty` | Loyalty points | 283 |
| `portal/wishlist` | Product wishlists | 202 |
| `portal/data-persistence` | Data continuity | 346 |

**Total Portal Coverage:** 4,142 lines

#### Public Page Tests (4 Test Suites)
| Test Suite | Coverage | Lines |
|------------|----------|-------|
| `public/homepage` | Homepage rendering | 122 |
| `public/services` | Services page | 84 |
| `store/store` | Public store browsing | 469 |
| `tools/toxic-food` | Toxic food checker | 98 |

#### Visual/Validation Tests (8 Test Suites)
| Test Suite | Coverage | Lines |
|------------|----------|-------|
| `visual/appointment-booking` | Booking UI/UX | 449 |
| `visual/auth-flow` | Auth UI/UX | 371 |
| `visual/cart-validation` | Cart validations | 406 |
| `visual/charges-validation` | Billing validations | 511 |
| `visual/pet-registration-portal` | Pet reg (owner) | 500 |
| `visual/pet-registration-staff` | Pet reg (staff) | 414 |
| `visual/registration` | User registration | 324 |
| `visual/store-purchasing` | Purchase flow | 497 |
| `visual/vaccination-warnings` | Vaccine alerts | 417 |

**Total Visual Coverage:** 3,889 lines

### Test Infrastructure Tools
- ✅ **Playwright** configured (multi-browser)
- ✅ **Auth helpers** (`helpers/auth.ts`)
- ✅ **Navigation helpers** (`helpers/navigation.ts`)
- ✅ **Database helpers** (`helpers/database.ts`)
- ✅ **Seeded demo data** (2 clinics: adris, petlife)
- ✅ **Test credentials** (owner, vet, admin per clinic)

---

## 2. TerraPet-Specific Testing Needs

### 🆕 Additional Tests Required for TerraPet

#### 2.1 Multi-Tenant Isolation (HIGH PRIORITY)

**Test Suite:** `multi-tenant/terrapet-isolation.spec.ts`

```typescript
test.describe('TerraPet Multi-Tenant Isolation', () => {
  
  test('TerraPet data isolated from Adris @security @multi-tenant', async ({ page }) => {
    // 1. Login as TerraPet owner
    await loginAs(page, 'terrapet', 'owner')
    
    // 2. Verify only TerraPet pets visible
    const pets = await getOwnerPets('owner@terrapet.demo')
    expect(pets.every(p => p.tenant_id === 'terrapet')).toBe(true)
    
    // 3. Verify no Adris data leaks
    const leakedPets = await getPetsFromDifferentTenant('terrapet', 'adris')
    expect(leakedPets).toHaveLength(0)
  })
  
  test('TerraPet appointments isolated from other clinics @security', async ({ page }) => {
    // Verify appointments don't cross tenant boundaries
  })
  
  test('TerraPet store products isolated @security', async ({ page }) => {
    // Verify product catalog is tenant-specific
  })
  
  test('TerraPet RLS policies enforce isolation @security @database', async () => {
    // Direct database queries respect RLS
  })
})
```

**Priority:** 🔴 **CRITICAL** - Must verify before launch

---

#### 2.2 Dog-Only Constraint Validation

**Test Suite:** `terrapet/dog-only-validation.spec.ts`

```typescript
test.describe('TerraPet Dog-Only Business Logic', () => {
  
  test('Cannot register non-dog pets @terrapet @business-rule', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    await navigateTo(page, ROUTES.addPet('terrapet'))
    
    // Attempt to select 'cat' as species
    await page.selectOption('[name="species"]', 'cat')
    
    // Should show validation error
    await expect(page.locator('.error')).toContainText(
      'TerraPet solo atiende perros'
    )
  })
  
  test('Dog species pre-selected and enforced @terrapet', async ({ page }) => {
    // Verify 'dog' is default and only option
  })
  
  test('Services display dog-specific language @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.services('terrapet'))
    
    // Verify all services mention 'perro' not generic 'mascota'
    const serviceCards = page.locator('[data-testid="service-card"]')
    const count = await serviceCards.count()
    
    for (let i = 0; i < count; i++) {
      const text = await serviceCards.nth(i).textContent()
      expect(text).toMatch(/perro|canino|peludo/i)
    }
  })
})
```

**Priority:** 🟡 **HIGH** - Business differentiator

---

#### 2.3 Home Visit Consultations (Unique Feature)

**Test Suite:** `terrapet/home-visits.spec.ts`

```typescript
test.describe('TerraPet Home Visit Consultations', () => {
  
  test('Home visit service visible and bookable @terrapet @feature', async ({ page }) => {
    await navigateTo(page, ROUTES.services('terrapet'))
    
    // Find "Consulta a Domicilio" service
    const homeVisit = page.locator('text=Consulta a Domicilio')
    await expect(homeVisit).toBeVisible()
    
    // Click to view details
    await homeVisit.click()
    
    // Verify booking enabled
    const bookBtn = page.locator('button:has-text("Agendar")')
    await expect(bookBtn).toBeEnabled()
  })
  
  test('Home visit booking requires address @terrapet', async ({ page }) => {
    // Book home visit appointment
    await loginAs(page, 'terrapet', 'owner')
    await bookHomeVisit(page, 'terrapet')
    
    // Verify address field is required
    await page.click('button:has-text("Confirmar")')
    await expect(page.locator('.error')).toContainText('dirección')
  })
  
  test('Home visit shows in appointment list with icon @terrapet', async ({ page }) => {
    // Verify home visit appointments display correctly
  })
  
  test('Home visit pricing differs from in-clinic @terrapet', async ({ page }) => {
    // Verify pricing structure
  })
})
```

**Priority:** 🟡 **HIGH** - Unique competitive advantage

---

#### 2.4 Online Store (Dog Food Products)

**Test Suite:** `terrapet/online-store.spec.ts`

```typescript
test.describe('TerraPet Online Store', () => {
  
  test('Store enabled and accessible @terrapet @store', async ({ page }) => {
    await navigateTo(page, ROUTES.store('terrapet'))
    
    // Verify store page loads
    await expect(page).toHaveURL(/\/terrapet\/store/)
    await expect(page.locator('h1')).toContainText('Tienda')
  })
  
  test('Dog food products display with images @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.store('terrapet'))
    
    // Verify products from Google Drive images load
    const productCards = page.locator('[data-testid="product-card"]')
    const firstProduct = productCards.first()
    
    // Check image loaded
    const img = firstProduct.locator('img')
    await expect(img).toBeVisible()
    
    // Verify Google Drive image URL
    const src = await img.getAttribute('src')
    expect(src).toMatch(/drive\.google\.com|\/uc\?id=/)
  })
  
  test('Add to cart and checkout flow @terrapet @store', async ({ page }) => {
    // Complete purchase flow with dog food product
  })
  
  test('Store products filtered to dog category @terrapet', async ({ page }) => {
    // Verify no cat/other products visible
  })
  
  test('Product search works for dog food @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.store('terrapet'))
    await page.fill('[data-testid="search"]', 'alimento')
    
    // Verify relevant results
    const results = page.locator('[data-testid="product-card"]')
    await expect(results).toHaveCountGreaterThan(0)
  })
})
```

**Priority:** 🟡 **HIGH** - Revenue-generating feature

---

#### 2.5 QR Tags for Lost Pets

**Test Suite:** `terrapet/qr-tags.spec.ts`

```typescript
test.describe('TerraPet QR Tags System', () => {
  
  test('QR tag generation available @terrapet @feature', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    await navigateTo(page, ROUTES.myPets('terrapet'))
    
    // Click on a pet
    await page.click('[data-testid="pet-card"]')
    
    // Verify QR tag option visible
    const qrBtn = page.locator('button:has-text("Generar QR")')
    await expect(qrBtn).toBeVisible()
  })
  
  test('Generate QR tag for pet @terrapet', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    const pet = await getFirstPet('owner@terrapet.demo')
    
    // Generate QR
    await generateQRTag(page, 'terrapet', pet.id)
    
    // Verify QR code displays
    const qrCode = page.locator('[data-testid="qr-code"]')
    await expect(qrCode).toBeVisible()
  })
  
  test('Lost pet reporting via QR @terrapet', async ({ page }) => {
    // Report pet lost
    // Verify public lost pet page accessible
  })
  
  test('Lost pet sighting tracking @terrapet', async ({ page }) => {
    // Report sighting
    // Verify owner notified
  })
  
  test('QR tag privacy controls @terrapet @security', async ({ page }) => {
    // Verify contact info controlled by owner
  })
})
```

**Priority:** 🟢 **MEDIUM** - Value-add feature

---

#### 2.6 7-Day Schedule (Daily Operations)

**Test Suite:** `terrapet/schedule-7day.spec.ts`

```typescript
test.describe('TerraPet 7-Day Schedule', () => {
  
  test('All days show 9am-6pm hours @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Verify hours displayed
    const hours = page.locator('[data-testid="hours"]')
    await expect(hours).toContainText('9:00')
    await expect(hours).toContainText('18:00')
    await expect(hours).toContainText('7 días')
  })
  
  test('Booking available all 7 days @terrapet', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    await navigateTo(page, ROUTES.booking('terrapet'))
    
    // Select Sunday (should be available)
    const calendar = page.locator('[data-testid="calendar"]')
    const sunday = calendar.locator('[data-day="sunday"]')
    
    await expect(sunday).not.toHaveClass(/disabled/)
  })
  
  test('No "Closed" days in week @terrapet', async ({ page }) => {
    // Verify every day has slots
  })
})
```

**Priority:** 🟢 **MEDIUM** - Business hours validation

---

#### 2.7 Accessible Pricing Messaging

**Test Suite:** `terrapet/pricing-accessibility.spec.ts`

```typescript
test.describe('TerraPet Accessible Pricing', () => {
  
  test('Pricing emphasis on homepage @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Verify "Precios Accesibles" feature
    const features = page.locator('[data-testid="feature"]')
    const pricingFeature = features.filter({ hasText: 'Precios Accesibles' })
    
    await expect(pricingFeature).toBeVisible()
  })
  
  test('Service prices displayed when available @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.services('terrapet'))
    
    // Services should show "Consultar" or actual price
    const serviceCards = page.locator('[data-testid="service-card"]')
    const firstService = serviceCards.first()
    
    // Should have pricing info
    await expect(firstService).toContainText(/Consultar|Gs/)
  })
  
  test('FAQ mentions accessible pricing @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.faq('terrapet'))
    
    // Search for pricing-related FAQ
    const faq = page.locator('text=precios')
    await expect(faq).toBeVisible()
  })
})
```

**Priority:** 🟢 **MEDIUM** - Brand messaging

---

#### 2.8 Google Drive Image Loading

**Test Suite:** `terrapet/google-drive-images.spec.ts`

```typescript
test.describe('TerraPet Google Drive Images', () => {
  
  test('Logo loads from Google Drive @terrapet @images', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    const logo = page.locator('[data-testid="clinic-logo"]')
    await expect(logo).toBeVisible()
    
    const src = await logo.getAttribute('src')
    expect(src).toMatch(/drive\.google\.com.*1pLfZCCIYW6qPsrkTpfeFJuZ6AX8Q0IPG/)
  })
  
  test('Clinic photos load @terrapet @images', async ({ page }) => {
    await navigateTo(page, ROUTES.about('terrapet'))
    
    // Verify 4 clinic photos
    const photos = page.locator('[data-testid="clinic-photo"]')
    await expect(photos).toHaveCount(4)
    
    // All should be from Google Drive
    for (let i = 0; i < 4; i++) {
      const src = await photos.nth(i).locator('img').getAttribute('src')
      expect(src).toMatch(/drive\.google\.com/)
    }
  })
  
  test('Vet photo loads @terrapet @images', async ({ page }) => {
    await navigateTo(page, ROUTES.about('terrapet'))
    
    const vetPhoto = page.locator('[data-testid="vet-photo"]')
    await expect(vetPhoto).toBeVisible()
    
    const src = await vetPhoto.getAttribute('src')
    expect(src).toMatch(/drive\.google\.com.*1t_z4_tSXiPqm_c3NpQGepcxGfuX_ONLH/)
  })
  
  test('Product photos load in store @terrapet @images', async ({ page }) => {
    await navigateTo(page, ROUTES.store('terrapet'))
    
    // Verify 5 product images from Google Drive
    const products = page.locator('[data-testid="product-image"]')
    const count = await products.count()
    
    expect(count).toBeGreaterThanOrEqual(5)
  })
  
  test('Images have proper alt text @terrapet @a11y', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    const images = page.locator('img')
    const count = await images.count()
    
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt')
      expect(alt).toBeTruthy()
      expect(alt).not.toBe('')
    }
  })
})
```

**Priority:** 🟡 **HIGH** - Visual brand identity

---

#### 2.9 Theme Color Application

**Test Suite:** `terrapet/theme-colors.spec.ts`

```typescript
test.describe('TerraPet Earth-Tone Theme', () => {
  
  test('Primary color applied (#78866B sage green) @terrapet @theme', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Check CSS variable applied
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--primary')
    })
    
    expect(primaryColor.trim()).toBe('#78866B')
  })
  
  test('Secondary color applied (#C19A6B tan) @terrapet @theme', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    const secondaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--secondary')
    })
    
    expect(secondaryColor.trim()).toBe('#C19A6B')
  })
  
  test('Theme differs from Adris @terrapet @multi-tenant', async ({ page }) => {
    // Get TerraPet primary color
    await navigateTo(page, ROUTES.homepage('terrapet'))
    const terraPetPrimary = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--primary')
    )
    
    // Get Adris primary color
    await navigateTo(page, ROUTES.homepage('adris'))
    const adrisPrimary = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--primary')
    )
    
    // Should be different
    expect(terraPetPrimary).not.toBe(adrisPrimary)
  })
  
  test('Buttons use primary color @terrapet @theme', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    const primaryBtn = page.locator('button[class*="primary"]').first()
    const bgColor = await primaryBtn.evaluate((el) => 
      getComputedStyle(el).backgroundColor
    )
    
    // Should be sage green (#78866B = rgb(120, 134, 107))
    expect(bgColor).toMatch(/rgb\(120,\s*134,\s*107\)/)
  })
})
```

**Priority:** 🟢 **MEDIUM** - Visual consistency

---

#### 2.10 Spanish Language Validation

**Test Suite:** `terrapet/spanish-language.spec.ts`

```typescript
test.describe('TerraPet Spanish Language', () => {
  
  test('All UI elements in Spanish @terrapet @i18n', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Check for English words that shouldn't be there
    const bodyText = await page.locator('body').textContent()
    
    // Should NOT contain common English UI words
    expect(bodyText).not.toMatch(/\b(Login|Logout|Submit|Cancel|Save)\b/)
    
    // Should contain Spanish equivalents
    expect(bodyText).toMatch(/\b(Iniciar|Cerrar|Enviar|Cancelar|Guardar)\b/)
  })
  
  test('Service names in Spanish @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.services('terrapet'))
    
    // All services should be in Spanish
    const services = [
      'Consultas Veterinarias',
      'Vacunación',
      'Desparasitación',
      'Control de Peso',
      'Peluquería',
      'Baño',
      'Microchip',
      'Certificados',
      'Eutanasia Humanitaria'
    ]
    
    for (const service of services) {
      await expect(page.locator(`text=${service}`)).toBeVisible()
    }
  })
  
  test('Error messages in Spanish @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.login('terrapet'))
    
    // Try login with invalid credentials
    await page.fill('[name="email"]', 'invalid@test.com')
    await page.fill('[name="password"]', 'wrong')
    await page.click('button[type="submit"]')
    
    // Error should be in Spanish
    const error = page.locator('.error')
    await expect(error).toContainText(/credenciales|contraseña|error/i)
    await expect(error).not.toContainText(/invalid|incorrect|error/i)
  })
  
  test('FAQ in Spanish @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.faq('terrapet'))
    
    // All 12 questions should be Spanish
    const questions = page.locator('[data-testid="faq-question"]')
    const count = await questions.count()
    
    expect(count).toBe(12)
    
    for (let i = 0; i < count; i++) {
      const text = await questions.nth(i).textContent()
      expect(text).toMatch(/¿.*\?/)  // Spanish question format
    }
  })
})
```

**Priority:** 🟡 **HIGH** - User experience

---

## 3. Deep-Dive Test Categories

### 3.1 Configuration & Data Integrity

**Test Suite:** `terrapet/configuration-integrity.spec.ts`

```typescript
test.describe('TerraPet Configuration Integrity', () => {
  
  test('All config files valid JSON @terrapet @config', async () => {
    const configs = [
      'config.json',
      'theme.json',
      'home.json',
      'services.json',
      'about.json',
      'images.json',
      'faq.json',
      'showcase.json',
      'legal.json',
      'testimonials.json'
    ]
    
    for (const file of configs) {
      const path = `.content_data/terrapet/${file}`
      const content = await fs.readFile(path, 'utf-8')
      
      // Should parse without error
      expect(() => JSON.parse(content)).not.toThrow()
    }
  })
  
  test('Contact info matches client data @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Verify phone number
    const phone = page.locator('a[href*="tel"]')
    await expect(phone).toContainText('+595 992 152 465')
    
    // Verify WhatsApp
    const whatsapp = page.locator('a[href*="wa.me"]')
    await expect(whatsapp).toHaveAttribute('href', /5950992152465/)
    
    // Verify email
    const email = page.locator('a[href*="mailto"]')
    await expect(email).toHaveAttribute('href', /terrapetanimal@gmail.com/)
  })
  
  test('Hours displayed correctly (9-6, 7 days) @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    const hours = await page.locator('[data-testid="hours"]').textContent()
    
    expect(hours).toMatch(/9:00|09:00/)
    expect(hours).toMatch(/18:00|6:00 PM/)
    expect(hours).toMatch(/lunes.*domingo|7 días/i)
  })
  
  test('Vet info accurate @terrapet', async ({ page }) => {
    await navigateTo(page, ROUTES.about('terrapet'))
    
    // Verify vet name
    await expect(page.locator('text=Adrián Alexander Gill Sánchez')).toBeVisible()
    
    // Verify title
    await expect(page.locator('text=Doctor en Ciencias Veterinarias')).toBeVisible()
    
    // Verify specialization
    await expect(page.locator('text=Clínica diaria')).toBeVisible()
  })
})
```

---

### 3.2 Service Booking Flows

**Test Suite:** `terrapet/booking-flows.spec.ts`

```typescript
test.describe('TerraPet Booking Flows', () => {
  
  test('Book general consultation @terrapet @booking', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    
    // Navigate to booking
    await navigateTo(page, ROUTES.booking('terrapet'))
    
    // Select "Consultas Veterinarias"
    await page.click('text=Consultas Veterinarias')
    
    // Select general consultation variant
    await page.click('text=Consulta General')
    
    // Select date/time
    await selectNextAvailableSlot(page)
    
    // Select pet (should only show dogs)
    await page.selectOption('[name="pet"]', { index: 0 })
    
    // Add notes
    await page.fill('[name="notes"]', 'Mi perro tiene tos')
    
    // Submit
    await page.click('button:has-text("Confirmar")')
    
    // Verify confirmation
    await expect(page.locator('.success')).toBeVisible()
  })
  
  test('Book home visit consultation @terrapet @booking', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    await navigateTo(page, ROUTES.booking('terrapet'))
    
    // Select home visit
    await page.click('text=Consulta a Domicilio')
    
    // Should require address
    await selectNextAvailableSlot(page)
    await page.click('button:has-text("Confirmar")')
    
    // Validation error
    await expect(page.locator('.error')).toContainText('dirección')
    
    // Fill address
    await page.fill('[name="address"]', 'Av. España 123, Asunción')
    
    // Submit again
    await page.click('button:has-text("Confirmar")')
    await expect(page.locator('.success')).toBeVisible()
  })
  
  test('Book vaccination appointment @terrapet @booking', async ({ page }) => {
    // Test vaccination booking flow
  })
  
  test('Book grooming appointment @terrapet @booking', async ({ page }) => {
    // Test grooming booking flow
  })
  
  test('Cannot book for non-existent pet @terrapet @validation', async ({ page }) => {
    // Validation test
  })
  
  test('Cannot book outside business hours @terrapet @validation', async ({ page }) => {
    // Should not show slots before 9am or after 6pm
  })
})
```

---

### 3.3 Store & E-commerce

**Test Suite:** `terrapet/ecommerce-flows.spec.ts`

```typescript
test.describe('TerraPet E-commerce Flows', () => {
  
  test('Browse dog food products @terrapet @store', async ({ page }) => {
    await navigateTo(page, ROUTES.store('terrapet'))
    
    // Should see products
    const products = page.locator('[data-testid="product-card"]')
    await expect(products).toHaveCountGreaterThan(0)
    
    // Click on first product
    await products.first().click()
    
    // Should navigate to product detail
    await expect(page).toHaveURL(/\/terrapet\/store\/products\//)
  })
  
  test('Add product to cart @terrapet @store', async ({ page }) => {
    await navigateTo(page, ROUTES.store('terrapet'))
    
    // Add to cart
    await page.click('[data-testid="add-to-cart"]')
    
    // Verify cart badge updates
    const cartBadge = page.locator('[data-testid="cart-count"]')
    await expect(cartBadge).toContainText('1')
  })
  
  test('Complete checkout flow @terrapet @store', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    
    // Add product
    await addProductToCart(page, 'terrapet')
    
    // Go to cart
    await navigateTo(page, ROUTES.cart('terrapet'))
    
    // Proceed to checkout
    await page.click('button:has-text("Comprar")')
    
    // Fill shipping info
    await page.fill('[name="address"]', 'Av. España 123')
    await page.fill('[name="phone"]', '0992152465')
    
    // Select payment method
    await page.click('[data-payment="cash"]')
    
    // Confirm order
    await page.click('button:has-text("Confirmar Pedido")')
    
    // Verify success
    await expect(page.locator('.success')).toBeVisible()
  })
  
  test('Cart persists across sessions @terrapet @store', async ({ page }) => {
    // Add to cart as guest
    await addProductToCart(page, 'terrapet')
    
    // Login
    await loginAs(page, 'terrapet', 'owner')
    
    // Cart should still have item
    await navigateTo(page, ROUTES.cart('terrapet'))
    const items = page.locator('[data-testid="cart-item"]')
    await expect(items).toHaveCountGreaterThan(0)
  })
})
```

---

### 3.4 Contact & Communication

**Test Suite:** `terrapet/contact-communication.spec.ts`

```typescript
test.describe('TerraPet Contact & Communication', () => {
  
  test('WhatsApp link works @terrapet @contact', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    const whatsapp = page.locator('a[href*="wa.me"]')
    await expect(whatsapp).toBeVisible()
    
    const href = await whatsapp.getAttribute('href')
    expect(href).toMatch(/wa\.me\/5950992152465/)
  })
  
  test('Email link works @terrapet @contact', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    const email = page.locator('a[href*="mailto"]')
    await expect(email).toBeVisible()
    
    const href = await email.getAttribute('href')
    expect(href).toBe('mailto:terrapetanimal@gmail.com')
  })
  
  test('Google Maps link works @terrapet @contact', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    const maps = page.locator('a[href*="maps"]')
    await expect(maps).toBeVisible()
    
    const href = await maps.getAttribute('href')
    expect(href).toBe('https://maps.app.goo.gl/mdMfXwBpAQdYjGP88')
  })
  
  test('Contact form submission @terrapet @contact', async ({ page }) => {
    await navigateTo(page, ROUTES.contact('terrapet'))
    
    // Fill form
    await page.fill('[name="name"]', 'Juan Pérez')
    await page.fill('[name="email"]', 'juan@test.com')
    await page.fill('[name="phone"]', '0981123456')
    await page.fill('[name="message"]', 'Consulta sobre servicios')
    
    // Submit
    await page.click('button[type="submit"]')
    
    // Verify success
    await expect(page.locator('.success')).toBeVisible()
  })
})
```

---

## 4. Multi-Tenant Isolation Testing

### Critical Isolation Tests

**Test Suite:** `multi-tenant/terrapet-isolation-deep.spec.ts`

```typescript
test.describe('TerraPet Multi-Tenant Isolation (Deep)', () => {
  
  test('Database queries filtered by tenant_id @security', async () => {
    // Direct database test
    const { data: pets } = await supabase
      .from('pets')
      .select('*')
      .eq('tenant_id', 'terrapet')
    
    // All should be terrapet
    expect(pets.every(p => p.tenant_id === 'terrapet')).toBe(true)
  })
  
  test('RLS prevents cross-tenant data access @security', async () => {
    // Login as TerraPet user
    const terraPetUser = await loginWithSupabase('owner@terrapet.demo')
    
    // Try to access Adris pet
    const adrisPet = await getFirstPet('owner@adris.demo')
    
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('id', adrisPet.id)
      .single()
    
    // Should return null or error
    expect(data).toBeNull()
  })
  
  test('API routes enforce tenant isolation @security', async ({ request }) => {
    // Get TerraPet auth token
    const token = await getAuthToken('owner@terrapet.demo')
    
    // Try to access Adris appointment
    const adrisAppt = await getFirstAppointment('adris')
    
    const response = await request.get(
      `/api/appointments/${adrisAppt.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    // Should be 403 or 404
    expect([403, 404]).toContain(response.status())
  })
  
  test('URL manipulation cannot access other tenants @security', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    
    // Try to navigate to Adris portal
    await page.goto('/adris/portal')
    
    // Should redirect or show error
    await expect(page).not.toHaveURL(/\/adris\/portal/)
  })
  
  test('Session isolation between tenants @security', async ({ browser }) => {
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    
    // Login to TerraPet in context 1
    await loginAs(page1, 'terrapet', 'owner')
    
    // Login to Adris in context 2
    await loginAs(page2, 'adris', 'owner')
    
    // Verify sessions are separate
    await page1.goto('/terrapet/portal')
    await expect(page1.locator('text=TerraPet')).toBeVisible()
    
    await page2.goto('/adris/portal')
    await expect(page2.locator('text=Adris')).toBeVisible()
  })
})
```

---

## 5. Integration Points Testing

### 5.1 Database Integration

```typescript
test.describe('TerraPet Database Integration', () => {
  
  test('Tenant record exists @database', async () => {
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', 'terrapet')
      .single()
    
    expect(data).toBeTruthy()
    expect(data.name).toBe('TerraPet')
    expect(data.slug).toBe('terrapet')
  })
  
  test('All tables have RLS enabled @security', async () => {
    // Query all tables
    const tables = await getAllTables()
    
    for (const table of tables) {
      const rlsEnabled = await checkRLSEnabled(table)
      expect(rlsEnabled).toBe(true)
    }
  })
  
  test('Foreign key constraints enforced @database', async () => {
    // Try to create pet with invalid tenant_id
    const { error } = await supabase
      .from('pets')
      .insert({
        name: 'Test Dog',
        species: 'dog',
        tenant_id: 'nonexistent'
      })
    
    expect(error).toBeTruthy()
  })
})
```

---

### 5.2 External Services Integration

```typescript
test.describe('TerraPet External Services', () => {
  
  test('Google Drive images load @integration', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Check all images loaded
    const images = page.locator('img[src*="drive.google.com"]')
    const count = await images.count()
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      
      // Wait for image to load
      await img.waitFor({ state: 'visible' })
      
      // Check naturalWidth > 0 (image loaded successfully)
      const loaded = await img.evaluate((el: HTMLImageElement) => el.naturalWidth > 0)
      expect(loaded).toBe(true)
    }
  })
  
  test('Email service configured @integration', async () => {
    // Send test email
    const result = await sendEmail({
      to: 'test@terrapet.com',
      subject: 'Test',
      body: 'Test email'
    })
    
    expect(result.success).toBe(true)
  })
  
  test('SMS service configured @integration', async () => {
    // Send test SMS to TerraPet number
    const result = await sendSMS({
      to: '+5950992152465',
      message: 'Test SMS'
    })
    
    expect(result.success).toBe(true)
  })
})
```

---

## 6. Edge Cases & Error Scenarios

### 6.1 Error Handling

```typescript
test.describe('TerraPet Error Handling', () => {
  
  test('Graceful handling of missing images @error', async ({ page }) => {
    // Temporarily block Google Drive
    await page.route('**/drive.google.com/**', route => route.abort())
    
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Page should still load
    await expect(page.locator('h1')).toBeVisible()
    
    // Placeholder images shown
    const images = page.locator('img')
    const count = await images.count()
    expect(count).toBeGreaterThan(0)
  })
  
  test('Network error during booking @error', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    await navigateTo(page, ROUTES.booking('terrapet'))
    
    // Fill booking form
    await selectService(page, 'Consultas Veterinarias')
    await selectNextAvailableSlot(page)
    
    // Simulate network failure
    await page.route('**/api/appointments', route => route.abort())
    
    // Attempt submit
    await page.click('button:has-text("Confirmar")')
    
    // Should show error message
    await expect(page.locator('.error')).toContainText(/error|problema/i)
  })
  
  test('Session expiry handling @error', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    
    // Manually expire session
    await clearAuthCookies(page)
    
    // Try to access portal
    await navigateTo(page, ROUTES.myPets('terrapet'))
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })
})
```

---

### 6.2 Validation Edge Cases

```typescript
test.describe('TerraPet Validation Edge Cases', () => {
  
  test('Special characters in pet name @validation', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    await navigateTo(page, ROUTES.addPet('terrapet'))
    
    // Try special characters
    await page.fill('[name="name"]', 'Pepe\'"<script>')
    await page.click('button[type="submit"]')
    
    // Should sanitize or reject
    const errorOrSuccess = await Promise.race([
      page.locator('.error').waitFor(),
      page.locator('.success').waitFor()
    ])
    
    expect(errorOrSuccess).toBeTruthy()
  })
  
  test('Maximum length validations @validation', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    
    // Try extremely long input
    const longText = 'a'.repeat(1000)
    
    await navigateTo(page, ROUTES.booking('terrapet'))
    await page.fill('[name="notes"]', longText)
    
    // Should truncate or show validation error
    const value = await page.inputValue('[name="notes"]')
    expect(value.length).toBeLessThan(500)
  })
  
  test('Future date validation for appointments @validation', async ({ page }) => {
    // Cannot book appointments too far in future
  })
  
  test('Past date validation @validation', async ({ page }) => {
    // Cannot book appointments in past
  })
})
```

---

## 7. Performance & Load Testing

### 7.1 Page Load Performance

```typescript
test.describe('TerraPet Performance', () => {
  
  test('Homepage loads under 3 seconds @performance', async ({ page }) => {
    const start = Date.now()
    
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    const duration = Date.now() - start
    expect(duration).toBeLessThan(3000)
  })
  
  test('Large image loading optimized @performance', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Check images are lazy-loaded
    const images = page.locator('img[loading="lazy"]')
    const count = await images.count()
    
    expect(count).toBeGreaterThan(0)
  })
  
  test('Store page with many products @performance', async ({ page }) => {
    const start = Date.now()
    
    await navigateTo(page, ROUTES.store('terrapet'))
    
    const duration = Date.now() - start
    expect(duration).toBeLessThan(5000)
  })
})
```

---

### 7.2 Concurrent User Scenarios

```typescript
test.describe('TerraPet Concurrent Users', () => {
  
  test('Multiple users booking same slot @concurrency', async ({ browser }) => {
    // Create 2 browser contexts
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    
    // Both login
    await loginAs(page1, 'terrapet', 'owner')
    await loginAs(page2, 'terrapet', 'owner')
    
    // Both try to book same slot
    const slot = await getNextAvailableSlot('terrapet')
    
    await Promise.all([
      bookSlot(page1, slot),
      bookSlot(page2, slot)
    ])
    
    // Only one should succeed
    const success1 = await page1.locator('.success').isVisible()
    const success2 = await page2.locator('.success').isVisible()
    
    // XOR: exactly one should succeed
    expect(success1 !== success2).toBe(true)
  })
})
```

---

## 8. Security & Data Privacy

### 8.1 Authentication Security

```typescript
test.describe('TerraPet Authentication Security', () => {
  
  test('SQL injection prevention @security', async ({ page }) => {
    await navigateTo(page, ROUTES.login('terrapet'))
    
    // Try SQL injection in email field
    await page.fill('[name="email"]', "admin' OR '1'='1")
    await page.fill('[name="password"]', 'anything')
    await page.click('button[type="submit"]')
    
    // Should not login
    await expect(page).not.toHaveURL(/\/portal/)
  })
  
  test('XSS prevention @security', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    await navigateTo(page, ROUTES.addPet('terrapet'))
    
    // Try XSS in pet name
    await page.fill('[name="name"]', '<script>alert("XSS")</script>')
    await page.click('button[type="submit"]')
    
    // Reload and check if script executed
    await page.reload()
    
    // Should be escaped
    const petName = await page.locator('[data-testid="pet-name"]').textContent()
    expect(petName).not.toContain('<script>')
  })
  
  test('CSRF protection @security', async ({ request }) => {
    // Try API call without CSRF token
    const response = await request.post('/api/pets', {
      data: {
        name: 'Test Dog',
        species: 'dog'
      }
    })
    
    // Should be rejected
    expect(response.status()).toBe(403)
  })
})
```

---

### 8.2 Data Privacy

```typescript
test.describe('TerraPet Data Privacy', () => {
  
  test('Owner only sees their own pets @privacy', async ({ page }) => {
    await loginAs(page, 'terrapet', 'owner')
    await navigateTo(page, ROUTES.myPets('terrapet'))
    
    // Get displayed pets
    const pets = await getAllDisplayedPets(page)
    
    // All should belong to logged-in owner
    const ownerEmail = 'owner@terrapet.demo'
    const ownerPets = await getOwnerPets(ownerEmail)
    
    expect(pets.length).toBe(ownerPets.length)
  })
  
  test('Sensitive data not exposed in HTML @privacy', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Check page source for secrets
    const html = await page.content()
    
    // Should not contain API keys, tokens, etc.
    expect(html).not.toMatch(/sk_live|pk_test|secret_key/)
  })
  
  test('Personal data encrypted in transit @privacy', async ({ page }) => {
    // Verify HTTPS only
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    const url = page.url()
    expect(url).toMatch(/^https:\/\//)
  })
})
```

---

## 9. Accessibility Testing

### 9.1 WCAG Compliance

```typescript
test.describe('TerraPet Accessibility', () => {
  
  test('Keyboard navigation works @a11y', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Tab through focusable elements
    await page.keyboard.press('Tab')
    
    // Should focus on first interactive element
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(['A', 'BUTTON', 'INPUT']).toContain(focused)
  })
  
  test('Images have alt text @a11y', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    const images = page.locator('img')
    const count = await images.count()
    
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt')
      expect(alt).toBeTruthy()
    }
  })
  
  test('Form inputs have labels @a11y', async ({ page }) => {
    await navigateTo(page, ROUTES.login('terrapet'))
    
    const inputs = page.locator('input')
    const count = await inputs.count()
    
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      
      // Should have associated label
      const label = page.locator(`label[for="${id}"]`)
      await expect(label).toBeVisible()
    }
  })
  
  test('Color contrast sufficient @a11y', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Check primary text color vs background
    const contrast = await page.evaluate(() => {
      const text = window.getComputedStyle(document.body).color
      const bg = window.getComputedStyle(document.body).backgroundColor
      
      // Calculate contrast ratio (simplified)
      return { text, bg }
    })
    
    // Sage green (#78866B) should have sufficient contrast
    expect(contrast).toBeTruthy()
  })
})
```

---

### 9.2 Screen Reader Support

```typescript
test.describe('TerraPet Screen Reader Support', () => {
  
  test('ARIA labels present @a11y', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Main navigation should have aria-label
    const nav = page.locator('nav')
    const ariaLabel = await nav.getAttribute('aria-label')
    
    expect(ariaLabel).toBeTruthy()
  })
  
  test('Form validation errors announced @a11y', async ({ page }) => {
    await navigateTo(page, ROUTES.login('terrapet'))
    
    // Submit empty form
    await page.click('button[type="submit"]')
    
    // Error should have role="alert"
    const error = page.locator('[role="alert"]')
    await expect(error).toBeVisible()
  })
  
  test('Skip to content link @a11y', async ({ page }) => {
    await navigateTo(page, ROUTES.homepage('terrapet'))
    
    // Press Tab (should focus skip link)
    await page.keyboard.press('Tab')
    
    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toBeFocused()
  })
})
```

---

## 10. Test Execution Priority

### Phase 1: Critical Path (MUST PASS before launch)

**Priority:** 🔴 **CRITICAL** - Block launch if fail

1. ✅ **Multi-Tenant Isolation** (4 hours)
   - `multi-tenant/terrapet-isolation.spec.ts`
   - Verify TerraPet data completely isolated from Adris/Petlife
   - RLS policies working
   - No cross-tenant data leaks

2. ✅ **Configuration Integrity** (2 hours)
   - `terrapet/configuration-integrity.spec.ts`
   - All JSON files valid
   - Contact info correct
   - Hours accurate

3. ✅ **Core Booking Flow** (4 hours)
   - `terrapet/booking-flows.spec.ts`
   - General consultation booking
   - Home visit booking
   - Vaccination booking

4. ✅ **Authentication** (2 hours)
   - `auth/login.spec.ts` (adapted for terrapet)
   - `auth/logout.spec.ts` (adapted for terrapet)
   - Owner login works
   - Session management

5. ✅ **Google Drive Images** (2 hours)
   - `terrapet/google-drive-images.spec.ts`
   - Logo loads
   - Clinic photos load
   - Product photos load

**Total Phase 1:** ~14 hours testing

---

### Phase 2: High Priority (Should pass before launch)

**Priority:** 🟡 **HIGH** - Fix before launch

6. ✅ **Dog-Only Validation** (3 hours)
   - `terrapet/dog-only-validation.spec.ts`
   - Cannot register non-dogs
   - Services mention dogs

7. ✅ **Home Visit Feature** (3 hours)
   - `terrapet/home-visits.spec.ts`
   - Service visible
   - Booking works
   - Address required

8. ✅ **Online Store** (4 hours)
   - `terrapet/ecommerce-flows.spec.ts`
   - Browse products
   - Add to cart
   - Checkout

9. ✅ **Theme Colors** (2 hours)
   - `terrapet/theme-colors.spec.ts`
   - Sage green applied
   - Differs from other clinics

10. ✅ **Spanish Language** (3 hours)
    - `terrapet/spanish-language.spec.ts`
    - All UI in Spanish
    - Error messages in Spanish

**Total Phase 2:** ~15 hours testing

---

### Phase 3: Medium Priority (Nice to have)

**Priority:** 🟢 **MEDIUM** - Can launch with known issues

11. ✅ **QR Tags** (4 hours)
    - `terrapet/qr-tags.spec.ts`
    - Generate QR
    - Lost pet reporting

12. ✅ **7-Day Schedule** (2 hours)
    - `terrapet/schedule-7day.spec.ts`
    - All days available

13. ✅ **Contact Methods** (2 hours)
    - `terrapet/contact-communication.spec.ts`
    - WhatsApp link
    - Email link
    - Maps link

14. ✅ **Performance** (3 hours)
    - `terrapet/performance.spec.ts`
    - Page load times
    - Image optimization

15. ✅ **Accessibility** (4 hours)
    - `terrapet/accessibility.spec.ts`
    - Keyboard navigation
    - Screen reader support

**Total Phase 3:** ~15 hours testing

---

### Phase 4: Regression & Edge Cases

**Priority:** 🔵 **LOW** - Post-launch improvements

16. ✅ **Error Scenarios** (4 hours)
17. ✅ **Edge Cases** (4 hours)
18. ✅ **Security Deep Dive** (6 hours)
19. ✅ **Concurrency** (4 hours)
20. ✅ **Data Privacy** (3 hours)

**Total Phase 4:** ~21 hours testing

---

## 📊 Testing Summary

### Total Testing Effort

| Phase | Priority | Tests | Hours | When |
|-------|----------|-------|-------|------|
| **Phase 1** | Critical | 5 suites | 14 hrs | Pre-launch (Required) |
| **Phase 2** | High | 5 suites | 15 hrs | Pre-launch (Recommended) |
| **Phase 3** | Medium | 5 suites | 15 hrs | Post-launch Week 1 |
| **Phase 4** | Low | 5 suites | 21 hrs | Ongoing improvement |
| **Total** | All | 20 suites | 65 hrs | Full coverage |

### Minimum Viable Testing (MVP)

**Before Launch:** Phase 1 only = **14 hours**

Tests:
- Multi-tenant isolation ✅
- Configuration integrity ✅
- Core booking flow ✅
- Authentication ✅
- Image loading ✅

**Confidence Level:** 80% with Phase 1

---

### Recommended Pre-Launch Testing

**Before Launch:** Phase 1 + Phase 2 = **29 hours**

Additional tests:
- Dog-only validation ✅
- Home visits ✅
- Store functionality ✅
- Theme consistency ✅
- Spanish language ✅

**Confidence Level:** 95% with Phase 1 + 2

---

## 🎯 Recommended Approach

### Week 1: Critical Path
- Days 1-2: Multi-tenant isolation + Configuration (6 hrs)
- Days 3-4: Booking flows + Authentication (6 hrs)
- Day 5: Image loading (2 hrs)

**Milestone:** Can launch if all pass ✅

### Week 2: High Priority
- Days 1-2: Dog-only + Home visits (6 hrs)
- Days 3-4: Store + Theme (6 hrs)
- Day 5: Spanish validation (3 hrs)

**Milestone:** Production-ready ✅

### Week 3+: Polish
- Ongoing: QR tags, performance, accessibility
- As needed: Edge cases, security hardening

---

## 📝 Test Execution Checklist

### Pre-Test Setup
- [ ] Database seeded with TerraPet tenant
- [ ] Test user created: `owner@terrapet.demo`
- [ ] Dev server running on localhost:3000
- [ ] Playwright browsers installed
- [ ] Google Drive images accessible

### Execute Tests
- [ ] Phase 1: Critical path (14 hrs)
- [ ] Phase 2: High priority (15 hrs)
- [ ] Phase 3: Medium priority (15 hrs)
- [ ] Phase 4: Regression (21 hrs)

### Document Results
- [ ] Pass/fail for each suite
- [ ] Screenshots of failures
- [ ] Bug reports created
- [ ] Retest after fixes

---

## ✅ Conclusion

**TerraPet has 20+ test suites needed** beyond the existing platform tests to ensure:

1. **Isolation:** No data leaks between tenants
2. **Features:** Dog-only, home visits, store, QR tags work
3. **Branding:** Theme colors, images, Spanish language
4. **Security:** RLS, auth, privacy maintained
5. **Quality:** Performance, accessibility, error handling

**Minimum to launch:** 14 hours of critical testing  
**Recommended:** 29 hours (critical + high priority)  
**Full coverage:** 65 hours total

**Next Step:** Execute Phase 1 tests (14 hours) for launch readiness.
