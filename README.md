# 🌾 KrishiSetu (कृषीसेतू)
## Smart Farmer Market Linkage & Regional Market Intelligence Platform
**Smart India Hackathon 2026 (SIH 2026) — Problem Statement SIH26132**

---

## 📌 Project Overview
KrishiSetu is a production-oriented, visual-first, multilingual market linkage and regional market intelligence platform built to empower Indian farmers. It provides direct buyer-seller trading, transparent bidding/counter-offering, logistics & storage booking, live regional market trends, location privacy, voice-first regional interactions (Marathi, Hindi, English), and a controlled, safe AI Task Agent.

---

## ✨ Key Features (Phases 1–12)
1. **Registration & Trust (Phase 1)**: Mobile/OTP onboarding, role selection (Farmer, Buyer, Trader, Logistics, Storage, Admin), trust verification badges.
2. **Dashboard & Core Marketplace (Phase 2)**: Visual crop grid, offline sync capabilities, multi-currency / regional formatting.
3. **Listings & Marketplace Expansion (Phase 3)**: Crop categorization, quality grade tags, lot location, photo attachments, active status tracking.
4. **Fixed Price & Bidding Engine (Phase 4)**: Fixed-price checkout, negotiated offers, counter-offer lineage, self-offer prevention, commitment locking.
5. **Orders & Digital Receipts (Phase 5)**: Automated order generation upon deal confirmation, digital receipts, order lifecycle state machine.
6. **Transport & Storage (Phase 6)**: Freight transport booking, cold storage space reservation, capacity checks, vehicle/facility tracking.
7. **Maps & Navigation (Phase 7)**: Geo-location distance matrix, regional market navigation, fuzzy location privacy buffers.
8. **Market Intelligence & Weather (Phase 8)**: APMC price comparison, historical trend indicators (UPWARD, DOWNWARD, STABLE), Open-Meteo live weather integration.
9. **Notifications & Alerts (Phase 9)**: Real-time deal alerts, price threshold triggers, SMS/in-app notification preferences.
10. **Trust, Safety & Dispute Management (Phase 10)**: User reputation scoring, buyer/seller reviews, report submission, dispute moderation.
11. **Voice-First Interaction Layer (Phase 11)**: Hands-free browser voice navigation, multilingual speech-to-text, spoken number/quantity normalization, consequential action confirmations.
12. **Controlled AI Task Agent (Phase 12)**: Multilingual AI Task Agent with Zod schema validation, server-bound single-use preview tokens, 5-minute TTL, double server-side revalidation, and zero direct DB/system access.

---

## 🛠️ Technology Stack
- **Frontend Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS, Lucide React Icons
- **Database & ORM**: SQLite (Development / Demo) via Prisma ORM
- **Authentication**: JWT & Cookie-based session management
- **Weather API**: Open-Meteo REST API (Keyless public meteorology data)
- **AI Task Provider**: Gemini 2.0 Flash REST API (with fallback `AIDemoAdapter` for keyless offline demo mode)
- **Validation**: Zod runtime schema validation

---

## 🏗️ Architecture Overview

```
       [ Farmer / Buyer ]
               │
               ▼
   [ Text Prompt / Voice Transcript (Phase 11) ]
               │
               ▼
   [ AI Task Agent Drawer UI (AITaskAgent.tsx) ]
               │
   POST /api/v1/ai/agent (JWT Auth + Zod Input Validation)
               │
               ▼
 ┌─────────────────────────────────────────────────────────┐
 │                   AITaskProvider                        │
 │  - Real Provider: GeminiProviderAdapter (Gemini 2.0)   │
 │  - Fallback Provider: AIDemoAdapter ("AI Demo Mode")    │
 └─────────────────────────────────────────────────────────┘
               │
               ▼
 ┌─────────────────────────────────────────────────────────┐
 │               Zod Runtime Schema Validation             │
 │ - Parses strictly structured tool calls                 │
 └─────────────────────────────────────────────────────────┘
               │
     ┌─────────┴────────────────────────┐
     ▼                                  ▼
[ Read-Only Intent ]            [ Consequential Action Intent ]
     │                                  │
     ▼                                  ▼
[ Tool Registry ]               [ Preview Token Manager ]
 (Calls Repositories)            (Generates 5-min Single-Use Token)
     │                                  │
     ▼                                  ▼
[ Return Data / UI ]            [ Confirmation UI Modal ]
                                        │ (User Action)
                                        ▼
                                POST /api/v1/ai/agent/confirm
                                        │
                                        ▼
                                [ Revalidate State & Exec Tool ]
                                        │
                                        ▼
                                [ Canonical Repository Path ]
```

---

## 🚀 Environment Setup & Configuration

### Environment Variables (`.env.local`)
Create a `.env.local` file in the root directory (do not commit secrets):

```env
# Server Session & Auth Secret
JWT_SECRET="your-secure-jwt-secret-key-here"

# Database Connection
DATABASE_URL="file:./dev.db"

# AI Task Agent Provider (Optional for Live Gemini AI, defaults to AI Demo Mode if omitted)
GEMINI_API_KEY=""

# Application Base URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 💻 Local Setup & Development Commands

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Database Migrations & Seed**:
   ```bash
   npx prisma db push
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Type Check**:
   ```bash
   npx tsc --noEmit
   ```

5. **Run Automated Audit Suite**:
   ```bash
   npx ts-node scripts/phase12_audit.ts
   ```

6. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```

---

## 🤖 AI Setup & "AI Demo Mode" Explanation
- **Live Mode**: When `GEMINI_API_KEY` is supplied, the AI Task Agent uses `GeminiProviderAdapter` (Gemini 2.0 Flash API) to parse multilingual user intent and execute safe tools.
- **AI Demo Mode**: When `GEMINI_API_KEY` is omitted, the system seamlessly uses `AIDemoAdapter`. It displays an explicit **"AI Demo Mode"** badge and handles predefined agricultural queries deterministically without pretending to possess general unconstrained intelligence or fabricating fake answers.

---

## 🔒 Security & Consequential Action Guardrails
- **Zero Direct Access**: AI models never have access to Prisma, SQL, node filesystem, or shell execution.
- **Single-Use Preview Tokens**: Consequential operations (creating listings, accepting offers, generating orders, booking transport/storage, submitting reports) return a 5-minute single-use token requiring explicit user tap in the confirmation modal.
- **Double Revalidation**: All business rules, ownership checks, and entity state machines are validated both at preview generation and server confirmation.

---

## 📝 Prototype Limitations & Production Note
> **Note**: Current preview tokens use server-memory storage (`PreviewTokenStore`) for the SIH prototype. Production multi-instance deployment should use durable shared server-side storage such as Redis or PostgreSQL with appropriate expiration and atomic consumption.

---

## 📄 License & Presentation Note
Prepared for **SIH 2026 (Problem Statement SIH26132)**. All rights reserved.
