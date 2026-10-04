# SafeRoad+ System Architecture Specification

## Overview
SafeRoad+ is an AI-powered tourist safety, group trip monitoring, smart navigation, offline communication, and emergency response system.

---

## Architectural Layers

```
+-----------------------------------------------------------------------+
|                            Client Tier                                |
|   +------------------------------------+--------------------------+   |
|   |         Web App (React/TS)         |   Android / WearOS App   |   |
|   +------------------------------------+--------------------------+   |
+-----------------------------------||-----------------------------------+
                                    || (HTTPS / REST / FCM)
+-----------------------------------\/-----------------------------------+
|                            Backend Tier                               |
|   +---------------------------------------------------------------+   |
|   |                  FastAPI / Express Server                      |   |
|   |   - Auth Middleware (Firebase ID Token Verification)         |   |
|   |   - Trip Lifecycle & Membership Controller                    |   |
|   |   - Safe Bubble Geofencing Engine                             |   |
|   |   - Emergency SOS & Escalation Router                         |   |
|   |   - Audit & Activity Logger                                   |   |
|   +---------------------------------------------------------------+   |
+-----------||----------------------||----------------------||-----------+
            ||                      ||                      ||
+-----------\/----------+ +---------\/----------+ +---------\/----------+
|  Database / Data Layer | |  AI Intelligence   | |  External Services  |
|  - PostgreSQL         | |  - Google Gemini    | |  - Firebase Auth    |
|  - Room / Local Cache | |    Safety Engine    | |  - Firebase FCM     |
|                       | |                     | |  - Google Places    |
|                       | |                     | |  - Google Routes    |
+-----------------------+ +---------------------+ +---------------------+
```

---

## Core System Components

### 1. Client Application (Web / Android Architecture)
- **MVVM / Component Architecture**: Clean separation between UI Views, State Managers/ViewModels, and Data Repositories.
- **Offline Caching**: Local database cache (Room / LocalStorage) to store active trip details, approved safe routes, and pending emergency action queues.
- **Location Service**: Background tracking active during live trips only, emitting periodic GPS coordinates to the backend.

### 2. Backend Server (FastAPI / Express API Gateway)
- **Authoritative Business Logic**: The backend is the sole source of truth for user identities, trip ownership, membership state, SOS events, and medical access permissions.
- **Authentication**: Verifies Firebase ID Tokens on every protected endpoint.
- **Geofencing Engine**: Computes distance relative to the trip leader or destination center point to evaluate Safe Bubble breaches (default 100m radius).

### 3. Data Storage (PostgreSQL & Local Cache)
- **Relational Integrity**: 10 core tables with foreign key constraints, indexing, timestamps, and soft deletion (`is_deleted` flags).
- **Soft Deletion & Archival**: Historical trip data and SOS records are soft-deleted to remain available for safety analytics and incident auditing.

### 4. AI Safety Engine (Google Gemini API)
- **Server-Side Proxy**: Calls Gemini via `@google/genai` exclusively on the backend to avoid exposing secret API keys to the client.
- **Source-Derived Safety Analysis**: Evaluates destination safety, road conditions, crime advisories, and route risk profiles.

### 5. Maps & Places Subsystem
- **Google Places**: Validates hotel existence near destination prior to trip creation.
- **Google Routes**: Calculates primary and alternative travel routes for AI safety evaluation.
