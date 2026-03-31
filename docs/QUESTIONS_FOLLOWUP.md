# Follow-up Questions

> Quick clarifications based on your previous answers.

---

## 1. Global Catalog + Clinic Products

**When a clinic adds a custom product (not in global catalog):**

- [ ] A) It stays private to that clinic only
- [ ] B) It can be submitted for global catalog review
- [ ] C) Either - clinic chooses
- [x] D) it gets added to the global catalog but only accesible to the clinic and the system admins (developers)

---

## 2. Cart - Unassigned Products Display

**You said products can be added without a pet. In the grouped cart, where do unassigned items go?**

**Option A: Unassigned at bottom**

```
🐕 Max - $40
🐱 Luna - $20
📦 General Items (no pet assigned)
  - Pet carrier - $50
Total: $110
```

**Option B: Unassigned at top**

```
📦 General Items
  - Pet carrier - $50
🐕 Max - $40
🐱 Luna - $20
Total: $110
```

**Option C: Other arrangement**

```
(Describe how you want it)

```

Your choice: [x] A [ ] B [ ] C

---

## 3. Prescription Workflow

**You selected both "upload before purchase" AND "vet approval after order". Which flow?**

- [ ] A) Upload first → Vet reviews → If approved, can checkout
- [x] B) Can checkout with upload → Order pending until vet approves
- [ ] C) Either works depending on situation

---

## 4. Custom Discounts

**What types of discounts do you need?**

Check all that apply:

- [x] Percentage off (10% off)
- [x] Fixed amount off ($5 off)
- [x] Buy X get Y free
- [x] Bundle discounts (buy food + treats = 15% off)
- [x] First-time customer discount
- [x] Birthday discount (pet or owner)
- [x] Loyalty tier discounts (based on points level)
- [x] Volume discounts (buy 3+ of same item)
- [x] Subscription discounts (recurring orders)
- [ ] Other: ******\_\_\_******

---

## 5. Services in Cart

**When adding a service (like grooming appointment), does the user:**

- [] A) Select date/time when adding to cart
- [ ] B) Select date/time at checkout
- [x] C) Book separately, just pay in cart
- [ ] D) Services are added by staff only, not by pet owner

---

## 6. Shipping Cost Calculation

**You said shipping depends on clinic + distance. How is this calculated?**

- [ ] A) Fixed zones (Zone 1 = $X, Zone 2 = $Y)
- [ ] B) Per-km calculation
- [ ] C) Clinic sets flat rate
- [ ] D) Free over certain amount, otherwise flat fee
- [ ] E) Combination (free over $X, otherwise zone-based)
- [x] F) Not defined yet - need to design

---

## 7. Loyalty Points

**How do loyalty points work?**

### 7.1 Earning Points

- [x] A) Fixed points per dollar spent (e.g., 1 point per $1)
- [x] B) Different rates for products vs services
- [x] C) Bonus points on certain products
- [ ] D) Not defined yet

### 7.2 Redeeming Points

- [ ] A) Points = money off (100 points = $1 off)
- [x] B) Points for specific rewards (500 points = free grooming)
- [x] C) Points for discounts (1000 points = 10% off next order)
- [ ] D) Not defined yet

---

## 8. Coupon Codes

**How should coupon codes work?**

### 8.1 Who creates coupons?

- [ ] A) Only super admin (global coupons)
- [x] B) Each clinic creates their own
- [ ] C) Both - global + clinic-specific

### 8.2 Coupon restrictions

Check what's needed:

- [x] Minimum order amount
- [x] Maximum discount cap
- [x] One per customer
- [x] Expiration date
- [x] Limit total uses
- [x] Product/category restrictions
- [] New customers only

---

## 9. Order Status Flow

**What order statuses do you need?**

Check all that apply:

- [x] Pending (just placed)
- [x] Confirmed (clinic acknowledged)
- [x] Processing (being prepared)
- [x] Ready for Pickup
- [x] Out for Delivery
- [x] Delivered / Completed
- [x] Cancelled
- [ ] Refunded
- [] On Hold (waiting for prescription approval)

---

## 10. Invoice Generation

**When is an invoice generated for shop orders?**

- [ ] A) Immediately when order is placed
- [x] B) When order is confirmed by clinic if confirmation is needed otherways imediatly
- [ ] C) When order is completed/delivered
- [ ] D) Manual - staff generates when ready

---

## 11. Returns & Refunds

**Can customers return products?**

- [ ] A) No returns
- [ ] B) Returns within X days (how many? \_\_\_)
- [x] C) Store credit only
- [ ] D) Full refund available
- [x] E) Depends on product type (no returns on medications)

---

## 12. Notifications

**What notifications should customers receive?**

Check all that apply:

- [x] Order placed confirmation
- [x] Order confirmed by clinic
- [x] Order ready for pickup
- [x] Order out for delivery
- [x] Order delivered
- [x] Prescription approved/rejected
- [x] Back in stock alerts
- [x] Shipping updates

---

## 13. Wishlist Functionality

**You rated Wishlist as critical (5). What should it do?**

- [ x] A) Simple save for later list
- [ ] B) Price drop notifications
- [ ] C) Share wishlist with others
- [ x] D) Notify when back in stock
- [ x] E) Quick "add all to cart" button
- [ ] F) All of the above

---

## 14. Product Display

**On product listing pages, what info should show?**

Check what's needed:

- [x] Product image
- [x] Product name
- [x] Price (original + sale if discounted)
- [x] Star rating
- [x] Number of reviews
- [x] "In Stock" / "Out of Stock" badge
- [x] "Prescription Required" badge
- [x] Quick add to cart button
- [x] Quick add to wishlist button
- [x] Pet type indicator (for dogs / for cats / both)

---

## 15. Quick Answers

1. Can a single order contain items for multiple pets? Yes
2. Can clinic staff place orders on behalf of customers? No
3. Is there an order history in the customer portal? Yes
4. Can customers reorder previous orders easily? Yes
5. Do you need product recommendations ("You may also like")? Yes
6. Do you need "Frequently bought together" suggestions? Yes

---

_Fill this out and I'll have everything I need to implement the shop correctly!_
