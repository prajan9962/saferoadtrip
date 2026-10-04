# SafeRoad+ Database Mapping (Server to Room Entities)

This document details the mapping between server storage (PostgreSQL/Firestore schemas) and the native Android Room local persistence layer.

---

## 1. Room Entity: `UserEntity`
- **Table Name:** `users`
- **Fields:**
  - `id: String` (Primary Key)
  - `firebaseUid: String`
  - `name: String`
  - `email: String`
  - `phone: String`
  - `age: Int`
  - `gender: String`
  - `preferredLanguage: String`
  - `role: String`
  - `bloodGroup: String`
  - `medicalConditions: String`
  - `allergies: String`
  - `emergencyContactName: String?`
  - `emergencyContactPhone: String?`
  - `emergencyContactRelationship: String?`

---

## 2. Room Entity: `TripEntity`
- **Table Name:** `trips`
- **Fields:**
  - `id: String` (Primary Key)
  - `code: String`
  - `destination: String`
  - `transportMode: String`
  - `targetMembersCount: Int`
  - `leaderId: String`
  - `leaderName: String`
  - `startDate: String`
  - `endDate: String`
  - `status: String` (UPCOMING, ACTIVE, COMPLETED, CANCELLED, ARCHIVED)
  - `safeBubbleRadiusMeters: Int`
  - `hotelJson: String?`
  - `selectedRouteJson: String?`
  - `isArchived: Boolean`
  - `updatedAt: Long`

---

## 3. Room Entity: `SosRecordEntity`
- **Table Name:** `sos_records`
- **Fields:**
  - `id: String` (Primary Key)
  - `tripId: String`
  - `userId: String`
  - `userName: String`
  - `latitude: Double`
  - `longitude: Double`
  - `accuracy: Float`
  - `status: String` (INITIATED, ACTIVE, CANCELLED, ESCALATED, RESOLVED)
  - `escalatedAuthority: String?`
  - `cancellationWindowExpiresAt: Long`
  - `createdAt: Long`

---

## 4. Room Entity: `TripReviewEntity`
- **Table Name:** `trip_reviews`
- **Fields:**
  - `id: String` (Primary Key)
  - `tripId: String`
  - `userId: String`
  - `destination: String`
  - `overallRating: Int` (1-5)
  - `safetyRating: Int` (1-5)
  - `routeRating: String`
  - `routeFeltSafe: String`
  - `destinationRating: Int`
  - `destinationExperiencesJson: String`
  - `safetyIssueType: String`
  - `safetyIssueDetails: String?`
  - `featureRatingsJson: String`
  - `suggestions: String?`
  - `isSynced: Boolean`
  - `createdAt: Long`

---

## 5. Room Entity: `OfflineQueueEntity`
- **Table Name:** `offline_queue`
- **Fields:**
  - `id: Long` (Auto-generate Primary Key)
  - `actionType: String` (SOS_TRIGGER, BUBBLE_RESPONSE, TRIP_REVIEW, CHAT_MESSAGE)
  - `payloadJson: String`
  - `createdAt: Long`
  - `retryCount: Int`
