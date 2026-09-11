# KrishiSetu (कृषीसेतू) — Phase 10: Trust, Reputation & Safety Layer

## Overview
Phase 10 introduces a truthful, transaction-grounded trust and reputation ecosystem for KrishiSetu, alongside a safety reporting and admin moderation framework.

---

## Key Features & Architecture

### 1. Empirical Reputation Signals (Zero Synthetic/AI Ratings)
- **Badges**:
  - `✓ Mobile Verified` (OTP verification)
  - `✓ Profile Verified` (Location & user profile completion)
  - `✓ DigiLocker Verified` (Present only when an authoritative DigiLocker request is approved)
  - `⭐ X.X (Y completed)` (Based strictly on completed orders and submitted transaction reviews)
- **No Synthetic Ratings**: Ratings and reviews are strictly computed from real transaction reviews.

### 2. Transaction Review Eligibility & Unique Constraints
- **Eligibility Rules**:
  - Review submission is restricted to completed orders (`Order.status === 'COMPLETED'`).
  - Reviewer and reviewed user must both be participants in the order (Farmer, Buyer, or linked Transport/Storage Provider).
  - Self-reviews are strictly blocked.
- **Unique Constraint**: Enforced at DB level via `@@unique([reviewerId, orderId, reviewedUserId])`.
- **Allowed Window**: 1–5 star integer ratings with optional comments (max 1000 chars).

### 3. Transaction Safety Reports & Moderation
- **Categories**: `NON_PAYMENT`, `NON_DELIVERY`, `QUALITY_MISMATCH`, `FRAUD`, `UNPROFESSIONAL_BEHAVIOR`, `HARASSMENT`, `OTHER`.
- **Min Length**: Rationale explanation requires at least 10 characters.
- **State Machine**: `OPEN` → `UNDER_REVIEW` → `RESOLVED` / `DISMISSED`.
- **Admin Moderation Dashboard**: `/admin/reports` with status/category filtering and internal moderation notes history.

### 4. Integration with Phase 9 Notification Engine
- **Review Received**: Automatic notification generated when a transaction review is received.
- **Report Status Update**: Automatic notification generated for reporters when admin updates report status.

---

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/reputation/[userId]` | Get user reputation summary & trust badges | Public |
| `GET` | `/api/v1/reputation/[userId]/reviews` | Get paginated user transaction reviews | Public |
| `POST` | `/api/v1/reviews` | Submit transaction review for completed order | User |
| `PATCH` | `/api/v1/reviews/[id]` | Update transaction review (reviewer only) | User |
| `POST` | `/api/v1/reports` | Submit transaction safety report | User |
| `GET` | `/api/v1/reports/[id]` | View safety report details (reporter/admin) | User |
| `GET` | `/api/v1/admin/reports` | List & filter safety reports for moderation | Admin |
| `PATCH` | `/api/v1/admin/reports/[id]` | Update report status & append moderation note | Admin |

---

## Verification & Audit
- **Audit Suite**: `scripts/phase10_audit.ts` (37 tests passed)
- **Full System Regressions**: 139 total tests passed across Phase 4–10 suites.
- **TypeScript Check**: `npx tsc --noEmit` (0 errors)
- **Next.js Build**: `npm run build` (58 routes compiled cleanly)
