# SafeRoad+ Frozen Requirements Specification

## 1. Authentication Requirements
- **FR-AUTH-1**: Support Google Sign-In and Phone Number + OTP authentication.
- **FR-AUTH-2**: All OTP authentications must be real and verified via Firebase. Demo shortcuts or arbitrary OTP acceptance are strictly prohibited.
- **FR-AUTH-3**: The backend must verify Firebase ID tokens on every request and match against PostgreSQL user records.

## 2. User Profile Requirements
- **FR-PROF-1**: Profile fields must store Name, Age, Gender, Mobile Number, and Preferred Language.
- **FR-PROF-2**: Emergency Information must store Emergency Contact, Blood Group, Medical Conditions, and Allergies.
- **FR-PROF-3**: Language preference changes must be supported.

## 3. Trip Management Requirements
- **FR-TRIP-1**: The creator of a trip automatically becomes the TRIP LEADER immediately upon creation.
- **FR-TRIP-2**: Joining members enter a unique 6-character trip code to send a join request.
- **FR-TRIP-3**: Trip creation must record Destination, Transport Mode, Member Count, Leader Name, Start/End Dates, and Hotel Booked.
- **FR-TRIP-4**: Selected hotels must be validated against Google Places to ensure physical existence at/near destination.
- **FR-TRIP-5**: Trip codes remain valid until the trip end date, after which joining is disabled.
- **FR-TRIP-6**: Trip membership rules require minimum 2 members, maximum initial capacity of 20 members (expandable to 60).
- **FR-TRIP-7**: A user cannot belong to multiple simultaneous active/upcoming trips.

## 4. Leadership & Lifecycle Requirements
- **FR-LEAD-1**: Leader permissions include approving/rejecting members, starting/ending trips, adjusting Safe Bubble radius, transferring leadership, and reviewing SOS alerts.
- **FR-LEAD-2**: When a leader leaves, the trip must either be transferred to an approved member or cancelled.
- **FR-LEAD-3**: Deleting or removing a trip must use soft deletion/archival to preserve data for safety analytics.
- **FR-LEAD-4**: Valid trip states are UPCOMING, ACTIVE, COMPLETED, CANCELLED, and ARCHIVED.

## 5. GPS Tracking & Safe Bubble Requirements
- **FR-GPS-1**: Background GPS tracking activates only when the trip state is ACTIVE.
- **FR-GPS-2**: Safe Bubble radius defaults to 100 meters (configurable by the leader).
- **FR-GPS-3**: Exceeding the Safe Bubble triggers a Boundary Alert to both member and leader.
- **FR-GPS-4**: Members can respond to boundary alerts with "I'm Safe" or "Need Help".

## 6. Emergency SOS & Data Privacy Requirements
- **FR-SOS-1**: Pressing SOS captures current GPS location and initiates a 10-second cancellation timer.
- **FR-SOS-2**: Uncancelled SOS alerts are dispatched to the leader for review and authority escalation.
- **FR-SOS-3**: Leaders can escalate SOS alerts to Police, Hospital, or Fire & Rescue with configuration-driven emergency contact numbers.
- **FR-SOS-4**: Normal team members cannot view medical info of other members. Leaders view emergency info during active SOS only. Escalated authorities (Hospital/Police) access patient location, blood group, medical conditions, emergency contact, and victim route.

## 7. AI Safety Guide & Safe Route Requirements
- **FR-AI-1**: Gemini AI evaluates destination safety using accident history, road conditions, advisories, crime data, and environmental factors.
- **FR-AI-2**: Gemini suggests safest routes, but the Trip Leader retains final authority to select and approve the trip route.
- **FR-AI-3**: AI responses must clearly distinguish verified data from general safety recommendations.
- **FR-AI-4**: Selected safe routes must be cached locally to ensure continuity during network connectivity loss.

## 8. Offline Communication & Synchronization Requirements
- **FR-OFFLINE-1**: BLE / Device-to-Device communication framework operates within 100m radius for offline boundary alerts, SOS, status updates, and leadership messages.
- **FR-OFFLINE-2**: Offline actions are queued locally and automatically synchronized with the server upon network restoration.
