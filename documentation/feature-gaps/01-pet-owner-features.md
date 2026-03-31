# Pet Owner (Cliente) Feature Gaps

This document details missing features from the perspective of a pet owner using the platform to manage their pets' health and interact with the veterinary clinic.

> **December 2024 Update**: A comprehensive code audit revealed that many features listed here as "missing" have been partially or fully implemented. Key implementations include:
> - Notification system (Edge Functions for email/SMS)
> - Appointment reminders (automated generation)
> - QR code system (generation and scanning)
> - Store with cart and loyalty discounts
> - Medical records timeline
> - Prescription PDF generation
>
> Review each section against actual code before implementation.

---

## 1. Authentication & Account Management

### Current State
- Email/password login works
- Google OAuth works
- Basic profile exists

### Missing Features

#### 1.1 Password Reset Flow 🔴 CRITICAL
**User Story**: As a pet owner, I want to reset my forgotten password so I can regain access to my account.

**Requirements**:
- "Forgot password" link on login page
- Email with secure reset token
- Password reset form with validation
- Confirmation message after reset
- Token expiration (24 hours)

**Implementation Notes**:
- Use Supabase Auth's built-in password reset
- File: `web/app/[clinic]/portal/forgot-password/page.tsx` (create)
- File: `web/app/[clinic]/portal/reset-password/page.tsx` (create)

**Acceptance Criteria**:
- [ ] User can request password reset from login page
- [ ] Email is sent within 30 seconds
- [ ] Token expires after 24 hours
- [ ] New password must meet security requirements
- [ ] User is logged in after successful reset

---

#### 1.2 Email Verification 🟡 HIGH
**User Story**: As a pet owner, I want to verify my email address so the clinic knows how to contact me.

**Requirements**:
- Send verification email on signup
- Verification link/code
- Resend verification option
- Visual indicator of verification status

**Implementation Notes**:
- Supabase Auth handles verification emails
- Need to enable in Supabase dashboard
- Add UI indicator in profile

---

#### 1.3 Social Login Options 🟢 MEDIUM
**User Story**: As a pet owner, I want to log in with my existing social accounts for convenience.

**Requirements**:
- Facebook login
- Apple login (for iOS users)
- Account linking (connect social to existing account)

**Implementation Notes**:
- Configure in Supabase Auth providers
- Add buttons to login page
- Handle account merging

---

#### 1.4 Profile Management 🟡 HIGH
**User Story**: As a pet owner, I want to manage my profile information so the clinic has accurate contact details.

**Requirements**:
- Edit full name
- Edit phone number
- Edit address
- Upload profile photo
- Change email (with verification)
- Change password
- Delete account (GDPR compliance)

**Current File**: `web/app/[clinic]/portal/profile/page.tsx` (exists but incomplete)

**Missing Fields**:
- Address fields (street, city, state, zip)
- Secondary phone
- Emergency contact
- Preferred contact method
- Communication preferences

---

#### 1.5 Onboarding Flow 🟢 MEDIUM
**User Story**: As a new pet owner, I want a guided tour so I understand how to use the platform.

**Requirements**:
- Welcome modal on first login
- Step-by-step feature introduction
- Prompt to add first pet
- Prompt to complete profile
- Skip option

---

## 2. Dashboard / Portal Home

### Current State
- Shows pet list with vaccine cards
- Shows upcoming appointments (owners)
- Shows stats (staff only)
- Pet search functionality

### Missing Features

#### 2.1 Notification Center 🔴 CRITICAL
**User Story**: As a pet owner, I want to see all my notifications in one place so I don't miss important information.

**Requirements**:
- Bell icon in header with unread count
- Dropdown with recent notifications
- Full notifications page
- Mark as read functionality
- Notification types:
  - Appointment reminders
  - Vaccine due alerts
  - Appointment status changes
  - Messages from clinic
  - Prescription ready
  - Test results available

**Implementation Notes**:
- Create `notifications` table or use existing `notification_queue`
- Real-time updates with Supabase subscriptions
- File: `web/components/layout/notification-bell.tsx` (create)
- File: `web/app/[clinic]/portal/notifications/page.tsx` (create)

---

#### 2.2 Quick Actions Widget 🟢 MEDIUM
**User Story**: As a pet owner, I want quick access to common tasks from my dashboard.

**Requirements**:
- One-tap buttons for:
  - Book appointment
  - Add vaccine record
  - Report lost pet
  - Contact clinic
  - View loyalty points
- Customizable order

---

#### 2.3 Pet Health Summary Cards 🟡 HIGH
**User Story**: As a pet owner, I want to see at a glance how healthy my pets are.

**Requirements**:
- Visual health score/indicator per pet
- Next vaccine due date prominently shown
- Days since last visit
- Weight trend indicator
- Active prescriptions count

---

#### 2.4 Activity Feed 🟢 MEDIUM
**User Story**: As a pet owner, I want to see recent activity related to my pets.

**Requirements**:
- Timeline of recent events:
  - "Vaccine added 3 days ago"
  - "Appointment completed yesterday"
  - "New prescription issued"
- Link to related records
- Filter by pet

---

#### 2.5 Emergency Contact Display 🔴 CRITICAL
**User Story**: As a pet owner, I want easy access to emergency contact information.

**Requirements**:
- Clinic phone number always visible
- 24/7 emergency number if different
- One-tap to call on mobile
- Nearest emergency vet if after hours

---

## 3. Pet Profile Management

### Current State
- Can create pets with full details
- Can view pet profile with medical history
- QR code generation works
- Growth chart displays

### Missing Features

#### 3.1 Edit Pet Information 🔴 CRITICAL
**User Story**: As a pet owner, I want to update my pet's information when it changes.

**Requirements**:
- Edit all fields from creation form:
  - Name, species, breed
  - Weight, birth date
  - Photo
  - Microchip ID
  - Diet information
  - Allergies, conditions
  - Temperament
- Update neutered/spayed status
- Change owner (transfer)

**Implementation Notes**:
- File: `web/app/[clinic]/portal/pets/[id]/edit/page.tsx` (create)
- Reuse form components from `pets/new`
- Server action: `updatePet`

**Acceptance Criteria**:
- [ ] All fields are editable
- [ ] Photo can be replaced
- [ ] Changes are validated
- [ ] Audit log records changes
- [ ] Owner receives confirmation

---

#### 3.2 Archive/Delete Pet 🟡 HIGH
**User Story**: As a pet owner, I want to mark my pet as deceased or remove it from my account.

**Requirements**:
- Mark as deceased with date
- Option to archive (hide but keep records)
- Permanent delete with confirmation
- Memorial page option

---

#### 3.3 Pet Photo Gallery 🟢 MEDIUM
**User Story**: As a pet owner, I want to store multiple photos of my pet over time.

**Requirements**:
- Multiple photo upload
- Photo date/caption
- Before/after comparisons
- Share photos with clinic

---

#### 3.4 Pet Documents Folder 🟢 MEDIUM
**User Story**: As a pet owner, I want to store important documents related to my pet.

**Requirements**:
- Upload adoption papers
- Store pedigree certificates
- Import vaccination records from other clinics
- Insurance documents
- Travel certificates

---

#### 3.5 Pet Insurance Information 🟡 HIGH
**User Story**: As a pet owner, I want to store my pet's insurance information for easy access.

**Requirements**:
- Insurance provider name
- Policy number
- Coverage details
- Claim submission info
- Link to provider portal

**Database**: Schema exists in `28_insurance.sql`

---

#### 3.6 Pet Sharing 🟢 MEDIUM
**User Story**: As a pet owner, I want to share my pet's profile with family members.

**Requirements**:
- Invite family member by email
- Permission levels (view only, can book appointments)
- Remove shared access
- Shared pet appears in their dashboard

---

#### 3.7 Pet Age Display 🔴 CRITICAL
**User Story**: As a pet owner, I want to see my pet's age prominently displayed.

**Requirements**:
- Age in years and months on profile
- Human age equivalent (use existing age calculator logic)
- Birthday indicator/alert

**Implementation Notes**:
- Age Calculator component exists: `web/components/tools/age-calculator.tsx`
- Integrate into pet profile header

---

## 4. Vaccine Management

### Current State
- Can add vaccines with date, batch, status
- Displays on pet profile
- Status badges (verified/pending/rejected)

### Missing Features

#### 4.1 Vaccine Reminders 🔴 CRITICAL
**User Story**: As a pet owner, I want to be reminded when my pet's vaccines are due.

**Requirements**:
- Notification X days before due date
- Multiple reminder options (7 days, 3 days, 1 day)
- Email and/or SMS delivery
- Snooze option
- Direct link to book appointment

**Database**: `notification_queue` table exists in `22_reminders.sql`

---

#### 4.2 Vaccine Certificate Download 🔴 CRITICAL
**User Story**: As a pet owner, I want to download an official vaccine certificate for my pet.

**Requirements**:
- PDF certificate with clinic branding
- All vaccines listed with dates
- Vet signature (if verified)
- QR code for verification
- Travel-compliant format option

**Implementation Notes**:
- "Download PDF" button exists but not functional
- Create component similar to `prescription-pdf.tsx`
- File: `web/components/clinical/vaccine-certificate-pdf.tsx` (create)

---

#### 4.3 Vaccine History Export 🟡 HIGH
**User Story**: As a pet owner, I want to export my pet's complete vaccine history.

**Requirements**:
- Export as PDF
- Export as CSV/Excel
- Include all fields (date, type, batch, provider)
- Share via email

---

#### 4.4 Upcoming Vaccines Calendar 🟡 HIGH
**User Story**: As a pet owner, I want to see when vaccines are due on a calendar.

**Requirements**:
- Visual calendar view
- All pets' vaccines shown
- Color coding by vaccine type
- Click to book appointment
- Sync to external calendar

---

## 5. Appointment Booking

### Current State
- Multi-step booking wizard works
- Pre-fills user's pets
- Creates appointment in database
- Confirmation screen

### Critical Issues
- **Time slots are hardcoded** (09:00-16:30)
- No real availability checking
- Cannot cancel or reschedule
- No appointment history view

### Missing Features

#### 5.1 Real-Time Availability 🔴 CRITICAL
**User Story**: As a pet owner, I want to see actual available time slots, not fake ones.

**Requirements**:
- Query database for booked slots
- Show only truly available times
- Update in real-time as others book
- Block fully booked days
- Show vet availability per service

**Implementation Notes**:
- Current file: `web/components/booking/booking-wizard.tsx:28-31` has hardcoded slots
- Need to fetch from `/api/booking` with date parameter
- Consider staff schedules from `staff_schedules` table

**Code to Replace**:
```typescript
// CURRENT (hardcoded)
const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
];

// NEEDED (dynamic)
const { data: timeSlots } = await fetch(`/api/booking/availability?date=${date}&service=${serviceId}`);
```

---

#### 5.2 Appointment Cancellation 🔴 CRITICAL
**User Story**: As a pet owner, I want to cancel an appointment I can no longer attend.

**Requirements**:
- Cancel button on appointment card
- Cancellation reason (optional)
- Confirmation dialog
- Cancellation policy display (e.g., "24hr notice required")
- Refund handling if prepaid
- Email confirmation of cancellation
- Free up the time slot

**Implementation Notes**:
- Server action exists: `web/app/actions/update-appointment.ts`
- Need UI to trigger cancellation
- Update appointment status to "cancelled"

---

#### 5.3 Appointment Rescheduling 🔴 CRITICAL
**User Story**: As a pet owner, I want to change the date/time of my appointment.

**Requirements**:
- Reschedule button on appointment card
- Show available alternative times
- One-step date/time change
- Policy display (e.g., "Reschedule up to 2 hours before")
- Email confirmation of new time

---

#### 5.4 Appointment History 🟡 HIGH
**User Story**: As a pet owner, I want to see all my past appointments.

**Requirements**:
- List of completed appointments
- Filter by pet, date range, service type
- View appointment details
- Link to medical record from that visit
- Rebook similar appointment

**File**: `web/app/[clinic]/portal/appointments/page.tsx` (create)

---

#### 5.5 Recurring Appointments 🟢 MEDIUM
**User Story**: As a pet owner, I want to schedule regular checkups automatically.

**Requirements**:
- Option to repeat weekly/monthly/yearly
- Automatic booking of next appointment
- Reminder before each occurrence
- Easy cancellation of series

---

#### 5.6 Multiple Pets Per Appointment 🟡 HIGH
**User Story**: As a pet owner with multiple pets, I want to book one appointment for all of them.

**Requirements**:
- Select multiple pets in booking wizard
- Automatic time extension for multiple pets
- Combined or separate pricing
- All pets listed on confirmation

---

#### 5.7 Appointment Reminders 🔴 CRITICAL
**User Story**: As a pet owner, I want to be reminded about upcoming appointments.

**Requirements**:
- Email reminder 24 hours before
- SMS reminder 2 hours before (optional)
- Push notification on mobile
- Calendar event attachment
- Reminder with clinic address/directions

---

#### 5.8 Calendar Sync 🟡 HIGH
**User Story**: As a pet owner, I want to add appointments to my personal calendar.

**Requirements**:
- "Add to Calendar" button
- Google Calendar support
- iCal/Outlook support
- Include clinic location
- Include appointment notes

---

#### 5.9 Check-In Feature 🟢 MEDIUM
**User Story**: As a pet owner, I want to let the clinic know I've arrived.

**Requirements**:
- "I'm here" button when within range
- Estimated wait time display
- Queue position
- Push notification when called

---

#### 5.10 Video Consultation 🟢 MEDIUM
**User Story**: As a pet owner, I want the option for a video call instead of in-person visit.

**Requirements**:
- Telemedicine appointment type
- Video call integration (Zoom/Meet)
- Waiting room
- Screen sharing for showing symptoms
- Different pricing

---

## 6. Medical Records Access

### Current State
- Timeline view of medical records on pet profile
- Can see diagnosis, notes, vitals
- Prescription history visible

### Missing Features

#### 6.1 Full Medical History View 🟡 HIGH
**User Story**: As a pet owner, I want to see my pet's complete medical history in detail.

**Requirements**:
- Expandable/collapsible records
- Search within records
- Filter by record type
- Date range filter
- Print-friendly view

---

#### 6.2 Lab Results Viewer 🟡 HIGH
**User Story**: As a pet owner, I want to view my pet's lab test results.

**Requirements**:
- Display blood work results
- Normal range indicators
- Trend charts over time
- Explanation of values
- PDF download

**Database**: Schema exists in `24_lab_results.sql`

---

#### 6.3 Download Medical Records 🟡 HIGH
**User Story**: As a pet owner, I want to download my pet's complete medical file.

**Requirements**:
- Generate comprehensive PDF
- Include all visits, vaccines, prescriptions
- Include lab results if available
- Password protection option
- Watermark with date generated

---

#### 6.4 Share Records with Another Vet 🟢 MEDIUM
**User Story**: As a pet owner, I want to share my pet's records with a specialist.

**Requirements**:
- Generate shareable link (time-limited)
- Email records directly
- Select which records to share
- Track who accessed records

---

#### 6.5 Treatment Progress Tracker 🟢 MEDIUM
**User Story**: As a pet owner, I want to track my pet's progress during treatment.

**Requirements**:
- Visual progress for ongoing conditions
- Medication completion tracking
- Weight/symptom logging by owner
- Notes from each checkup
- Goal indicators

---

## 7. Prescriptions

### Current State
- Prescriptions shown on pet profile
- PDF generation works
- Drug name, dose, instructions displayed

### Missing Features

#### 7.1 Prescription Refill Request 🟡 HIGH
**User Story**: As a pet owner, I want to request a prescription refill without visiting.

**Requirements**:
- "Request Refill" button on prescription
- Select quantity needed
- Add note for vet
- Track request status
- Notification when approved/denied
- Pickup or delivery option

---

#### 7.2 Medication Reminders 🟡 HIGH
**User Story**: As a pet owner, I want reminders to give my pet medication.

**Requirements**:
- Set reminder times when prescription issued
- Daily push notifications
- Mark as "given" in app
- Track compliance percentage
- Alert clinic if doses missed

---

#### 7.3 Drug Information 🟢 MEDIUM
**User Story**: As a pet owner, I want to understand what medication my pet is taking.

**Requirements**:
- Link to drug information
- Side effects to watch for
- Food/drug interactions
- Storage instructions
- What to do if dose missed

---

## 8. Store & E-Commerce

### Current State
- Store page exists
- Product display works
- Cart functionality with context
- Loyalty discount application

### Missing Features

#### 8.1 Product Search 🔴 CRITICAL
**User Story**: As a pet owner, I want to search for products by name.

**Requirements**:
- Search bar on store page
- Real-time search results
- Search suggestions
- Search history

---

#### 8.2 Category Filters 🟡 HIGH
**User Story**: As a pet owner, I want to filter products by category.

**Requirements**:
- Category sidebar/dropdown
- Categories: Food, Medicine, Toys, Accessories, Grooming
- Subcategories
- Multi-select filtering
- Price range filter
- Brand filter

---

#### 8.3 Order History 🔴 CRITICAL
**User Story**: As a pet owner, I want to see my past purchases.

**Requirements**:
- List of all orders
- Order status tracking
- Reorder functionality
- Invoice download
- Return request option

**File**: `web/app/[clinic]/portal/orders/page.tsx` (create)

---

#### 8.4 Wishlist 🟢 MEDIUM
**User Story**: As a pet owner, I want to save products for later.

**Requirements**:
- "Add to Wishlist" button
- Wishlist page
- Move to cart
- Share wishlist
- Price drop alerts

---

#### 8.5 Payment Processing 🔴 CRITICAL
**User Story**: As a pet owner, I want to pay for products and services online.

**Requirements**:
- Credit/debit card processing
- Integration with payment gateway (Stripe recommended)
- Save payment methods
- Invoice generation
- Receipt email
- Refund processing

**Implementation Notes**:
- Invoice tables exist in database
- Need Stripe integration
- PCI compliance considerations

---

#### 8.6 Delivery Options 🟡 HIGH
**User Story**: As a pet owner, I want products delivered to my home.

**Requirements**:
- Multiple delivery addresses
- Shipping cost calculation
- Estimated delivery date
- Tracking number
- Delivery notifications
- In-store pickup option

---

## 9. Loyalty Program

### Current State
- Loyalty points displayed on pet profile
- Points can be applied in cart
- Basic LoyaltyCard component

### Missing Features

#### 9.1 Points Transaction History 🟡 HIGH
**User Story**: As a pet owner, I want to see how I earned and spent my points.

**Requirements**:
- Transaction list with dates
- Points earned per purchase
- Points redeemed
- Expiring points warning
- Balance over time chart

---

#### 9.2 Rewards Catalog 🟡 HIGH
**User Story**: As a pet owner, I want to see what I can redeem my points for.

**Requirements**:
- Browse available rewards
- Filter by points required
- Redeem directly from catalog
- Track redeemed rewards

---

#### 9.3 Referral Program 🟢 MEDIUM
**User Story**: As a pet owner, I want to earn points by referring friends.

**Requirements**:
- Unique referral code/link
- Points for successful referral
- Track referral status
- Share via social media
- Bonus for referee too

---

## 10. Communication

### Current State
- No in-app messaging
- No notification system
- WhatsApp links exist for external communication

### Missing Features

#### 10.1 In-App Messaging 🟡 HIGH
**User Story**: As a pet owner, I want to message the clinic directly from the app.

**Requirements**:
- Chat interface
- Send text and photos
- See message history
- Typing indicators
- Read receipts
- Push notifications for replies

**Database**: Schema exists in `27_messaging.sql`
**API**: Routes exist at `/api/conversations`

**Implementation Notes**:
- Backend infrastructure exists
- Need chat UI component
- Real-time with Supabase subscriptions

---

#### 10.2 Notification Preferences 🟡 HIGH
**User Story**: As a pet owner, I want to control what notifications I receive.

**Requirements**:
- Email notification toggles
- SMS notification toggles
- Push notification toggles
- Categories: Appointments, Vaccines, Messages, Promotions
- Quiet hours setting

---

#### 10.3 Feedback/Review System 🟢 MEDIUM
**User Story**: As a pet owner, I want to rate my experience after visits.

**Requirements**:
- Post-visit survey prompt
- Star rating
- Written review
- Option to share publicly
- Response from clinic visible

---

## 11. Safety & Lost Pet Features

### Current State
- QR code generation works
- Public pet profile accessible via QR scan
- LostFoundWidget component exists

### Missing Features

#### 11.1 Lost Pet Alert Broadcast 🟡 HIGH
**User Story**: As a pet owner, I want to quickly alert the community if my pet is lost.

**Requirements**:
- One-click "Report Lost" button
- Broadcast to nearby users
- Share to social media
- Missing poster generation
- Contact form for finders
- Mark as found

---

#### 11.2 QR Tag Ordering 🟢 MEDIUM
**User Story**: As a pet owner, I want to order physical QR tags from the app.

**Requirements**:
- Tag style options
- Shipping address
- Payment processing
- Track delivery
- Link tag to pet

---

## 12. Tools & Utilities

### Current State
- Age Calculator fully functional
- Toxic Food checker referenced but incomplete

### Missing Features

#### 12.1 Toxic Food Checker 🟡 HIGH
**User Story**: As a pet owner, I want to check if a food is safe for my pet.

**Requirements**:
- Search by food name
- Toxicity level indicator
- Symptoms to watch for
- Emergency actions
- Species-specific info

**File**: `web/app/[clinic]/tools/toxic-food/page.tsx` (exists but needs content)

---

#### 12.2 Symptom Checker 🟢 MEDIUM
**User Story**: As a pet owner, I want guidance when my pet shows symptoms.

**Requirements**:
- Select symptoms from list
- Possible causes
- Urgency indicator
- Home care tips vs. vet visit needed
- One-click to book if urgent

---

#### 12.3 Food Portion Calculator 🟢 MEDIUM
**User Story**: As a pet owner, I want to know how much to feed my pet.

**Requirements**:
- Input pet weight, age, activity level
- Recommended daily calories
- Portion size by food brand
- Feeding schedule suggestions

---

#### 12.4 Pet First Aid Guide 🟢 MEDIUM
**User Story**: As a pet owner, I want access to emergency first aid procedures.

**Requirements**:
- Common emergencies (choking, poisoning, wounds)
- Step-by-step instructions
- When to call vet
- CPR instructions
- Emergency kit checklist

---

## Implementation Checklist

### Phase 1: Critical (Must Have)
- [ ] Password reset flow
- [ ] Edit pet information
- [ ] Real-time availability
- [ ] Appointment cancellation
- [ ] Appointment reminders (email)
- [ ] Notification center
- [ ] Product search
- [ ] Order history
- [ ] Payment processing

### Phase 2: High Priority
- [ ] Profile management
- [ ] Vaccine reminders
- [ ] Vaccine certificate PDF
- [ ] Appointment rescheduling
- [ ] Appointment history
- [ ] Lab results viewer
- [ ] Prescription refill request
- [ ] In-app messaging
- [ ] Points transaction history

### Phase 3: Medium Priority
- [ ] Social login options
- [ ] Onboarding flow
- [ ] Pet photo gallery
- [ ] Pet sharing
- [ ] Recurring appointments
- [ ] Calendar sync
- [ ] Wishlist
- [ ] Referral program
- [ ] Toxic food checker
