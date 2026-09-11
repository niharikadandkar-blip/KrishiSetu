# KrishiSetu (कृषीसेतू) — Phase 5 Technical Specification & Architecture Manual
## Order Management, Deal Receipt & Transaction Workflow Foundation

---

## 1. Architectural Purpose & Overview

Phase 5 establishes the authoritative Order Management & Fulfillment Workflow layer on top of the established Phase 1 (Trust & Identity), Phase 2 (Geospatial Discovery & Pre-booking), Phase 3 (Listing Management & RFQ Sourcing), and Phase 4 (Offers, Bidding & Commercial Commitment) foundations of KrishiSetu.

An **Order** is generated exclusively from an **ACCEPTED Phase 4 Offer**. The accepted offer is preserved historically intact, and a snapshot of agreed commercial values (crop, variety, quantity, unit, agreed price per unit, total agreed value, participant contact information, and public location) is captured inside the `Order` entity.

---

## 2. Order State Machine Specification

```
ORDER_CREATED
      │
      ▼
  CONFIRMED ──────► PICKUP_PLANNED ──────► READY_FOR_PICKUP ──────► PICKED_UP
      │                   │                      │                     │
      ▼                   ▼                      ▼                     ▼
  CANCELLED           CANCELLED              CANCELLED            IN_TRANSIT
                                                                       │
                                                                       ▼
                                                                   DELIVERED
                                                                       │
                                                                       ▼
                                                               RECEIPT_PENDING
                                                                       │
                                                                       ▼
                                                                   COMPLETED
```

### Transition Authority Matrix

| Target Status | Permitted Actor | Prerequisite Status |
| :--- | :--- | :--- |
| `CONFIRMED` | Farmer or Buyer | `ORDER_CREATED` |
| `PICKUP_PLANNED` | Farmer or Buyer | `CONFIRMED` |
| `READY_FOR_PICKUP` | Farmer Only | `PICKUP_PLANNED` |
| `PICKED_UP` | Farmer or Buyer | `READY_FOR_PICKUP` |
| `IN_TRANSIT` | Farmer or Buyer | `PICKED_UP` |
| `DELIVERED` | Farmer or Buyer | `IN_TRANSIT` |
| `RECEIPT_PENDING` | Buyer Only | `DELIVERED` |
| `COMPLETED` | Buyer Only | `RECEIPT_PENDING` |
| `CANCELLED` | Farmer or Buyer | `ORDER_CREATED`, `CONFIRMED`, `PICKUP_PLANNED`, `READY_FOR_PICKUP` |

---

## 3. Inventory Commitment Accounting

Phase 5 reuses the Phase 4 inventory accounting model to prevent double-counting inventory:

$$\text{Committed Qty} = \sum \text{Qty}(\text{ACCEPTED Offers}) + \sum \text{Qty}(\text{CONFIRMED Prebookings})$$

$$\text{Available Qty} = \text{lot.quantityAvailable} - \text{Committed Qty}$$

- **Order Representation**: Creating an order from an accepted offer maintains the accepted offer's status as `ACCEPTED`, keeping `committedQuantity` intact without subtracting quantity twice.
- **Order Cancellation**: When an order is cancelled prior to transport dispatch, the underlying accepted offer status is set to `WITHDRAWN`, releasing the committed quantity back into available lot inventory for other buyers.

---

## 4. Security & Authorization Rules

1. **Session-Derived Identity**: Identity is derived strictly from server HTTP `krishisetu_session` cookies via `getAuthSession(req)`. Client-supplied user IDs in request bodies cannot override session credentials.
2. **Idempotency Guard**: 1-to-1 unique relation constraint `acceptedOfferId UNIQUE` prevents multiple orders from being generated from a single accepted offer.
3. **IDOR Protection**: Order viewing and transition endpoints (`/api/v1/orders/[id]`) verify that the authenticated user is either the order's farmer or buyer.
4. **Post-Acceptance Contact Privacy**: Direct phone numbers and contact details are visible ONLY to confirmed order participants. Unrelated marketplace users cannot view private details.

---

## 5. Offline Safety

- **Read Operations**: Order lists, deal receipts, timelines, and translation strings function offline via local browser state and IndexedDB caching.
- **Online Transition Guard**: High-risk workflow actions (e.g. order completion) check network connectivity (`navigator.onLine`), displaying explicit notices if offline to protect server transaction integrity.

---

## 6. Integration Readiness (Phase 6+)

Phase 5 output objects lay the foundation for:
- **Phase 6**: Transport Freight Booking, Driver Assignment, Live GPS Tracking, Cold Storage Booking, Escrow Payment Settlement, and Digital Contract PDF Generation.
