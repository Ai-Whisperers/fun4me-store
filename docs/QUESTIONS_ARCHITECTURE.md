# Architecture & Technical Questions

> Questions about how the system should work technically.

---

## Part 1: Multi-Tenancy

### 1.1 Clinic Independence

**How independent should each clinic be?**

- [x] A) Completely separate (different branding, products, prices, everything)
- [ ] B) Shared catalog, but clinics set their own prices/stock
- [ ] C) Mostly shared, minor customization per clinic
- [ ] D) Just branding differences, everything else shared

---

### 1.2 Data Isolation

**Can clinics see each other's data?**

- [x] A) Never - complete isolation
- [ ] B) Admins can see aggregate stats across clinics
- [ ] C) Some shared data (e.g., drug database, diagnosis codes)

---

### 1.3 User Accounts

**Can a pet owner have pets at multiple clinics?**

- [ ] A) No - one account per clinic
- [x] B) Yes - single account, pets at different clinics
- [ ] C) Not needed right now

---

## Part 2: Authentication & Roles

### 2.1 Current Roles

**Are these roles correct?**

| Role    | Description                                       | Correct? |
| ------- | ------------------------------------------------- | -------- |
| `owner` | Pet owners - manage their pets, book appointments | Yes      |
| `vet`   | Veterinarians - clinical access, prescriptions    | Yes      |
| `admin` | Clinic admins - full access including settings    | Yes      |

**Missing roles?** ******\_\_\_******

---

### 2.2 Staff Permissions

**Do vets and admins have different permissions, or same access?**

- [ ] A) Same access - both can do everything
- [x] B) Different - vets can't access financials/settings
- [ ] C) Configurable per clinic

---

### 2.3 Registration Flow

**How do new users register?**

- [ ] A) Open registration (anyone can sign up)
- [ ] B) Invite only (clinic sends invitation)
- [x] C) Open for pet owners, invite for staff
- [ ] D) Current flow is fine, don't change

---

## Part 3: Appointments

### 3.1 Booking Flow

**How should appointment booking work?**

- [x] A) Pet owner selects service → date → time → confirms
- [ ] B) Pet owner requests appointment → clinic confirms
- [ ] C) Both options available
- [ ] D) Current flow is fine

---

### 3.2 Service Selection

**When booking, how are services chosen?**

- [x] A) Pet owner selects specific service
- [ ] B) Pet owner describes reason, clinic assigns service
- [ ] C) Mix - common services selectable, custom requests allowed

---

### 3.3 Payment for Appointments

**When is payment collected for appointments?**

- [x] A) Online at booking time
- [ ] B) At the clinic after service
- [ ] C) Deposit online, rest at clinic
- [ ] D) Current flow is fine

---

## Part 4: Integrations

### 4.1 Email Provider

**What email service should we use?**

- [ ] A) Resend (currently configured)
- [ ] B) SendGrid
- [ ] C) AWS SES
- [x] D) Other: you decide
- [ ] E) Not set up yet

---

### 4.2 SMS Provider

**What SMS service for notifications?**

- [ ] A) Twilio
- [ ] B) Not needed
- [ ] C) Other: ******\_\_\_******
- [x] D) Not set up yet

---

### 4.3 Payment Gateway

**What payment provider?**

- [x] A) Stripe
- [ ] B) MercadoPago (Latin America)
- [ ] C) Pay at clinic only (no online payments)
- [ ] D) Other: ******\_\_\_******
- [ ] E) Not set up yet

---

### 4.4 WhatsApp

**WhatsApp integration:**

- [x] A) Needed for notifications
- [ ] B) Needed for two-way chat
- [ ] C) Not needed
- [ ] D) Already configured

---

## Part 5: Deployment

### 5.1 Hosting

**Where is/will this be hosted?**

- [ x] A) Vercel
- [ ] B) AWS
- [ ] C) Other: ******\_\_\_******
- [ ] D) Not decided yet

---

### 5.2 Database

**Supabase project:**

- [x] A) Using Supabase cloud (already set up)
- [ ] B) Self-hosted Supabase
- [ ] C) Need to set up

---

### 5.3 Environments

**What environments do you need?**

- [x] Development (local)

---

## Part 6: Quick Answers

1. Target launch date: 01/02/2026
2. Expected number of clinics at launch: 30
3. Expected users per clinic: 100
4. Primary language: Spanish only
5. Currency: PYG (Guaraníes)
6. Time zone: Paraguay (UTC-4)

---

_Fill this out for technical clarity!_
