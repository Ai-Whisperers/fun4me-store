# Page Load Flow

How a page request flows through the Next.js application.

```mermaid
sequenceDiagram
    participant Browser
    participant Router as Next.js Router
    participant Layout
    participant Page
    participant CMS as JSON-CMS
    participant Theme
    participant DB as Database
    participant Response

    Browser->>Router: GET /adris/services
    
    Router->>Router: Extract [clinic] = 'adris'
    Router->>Layout: Load layout.tsx
    
    Layout->>CMS: getClinicData('adris')
    CMS->>CMS: Read .content_data/adris/config.json
    CMS->>CMS: Read .content_data/adris/theme.json
    CMS-->>Layout: ClinicData { config, theme }
    
    Layout->>Theme: Apply Theme (CSS Variables)
    Theme->>Theme: Inject var(--primary), etc.
    Theme-->>Layout: Theme Applied
    
    Layout->>Page: Load page.tsx
    
    Page->>CMS: Load services.json
    CMS-->>Page: Services Array
    
    Page->>DB: Query services (if needed)
    DB-->>Page: Service Data
    
    Page->>Page: Render Components
    Page-->>Layout: Rendered Content
    
    Layout-->>Router: Complete Page
    Router-->>Browser: HTML Response
    
    Browser->>Browser: Apply CSS Variables
    Browser->>Browser: Display Page
```

## Key Steps

1. **Route Matching**: Next.js matches `/[clinic]/services`
2. **Layout Loading**: Clinic layout loads config and theme
3. **Content Loading**: Page-specific JSON content loaded
4. **Database Query**: Dynamic data fetched (if needed)
5. **Rendering**: React components render with theme
6. **Response**: HTML sent to browser with CSS variables

## Performance Optimizations

- **Static Generation**: Clinic pages pre-rendered at build time
- **Caching**: JSON files cached in memory
- **CDN**: Static assets served from CDN
- **Database**: RLS adds minimal query overhead

