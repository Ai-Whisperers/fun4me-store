# Image Optimization Configuration

This document outlines the image CDN and optimization settings for the Vete platform.

## Current Setup

### File Size Limits

All file size limits are centrally defined in `lib/constants/index.ts`:

- **Logo uploads**: 2MB (`MAX_LOGO_SIZE`)
- **Pet photos**: 5MB (`MAX_IMAGE_SIZE`)
- **Pet documents**: 20MB (`MAX_PET_DOCUMENT_SIZE`)
- **Message attachments**: 10MB (`MAX_ATTACHMENT_SIZE`)
- **Prescription uploads**: 5MB (`MAX_PRESCRIPTION_SIZE`)
- **Import files**: 5MB (`MAX_IMPORT_FILE_SIZE`)

### Allowed File Types

- **Images**: JPEG, PNG, WebP, GIF
- **Documents**: PDF, DOC/DOCX, XLS/XLSX
- **Text**: TXT

### Content Security Policy (CSP)

The following domains are whitelisted for image sources:

#### Core Infrastructure
- `*.supabase.co` - Main storage backend
- `*.tile.openstreetmap.org` - Map tiles
- `unpkg.com` - CDN for libraries (Leaflet markers)

#### Veterinary Product Suppliers
- `purina.com.py`, `www.purina.com.py` - Purina products
- `http2.mlstatic.com` - MercadoLibre products
- `cdn.awsli.com.br` - AWS CDN for Brazilian suppliers
- `s.turbifycdn.com` - Entirely Pets product images
- `www.idexx.com` - IDEXX test kits
- `www.ferplast.com` - Pet accessories
- `www.pedigree.com.mx` - Pedigree products
- `acdn-us.mitiendanube.com` - TiendaNube marketplace
- `koniglab.com` - König lab products
- `www.farmina.com` - Farmina pet food

#### Development & Placeholders
- `placehold.co` - Placeholder images
- `images.pexels.com` - Stock photos

### Next.js Image Optimization

- **Formats**: AVIF, WebP (with JPEG fallback)
- **Device sizes**: 640px, 750px, 828px, 1080px, 1200px, 1920px
- **Image sizes**: 16px - 384px (for thumbnails/icons)
- **Cache TTL**: 30 days for optimized images
- **SVG handling**: Disabled for security (prevents XSS)

### Supabase Storage Configuration

- **Public bucket**: `public` 
- **Logo storage**: `logos/pending/{slug}_{timestamp}_{id}.{ext}`
- **Pet photos**: `pets/{owner_id}/{pet_id}/{filename}`
- **Documents**: Organized by entity type and tenant

## Security Features

1. **File extension whitelist**: Prevents dangerous file types
2. **MIME type validation**: Double validation with extension check
3. **CSP enforcement**: Only approved domains can load images
4. **SVG disabled**: Prevents potential XSS attacks via SVG files
5. **Rate limiting**: Upload endpoints have rate limits per IP

## Performance Optimizations

1. **Automatic WebP/AVIF**: Modern formats with fallbacks
2. **Responsive images**: Multiple sizes generated automatically
3. **Lazy loading**: Images load when needed (Next.js default)
4. **CDN caching**: 30-day cache for optimized images
5. **Size limits**: Prevent oversized uploads from affecting performance

## Monitoring

Images are served through Next.js optimization API which provides:
- Automatic format selection based on browser support
- Quality optimization based on network conditions
- Built-in caching and CDN integration (when deployed)

## Future Improvements

Consider implementing:
- **Supabase image transformations**: On-the-fly resizing/optimization
- **Progressive loading**: Base64 placeholders for better UX
- **Image compression**: Client-side compression before upload
- **Format detection**: Automatic conversion of uploaded images