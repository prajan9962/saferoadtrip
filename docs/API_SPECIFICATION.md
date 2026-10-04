# SafeRoad+ API Specification (v1)

Base URL: `/api/v1`

---

## 1. Authentication & Users

### `POST /api/v1/auth/verify-token`
- **Description**: Verifies Firebase ID Token, synchronizes PostgreSQL user record, and returns user session.
- **Request Body**:
  ```json
  {
    "idToken": "string",
    "provider": "google.com | phone"
  }
  ```
- **Response 200**:
  ```json
  {
    "user": {
      "id": "uuid",
      "firebaseUid": "string",
      "email": "string",
      "phone": "string",
      "name": "string",
      "age": 28,
      "gender": "string",
      "language": "en"
    },
    "token": "string"
  }
  ```

### `GET /api/v1/users/me`
- **Description**: Retrieves profile, emergency contacts, and medical details of the current user.

### `PUT /api/v1/users/me`
- **Description**: Updates profile details, language preference, or emergency medical info.

---

## 2. Trips & Membership

### `POST /api/v1/trips`
- **Description**: Creates a new trip and automatically assigns the user as TRIP LEADER.
- **Request Body**:
  ```json
  {
    "destination": "string",
    "transportMode": "Car | Bus | Train | Flight",
    "targetMembersCount": 5,
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "hotel": {
      "name": "string",
      "placeId": "string",
      "address": "string",
      "latitude": 0.0,
      "longitude": 0.0
    }
  }
  ```

### `POST /api/v1/trips/join`
- **Description**: Sends a join request using a 6-character trip code.
- **Request Body**: `{ "tripCode": "ABC123" }`

### `POST /api/v1/trips/{tripId}/members/{memberId}/approve`
- **Description**: Trip leader approves or rejects a pending join request.

### `POST /api/v1/trips/{tripId}/state`
- **Description**: Updates trip lifecycle state (`UPCOMING`, `ACTIVE`, `COMPLETED`, `CANCELLED`).

### `POST /api/v1/trips/{tripId}/transfer-leadership`
- **Description**: Transfers trip leadership to an approved member.

---

## 3. Places & Hotel Validation

### `GET /api/v1/places/hotels/search`
- **Description**: Searches Google Places for verified hotels near a destination.
- **Query Params**: `destination=string`

---

## 4. GPS & Safe Bubble

### `POST /api/v1/trips/{tripId}/location`
- **Description**: Emits user GPS coordinate for active trip geofencing.
- **Request Body**:
  ```json
  {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "timestamp": "ISO-8601"
  }
  ```

### `PUT /api/v1/trips/{tripId}/safe-bubble`
- **Description**: Leader updates Safe Bubble radius (default 100 meters).

### `POST /api/v1/trips/{tripId}/boundary-response`
- **Description**: Responds to a Safe Bubble boundary breach ("I'm Safe" or "Need Help").

---

## 5. Emergency SOS

### `POST /api/v1/trips/{tripId}/sos`
- **Description**: Initiates an SOS alert with location and starts a 10-second timer.

### `POST /api/v1/sos/{sosId}/cancel`
- **Description**: Cancels an SOS alert within the 10-second window.

### `POST /api/v1/sos/{sosId}/escalate`
- **Description**: Leader escalates an uncancelled SOS to Police, Hospital, or Fire & Rescue.

### `GET /api/v1/sos/{sosId}/medical-info`
- **Description**: Authorized endpoint for Hospital/Police dashboard to view emergency medical data.

---

## 6. AI Safety Guide & Safe Route

### `POST /api/v1/ai/safety-guide`
- **Description**: Generates Gemini AI destination safety guide with verified safety recommendations.

### `POST /api/v1/ai/route-evaluation`
- **Description**: Evaluates route safety using Gemini AI and recommends safest route options.

### `POST /api/v1/trips/{tripId}/select-route`
- **Description**: Leader approves and locks the final trip route for online/offline caching.
