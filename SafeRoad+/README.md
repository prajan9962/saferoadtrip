# SafeRoad+ 🛡️
### Mission-Critical Convoy Safety, Dynamic Geofencing & Emergency SOS Platform

SafeRoad+ is an enterprise-grade convoy telemetry and road travel safety ecosystem designed for group vehicular expeditions, fleet tracking, and real-time emergency distress coordination across both Web and Native Android platforms.

---

## 📂 Project Directory Structure

```
SafeRoad+/
│
├── android/                         # Native Android Application (Kotlin, Jetpack Compose, MapLibre)
│   ├── app/                         # Android application module & source code
│   │   ├── src/                     # UI screens, ViewModels, API repositories, MapLibre views
│   │   └── build.gradle.kts         # App-level Gradle build configuration
│   ├── build.gradle.kts             # Top-level root Gradle configuration
│   ├── settings.gradle.kts          # Project settings & dependency resolution
│   ├── local.properties.example     # Environment and SDK template
│   └── README.md                    # Android setup & compilation guide
│
├── backend/                         # Mission-Critical Telemetry & Emergency Backend (Node.js, Express)
│   ├── server/                      # Geofence service, SOS engine, Gemini AI copilot, database
│   ├── server.ts                    # Main API server entry point & WebSocket hub
│   ├── package.json                 # Backend dependencies and build scripts
│   ├── tsconfig.json                # TypeScript compiler configuration
│   ├── .env.example                 # Environment configuration template
│   └── README.md                    # Backend architecture and API reference
│
├── web/                             # Web Mission Control Dashboard (React 18, TypeScript, Tailwind, MapLibre)
│   ├── src/                         # React components, custom hooks, utils, state
│   ├── public/                      # Static assets, branding, map icons
│   ├── index.html                   # Web application HTML entry point
│   ├── vite.config.ts               # Vite bundler configuration
│   ├── package.json                 # Web frontend dependencies & scripts
│   └── README.md                    # Web setup and UI architecture
│
├── database/                        # Database Schemas & Migrations (PostgreSQL, Cloud SQL, PostGIS)
│   ├── migrations/                  # Sequential SQL migration files
│   │   └── 001_initial_saferoad_schema.sql
│   ├── seeds/                       # Seed scripts for national emergency authorities
│   │   └── 01_emergency_authorities_seed.sql
│   ├── schema.sql                   # Master database schema DDL
│   └── README.md                    # Database management guide
│
├── docs/                            # Engineering Specifications & Technical Blueprints
│   ├── ARCHITECTURE.md              # System design & microservice interaction diagrams
│   ├── API_SPECIFICATION.md         # Complete REST API & WebSocket documentation
│   ├── DATABASE_DESIGN.md           # Schema ER diagrams, indexes, and constraints
│   ├── SECURITY.md                  # RBAC, token security, and encryption guidelines
│   ├── TEST_PLAN.md                 # Automated test suite and offline sync protocols
│   ├── GAP_ANALYSIS.md              # Feature audit and capability evaluation
│   ├── REQUIREMENTS.md              # System requirements specification
│   └── README.md                    # Documentation index
│
├── .gitignore                       # Multi-platform version control ignore rules
└── README.md                        # Master project documentation
```

---

## 🌟 Key Capabilities

1. **Dynamic Safe Bubble Geofencing**: Real-time virtual perimeter centered dynamically on the Convoy Leader with adjustable radius (100m - 5000m) and proactive straggler detection.
2. **1-Tap Emergency SOS Dispatch**: Instant distress broadcast to group members and national emergency response centers (Police 112, Medical 108, Fire 101, NDRF 1070) with 10s grace period.
3. **MapLibre Open-Source Mapping**: High-performance OpenStreetMap vector and raster tiles without proprietary API lock-in.
4. **Gemini 2.5 Safety AI**: Proactive convoy pace monitoring, weather threat assessment, elevation fatigue analysis, and smart rest stop recommendations.
5. **Offline Resiliency & SQLite Room DB**: Automatic offline buffering and background synchronization with idempotent deduplication.

---

## 🚀 Quick Start Guide

### 1. Web Application & Backend
```bash
# Navigate to web or backend
cd SafeRoad+/backend
npm install
npm run dev

# Or run the web mission control
cd SafeRoad+/web
npm install
npm run dev
```

### 2. Android App
1. Open `SafeRoad+/android` in Android Studio.
2. Configure `local.properties` with Android SDK path.
3. Build and launch on device or emulator.
