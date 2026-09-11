# Phase 9 Architecture & Specification — Notifications, Alerts & Action Reminders

## Scope
Phase 9 extends KrishiSetu with an event-driven Notifications, Alerts, and Action Reminders engine. It delivers actionable in-app notifications, user category preferences, mandi price alerts, weather advisories, read/unread state tracking, deep-link navigation, and IndexedDB offline caching without modifying frozen Phase 1–8 domain contracts or creating fake background activity.

---

## Key Architectural Principles

1. **Reliable Domain Event Dispatch**:
   - Business transactions (offer responses, order status updates, transport/storage bookings) execute authoritatively first.
   - Event notifications are dispatched AFTER the underlying database transaction succeeds.
   - A notification dispatch failure is handled silently so an already-successful transaction is never rolled back.

2. **Event Notifications vs Data Alerts**:
   - **Event Notifications**: Triggered inline upon domain state changes (Offer, Order, Transport, Storage).
   - **Data-Condition Alerts**: Evaluated when relevant market or weather data is queried (`evaluateMarketAlerts`, `evaluateWeatherAlerts`).

3. **Demarcation & Truthful Data Attribution**:
   - Notifications derived from demo sandbox datasets (e.g. Agmarknet Demo / IMD Demo) include `{ isDemoData: true, source: "Agmarknet Sandbox / Demo Data" }`.
   - The UI explicitly renders `"Demo Data Alert"` badges for sample-based notifications.

4. **Preference Semantics**:
   - `enableInApp`: Master control toggle for optional in-app alerts.
   - Category toggles: Toggles for `OFFER`, `ORDER`, `TRANSPORT`, `STORAGE`, `MARKET`, `WEATHER`, `REMINDER`.
   - **Required Workflow Enforcement**: Critical transactional notices (`isRequired: true`) bypass optional category toggles so users do not miss necessary workflow steps.

5. **IDOR & Security Boundaries**:
   - All `/api/v1/notifications/*`, `/api/v1/notification-preferences`, and `/api/v1/alerts/*` endpoints derive user identity strictly from authenticated sessions.
   - Users can only read, mark as read, or modify their own notifications and preferences.

6. **Offline IndexedDB Infrastructure**:
   - Notifications are cached client-side in IndexedDB (`notifications_cache` store in `krishisetu_offline_db` version 2).
   - When offline, cached notifications remain viewable with a prominent cache banner (`"Viewing Cached Notifications (Offline Mode)"`).

7. **Extensible Dormant External Provider Stubs**:
   - Architected interfaces for `IPushNotificationProvider`, `ISMSProvider`, `IWhatsAppProvider`, and `IEmailProvider`.
   - Dormant stubs return explicit unconfigured statuses until real third-party credentials exist. No fake push/SMS behavior is claimed.

8. **Future AI Agent Compatibility**:
   - Unread feeds and action reminders are queryable via standard API endpoints (`GET /api/v1/notifications?unreadOnly=true`), allowing a future AI agent layer to inspect user notifications without implementing AI in Phase 9.

---

## API Endpoints (`/api/v1/`)

- `GET /api/v1/notifications` — Fetch user notifications with category and unread filters.
- `GET /api/v1/notifications/unread-count` — Fast unread notification count lookup.
- `PATCH /api/v1/notifications/[id]/read` — Mark single notification as read (with IDOR protection).
- `PATCH /api/v1/notifications/read-all` — Mark all user notifications as read.
- `GET /api/v1/notification-preferences` & `PATCH /api/v1/notification-preferences` — Manage category toggles.
- `GET /api/v1/alerts`, `POST /api/v1/alerts`, `DELETE /api/v1/alerts/[id]` — Manage custom mandi price alerts.

---

## Verification & Audit Results

- `scripts/phase9_audit.ts`: **19 / 19 PASSED (100%)**
- `scripts/phase8_audit.ts`: **14 / 14 PASSED (100%)**
- `scripts/phase7_audit.ts`: **14 / 14 PASSED (100%)**
- `scripts/phase6_audit.ts`: **16 / 16 PASSED (100%)**
- `scripts/phase5_audit.ts`: **21 / 21 PASSED (100%)**
- `scripts/phase4_audit.ts`: **18 / 18 PASSED (100%)**
- TypeScript (`npx tsc --noEmit`): **0 ERRORS**
- Build (`npm run build`): **EXIT CODE 0 (54 Routes Prerendered)**
