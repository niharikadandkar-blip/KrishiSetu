# KrishiSetu (कृषीसेतू) — Phase 4 Technical Specification & Architecture Manual
## Fixed-Price Selling, Offers, Bidding & Counter-Offer Negotiation Engine

---

## 1. Architectural Purpose & Overview

Phase 4 introduces a real, production-ready produce negotiation layer on top of the established Phase 1 (Trust & Identity), Phase 2 (Geospatial Discovery & Pre-booking), and Phase 3 (Listing Management & RFQ Sourcing) foundations of KrishiSetu.

Rather than treating produce transactions as rigid e-commerce checkouts, Phase 4 models authentic agricultural trading dynamics in Indian mandis and direct farmgate sales:
* **Asking Price Benchmark**: Farmers define ask prices (per quintal) rooted in live Agmarknet mandi benchmarks.
* **Flexible Purchase Intent**: Buyers can accept the asking price or propose custom offers with negotiable prices, quantities, and payment terms (e.g. Instant Cash vs. 7/15-day Credit).
* **Multi-Hop Counter-Offers**: Counter-offers create immutable lineage records rather than mutating existing offer records in-place.
* **Atomic Commitment**: Accepting an offer locks quantity inside single database transactions and transitions the lot status to `UNDER_OFFER` or `SOLD`/`COMPLETED`.

---

## 2. Offer Engine & Lineage Architecture

Phase 4 extends the single authoritative `OfferAndBid` model in `biddingRepository.ts` to enforce a unified state machine:

```
                  ┌──────────────┐
                  │   PENDING    │
                  └──────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
 ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
 │   ACCEPTED   │ │  REJECTED    │ │  WITHDRAWN   │
 └──────────────┘ └──────────────┘ └──────────────┘
                         │
                         ▼ (New Offer Linked via counterOfferId)
                  ┌──────────────┐
                  │  COUNTERED   │
                  └──────────────┘
```

### Counter-Offer Lineage Tracing
When a counter-offer is proposed (by either farmer or buyer):
1. The parent offer's status transitions from `PENDING` to `COUNTERED`.
2. A new `OfferAndBid` record is created containing the counter price, quantity, and payment terms.
3. The new record's `counterOfferId` points to the ID of the parent offer.
4. Calling `getNegotiationTimeline(rootOfferId)` recursively traverses the ancestor chain (`counterOfferId`) from leaf to root, returning a chronological `NegotiationTimelineEvent[]` array.

---

## 3. Atomic Concurrency & Explicit Quantity Accounting

### Inventory Reservation Formula
To prevent overselling when multiple buyers make concurrent offers or prebookings:

$$\text{Committed Quantity} = \sum \text{Qty}(\text{ACCEPTED Offers}) + \sum \text{Qty}(\text{CONFIRMED Prebookings})$$

$$\text{Available Quantity} = \text{totalQuantity} - \text{Committed Quantity}$$

### Database Transaction Boundary (`db.$transaction`)
Offer acceptance is executed inside a single PostgreSQL/SQLite Prisma interactive transaction:
1. **Re-fetch Lot & Offer**: Re-fetches the target produce lot and target offer within the transaction boundary.
2. **State Validation**: Confirms offer is in `PENDING` or `COUNTERED` status.
3. **Quantity Accounting**: Verifies $\text{Offer Qty} \le \text{Available Quantity}$.
4. **Concurrency Conflict**: If $\text{Offer Qty} > \text{Available Quantity}$, rolls back transaction and throws HTTP 409 Conflict.
5. **State Updates**:
   - Updates target offer status to `ACCEPTED`.
   - If total committed quantity equals `totalQuantity`, sets lot status to `SOLD` (already harvested) or `BOOKING_THRESHOLD_REACHED` (pre-booked).
   - If total committed quantity > 0, sets lot status to `UNDER_OFFER`.
   - Sets older open offers for the same lot to `REJECTED` if remaining quantity is insufficient.

---

## 4. Security & Authorization Rules

1. **Derived Identity**: All endpoints derive user identity directly from verified HTTP session tokens (`getAuthSession`). Client-supplied user IDs in request bodies are ignored.
2. **Self-Offer Guard**: Farmers are strictly prohibited from submitting offers on their own produce lots (`bidderId !== lot.farmerId`).
3. **Participant Verification**: Only the lot's farmer or the offer's buyer may view, respond to, or counter an offer.
4. **Closed Lot Guard**: Offers cannot be placed on lots with status `SOLD`, `COMPLETED`, or `CANCELLED`.
5. **Idempotency Safeguard**: API calls support optional `Idempotency-Key` headers to prevent double-submissions on flaky networks.

---

## 5. Buyer Offer Withdrawal

Buyers may withdraw their active offers (`POST /api/v1/offers/[id]/withdraw`):
* **Eligibility**: Only offers in `PENDING` status owned by the authenticated buyer can be withdrawn.
* **Transition**: Sets offer status to `WITHDRAWN`.
* **Ineligibility**: `COUNTERED`, `ACCEPTED`, or `REJECTED` offers cannot be withdrawn.

---

## 6. Offline Acceptance Safety

* **Drafting & Browsing**: Browsing offers, inspecting negotiation timelines, and preparing counter-offers can function offline via IndexedDB caching (`krishisetu_offline_v1`).
* **Online Acceptance Guard**: Accepting an offer requires live online connectivity (`navigator.onLine`). If offline, the client displays an explicit warning (`offers.offlineAcceptWarning`) preventing optimistic local acceptance, preserving server-side atomic inventory guarantees.

---

## 7. Commercial Agreement Foundation UI

When an offer is accepted:
* The system establishes a **Commercial Agreement Foundation**.
* Clear UI warnings state: *"Accepting an offer creates a binding commercial agreement foundation. Quantity will be locked and active counter-offers resolved."*
* The UI explicitly avoids making fake payment settlement claims, transparently indicating that digital escrow, payment collection, and transport dispatch will take place in Phase 5 & 6.

---

## 8. Integration Readiness (Phase 5 & 6)

Phase 4 output objects lay the foundation for:
* **Phase 5**: Trade Settlement, Escrow Ledger, Payment Gateway Integration (UPI / NetBanking / RTGS), Digital Contract PDF Generation.
* **Phase 6**: Logistics Freight Booking, Vehicle Dispatch, Quality Inspection Certificates, and Cold Storage Handover.
