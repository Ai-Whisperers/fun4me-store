# Store Shopping Flow

Complete e-commerce shopping experience from browsing to purchase.

```mermaid
journey
    title Store Shopping Journey
    section Browse
      Visit Store Page: 5: Customer
      Browse Categories: 4: Customer
      Search Products: 4: Customer
      View Product Details: 5: Customer
      Check Stock Availability: 4: Customer
    section Cart
      Add to Cart: 5: Customer
      View Cart: 4: Customer
      Update Quantities: 4: Customer
      Apply Coupon Code: 3: Customer
      Review Totals: 4: Customer
    section Checkout
      Proceed to Checkout: 5: Customer
      Enter Shipping Address: 4: Customer
      Select Payment Method: 4: Customer
      Review Order: 5: Customer
      Confirm Order: 5: Customer
    section Processing
      Stock Validation: 5: System
      Create Invoice: 5: System
      Process Payment: 5: System
      Send Confirmation: 4: System
    section Post-Purchase
      View Order Details: 4: Customer
      Track Order: 3: Customer
      Receive Product: 5: Customer
      Leave Review: 3: Customer
```

## Shopping Features

- **Product Catalog**: Browse by category, search, filters
- **Product Details**: Images, descriptions, pricing, stock status
- **Shopping Cart**: Add/remove items, update quantities
- **Coupons**: Apply discount codes
- **Checkout**: Secure payment processing
- **Order Tracking**: View order status
- **Reviews**: Rate and review products

