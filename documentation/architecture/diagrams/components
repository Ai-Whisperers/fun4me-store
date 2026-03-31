# Dashboard Component Hierarchy

React component structure for the staff dashboard.

```mermaid
graph TD
    DASHBOARD[DashboardLayout]
    
    DASHBOARD --> SIDEBAR[SidebarNavigation]
    DASHBOARD --> HEADER[DashboardHeader]
    DASHBOARD --> MAIN[MainContent]
    DASHBOARD --> FOOTER[Footer]
    
    SIDEBAR --> NAV_ITEMS[NavigationItems]
    NAV_ITEMS --> DASH_LINK[Dashboard Link]
    NAV_ITEMS --> APPT_LINK[Appointments Link]
    NAV_ITEMS --> PATIENTS_LINK[Patients Link]
    NAV_ITEMS --> INVOICES_LINK[Invoices Link]
    NAV_ITEMS --> INVENTORY_LINK[Inventory Link]
    
    HEADER --> USER_MENU[UserMenu]
    HEADER --> NOTIFICATIONS[Notifications]
    HEADER --> SEARCH[GlobalSearch]
    
    MAIN --> ROUTER[Page Router]
    ROUTER --> DASH_PAGE[Dashboard Home]
    ROUTER --> APPT_PAGE[Appointments Page]
    ROUTER --> PATIENTS_PAGE[Patients Page]
    ROUTER --> INVOICES_PAGE[Invoices Page]
    
    DASH_PAGE --> STATS[StatsCards]
    DASH_PAGE --> CALENDAR[CalendarView]
    DASH_PAGE --> RECENT[RecentActivity]
    
    APPT_PAGE --> APPT_LIST[AppointmentList]
    APPT_PAGE --> APPT_FORM[AppointmentForm]
    APPT_PAGE --> CALENDAR_VIEW[CalendarView]
    
    PATIENTS_PAGE --> PATIENT_LIST[PatientList]
    PATIENTS_PAGE --> PATIENT_FILTER[PatientFilters]
    PATIENTS_PAGE --> PATIENT_DETAILS[PatientDetails]
    
    INVOICES_PAGE --> INVOICE_LIST[InvoiceList]
    INVOICE_PAGE --> INVOICE_FORM[InvoiceForm]
    INVOICE_PAGE --> PAYMENT_FORM[PaymentForm]
    
    style DASHBOARD fill:#60a5fa
    style MAIN fill:#4ade80
    style ROUTER fill:#fbbf24
```

## Dashboard Sections

- **Navigation**: Sidebar with main sections
- **Header**: User menu, notifications, search
- **Content**: Dynamic based on route
- **Footer**: Clinic information, links

