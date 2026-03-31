# Adding a New Clinic

Step-by-step guide to onboard a new veterinary clinic to the Vete platform.

## Prerequisites

- Access to the codebase
- Supabase dashboard access
- Clinic information (name, contact, branding)

---

## Step 1: Create Content Directory

```bash
# Navigate to content directory
cd web/.content_data

# Copy template
cp -r _TEMPLATE newclinic
```

This creates:
```
.content_data/newclinic/
├── config.json
├── theme.json
├── home.json
├── services.json
├── about.json
├── faq.json
├── testimonials.json
└── legal.json
```

---

## Step 2: Configure Clinic Settings

Edit `.content_data/newclinic/config.json`:

```json
{
  "id": "newclinic",
  "name": "Nueva Veterinaria",
  "tagline": "Cuidando a tus mascotas",

  "contact": {
    "whatsapp_number": "595981123456",
    "phone_display": "+595 981 123 456",
    "email": "contacto@nuevaveterinaria.com.py",
    "address": "Av. España 1234, Asunción",
    "google_maps_id": "ChIJ..."
  },

  "settings": {
    "currency": "PYG",
    "timezone": "America/Asuncion",
    "emergency_24h": true,
    "modules": {
      "toxic_checker": true,
      "age_calculator": true,
      "booking": true,
      "store": true,
      "loyalty": true
    }
  },

  "branding": {
    "logo_url": "/clinics/newclinic/logo.png",
    "logo_width": 150,
    "favicon_url": "/clinics/newclinic/favicon.ico",
    "hero_image_url": "/clinics/newclinic/hero.jpg",
    "og_image_url": "/clinics/newclinic/og-image.jpg"
  },

  "social": {
    "facebook": "https://facebook.com/nuevaveterinaria",
    "instagram": "https://instagram.com/nuevaveterinaria"
  }
}
```

---

## Step 3: Configure Theme

Edit `.content_data/newclinic/theme.json`:

```json
{
  "colors": {
    "primary": {
      "main": "#2563EB",
      "light": "#3B82F6",
      "dark": "#1D4ED8"
    },
    "secondary": {
      "main": "#10B981",
      "light": "#34D399",
      "dark": "#059669"
    },
    "background": {
      "default": "#F9FAFB",
      "paper": "#FFFFFF"
    },
    "text": {
      "primary": "#111827",
      "secondary": "#6B7280"
    }
  },
  "gradients": {
    "primary": "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
    "hero": "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)"
  },
  "fonts": {
    "heading": "Poppins",
    "body": "Inter"
  },
  "borderRadius": {
    "small": "4px",
    "medium": "8px",
    "large": "16px"
  }
}
```

---

## Step 4: Add Homepage Content

Edit `.content_data/newclinic/home.json`:

```json
{
  "hero": {
    "title": "Bienvenidos a Nueva Veterinaria",
    "subtitle": "Atención veterinaria de calidad para tu mejor amigo",
    "cta_primary": {
      "text": "Agendar Cita",
      "link": "/newclinic/book"
    },
    "cta_secondary": {
      "text": "Nuestros Servicios",
      "link": "/newclinic/services"
    }
  },
  "features": [
    {
      "icon": "Stethoscope",
      "title": "Consultas",
      "description": "Atención personalizada"
    },
    {
      "icon": "Syringe",
      "title": "Vacunación",
      "description": "Esquema completo"
    },
    {
      "icon": "Clock",
      "title": "Emergencias 24h",
      "description": "Siempre disponibles"
    }
  ],
  "testimonials_section": {
    "title": "Lo que dicen nuestros clientes",
    "show_count": 3
  }
}
```

---

## Step 5: Add Services

Edit `.content_data/newclinic/services.json`:

```json
{
  "categories": [
    {
      "id": "consultation",
      "name": "Consultas",
      "icon": "Stethoscope"
    },
    {
      "id": "vaccination",
      "name": "Vacunación",
      "icon": "Syringe"
    },
    {
      "id": "surgery",
      "name": "Cirugía",
      "icon": "Scissors"
    }
  ],
  "services": [
    {
      "id": "general-consultation",
      "name": "Consulta General",
      "description": "Examen clínico completo",
      "category": "consultation",
      "price": 150000,
      "duration": 30
    },
    {
      "id": "vaccine-rabies",
      "name": "Vacuna Antirrábica",
      "description": "Protección contra la rabia",
      "category": "vaccination",
      "price": 80000,
      "duration": 15
    }
  ]
}
```

---

## Step 6: Add Static Assets

Place clinic images in `public/clinics/newclinic/`:

```
public/clinics/newclinic/
├── logo.png          # Clinic logo (transparent PNG)
├── logo-white.png    # White version for dark backgrounds
├── favicon.ico       # Browser favicon
├── hero.jpg          # Homepage hero image
├── og-image.jpg      # Social sharing image (1200x630)
└── team/
    ├── vet1.jpg      # Team member photos
    └── vet2.jpg
```

---

## Step 7: Add Tenant to Database

In Supabase SQL Editor:

```sql
-- Add tenant record
INSERT INTO tenants (id, name, created_at)
VALUES ('newclinic', 'Nueva Veterinaria', NOW());

-- Optionally add initial admin user
INSERT INTO clinic_invites (tenant_id, email, role)
VALUES ('newclinic', 'admin@nuevaveterinaria.com.py', 'admin');
```

---

## Step 8: Test Locally

```bash
# Restart dev server
npm run dev

# Access new clinic
open http://localhost:3000/newclinic
```

### Verification Checklist

- [ ] Homepage loads with correct branding
- [ ] Theme colors applied correctly
- [ ] Services display properly
- [ ] About page shows team
- [ ] Booking flow works
- [ ] Portal login accessible

---

## Step 9: Deploy

```bash
# Build to verify no errors
npm run build

# Deploy (Vercel)
vercel --prod
```

The new clinic pages are automatically generated via `generateStaticParams()`.

---

## Troubleshooting

### Clinic not appearing

1. Check slug matches directory name
2. Verify `config.json` has correct `id`
3. Ensure directory doesn't start with `_`

### Theme not applying

1. Check `theme.json` syntax
2. Clear browser cache
3. Restart dev server

### Images not loading

1. Check file paths in `config.json`
2. Verify files exist in `public/clinics/`
3. Check file permissions

### Database errors

1. Verify tenant exists in `tenants` table
2. Check RLS policies include new tenant
3. Review Supabase logs

---

## Content Files Reference

| File | Purpose |
|------|---------|
| `config.json` | Clinic settings, contact, modules |
| `theme.json` | Colors, fonts, gradients |
| `home.json` | Homepage content |
| `services.json` | Service catalog |
| `about.json` | About page, team |
| `faq.json` | Frequently asked questions |
| `testimonials.json` | Customer reviews |
| `legal.json` | Privacy policy, terms |

---

## Related Documentation

- [JSON-CMS System](../architecture/json-cms.md)
- [Theming Guide](../architecture/theming.md)
- [Multi-Tenancy](../architecture/multi-tenancy.md)
