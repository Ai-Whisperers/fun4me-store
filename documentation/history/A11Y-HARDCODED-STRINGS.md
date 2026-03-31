# A11Y-005: Hardcoded Spanish Text Documentation

This document lists all hardcoded Spanish strings that should be moved to `config.ui_labels` for proper i18n support.

## Files with Hardcoded Strings

### 1. `web/components/appointments/appointment-list.tsx`

**Current hardcoded strings:**
- Line 48: `'Próximas'` - Tab label for upcoming appointments
- Line 49: `'Anteriores'` - Tab label for past appointments
- Line 111: `'No tienes citas programadas'` - Empty state heading
- Line 114: `'Agenda una cita para tu mascota y la verás aquí.'` - Empty state description
- Line 121: `'Agendar Cita'` - Book appointment button
- Line 133: `'Sin historial de citas'` - Empty state heading for past
- Line 136: `'Aquí aparecerán tus citas pasadas y canceladas.'` - Empty state description for past

**Recommended config structure:**
```json
{
  "ui_labels": {
    "appointments": {
      "tabs": {
        "upcoming": "Próximas",
        "past": "Anteriores"
      },
      "empty_state": {
        "upcoming": {
          "title": "No tienes citas programadas",
          "description": "Agenda una cita para tu mascota y la verás aquí.",
          "button": "Agendar Cita"
        },
        "past": {
          "title": "Sin historial de citas",
          "description": "Aquí aparecerán tus citas pasadas y canceladas."
        }
      }
    }
  }
}
```

---

### 2. `web/components/layout/main-nav.tsx`

**Current hardcoded strings:**
- Line 159: `'Inventario'` - Inventory nav item
- Line 330: `'Navegación'` - Mobile menu section heading
- Line 352: `'Mi Cuenta'` - Mobile menu section heading
- Line 390: `'Configuración'` - Settings link
- Line 404: `'Cerrar sesión'` - Logout button
- Line 319: `'Cerrar menú'` - Close menu aria-label
- Line 319: `'Abrir menú'` - Open menu aria-label

**Recommended config structure:**
```json
{
  "ui_labels": {
    "nav": {
      "inventory": "Inventario",
      "settings": "Configuración",
      "logout": "Cerrar sesión",
      "mobile_menu": {
        "navigation_heading": "Navegación",
        "account_heading": "Mi Cuenta",
        "open": "Abrir menú",
        "close": "Cerrar menú"
      }
    }
  }
}
```

---

### 3. `web/components/dashboard/appointments/appointment-queue.tsx`

**Current hardcoded strings:**
- Line 61: `'En Consulta'` - In progress section heading
- Line 77: `'Cola de Espera'` - Checked in section heading
- Line 93: `'Próximas Citas'` - Waiting section heading
- Line 109: `'Finalizadas'` - Completed section heading
- Line 62: `'citas en consulta'` - Screen reader label for count
- Line 78: `'citas en espera'` - Screen reader label for count
- Line 94: `'citas próximas'` - Screen reader label for count
- Line 110: `'citas finalizadas'` - Screen reader label for count
- Line 177: `'Sin nombre'` - Default pet name
- Line 180: `'Propietario desconocido'` - Default owner name

**Recommended config structure:**
```json
{
  "ui_labels": {
    "dashboard": {
      "appointment_queue": {
        "sections": {
          "in_progress": "En Consulta",
          "checked_in": "Cola de Espera",
          "waiting": "Próximas Citas",
          "completed": "Finalizadas"
        },
        "aria_labels": {
          "in_progress_count": "citas en consulta",
          "checked_in_count": "citas en espera",
          "waiting_count": "citas próximas",
          "completed_count": "citas finalizadas"
        },
        "defaults": {
          "pet_name": "Sin nombre",
          "owner_name": "Propietario desconocido"
        }
      }
    }
  }
}
```

---

### 4. Additional Files to Review

The following files may also contain hardcoded strings that should be moved to config:

- `web/components/consents/blanket-consents.tsx`
- `web/components/consents/signing-form.tsx`
- `web/components/invoices/invoice-pdf.tsx`
- `web/components/lab/result-entry.tsx`
- `web/components/messaging/new-conversation-dialog.tsx`
- `web/components/store/search-autocomplete.tsx`

These files were not audited in this pass but should be reviewed for i18n compliance.

---

## Implementation Plan

1. **Update JSON schema** in `_TEMPLATE/config.json` to include all new ui_labels sections
2. **Update all clinic configs** (adris, petlife) with Spanish translations
3. **Refactor components** to use `config.ui_labels` instead of hardcoded strings
4. **Add TypeScript types** for the new ui_labels structure
5. **Test** all components to ensure labels render correctly

---

## Notes

- All ARIA labels and screen reader text must also be configurable
- Consider adding English translations for potential future multi-language support
- Some strings (like "Navegación" and "Mi Cuenta") may be candidates for global ui_labels rather than component-specific ones
