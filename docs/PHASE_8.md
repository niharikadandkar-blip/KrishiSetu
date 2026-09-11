# Phase 8 Architecture & Specification — Market Intelligence + Weather Platform

## Scope
Phase 8 extends KrishiSetu with a trustworthy Market Intelligence and Agricultural Weather infrastructure to assist farmers in price discovery, nearby market comparison, historical trend analysis, probabilistic outlook indicators, estimated net realization, and weather-aware harvest/storage planning.

---

## Data Source Policy
- **Provider Architecture**: Abstracted through `IMarketDataProvider` and `IWeatherDataProvider` interfaces.
- **Provider Implementations**:
  - `DemoMarketDataProvider` / `DemoWeatherDataProvider`: Provides realistic deterministic sandbox data when live API credentials are unconfigured or unavailable.
  - `RealMarketDataProvider` / `RealWeatherDataProvider`: Supported path for live Agmarknet / IMD / OpenWeather API connections.
- **Honest Labeling Policy**:
  - Every market price and weather payload explicitly contains: `source`, `dataTimestamp`, `retrievedAt`, `isDemoData`, `providerName`.
  - Sandbox/seed data is clearly labeled `"Demo Data"` / `"Sample Data"` (never mislabeled as live or government-verified).
  - Stale cached data includes prominent visual indicators (`"Showing last available data • Last updated: [timestamp]"`).

---

## Market Intelligence Core
- **Data Points**: Crop Name, Variety, Mandi/Market, District, State, Market Date, Min Price (INR), Max Price (INR), Modal Price (INR), Arrivals Quantity, Unit, Source, Data Timestamp.
- **Nearby Market Comparison**: Integrates Phase 7 `GeoService` to calculate straight-line geodesic distance to nearby mandis. Includes contextual warning: *"Higher price does not always mean higher profit. Transport, storage, and other costs may affect your final realization."*
- **Historical Trends**: 7-day and 30-day historical price movement, percentage change, and period comparisons formatted with non-deterministic honest wording (*"Modal price increased compared with the previous available period."*).
- **Price Trend Indicator**: Historical trend indicator (`UPWARD`, `DOWNWARD`, `STABLE`, `INSUFFICIENT_DATA`) computed deterministically from 30-day price trajectory slope (requires $\ge 3$ observation data points). This is a deterministic historical trend indicator — **NOT** a machine-learning prediction and **NOT** a statistically calibrated probability forecast. Displays zero fabricated probability percentages. Architecture remains extensible for future validated probabilistic models. Mandatory disclaimer: *"Trend indicators are based on available historical data and are not a guarantee of future prices."*
- **Estimated Net Realization**:
  $$\text{Estimated Net Realization} = \text{Selling Value} - \text{Estimated Transport Cost} - \text{Estimated Storage Cost}$$
  Explicitly labeled as estimate without modifying Phase 4/5/6 commitment or order accounting.

---

## Weather Core
- **Data Points**: Temperature (°C), Weather Condition (Sunny, Rainy, Cloudy, Thunderstorm, Foggy), Humidity (%), Rainfall (mm), Wind Speed (km/h), Forecast, Location, Timestamp, Source.
- **Location Privacy**: Reuses Phase 7 coarse geographic boundaries (district/taluka). Never exposes exact private farm GPS or street addresses.
- **Agricultural Context**: Provides cautious advisory hints (*"Rainfall may affect harvest timing"*, *"Could be relevant for storage"*). Avoids deterministic agronomic promises.

---

## API Contracts (`/api/v1/`)
- `GET /api/v1/market-intelligence?crop=Onion&district=Nashik`
- `GET /api/v1/market-intelligence/current`
- `GET /api/v1/market-intelligence/history`
- `GET /api/v1/market-intelligence/nearby`
- `GET /api/v1/market-intelligence/outlook`
- `GET /api/v1/weather?district=Nashik`
- `GET /api/v1/weather/forecast`

---

## Offline Behavior & Cache
- Cached market prices and weather observations stored in `localStorage`.
- Display status banner when offline: `"Showing last available data (Last updated: [timestamp]). Internet connection required for latest market prices."`
