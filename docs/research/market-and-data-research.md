# Market and Data Research: APIs, Freshness, and Constraints

## Agricultural Data Ecosystem in India

### 1. Official Price & Mandi Data Sources
- **Agmarknet (Directorate of Marketing & Inspection)**:
  - *Coverage*: 3,000+ APMC mandis across India.
  - *Data Attributes*: Min Price, Max Price, Modal Price, Arrivals (Tonnes), Date.
  - *API & Access*: Open Government Data (OGD) Platform / API portal (`data.gov.in`).
  - *Limitations*: Delayed updates (often post-6 PM); inconsistent reporting by smaller rural mandis; no individual quality grade metrics.
- **e-NAM Portal Data**:
  - *Coverage*: 1,300+ integrated APMC mandis.
  - *API & Access*: Restricted API requiring institutional onboarding; web scraping violates terms of service.
  - *Limitations*: Offline transactions outside e-NAM mandis are not captured.

### 2. Weather & Agrometeorological Data
- **IMD (India Meteorological Department)**:
  - *Coverage*: District & Sub-district level forecasts.
  - *API & Access*: Open weather datasets & RSS feeds; OpenWeatherMap / Tomorrow.io fallback for hyperlocal APIs.
  - *Limitations*: Hyperlocal micro-climate variations (e.g., sudden hail in a single village) are difficult to predict deterministically.

### 3. Identity & Verification Data Infrastructure
- **DigiLocker / Aadhaar OAuth (MeitY)**:
  - *Capability*: Official identity document verification (Aadhaar, PAN, Driving License, Land Records / 7/12 Extract in Maharashtra via Mahabhulekh).
  - *API & Access*: Requires official Sandbox/Production registration with MeitY / Digital India Corporation.
  - *Constraint for Hackathons/Dev*: Sandbox API requires organization credentials; local development must use clear **Demo Verification / Sandbox Mode** to avoid legal violations.

---

## Technical & Data Integrity Rules for KrishiSetu

1. **No Data Fabrication**: Never display static/mock data as "Live API Data".
2. **Transparent Timestamping**: Every displayed market price must state its exact source and timestamp (e.g., *"Source: Agmarknet API • Updated 10-Sep-2026 18:30 IST"*).
3. **Legal Compliance**: Do not scrape private trader portals or violate government API terms.
