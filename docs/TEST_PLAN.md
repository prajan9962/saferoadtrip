# SafeRoad+ Comprehensive Test Plan

## 1. Authentication & Security Testing
- **Firebase Token Verification**: Test valid, expired, and malformed Firebase ID tokens. Ensure unauthorized access is rejected with HTTP 401.
- **Role Verification**: Attempt member actions using non-leader account (e.g., approving members, starting trip) and verify HTTP 403 Forbidden.
- **Medical Access Control**: Verify that normal members cannot query `/api/v1/sos/{sosId}/medical-info`. Ensure access is granted strictly to leaders during SOS or escalated hospital authorities.

## 2. Trip Management & Validation Testing
- **Auto Leader Assignment**: Verify trip creator is immediately assigned role `LEADER` with full permissions.
- **Unique Trip Code**: Ensure 6-character code is generated uniquely and expires after `end_date`.
- **Google Places Hotel Verification**: Test valid hotel name near destination versus fabricated hotel name. Ensure fabricated names are rejected.
- **Single Active Trip Constraint**: Attempt to create or join a second active trip while already belonging to an active trip. Verify rejection.
- **Member Limits**: Attempt to join a trip that has reached max capacity (20 members). Verify refusal.

## 3. GPS & Geofencing Testing
- **Location Emission**: Send GPS coordinates within 100m radius -> Verify state remains `INSIDE_BUBBLE`.
- **Boundary Breach**: Send GPS coordinate > 100m away -> Verify `BOUNDARY_ALERT` notification created.
- **Boundary Response**: Verify "I'm Safe" and "Need Help" status updates update backend record correctly.

## 4. SOS Emergency System Testing
- **10-Second Timer**: Initiate SOS -> verify 10-second cancellation window.
- **Cancellation**: Cancel SOS within 8 seconds -> verify state changes to `CANCELLED` and no escalation occurs.
- **Leader Review & Escalation**: Allow 10s timer to expire -> verify leader receives alert. Test escalation to Police/Hospital.

## 5. Gemini AI Safety Guide & Safe Route Testing
- **AI Safety Guide**: Call `/api/v1/ai/safety-guide` -> Verify structured safety guide return with advisories and source distinction.
- **Safe Route Recommendation**: Request AI route safety evaluation -> verify Gemini produces safety rankings. Verify final selection requires Leader approval.

## 6. Offline Caching & Sync Testing
- **Offline Route Caching**: Verify approved safe route persists in client cache.
- **Local Action Queue**: Perform offline actions (e.g., BLE message or offline boundary response) -> verify local queueing and automatic sync upon network reconnect.
