# SafeRoad+ Backend Engine & Telemetry Microservice

Mission-critical Node.js / Express / TypeScript backend powering dynamic geofencing, high-speed telemetry ingestion, real-time SOS distress escalation, and Gemini 2.5 AI convoy safety analysis.

---

## 🏛️ Architecture & Services

- **Telemetry Ingestion Engine (`/server/geofenceService.ts`)**:
  - Ingests GPS fixes from Leader and Members.
  - Haversine mathematical distance calculation with dynamic speed and bearing offsets.
  - Real-time geofence breaches (`SAFE_BUBBLE_BREACH`, `STRAGGLER_ALERT`).
- **SOS & Emergency Services Dispatch (`/server/sosService.ts`)**:
  - 10-second grace cancellation window.
  - Offline Room DB sync with strict idempotency key deduplication.
  - Dispatch to Indian emergency authorities (Police 112, Ambulance 108, Fire 101, NDRF 1070).
- **Gemini AI Safety Copilot (`/server/geminiService.ts`)**:
  - Convoy pace analysis, terrain elevation risk assessment, and proactive stop recommendations using `@google/genai`.
- **Database & Authentication (`/server/database.ts`, `/server/firebaseAuth.ts`)**:
  - In-memory ACID simulated repository with PostgreSQL / Cloud SQL compatibility.
  - Firebase Auth token verification.

---

## 🚀 Running the Backend

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start development server
npm run dev

# 4. Production build & start
npm run build
npm start
```
