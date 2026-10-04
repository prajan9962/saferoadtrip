# SafeRoad+ Security & Data Privacy Specification

## 1. Authentication & Token Verification
- **Firebase Authentication**: Users authenticate via Google Sign-In or Phone OTP using Firebase SDK.
- **Server-Side Verification**: Every incoming REST API request must include a `Bearer <Firebase_ID_Token>` header.
- **Token Decryption**: Backend verifies token signature using Firebase Admin SDK, extracting `uid`, `email`, and `phone_number`. Unverified requests receive HTTP 401 Unauthorized immediately.
- **No Insecure OTP Bypasses**: Hardcoded or arbitrary OTP shortcuts are strictly forbidden in production code.

## 2. Role-Based Access Control (RBAC)
- **Authoritative Backend Verification**: Leader permissions (e.g., approving members, starting trips, escalating SOS alerts) are verified strictly in backend services. Client-provided roles or user claims are never trusted.
- **Single Active Trip Rule**: The backend enforces that a user cannot create or join a new trip while currently belonging to an active or upcoming trip.

## 3. Privacy & Medical Data Access Control
- **Strict Data Isolation**:
  - **Normal Team Members**: CANNOT view medical or emergency information of other trip members.
  - **Trip Leader**: Can view emergency contact info and blood group during an ACTIVE trip or SOS event.
  - **Escalated Authorities (Police / Hospital / Fire & Rescue)**: Access to full emergency medical profiles (Blood Group, Medical Conditions, Allergies, Emergency Contacts, Location, Route) is granted ONLY after an SOS alert is confirmed and explicitly escalated by the leader.
- **Audit Logging**: All accesses to medical records and emergency escalations write an immutable record to `audit_logs`.

## 4. API Security & Rate Limiting
- **Secret Protection**: Secrets (Firebase Service Account, Gemini API Key, OpenRouteService API Key) are stored exclusively in environment variables and never exposed to the client or committed to source code.
- **Input Sanitization**: All incoming Pydantic / TypeScript payloads are strictly validated for string length, array sizes, coordinate bounds, and date ranges.
- **Rate Limiting**: Protect endpoints against brute force (e.g., trip code guessing limited to 5 attempts per minute per IP).

## 5. Data Retention & Soft Deletion
- **Archival**: Physical deletion of trips or SOS events is prohibited. All deletions mark records as `is_archived = true` to preserve critical historical records for incident investigation and safety analytics.
