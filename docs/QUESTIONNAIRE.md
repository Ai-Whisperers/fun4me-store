# Project Questionnaire

> Answer these questions so I can help you efficiently without you reading everything.

---

## 1. Immediate Priority

**What's your main goal right now?**

- [x] A) Fix bugs and issues before launch
- [ ] B) Add new features
- [ ] C) Understand how everything works
- [ ] D) Deploy to production
- [ ] E) Other: ********\_********

---

## 2. Current State

**Is this project currently live/in production?**

- [ ] Yes, users are actively using it
- [x] No, still in development
- [ ] Partially (some clinics live, others not)

---

## 3. Merge Conflicts

**There are unresolved git merge conflicts in 3 critical files. Do you want me to:**

- [x] A) Fix them now (requires choosing which version to keep)
- [ ] B) Show me the conflicts so I can decide
- [ ] C) Skip for now, I'll handle manually
- [ ] D) I didn't know about this - explain more

**Files affected:**

- `middleware.ts` - Core routing
- `lib/api/with-auth.ts` - Authentication wrapper
- `app/actions/assign-tag.ts` - QR tag assignment

---

## 4. TypeScript Errors

**TypeScript checking is disabled (`ignoreBuildErrors: true`). Do you want to:**

- [x] A) Enable it and fix all errors now
- [ ] B) Leave it disabled for now
- [ ] C) Enable it but only fix critical errors
- [ ] D) I need to understand what this means first

---

## 5. Security Vulnerabilities

**There are 6 dependency vulnerabilities (2 high severity). Do you want to:**

- [x] A) Fix the safe ones now (`npm audit fix`)
- [ ] B) Fix all including breaking changes
- [ ] C) Review them first before deciding
- [ ] D) Ignore for now

**Note:** The `xlsx` package has no fix available - may need replacement.

---

## 6. Incomplete Features

**Several features are half-built. Which matter most to you?**

Rate 1-5 (1=not needed, 5=critical):

| Feature                   | Current State                       | Priority (1-5) |
| ------------------------- | ----------------------------------- | -------------- |
| Product Reviews           | Button exists, does nothing         | 1              |
| Wishlist                  | Only saves locally, doesn't persist | 5              |
| Lost Pets                 | Backend ready, no UI                | 1              |
| SMS Notifications         | Settings page, no actual sending    | 1              |
| Email Campaigns           | Can create, can't send              | 1              |
| P&L Reports               | API incomplete, no UI               | 1              |
| Loyalty Points Redemption | Points exist, no redemption UI      | 1              |
| Insurance Claims          | API exists, no submission UI        | 1              |

---

## 7. Database Cleanup

**35% of database tables are unused (43 tables). Do you want to:**

- [x] A) Leave them (might be for future features)
- [ ] B) Review and decide which to keep
- [ ] C) Delete unused tables
- [ ] D) I need to see the list first

---

## 8. Code Quality

**There are 53 identified issues. How should we prioritize?**

- [x] A) Security first, then bugs, then improvements
- [ ] B) User-facing bugs first
- [ ] C) Whatever's fastest to fix
- [ ] D) Show me the list and I'll prioritize

---

## 9. Testing

**Current test coverage is ~20%. Do you want to:**

- [x] A) Add more tests before making changes
- [ ] B) Fix issues first, add tests later
- [ ] C) Only test critical paths
- [ ] D) Tests aren't a priority right now

---

## 10. Your Expertise

**What's your comfort level with this stack?**

| Technology            | Comfort (1-5) |
| --------------------- | ------------- |
| Next.js / React       | 5             |
| TypeScript            | 5             |
| Supabase / PostgreSQL | 5             |
| Tailwind CSS          | 5             |
| Git                   | 5             |

---

## 11. Working Style

**How do you prefer to work?**

- [x] A) You do most of the work, I review
- [ ] B) We work together step by step
- [ ] C) Explain everything so I can do it myself
- [ ] D) Just fix critical issues, explain the rest

---

## 12. Specific Questions

**Anything specific you want to know or focus on?**

```
(Write here)


```

---

## Quick Summary (Fill after answering above)

**My top 3 priorities are:**

1. i want the shop to work and the shop should reflect the clients inventory
2. i want to work on the cart and the cart should organize the products and the prices and services and group them by pet

**I want to start with:**

---

---

_Once you fill this out, just paste it back or tell me your answers and we'll get started!_
