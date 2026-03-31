# Demo Setup Guide - Vete Sales Presentations

This guide explains how to prepare and run successful sales demonstrations of Vete.

## 📋 Quick Start Checklist

### Before Every Demo (5 minutes)

1. **Reset demo data:**
   ```bash
   cd web
   npx tsx scripts/reset-demo-clinic.ts
   ```

2. **Verify demo environment:**
   - Visit `[your-domain]/terapet` 
   - Login with `admin@demo` (no password needed in demo mode)
   - Confirm today's appointments are visible
   - Check low stock alerts are showing

3. **Prepare your setup:**
   - Stable internet connection + backup
   - Screen sharing tested (Zoom/Teams/Meet)
   - Browser in incognito/private mode
   - Second monitor/device for notes (optional)

4. **Review the script:**
   - Open `docs/sales/demo-script-15min.md`
   - Check prospect's specific pain points
   - Prepare personalized examples

---

## 🎭 Demo Environment Details

### Demo Clinic: "Clínica Veterinaria TeraPet"
- **Location:** Avda. Eusebio Ayala 1234, Asunción
- **Phone:** +595 21 123-4567
- **Email:** info@terapet.py

### Demo Users
| Email | Name | Role | Purpose |
|-------|------|------|---------|
| `admin@demo` | Dr. María González | Director | Show admin dashboard, financial overview |
| `vet@demo` | Dr. Carlos Rodríguez | Veterinario | Show clinical workflow, medical records |
| `owner@demo` | Ana Pérez | Cliente | Show customer portal, self-service |

### Demo Pets & Scenarios
| Pet | Type | Scenario |
|-----|------|----------|
| **Max** | Golden Retriever | Vaccination due today (10:30 AM) |
| **Luna** | Siamés | General consultation (11:00 AM) |
| **Rocky** | Pastor Alemán | 🚨 Urgent surgery (2:00 PM) |

### Demo Data Features
- **12 appointments** for "today" (3 urgent marked)
- **2 low stock alerts** (Vacuna Triple, Rimadyl)
- **Gs. 2.400.000** weekly revenue sample
- **Complete medical histories** for all pets
- **Real Paraguay pricing** in Guaraníes

---

## 🛠️ Script Commands

### Initial Setup (Run Once)
```bash
# Install dependencies
cd web
npm install

# Create demo clinic for first time
npx tsx scripts/seed-demo-clinic.ts
```

### Daily Demo Prep (Run Before Each Demo)
```bash
# Reset to fresh demo state
npx tsx scripts/reset-demo-clinic.ts
```

### Advanced Usage
```bash
# Seed only (no cleanup)
npx tsx scripts/seed-demo-clinic.ts

# Check demo data without reset
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('appointments').select('*').eq('tenant_id', 'terapet').then(r => console.log('Appointments:', r.data?.length))
"
```

---

## 🎯 Demo Flow Reference

### Timing Breakdown (15 minutes total)
- **00:00-02:00** Opening & context setting
- **02:00-12:00** Core feature demo (10 min)
  - Dashboard overview (2 min)
  - Intelligent scheduling (2 min) 
  - Digital medical records (2 min)
  - Real-time inventory (1.5 min)
  - Customer portal (1.5 min)
  - Paraguay invoicing (1 min)
- **12:00-15:00** Closing & next steps (3 min)

### Key Demo URLs
| Feature | URL Path | Login |
|---------|----------|-------|
| Admin Dashboard | `/terapet/dashboard` | `admin@demo` |
| Vet Workflow | `/terapet/appointments` | `vet@demo` |
| Customer Portal | `/terapet/portal` | `owner@demo` |
| Inventory Alerts | `/terapet/inventory` | `admin@demo` |

---

## 🎪 Demo Script Highlights

### Opening Hook
> "En estos 15 minutos vamos a ver exactamente cómo Vete soluciona [specific problem they mentioned]"

### Value Props to Emphasize
- ✅ **2 horas/día ahorradas** en trabajo administrativo
- ✅ **Errores de facturación = cero** (IVA automático) 
- ✅ **Clientes satisfechos** (portal 24/7)
- ✅ **Nunca sin medicamentos** (alertas automáticas)
- ✅ **Datos reales** para decisiones

### Pricing Closer
> "Gs. 350.000/mes son Gs. 11.600/día. El tiempo que ahorra su secretaria vale más que eso."

---

## 🚨 Troubleshooting

### Common Issues

**"Demo data looks old/incorrect"**
```bash
# Solution: Reset demo data
npx tsx scripts/reset-demo-clinic.ts
```

**"Cannot access /terapet"**
- Check if tenant was created correctly
- Verify database connection
- Check app is running on correct domain

**"Login doesn't work"**
- Demo accounts bypass normal auth
- Try incognito/private mode
- Clear browser cache if needed

**"Appointments not showing today"**
- Demo creates appointments for "today" dynamically
- If running late at night, may show tomorrow
- Reset demo data to refresh dates

### Database Issues

**"Foreign key constraint errors"**
```bash
# Solution: Manual cleanup then reset
psql $DATABASE_URL -c "DELETE FROM appointments WHERE tenant_id = 'terapet';"
psql $DATABASE_URL -c "DELETE FROM pets WHERE tenant_id = 'terapet';"
# ... then run reset script
```

**"Permission denied errors"**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check key has admin/bypass RLS permissions
- Confirm key matches your Supabase project

---

## 📊 Success Metrics

### During Demo - Look For:
- ✅ **Active questions** about specific features
- ✅ **Time requests** ("When could we start?")
- ✅ **Reference requests** ("Can we talk to other clinics?")
- ✅ **Technical questions** (shows serious interest)

### Red Flags:
- ❌ **Complete silence** during demo
- ❌ **Only price questions** (not features)
- ❌ **"We'll think about it"** without next steps
- ❌ **Decision maker not present**

### Follow-up Triggers:
- **Same day:** If they say yes to trial
- **24 hours:** If they need time to decide  
- **1 week:** If they declined (soft follow-up)

---

## 📈 Continuous Improvement

### After Each Demo:
1. **Record outcome** in prospect tracker
2. **Note questions** they asked (FAQ improvement)
3. **Time each section** (optimize pacing)
4. **Update script** based on what resonated

### Monthly Review:
- **Conversion rate** by demo script version
- **Most common objections** and responses
- **Feature requests** from prospects
- **Demo data improvements** needed

---

## 🔗 Related Files

- 📖 **Demo Script:** `docs/sales/demo-script-15min.md`
- 🎬 **Demo Data:** `scripts/seed-demo-clinic.ts`
- 🔄 **Reset Script:** `scripts/reset-demo-clinic.ts`
- 📧 **Email Templates:** `docs/sales/email-pitch-template.md`
- 💰 **Pricing Info:** Work coordination epic v005-go-to-market/s006-pricing

---

*Last updated: 2026-02-08*
*Created by: Erebus 🔥*
*For: Vete Sales Team*