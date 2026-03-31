# SEO Testing Checklist

Use this checklist to verify the SEO implementation is working correctly.

## Pre-Deployment Testing

### 1. Build Verification

```bash
cd web
npm run build
```

- [ ] Build completes without errors
- [ ] No metadata-related warnings
- [ ] Static pages generated successfully

### 2. Local Testing

```bash
npm run dev
```

Visit each page type and verify:

- [ ] Homepage loads with proper title
- [ ] Service pages show correct metadata
- [ ] Product pages have unique titles
- [ ] Tool pages render properly

### 3. View Source

Right-click on each page type → View Page Source

#### Check for Meta Tags

- [ ] `<title>` present and unique
- [ ] `<meta name="description">` present
- [ ] `<link rel="canonical">` correct URL
- [ ] `<meta property="og:*">` tags present
- [ ] `<meta name="twitter:*">` tags present

#### Check for Structured Data

- [ ] `<script type="application/ld+json">` present
- [ ] JSON is valid (no syntax errors)
- [ ] Clinic name appears correctly
- [ ] URLs are absolute (not relative)

### 4. Structured Data Validation

Visit: https://validator.schema.org/

Test these URLs:

- [ ] Homepage: `https://Vetic.vercel.app/adris`
- [ ] Services: `https://Vetic.vercel.app/adris/services`
- [ ] About: `https://Vetic.vercel.app/adris/about`
- [ ] Store: `https://Vetic.vercel.app/adris/store`

Look for:

- [ ] No errors
- [ ] All required properties present
- [ ] Proper schema type recognition

### 5. Rich Results Test

Visit: https://search.google.com/test/rich-results

Test the same URLs:

- [ ] No critical errors
- [ ] Rich results eligible (if applicable)
- [ ] Mobile-friendly
- [ ] Valid structured data

## Post-Deployment Testing

### 6. OpenGraph Testing

Visit: https://developers.facebook.com/tools/debug/

Test URLs:

- [ ] Correct title appears
- [ ] Description shows properly
- [ ] Image loads (1200x630)
- [ ] No warnings or errors

Steps:

1. Enter URL
2. Click "Scrape Again"
3. Check preview
4. Verify all OG tags

### 7. Twitter Card Testing

Visit: https://cards-dev.twitter.com/validator

Test URLs:

- [ ] Card type: summary_large_image
- [ ] Image displays correctly
- [ ] Title is compelling
- [ ] Description is clear

### 8. Google Search Console

After deployment, in Search Console:

#### Coverage

- [ ] All pages indexed
- [ ] No "noindex" errors
- [ ] Valid sitemap submitted

#### Enhancements

- [ ] Structured data types recognized
- [ ] No enhancement errors
- [ ] Rich results eligible

#### Performance

- [ ] Pages appearing in search
- [ ] Click-through rate tracked
- [ ] Impressions increasing

### 9. Mobile Testing

Use Chrome DevTools (F12 → Device Toolbar):

- [ ] Mobile viewport renders correctly
- [ ] Touch targets adequate size
- [ ] Text readable without zoom
- [ ] Images responsive

Or use: https://search.google.com/test/mobile-friendly

### 10. Page Speed

Visit: https://pagespeed.web.dev/

Test key pages:

- [ ] Performance score > 90
- [ ] FCP < 1.8s (First Contentful Paint)
- [ ] LCP < 2.5s (Largest Contentful Paint)
- [ ] CLS < 0.1 (Cumulative Layout Shift)

## Manual Checks

### 11. Title Tags

For each page type, verify:

- [ ] Under 60 characters
- [ ] Includes clinic name
- [ ] Descriptive and unique
- [ ] No keyword stuffing

### 12. Meta Descriptions

For each page type, verify:

- [ ] 150-160 characters
- [ ] Includes call-to-action
- [ ] Compelling and unique
- [ ] Natural keyword usage

### 13. Canonical URLs

For each page, verify:

- [ ] Points to correct URL
- [ ] Uses absolute URLs
- [ ] No trailing slash inconsistencies
- [ ] Matches actual page URL

### 14. Structured Data by Page Type

#### Homepage

- [ ] VeterinaryCare schema present
- [ ] Contact info correct
- [ ] Opening hours accurate
- [ ] Social links working

#### Services Page

- [ ] Service list visible
- [ ] Breadcrumbs correct

#### Service Detail

- [ ] ServiceSchema present
- [ ] Price displayed (if applicable)
- [ ] Duration shown
- [ ] Provider info correct

#### Product Page

- [ ] ProductSchema present
- [ ] SKU included
- [ ] Price correct
- [ ] Availability status accurate
- [ ] Ratings (if available)

#### About Page

- [ ] TeamSchema present
- [ ] All team members included
- [ ] Roles accurate
- [ ] Breadcrumbs correct

#### Tools Pages

- [ ] HowToSchema present
- [ ] WebApplicationSchema present
- [ ] Steps clear and accurate
- [ ] Breadcrumbs correct

#### FAQ Page

- [ ] FAQSchema present
- [ ] Questions and answers matched
- [ ] All FAQs included

## Browser Testing

Test in multiple browsers:

### Chrome

- [ ] Metadata loads correctly
- [ ] No console errors
- [ ] Structured data parses

### Firefox

- [ ] Same as Chrome

### Safari

- [ ] Same as Chrome

### Mobile Safari (iOS)

- [ ] Apple touch icon appears
- [ ] Meta tags work correctly

### Chrome Mobile (Android)

- [ ] Same as desktop

## Search Engine Testing

### Google (After Indexing)

Search: `site:Vetic.vercel.app/adris`

- [ ] Pages appear in results
- [ ] Titles look good
- [ ] Descriptions compelling
- [ ] Rich results showing (if eligible)

### Google Images

- [ ] Clinic logo appears
- [ ] Product images indexed
- [ ] Alt text working

## Social Media Testing

### Share on Facebook

- [ ] Preview shows correct image
- [ ] Title is compelling
- [ ] Description is clear
- [ ] No broken images

### Share on Twitter

- [ ] Card renders correctly
- [ ] Image displays
- [ ] Text not cut off

### Share on WhatsApp

- [ ] Link preview works
- [ ] Image shows
- [ ] Title and description present

## Analytics Setup

### Google Analytics

- [ ] Tracking code installed
- [ ] Events firing
- [ ] Page views tracked
- [ ] Organic traffic visible

### Google Search Console

- [ ] Property verified
- [ ] Sitemap submitted
- [ ] Coverage reports working
- [ ] Performance data available

## Issues Checklist

If you find issues, check:

### Title Not Showing

- [ ] Check `generateMetadata` function exists
- [ ] Verify `title` property is set
- [ ] Check for async/await issues
- [ ] Ensure clinic data loads

### Description Missing

- [ ] Check `description` in metadata
- [ ] Verify length (150-160 chars)
- [ ] Check for special characters

### Image Not Loading

- [ ] Verify image URL is absolute
- [ ] Check image exists
- [ ] Ensure 1200x630 dimensions
- [ ] Check CORS headers

### Structured Data Errors

- [ ] Validate JSON syntax
- [ ] Check required properties
- [ ] Verify schema type
- [ ] Ensure URLs are absolute

### Canonical Issues

- [ ] Check BASE_URL env variable
- [ ] Verify no trailing slashes
- [ ] Ensure HTTPS
- [ ] Check for duplicates

## Regression Testing

After any changes:

- [ ] Re-run build
- [ ] Check key pages
- [ ] Validate structured data
- [ ] Test social sharing
- [ ] Verify mobile rendering

## Performance Monitoring

Weekly checks:

- [ ] Search Console for errors
- [ ] Analytics for traffic trends
- [ ] PageSpeed scores
- [ ] Core Web Vitals
- [ ] Broken link checks

## Documentation Review

Ensure docs are current:

- [ ] metadata-usage-guide.md
- [ ] SEO_IMPLEMENTATION_SUMMARY.md
- [ ] FINAL_SEO_REPORT.md
- [ ] This checklist

---

## Quick Test URLs

Replace `{clinic}` with actual clinic slug (e.g., `adris`):

```
Homepage:         https://Vetic.vercel.app/{clinic}
Services:         https://Vetic.vercel.app/{clinic}/services
About:            https://Vetic.vercel.app/{clinic}/about
Store:            https://Vetic.vercel.app/{clinic}/store
Book:             https://Vetic.vercel.app/{clinic}/book
Age Calculator:   https://Vetic.vercel.app/{clinic}/tools/age-calculator
Toxic Food:       https://Vetic.vercel.app/{clinic}/tools/toxic-food
Privacy:          https://Vetic.vercel.app/{clinic}/privacy
Terms:            https://Vetic.vercel.app/{clinic}/terms
FAQ:              https://Vetic.vercel.app/{clinic}/faq
```

## Success Criteria

✅ All tests pass
✅ No critical errors in validators
✅ Rich results eligible
✅ Social sharing works
✅ Mobile-friendly
✅ Fast page loads
✅ Analytics tracking

---

**Last Updated**: December 2024
