# KrishiSetu (कृषीसेतू) — Phase 6 Technical Manual
## Transportation + Storage Fulfillment Platform

### 1. Overview & Architecture
Phase 6 extends KrishiSetu from deal confirmation into a practical agricultural fulfillment platform. It connects farmers and buyers with service providers offering **Transportation** and/or **Storage** capabilities.

---

### 2. Provider Architecture
- **`ProviderProfile`**: Represents the person or business entity (1-to-1 with `User`).
- **Capabilities**: Modeled as service flags (`hasTransportServices`, `hasStorageServices`). A provider can offer transportation only, storage only, or both.
- **Verification**: Uses truthful verification levels (`MOBILE_VERIFIED`, `PROFILE_PENDING`, `PROFILE_VERIFIED`, `REJECTED`).

---

### 3. Transportation Fulfillment
- **Arrangement Types**:
  - `FARMER_ARRANGED`: Farmer independently arranges transport.
  - `BUYER_ARRANGED`: Buyer independently arranges transport.
  - `KRISHISETU_PROVIDER`: Fulfilled via registered platform provider.
- **Provider $\neq$ Driver**: Provider/business can assign driver details (`driverName`, `driverMobile`) without a separate driver account system.
- **One Active Transport Assignment Invariant**: Enforces at most ONE active transport request (`status NOT IN ['CANCELLED']`) per Order.
- **State Machine**:
  $$\text{REQUESTED} \rightarrow \text{ACCEPTED} \rightarrow \text{ASSIGNED} \rightarrow \text{PICKUP\_PLANNED} \rightarrow \text{READY\_FOR\_PICKUP} \rightarrow \text{PICKED\_UP} \rightarrow \text{IN\_TRANSIT} \rightarrow \text{DELIVERED} \rightarrow \text{COMPLETED}$$

---

### 4. Storage Fulfillment & Capacity Accounting
- **Canonical Unit Policy & Normalization**: Facilities specify `capacityUnit` (`Quintal` or `Tonne`). Quantities normalize using $1 \text{ Tonne} = 10 \text{ Quintals} = 1000 \text{ kg}$. Incompatible units throw HTTP 400 `UNIT_MISMATCH`.
- **Capacity Consuming States**: `['ACCEPTED', 'RESERVED', 'CHECK_IN_PENDING', 'STORED', 'RELEASE_REQUESTED']`.
- **Free States**: `['REQUESTED', 'RELEASED', 'COMPLETED', 'CANCELLED']`.
- **Concurrency & Overbooking Guard**: Row-level locking on `StorageFacility` within interactive Prisma transactions (`db.$transaction`). Overbooking throws HTTP 409 Conflict.
- **State Machine**:
  $$\text{REQUESTED} \rightarrow \text{ACCEPTED} \rightarrow \text{RESERVED} \rightarrow \text{CHECK\_IN\_PENDING} \rightarrow \text{STORED} \rightarrow \text{RELEASE\_REQUESTED} \rightarrow \text{RELEASED} \rightarrow \text{COMPLETED}$$

---

### 5. 3-Tier Privacy Model
1. **PUBLIC**: District, Taluka, Village, approximate distance.
2. **DISCOVERY**: Available capacity, storage type, vehicle specs, pricing model.
3. **FULFILLMENT**: Exact street address, exact coordinates, driver name, mobile number — returned **strictly** to authorized participants. Masked for all other users.

---

### 6. Order Integration & Cost Separation
- Extends `/orders/[id]` to show attached Transport Assignment and Storage Reservation cards.
- Costs are presented as separate breakdown items:
  - `Crop Agreed Commercial Value`
  - `Estimated Transport Cost`
  - `Estimated Storage Cost`
  - `Estimated Total Fulfillment Costs` *(Estimate Only)*

---

### 7. Verification Commands
```bash
# Phase 6 Audit Test Suite
npx tsx scripts/phase6_audit.ts

# Phase 4 & Phase 5 Regression Audit
npx tsx scripts/phase4_audit.ts
npx tsx scripts/phase5_audit.ts

# TypeScript Type Check & Next.js Production Build
npx tsc --noEmit
npm run build
```
