# KrishiSetu — Future Feature & Architectural Roadmap

This document maps planned future extensions that build on top of frozen Phase 1–10 foundations for post-SIH deployment.

---

## Completed Platform Architecture (Phases 1–10)
- **Phase 1**: Registration + Trust Foundation [APPROVED + FROZEN]
- **Phase 2**: Core Marketplace + Offline Sync [APPROVED + FROZEN]
- **Phase 3**: Listings + Marketplace Expansion [APPROVED + FROZEN]
- **Phase 4**: Offers/Bidding + Commercial Commitment [APPROVED + FROZEN]
- **Phase 5**: Orders + Deal Receipt [APPROVED + FROZEN]
- **Phase 6**: Transportation + Storage Fulfillment [APPROVED + FROZEN]
- **Phase 7**: Maps + Geographic Discovery [APPROVED + FROZEN]
- **Phase 8**: Market Intelligence + Weather [APPROVED + FROZEN]
- **Phase 9**: Notifications + Alerts [APPROVED + FROZEN]
- **Phase 10**: Trust, Reputation & Safety Layer [APPROVED + FROZEN]
- **Phase 11**: Voice-First Interaction Layer [APPROVED + FROZEN]
- **Phase 12**: Controlled AI Task Agent [APPROVED + FROZEN]

---

## Post-SIH Platform Roadmap Extensions

- **External Push & Messaging Integration**:
  - Push Notifications (FCM / WebPush) with real Firebase credentials.
  - SMS Integration (DLT Telemarketer API) for transactional OTPs and alerts.
  - WhatsApp Business API for rich receipt sharing.

---

## 1. External Push & Messaging Integration (Post-SIH Infrastructure)

- **Push Notifications (FCM / WebPush)**: Implement `PushNotificationProvider` with real Firebase Cloud Messaging API credentials to deliver native mobile & browser push alerts.
- **SMS Integration (DLT Telemarketer API)**: Implement `SMSProvider` with TRAI-approved DLT SMS templates for transactional OTPs, offer alerts, and pickup notifications.
- **WhatsApp Business API**: Implement `WhatsAppProvider` using Meta WhatsApp Business API for rich receipt sharing and order status updates.
- **Email Gateway**: Implement `EmailProvider` with SMTP / SendGrid credentials for formal PDF invoice & deal receipt delivery.

---

## 2. Future AI Agent & Analytics Extensions (Post-SIH)

- **Conversational Agri-Assistant**: Multi-modal AI agent consuming KrishiSetu Phase 1–10 APIs to answer farmer queries in Marathi, Hindi, and English.
- **Proactive Notification Digest**: AI agent querying active notifications (`GET /api/v1/notifications?unreadOnly=true`) to summarize urgent action items for farmers:
  > *"You have 1 accepted offer requiring order confirmation and 1 rain advisory forecast for Nashik district today."*
- **Explainable Recommendation Explanation**: Conversational interface explaining buyer matching scores, mandi transport realization estimates, and historical price movement indicators.

---

## 3. Financial Settlement & Escrow Integration (Post-SIH)

- **UPI / Payment Gateway Integration**: Connect agreed commercial contracts (`Order.agreedTotalValue`) to automated UPI intent links, escrow lockup, and digital proof-of-payment receipts.
