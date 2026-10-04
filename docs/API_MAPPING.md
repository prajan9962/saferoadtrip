# SafeRoad+ API Mapping Specification

This document maps all backend REST endpoints to Android Retrofit interfaces.

## Base URL Configuration
- **Development Emulator:** `http://10.0.2.2:3000/api/v1/`
- **Cloud Run / Production:** `https://ais-dev-q4bdbvf7ftqdtoqsmhhbzu-555308255666.asia-southeast1.run.app/api/v1/`

---

## Retrofit Service Definition (`SafeRoadApiService`)

| Endpoint Path | HTTP Method | Retrofit Method | Request Body / Params | Response Model |
|---------------|-------------|-----------------|----------------------|----------------|
| `/auth/verify-token` | `POST` | `verifyToken(@Body req)` | `{ idToken: String }` | `AuthResponse` |
| `/users/me` | `GET` | `getCurrentUser()` | None | `UserProfileResponse` |
| `/users/me` | `PUT` | `updateProfile(@Body req)` | `UserProfile` | `UserProfileResponse` |
| `/users/me/emergency-contact` | `POST` | `updateEmergencyContact(@Body req)` | `EmergencyContact` | `EmergencyContactResponse` |
| `/users/me/test-emergency-sms` | `POST` | `testEmergencySms(@Body req)` | `{ latitude, longitude }` | `TestSmsResponse` |
| `/trips` | `POST` | `createTrip(@Body req)` | `CreateTripRequest` | `TripResponse` |
| `/trips/active` | `GET` | `getActiveTrip()` | None | `ActiveTripResponse` |
| `/trips/completed` | `GET` | `getCompletedTrips()` | None | `CompletedTripsResponse` |
| `/trips/join` | `POST` | `joinTrip(@Body req)` | `{ tripCode: String }` | `JoinTripResponse` |
| `/trips/{id}/state` | `POST` | `updateTripState(@Path("id") id, @Body req)` | `{ newState: String }` | `TripResponse` |
| `/trips/{id}/members/locations` | `GET` | `getMemberLocations(@Path("id") id)` | None | `LocationsResponse` |
| `/trips/{id}/bubble-telemetry` | `GET` | `getBubbleTelemetry(@Path("id") id)` | None | `BubbleTelemetryResponse` |
| `/trips/{id}/bubble-response` | `POST` | `sendBubbleResponse(@Path("id") id, @Body req)` | `{ response: "I_AM_SAFE" \| "NEED_HELP" }` | `BaseResponse` |
| `/trips/{id}/reviews` | `POST` | `submitTripReview(@Path("id") id, @Body req)` | `TripReview` | `TripReviewResponse` |
| `/trips/{id}/reviews/me` | `GET` | `getMyTripReview(@Path("id") id)` | None | `SingleReviewResponse` |
| `/destinations/{d}/reviews/summary` | `GET` | `getDestinationSummary(@Path("d") dest)` | None | `DestinationSummaryResponse` |
| `/sos/initiate` | `POST` | `initiateSos(@Body req)` | `{ tripId, latitude, longitude, accuracy }` | `SosInitiateResponse` |
| `/sos/{id}/cancel` | `POST` | `cancelSos(@Path("id") id)` | None | `BaseResponse` |
| `/sos/{id}/activate` | `POST` | `activateSos(@Path("id") id, @Body req)` | `{ latitude, longitude, accuracy }` | `SosActivateResponse` |
| `/sos/{id}/escalate` | `POST` | `escalateSos(@Path("id") id, @Body req)` | `{ authority: "POLICE" \| "HOSPITAL" \| "FIRE_RESCUE" }` | `BaseResponse` |
| `/sos/{id}/medical-profile` | `GET` | `getMedicalSnapshot(@Path("id") id)` | None | `MedicalSnapshotResponse` |
| `/ai/safety-guide` | `POST` | `generateSafetyGuide(@Body req)` | `{ destination: String, language: String }` | `SafetyGuideResponse` |
| `/ai/route-evaluation` | `POST` | `evaluateRoutes(@Body req)` | `{ origin, destination, transportMode }` | `RouteEvaluationResponse` |
| `/notifications` | `GET` | `getNotifications()` | None | `NotificationsResponse` |
| `/notifications/{id}/read` | `POST` | `markNotificationRead(@Path("id") id)` | None | `BaseResponse` |
| `/trips/{id}/messages` | `GET` | `getTripMessages(@Path("id") id)` | None | `MessagesResponse` |
| `/trips/{id}/messages` | `POST` | `sendTripMessage(@Path("id") id, @Body req)` | `{ messageText: String }` | `SingleMessageResponse` |
