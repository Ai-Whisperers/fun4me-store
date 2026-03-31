# Add New Clinic Tenant

Guide for adding a new veterinary clinic to the multi-tenant platform.

## Steps

### 1. Create Content Directory

Create new folder in `.content_data/[clinic-slug]/` with these files:

- `config.json` - Clinic settings
- `theme.json` - Brand colors
- `home.json` - Homepage content
- `services.json` - Services catalog
- `about.json` - About page
- `faq.json` - FAQ section
- `testimonials.json` - Customer reviews
- `legal.json` - Legal pages

### 2. Customize config.json

```json
{
  "id": "clinic-slug",
  "name": "Clinic Name",
  "contact": {
    "whatsapp_number": "+595...",
    "phone_display": "(021) XXX-XXXX",
    "email": "info@clinic.com",
    "address": "Street Address, City",
    "google_maps_id": "..."
  },
  "settings": {
    "currency": "PYG",
    "emergency_24h": true,
    "modules": {
      "toxic_checker": true,
      "age_calculator": true,
      "booking": true,
      "store": false
    }
  },
  "branding": {
    "logo_url": "/clinics/[slug]/logo.png",
    "hero_image_url": "/clinics/[slug]/hero.jpg",
    "favicon_url": "/clinics/[slug]/favicon.ico"
  }
}
```

### 3. Customize theme.json

```json
{
  "colors": {
    "primary": { "main": "#2563eb", "light": "#3b82f6", "dark": "#1d4ed8", "contrast": "#ffffff" },
    "secondary": { "main": "#10b981", "light": "#34d399", "dark": "#059669", "contrast": "#ffffff" },
    "background": { "default": "#f8fafc", "paper": "#ffffff", "muted": "#f1f5f9" },
    "text": { "primary": "#0f172a", "secondary": "#475569", "muted": "#94a3b8" }
  },
  "fonts": {
    "heading": "Inter, sans-serif",
    "body": "Inter, sans-serif"
  }
}
```

### 4. Add Database Tenant Record

```sql
INSERT INTO tenants (slug, name, settings)
VALUES ('clinic-slug', 'Clinic Name', '{"currency": "PYG"}');
```

### 5. Add Static Assets

Place in `web/public/clinics/[slug]/`:
- `logo.png`
- `hero.jpg`
- `favicon.ico`
- Any other clinic-specific images

### 6. Verify

1. Run `npm run dev`
2. Visit `http://localhost:3000/[clinic-slug]`
3. Test all enabled modules
4. Check responsive design
5. Verify theme colors applied correctly

## Checklist

- [ ] Content directory created with all JSON files
- [ ] Config customized with correct contact info
- [ ] Theme colors match clinic branding
- [ ] Static assets uploaded
- [ ] Tenant record in database
- [ ] All pages render correctly
- [ ] Mobile responsive
- [ ] WhatsApp links work
