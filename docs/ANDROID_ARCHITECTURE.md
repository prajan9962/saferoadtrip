# SafeRoad+ Native Android Architecture Specification

## 1. Architectural Philosophy
SafeRoad+ Android adopts an **Offline-First Clean MVVM Architecture** adhering strictly to Android Jetpack Guidelines, Material Design 3, Zero-Trust Access Control, and Kotlin Coroutines/Flow.

```
                          ┌────────────────────────┐
                          │   Presentation Layer   │
                          │   (Jetpack Compose)    │
                          └───────────┬────────────┘
                                      │
                                      ▼
                          ┌────────────────────────┐
                          │    ViewModel Layer     │
                          │   (StateFlow / Coro)   │
                          └───────────┬────────────┘
                                      │
                                      ▼
                          ┌────────────────────────┐
                          │    Repository Layer    │
                          │  (Single Source Truth) │
                          └─────┬────────────┬─────┘
                                │            │
                                ▼            ▼
                     ┌──────────────┐    ┌──────────────┐
                     │  Local Data  │    │ Remote Data  │
                     │ (Room/Store) │    │  (Retrofit)  │
                     └──────────────┘    └──────┬───────┘
                                                │
                                                ▼
                                         ┌──────────────┐
                                         │ SafeRoad+ API│
                                         │(Node/FastAPI)│
                                         └──────────────┘
```

---

## 2. Layer Definitions

### 2.1 Presentation Layer (`ui/`)
- Pure Jetpack Compose UI with declarative layout components.
- Zero Business Logic inside Composables; all state hoisting performed through ViewModels.
- State exposed strictly via immutable Kotlin `StateFlow<UiState>`.
- Responsive layout supporting phones and foldables.
- Theme system supporting Light, Dark, and Dynamic Accent colors without altering standard safety alert semantics.

### 2.2 Domain Layer (`domain/`)
- Pure Kotlin data models (`User`, `Trip`, `SOSRecord`, `SafeRoute`, `TripReview`).
- Clean separation between DTOs and UI domain objects.

### 2.3 Repository Layer (`data/repository/`)
- Single Source of Truth coordinating between Room DB (local cache) and Retrofit API services (remote).
- Implements offline queueing: when network connectivity is lost, operations like SOS alerts, "I'm Safe" responses, and trip reviews are persisted in Room and synchronized automatically via `WorkManager`.

### 2.4 Local Storage Layer (`data/local/`)
- **Room Database (`SafeRoadDatabase`):**
  - `trips` table: Active and completed trips, offline route waypoints.
  - `offline_queue` table: Actions dispatched while offline waiting for network restore.
  - `trip_reviews` table: Locally cached trip reviews.
  - `sos_records` table: Distress beacons with timestamps, battery, and coordinates.
- **DataStore (`ThemePreferencesRepository`):**
  - Theme mode (SYSTEM, LIGHT, DARK).
  - Selected Accent Color (Ocean Blue, Safety Cyan, Emerald Green, Purple, Amber, Crimson, Custom Hex).

### 2.5 Remote Network Layer (`data/remote/`)
- Retrofit 2 + OkHttp 3.
- `AuthInterceptor`: Injects Firebase ID token into `Authorization: Bearer <token>` on all requests.
- Automatic retry and exponential backoff for transient 503/429 network spikes.

### 2.6 Background & System Services (`services/`)
- **Foreground Location Service (`SafeBubbleLocationService`):**
  - Runs active notification foreground service during active trips.
  - Interacts with `FusedLocationProviderClient` for battery-efficient continuous GPS monitoring.
  - Evaluates Haversine distance from leader location and dispatches local Boundary Alerts upon 100m geofence breach.
- **Offline BLE Service (`BleMeshService`):**
  - Broadcasts short-range beacon packets (UUID, TripId, StatusCode) within a 100m radius.
  - Facilitates Device-to-Device emergency mesh communication when cellular connectivity drops.

---

## 3. Directory Layout
```
android/app/src/main/java/com/saferoad/app/
 ├── data/
 │   ├── api/               # Retrofit service declarations & API models
 │   ├── local/             # Room Database, DAOs, Entities, DataStore
 │   ├── model/             # Domain data models (Trip, User, SOS, Route, Review)
 │   └── repository/        # Repositories (Auth, Trip, SOS, Bubble, AI, Review)
 │
 ├── navigation/            # Screen routes, NavGraph, BottomNavigation
 │
 ├── services/
 │   ├── location/          # Foreground GPS Location Service & Geofence math
 │   └── ble/               # Bluetooth Low Energy Mesh Communication
 │
 ├── ui/
 │   ├── auth/              # Login, Phone OTP, Google Sign-In
 │   ├── home/              # Dashboard, status overview, quick actions
 │   ├── trip/              # Trip management, creation, join code, completed list, review
 │   ├── map/               # MapLibre/Google Map, pins, 100m bubble, route polyline
 │   ├── safety/            # Smart Safe Bubble telemetry, AI Safety Guide, Destination Summary
 │   ├── sos/               # 10s countdown cancellation, emergency SMS gateway status, leader command
 │   ├── chat/              # In-trip group chat & leadership announcements
 │   ├── authority/         # Hospital triage & Police emergency dashboard
 │   ├── notifications/     # Notifications center
 │   ├── profile/           # User profile & medical privacy settings
 │   ├── settings/          # General settings & Appearance/Theme customizer
 │   └── theme/             # Material 3 ColorScheme, Typography, ThemeManager
 │
 └── MainActivity.kt        # App entry point, session listener & NavHost
```
