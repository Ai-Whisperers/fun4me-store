# Terra Pet - Configuration Update Summary

## ✅ Completed Updates

### 1. **Clinic Information** (`web/.content_data/adris/config.json`)
- **Name**: Changed from "Veterinaria Adris" to "Terra Pet"
- **Tagline**: Updated to "Para Nosotros, Ellos Son Familia" (For us, they are family)
- **Phone/WhatsApp**: +595 981 673 6670
- **Email**: contacto@terrapet.com.py (placeholder - verify actual email)
- **Location**: Fernando de la Mora, Paraguay
- **Business Hours**: 
  - Monday-Sunday: 08:00 - 20:00
  - 24/7 Emergency Service Available

### 2. **Social Media Links**
- **Instagram**: https://instagram.com/terrapetpy
- **Facebook**: https://facebook.com/Terra.Pet.Py

### 3. **Services Confirmed**
Based on their Facebook posts, Terra Pet offers:
- ✅ 24-hour emergency service
- ✅ General consultations
- ✅ Vaccinations
- ✅ Surgeries
- ✅ Laboratory and clinical analysis
- ✅ Dentistry (odontología)
- ✅ Ultrasounds (ecografías)
- ✅ X-rays (rayos X)
- ✅ Home visits (visitas a domicilio)

---

## 🔴 PENDING: Logo & Branding Assets

### Required Steps:

#### 1. **Download Logo from Social Media**
Visit their Instagram or Facebook page and save their logo:
- Instagram: https://instagram.com/terrapetpy
- Facebook: https://facebook.com/Terra.Pet.Py

#### 2. **Prepare Logo Files**
You need to create the following files:

| File | Specifications | Purpose |
|------|---------------|---------|
| `logo.png` | Transparent PNG, ~150x56px | Main logo (light backgrounds) |
| `logo-dark.png` | Transparent PNG, ~150x56px | Dark mode logo |
| `favicon.ico` | 16x16, 32x32, 48x48 | Browser tab icon |
| `apple-touch-icon.png` | 180x180px | iOS home screen icon |
| `og-image.jpg` | 1200x630px | Social media preview |

#### 3. **Replace Files in Directory**
Copy the prepared files to:
```
web/public/branding/adris/images/
```

Replace these files:
- `logo.png`
- `logo-dark.png`
- `favicon.ico`
- `apple-touch-icon.png`
- `og-image.jpg` (can be their logo + tagline)

#### 4. **Hero Images (Optional)**
Consider updating these with Terra Pet's actual clinic photos:
- `hero-bg.jpg` - Main homepage hero background
- `about-hero.jpg` - About page hero
- `services-hero.jpg` - Services page hero
- `store-hero.jpg` - Store page hero

---

## 📝 To Verify

### Contact Information
- **Email**: `contacto@terrapet.com.py` - **Verify this is correct**
- **Address**: Currently shows "Fernando de la Mora" - **Get full street address**
- **Google Maps**: Current coordinates may not be accurate - **Update with correct location**

### Business Hours
- Current config shows 08:00 - 20:00 daily
- **Verify actual business hours** for regular services
- 24/7 emergency service is confirmed

### Service Areas
The config currently lists delivery zones:
- Santa Teresa
- Villa Morra
- Carmelitas
- Manorá

**Action**: Verify if these zones are correct for Terra Pet's service area in Fernando de la Mora.

---

## 🎨 Brand Colors (Optional Update)

Current theme uses:
- **Primary Green**: #2F5233 (forest green)
- **Secondary Yellow**: #F0C808 (gold/yellow)

**Recommendation**: 
1. Check Terra Pet's actual brand colors from their logo/social media
2. If different, update `web/.content_data/adris/theme.json`

---

## 🚀 Next Steps

1. **Immediate**:
   - [ ] Download Terra Pet logo from Instagram/Facebook
   - [ ] Create required logo variants (PNG, ICO)
   - [ ] Replace files in `web/public/branding/adris/images/`

2. **High Priority**:
   - [ ] Verify email address
   - [ ] Get complete street address
   - [ ] Update Google Maps coordinates
   - [ ] Confirm business hours

3. **Nice to Have**:
   - [ ] Get actual clinic photos for hero images
   - [ ] Extract and apply brand colors if different
   - [ ] Update service area zones

---

## 📞 Terra Pet Contact Info

**Official Social Media**:
- Instagram: [@terrapetpy](https://instagram.com/terrapetpy)
- Facebook: [Terra.Pet.Py](https://facebook.com/Terra.Pet.Py)
- Facebook Alt: [ClinicaTerrapet](https://facebook.com/ClinicaTerrapet)

**Phone/WhatsApp**: +595 981 673 6670

---

## 🔧 Technical Details

**Files Modified**:
- `web/.content_data/adris/config.json`

**Files to Update Manually**:
- All images in `web/public/branding/adris/images/`

**No Code Changes Required**: The system uses the config.json data automatically.

---

_Updated: January 21, 2026_
