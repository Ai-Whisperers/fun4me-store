# Shop & Inventory Questions

> I need to understand the business logic to implement correctly.

---

## Part 1: Shop & Inventory Relationship

### 1.1 Inventory Source

**Where does the shop inventory come from?**

- [ ] A) Each clinic manages their own products manually
- [ ] B) There's a global catalog and clinics pick which products to sell
- [ ] C) Products sync from an external system
- [ ] D) Mix of global catalog + clinic-specific products
- [x] E) each clinic can select from the global catalog and add their own products if not available

---

### 1.2 Stock Tracking

**How should stock be tracked?**

- [ ] A) Real-time stock (decrements immediately on purchase)
- [x] B) Stock decrements only after order confirmation
- [ ] C) Stock decrements after pickup/delivery
- [ ] D) No stock tracking needed (always available)

---

### 1.3 Out of Stock Behavior

**When a product is out of stock:**

- [] A) Hide it from the shop
- [x] B) Show it but disable "Add to Cart"
- [ ] C) Allow backorders (customer can still order)
- [x] D) Show "Notify me when available" option

---

### 1.4 Price Display

**How should prices work?**

- [ ] A) Same price for all customers
- [ ] B) Different prices for registered vs guest users
- [ ] C) Different prices per pet type (dogs vs cats)
- [x] D) Clinic sets their own markup on base prices

---

### 1.5 Product Categories

**What product categories should the shop have?**

Check all that apply:

- [] Medications (prescription)
- [] Medications (over-the-counter)
- [ ] Food & Nutrition
- [ ] Accessories & Toys
- [ ] Hygiene & Grooming
- [ ] Supplements
- [x] Other: all the categories that are available and prepared globally

---

### 1.6 Prescription Products

**For prescription medications:**

- [ ] A) Don't sell them online
- [x] B) Require prescription upload before purchase
- [x] C) Require vet approval after order placed
- [ ] D) Only show to pet owners with valid prescription on file

---

## Part 2: Cart Functionality

### 2.1 Cart Persistence

**How should the cart be saved?**

- [ ] A) Local storage only (lost on browser clear)
- [ ] B) Database (persists across devices when logged in)
- [x] C) Both (local for guests, DB for logged-in users)

---

### 2.2 Pet Grouping in Cart

**You mentioned grouping by pet. How should this work?**

Example cart view - which is correct?

**Option A: Simple list**

```
Cart:
- Dog Food (Max) - $25
- Cat Food (Luna) - $20
- Flea Treatment (Max) - $15
Total: $60
```

**Option B: Grouped by pet**

```
Cart:

🐕 Max (Golden Retriever)
  - Dog Food - $25
  - Flea Treatment - $15
  Subtotal: $40

🐱 Luna (Siamese)
  - Cat Food - $20
  Subtotal: $20

Total: $60
```

**Option C: Grouped with services too**

```
Cart:

🐕 Max (Golden Retriever)
  Products:
  - Dog Food - $25
  - Flea Treatment - $15
  Services:
  - Grooming appointment (Jan 15) - $30
  Subtotal: $70

🐱 Luna (Siamese)
  Products:
  - Cat Food - $20
  Subtotal: $20

Total: $90
```

Your choice: [ ] A [ ] B [x] C

## but oproducts can be added to cart without defining the pet

### 2.3 Services in Cart

**Can services (appointments, grooming, etc.) be in the same cart as products?**

- [x] A) Yes, mixed cart (products + services together)
- [ ] B) No, separate checkout flows
- [ ] C) Yes, but services are paid separately at the clinic

---

### 2.4 Assigning Products to Pets

**When adding a product to cart, how is the pet selected?**

- [ ] A) User must select which pet the product is for
- [ ] B) Auto-suggest based on product type (dog food → show dogs)
- [x] C) Optional - can add without specifying pet
- [x] D) Some products require pet, some don't (e.g., toys vs medications)

---

### 2.5 Multi-Pet Discounts

**Are there discounts for multiple pets?**

- [ ] A) No multi-pet discounts
- [ ] B) Yes, percentage off for 2+ pets
- [ ] C) Yes, buy X get Y free on same product for multiple pets
- [x] D) Custom discount rules

---

## Part 3: Checkout Flow

### 3.1 Checkout Options

**How does checkout work?**

- [ ] A) Online payment only
- [ ] B) Pay at clinic only
- [x] C) Both options available
- [ ] D) Pay at clinic, online payment coming later

---

### 3.2 Delivery Options

**How are products delivered?**

- [ ] A) Pickup at clinic only
- [ ] B) Delivery available
- [x] C) Both pickup and delivery
- [ ] D) Depends on product type

---

### 3.3 Order Confirmation

**After order is placed:**

- [ ] A) Email confirmation only
- [ ] B) Email + SMS
- [x] C) Email + WhatsApp + portal
- [ ] D) Show in portal only (no notification)

---

## Part 4: Current State

### 4.1 What's Working Now?

**Check what currently works:**

- [ ] Product listing page
- [ ] Product detail page
- [ ] Add to cart button
- [ ] Cart page/sidebar
- [ ] Checkout page
- [ ] Order history
- [ ] Inventory management (dashboard)
- [ ] Stock alerts

---

### 4.2 What's Broken?

**What specific issues have you noticed?**

```
(Describe any bugs or issues you've seen)



```

---

### 4.3 Missing Features

**What's missing that you need before launch?**

```
(List must-have features)



```

---

## Part 5: Quick Answers

**Fill in:**

1. Can guests (not logged in) purchase? No
2. Is there a minimum order amount? No
3. Are there shipping costs? Yes depends on the clinics and distance
4. Do you have coupon codes? Yes
5. Is there a loyalty points system for purchases? Yes
6. Should the shop be visible to all clinics or clinic-specific? all clinics

---

_Fill this out and I'll have a complete picture of the shop requirements!_
