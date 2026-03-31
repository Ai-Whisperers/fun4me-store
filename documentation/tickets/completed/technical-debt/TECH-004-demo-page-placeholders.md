# TECH-004: Demo Page Placeholder Content

## Priority: P3 (Low)
## Category: Technical Debt
## Status: COMPLETED

## Description
The marketing demo page contains placeholder content marked as "coming soon" that should either be implemented or removed.

## Current State
### Placeholders Found
**`app/demo/page.tsx`**

**Line 61-64 - Video Section:**
```tsx
<div className="video-placeholder">
  <p>Video próximamente</p>
  {/* Empty video demo section */}
</div>
```

**Line 152-160 - Calendar Section:**
```tsx
<div className="calendar-section">
  <h3>Calendario de reservas</h3>
  <p>Próximamente</p>
  <p className="text-sm text-gray-500">
    Por ahora, contacta por WhatsApp para reservar
  </p>
</div>
```

### Business Impact
- Unprofessional appearance for prospective customers
- "Coming soon" content reduces credibility
- Visitors may think product is incomplete
- WhatsApp fallback feels like workaround

## Proposed Solutions

### Option A: Implement Features
1. **Video Demo**: Record and embed product demo video
2. **Calendar Widget**: Embed simplified booking calendar

### Option B: Remove Placeholders
If features aren't planned soon, remove the sections entirely rather than showing "coming soon".

### Option C: Improve Messaging
If keeping placeholders, make them feel intentional:
```tsx
<div className="calendar-section bg-primary-light rounded-lg p-6">
  <h3>Reservas Personalizadas</h3>
  <p>Agenda tu cita de forma personalizada</p>
  <Button onClick={() => openWhatsApp()}>
    <WhatsAppIcon /> Reservar por WhatsApp
  </Button>
</div>
```

## Recommended Approach

### 1. Video Section
Either:
- Record a 2-minute product demo video
- Or replace with animated screenshots/GIF
- Or show feature carousel with real screenshots

```tsx
// Option: Feature carousel
<div className="feature-showcase">
  <Carousel autoPlay interval={5000}>
    <CarouselItem>
      <Image src="/demo/dashboard.png" alt="Dashboard" />
      <p>Panel de control intuitivo</p>
    </CarouselItem>
    <CarouselItem>
      <Image src="/demo/appointments.png" alt="Citas" />
      <p>Gestión de citas simplificada</p>
    </CarouselItem>
    {/* ... more features */}
  </Carousel>
</div>
```

### 2. Calendar Section
Either:
- Embed actual booking widget (simplified version)
- Or show sample calendar with fake data
- Or make WhatsApp CTA more prominent

```tsx
// Option: Sample calendar
<div className="calendar-preview">
  <h3>Agenda Online 24/7</h3>
  <div className="calendar-mock" aria-hidden="true">
    <CalendarPreview
      month={new Date()}
      availableSlots={sampleSlots}
    />
  </div>
  <Button href="/adris/book">
    Ver disponibilidad real →
  </Button>
</div>
```

## Implementation Steps
1. Decide on approach (implement vs remove vs improve)
2. If implementing video:
   - Script and record demo
   - Host on YouTube/Vimeo
   - Embed with lazy loading
3. If implementing calendar:
   - Create CalendarPreview component
   - Generate sample availability data
   - Link to actual booking flow
4. If removing:
   - Delete placeholder sections
   - Adjust page layout
5. Update mobile responsiveness

## Acceptance Criteria
- [ ] No "próximamente" text visible
- [ ] All sections have real content or are removed
- [ ] Page looks professional and complete
- [ ] Mobile-responsive
- [ ] Performance optimized (lazy load media)

## Related Files
- `web/app/demo/page.tsx`
- `web/components/demo/CalendarPreview.tsx` (new, if implementing)
- `web/components/demo/FeatureCarousel.tsx` (new, if implementing)

## Estimated Effort
- **Option A (Implement)**: 8-12 hours
  - Video recording/editing: 4-6 hours
  - Calendar widget: 4-6 hours
- **Option B (Remove)**: 1 hour
- **Option C (Improve messaging)**: 2 hours

**Recommended: Option C** - Quick win with better UX

---
*Ticket created: January 2026*
*Based on codebase analysis*
