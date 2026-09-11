# KRISHISETU (कृषीसेतू) — PHASE 12: CONTROLLED AI TASK AGENT

## 1. Overview & Architectural Flow
Phase 12 introduces a **Controlled AI Task Agent** built on top of KrishiSetu's frozen domain models and APIs (Phases 1–11). Designed for multi-lingual natural language task execution (text up to 2,000 characters or Phase 11 voice transcripts), the AI Agent acts strictly as an interpretation and tool dispatch layer.

> [!IMPORTANT]
> **SIH Platform Statement**:
> SIH-ready controlled AI prototype built on a production-oriented architecture. Consequential actions require explicit user confirmation and server-side revalidation.

```
+-------------------------------------------------------------------------------+
|                             USER INTERACTION LAYER                            |
|       User Text Prompt (<= 2,000 chars) OR Phase 11 Voice Transcript          |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                            SERVER-SIDE API GATEWAY                            |
|                    POST /api/v1/ai/agent (getAuthSession)                     |
|           Enforces: Max 2000 chars, Max 5-turn context, Rate Limits           |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                             PROVIDER ABSTRACTION                              |
|        IAITaskProvider -> GeminiProviderAdapter / AIDemoAdapter               |
|            Produces Structured JSON parsed via AIAgentResponseSchema          |
+-------------------------------------------------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                            CONTROLLED TOOL REGISTRY                           |
|             ToolRegistry.ts (21 Registered Allowlisted Tools)                |
|      Zod Argument Validation -> Session Auth -> Role & Verification Gate      |
+-------------------------------------------------------------------------------+
                     /                                     \
                    /                                       \
                   v                                         v
+------------------------------------+    +------------------------------------+
|           READ-ONLY TOOLS          |    |     ACTION PREPARATION TOOLS       |
| Direct Invocation of Existing      |    | Generates Server-Bound Preview Token|
| Business Services & Repositories   |    | (PreviewTokenStore, TTL 5 mins)    |
+------------------------------------+    +------------------------------------+
                   |                                         |
                   v                                         v
+------------------------------------+    +------------------------------------+
|       READ-ONLY RESULT CARD        |    |      AITaskConfirmation UI MODAL    |
|   Displayed directly in Agent UI   |    |      Displays [Edit] [Cancel]      |
|   (Price, Weather, Transport, etc.)|    |          and [Confirm] buttons     |
+------------------------------------+    +------------------------------------+
                                                             |
                                                             v (User Taps Confirm)
                                          +------------------------------------+
                                          |    SERVER CONFIRMATION ENDPOINT    |
                                          |     POST /api/v1/ai/agent/confirm  |
                                          |  1. Re-authenticates session       |
                                          |  2. Consumes preview token (1-use) |
                                          |  3. Re-fetches entity state from DB|
                                          |  4. Re-checks permissions & rules  |
                                          |  5. Re-validates stale state       |
                                          +------------------------------------+
                                                             |
                                                             v
                                          +------------------------------------+
                                          |    CANONICAL BUSINESS OBJECT       |
                                          |  lotRepository / biddingRepository |
                                          |  orderRepository / etc.            |
                                          +------------------------------------+
                                                             |
                                                             v
                                          +------------------------------------+
                                          |          DATABASE (Prisma)         |
                                          +------------------------------------+
```

---

## 2. Canonical Business Boundary Tracing Table

In KrishiSetu's frozen architecture, domain repositories (`lotRepository`, `biddingRepository`, `orderRepository`, `transportRepository`, `storageRepository`, `reportRepository`) genuinely serve as the established canonical business-logic boundaries containing all atomic state machine invariants, commitment locks, capacity calculations, and transactional operations.

| Action | AI Tool | Canonical Business Boundary | Repository/DB Operation |
| :--- | :--- | :--- | :--- |
| `CREATE_CROP_LISTING` | `prepare_crop_listing` | `lotRepository.createLot` | `db.lot.create` |
| `ACCEPT_OFFER` | `prepare_accept_offer` | `biddingRepository.respondToBid` | `db.$transaction` $\rightarrow$ `db.offerAndBid.update` & `db.lot.update` |
| `REJECT_OFFER` | `prepare_reject_offer` | `biddingRepository.respondToBid` | `db.offerAndBid.update` |
| `COUNTER_OFFER` | `prepare_counter_offer` | `biddingRepository.respondToBid` | `db.$transaction` $\rightarrow$ `db.offerAndBid.create` |
| `GENERATE_ORDER` | `prepare_order` | `orderRepository.createOrderFromAcceptedOffer` | `db.$transaction` $\rightarrow$ `db.order.create` |
| `REQUEST_TRANSPORT` | `prepare_transport_request` | `transportRepository.createTransportRequest` | `db.transportRequest.create` |
| `RESERVE_STORAGE` | `prepare_storage_reservation` | `storageRepository.createStorageRequest` | `db.$transaction` $\rightarrow$ `db.storageRequest.create` |
| `SUBMIT_REPORT` | `prepare_report` | `reportRepository.createReport` | `db.report.create` |

---

## 3. Truthful Prototype vs Production Storage Note

> [!NOTE]
> **Prototype Storage Limitation**:
> Current preview tokens use server-memory storage for the SIH prototype. Production multi-instance deployment should use durable shared server-side storage such as Redis or PostgreSQL with appropriate expiration and atomic consumption.

---

## 4. Truthful Data & Provider Statements

1. **Weather Data Wording**: Weather observations and forecasts are retrieved from the configured application weather provider (`weatherDataProviderFactory`). Sample/demo data is clearly labelled as **Demo Data** and is never presented as official real-time government or IMD verified data unless connected to a live production feed.
2. **Market Intelligence Wording**: Price trend indicators output discrete trends (`UPWARD`, `DOWNWARD`, `STABLE`, `INSUFFICIENT_DATA`) based strictly on historical data slope. They are accompanied by the disclaimer: *"Trend indicators are based on available historical data and are not a guarantee of future prices."*

---

## 5. Formal Truthful Status Statement

> [!IMPORTANT]
> **Truthful Status Statement**:
> SIH-ready controlled AI prototype built on a production-oriented architecture. Consequential actions require explicit user confirmation and server-side revalidation.
