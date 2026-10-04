# SafeRoad+ SOS & Automated SMS Fallback Audit

**Document Version:** 1.0.0  
**Project:** SafeRoad+ (AI-Powered Tourist Safety & Emergency Response Platform)  
**Target:** Automated Zero-Click Location & SMS Dispatch Post-SOS Confirmation  

---

## 1. Executive Summary

SafeRoad+ provides tourists and expedition travelers with emergency SOS capabilities. When a traveler triggers an SOS and the 10-second cancellation window elapses, the application must immediately capture high-accuracy location telemetry and dispatch distress alerts to:
1. The assigned **Trip Leader**
2. Approved **Team Members**
3. The traveller's personal **Emergency Contact**

An audit was conducted on the Android codebase, background services, permission lifecycles, and location acquisition layers. The objective of this audit is to identify why previous implementations required manual user intervention (such as manual "Share Location" dialogs, OS intent pickers, or mid-crisis runtime permission requests) and to provide a production-ready architectural redesign ensuring **zero secondary manual interactions** after the SOS is confirmed.

---

## 2. Current Architecture & Flow Audit

### 2.1 Current SOS Flow
```
User Presses SOS Button
       ↓
Navigates to SosScreen
       ↓
10-Second Cancellation Window (Countdown Timer)
       ↓ (If not cancelled)
Timer hits 0 → isActivated = true
       ↓
Direct In-Screen Repository Calls (initiateSos & activateSos)
       ↓
Displays SOS Status Card & Escalation Console
```

### 2.2 Current Location Flow
- In `SafeRoadMapScreen.kt`, `LocationServices.getFusedLocationProviderClient(context)` was used to fetch location using `Priority.PRIORITY_HIGH_ACCURACY`.
- However, in `SosScreen.kt`, the GPS telemetry was hardcoded (`val latitude = 51.1784`, `val longitude = -115.5708`, `val accuracy = 8.4f`), lacking an integrated, dynamic location provider service with emergency timeout handling and graceful fallback to last known location.
- When an emergency occurred without prior permission checks, the application either failed silently with default fallback coordinates or had to prompt the user mid-crisis.

### 2.3 Current SMS Flow
- `AndroidSmsService.kt` contains low-level device telephony checks (`PackageManager.FEATURE_TELEPHONY`, `TelephonyManager.simState`, and `Manifest.permission.SEND_SMS`), utilizing `SmsManager.sendTextMessage` / `sendMultipartTextMessage`.
- The FastAPI server (`/server/smsService.ts`) handles server-side SMS routing via Twilio or the SafeRoad+ Telemetry Emergency Gateway when network connectivity exists.
- In earlier versions or alternative branches, location sharing was either routed through Android's `Intent.ACTION_SENDTO` / `ACTION_SEND` (which forces the user to choose an SMS messaging client, select a contact, and press the SMS send button) or relied on a second interactive prompt asking the user: *"Do you want to share your location with your Emergency Contact?"*.

---

## 3. Root Cause of Manual Interaction

The requirement for manual user intervention after SOS activation stemmed from three key architectural issues:

1. **Reliance on Interactive Intent Composers (`ACTION_SENDTO` / `ACTION_SEND`) vs. Programmatic Telephony (`SmsManager` & Backend Proxy):**
   - Triggering an Android system Intent requires the user to select an app, confirm the recipient, and tap "Send" in Google Messages / Samsung Messages. This breaks automated emergency protocol when the user may be injured, impaired, or in immediate distress.
2. **Post-Trigger Runtime Permission Requesting:**
   - Requesting `ACCESS_FINE_LOCATION` or `SEND_SMS` after the 10-second countdown forces Android OS system permission popups ("Allow SafeRoad+ to access this device's location?"). If the user misses or dismisses this prompt, location capture fails or SMS dispatch is blocked.
3. **Absence of Unified Emergency Location Provider with Automatic Fallback:**
   - Without an asynchronous `EmergencyLocationProvider` that requests a fresh location fix with a strict timeout (e.g., 5 seconds) and falls back to `lastLocation` if a fresh fix is delayed, developers previously inserted a confirmation step to let the user review and approve location sharing.

---

## 4. Responsible Files

| File | Current Role | Identified Deficiency | Required Refactor |
|---|---|---|---|
| `android/app/src/main/java/com/saferoad/app/ui/sos/SosScreen.kt` | SOS UI & Countdown | Uses static coordinate constants; lacks MVVM separation | Connect to `SosViewModel`; bind reactive state; display automatic dispatch status |
| `android/app/src/main/java/com/saferoad/app/ui/sos/SosViewModel.kt` | *Missing / Implicit* | Business logic was executed directly inside Composable | Implement dedicated ViewModel handling location acquisition, backend sync, and SMS fallback |
| `android/app/src/main/java/com/saferoad/app/services/location/EmergencyLocationProvider.kt` | *Missing* | No dedicated location provider with emergency priority and fallback | Create provider implementing `getCurrentLocation` with 5s timeout & `lastLocation` fallback |
| `android/app/src/main/java/com/saferoad/app/services/sms/AndroidSmsService.kt` | Device SMS Manager | Basic implementation | Integrate idempotency, pending intent broadcast callbacks, and offline queueing |
| `android/app/src/main/java/com/saferoad/app/data/repository/SosRepository.kt` | In-memory SOS state | Lacks direct synchronization with backend REST API | Add API integration (`SafeRoadApiService`) and offline persistence support |
| `android/app/src/main/java/com/saferoad/app/ui/home/HomeScreen.kt` | Home Dashboard | Does not warn user if required SOS permissions are ungranted | Add proactive Safety & Permissions setup banner prior to expedition |
| `android/app/src/main/java/com/saferoad/app/ui/settings/SafetySetupScreen.kt` | *Missing* | No centralized pre-trip safety & permissions check | Provide pre-travel onboarding screen to review Location & SMS permissions |

---

## 5. Redesigned Zero-Click SOS Flow

```
                USER PRESSES SOS BUTTON
                           ↓
                  SOS CONFIRMATION UI
                           ↓
             10-SECOND CANCELLATION WINDOW
            (Audible alert / Cancel option)
                           ↓
                     SOS CONFIRMED
                           ↓
    AUTOMATIC LOCATION ACQUISITION (ZERO PROMPTS)
  ┌─────────────────────────────────────────────────┐
  │ 1. FusedLocationProviderClient.getCurrentLocation│
  │    (Priority: HIGH_ACCURACY, Timeout: 5000ms)   │
  │ 2. Fallback: FusedLocationProvider.lastLocation │
  │    (Clearly tagged: "Last known location")      │
  └─────────────────────────────────────────────────┘
                           ↓
                 CREATE SOS RECORD
           (Unique SOS ID, Time, GPS fix)
                           ↓
          GENERATE STANDARDIZED EMERGENCY SMS
   (SafeRoad+ SOS Alert, coordinates, Google Maps link,
    NO sensitive medical data included by default)
                           ↓
            HYBRID AUTOMATED DISPATCH ENGINE
  ┌────────────────────────────┬────────────────────┐
  │  IF INTERNET IS AVAILABLE  │  IF NO INTERNET    │
  ├────────────────────────────┼────────────────────┤
  │ 1. POST /api/v1/sos/init   │ 1. Check Telephony │
  │ 2. Backend SMS Gateway     │ 2. Check SIM Ready │
  │    (Twilio / Gateway)      │ 3. Check SEND_SMS  │
  │    dispatches to Contact,  │ 4. SmsManager      │
  │    Leader, and Members     │    direct dispatch │
  │ 3. FCM Push to SafeRoad    │ 5. If unavailable: │
  │    app instances           │    queue offline   │
  └────────────────────────────┴────────────────────┘
                           ↓
           SHOW LIVE MULTI-CHANNEL STATUS UI
   (SOS Active, Location Fix, SMS Submitted / Sent,
    FCM Team Alerted, Escalation Controls)
```

---

## 6. Android Permission Requirements & Rules

1. **Proactive Setup vs. Runtime Crisis Prompts:**
   - Permissions must **never** be requested for the first time when the SOS button is triggered.
   - The user is guided through **Safety Setup / Permissions** during onboarding or before starting a trip:
     - `ACCESS_FINE_LOCATION`
     - `ACCESS_COARSE_LOCATION`
     - `SEND_SMS` (Direct device fallback)
     - `POST_NOTIFICATIONS` (Android 13+)
     - `READ_PHONE_STATE` (SIM card readiness check)
2. **No Security Bypass:**
   - The app strictly honors Android OS security policies.
   - If `SEND_SMS` is denied or unavailable, the application gracefully routes through the backend Internet gateway without throwing runtime exceptions.
   - If both Internet and device SMS capabilities are absent, the application logs the emergency into an offline queue and displays transparent diagnostic feedback to the user ("SMS could not be sent: Cellular SIM not ready").
   - Under no circumstances is "SMS sent" falsely reported unless confirmed by the SMS provider or the telephony radio layer.

---

## 7. Limitations & Device Realities

1. **Telephony Hardware Dependency:**
   - Wi-Fi only tablets, Chromebooks, or Android emulators lacking cellular baseband modems cannot execute direct device SMS. They depend exclusively on backend internet gateways.
2. **SIM Lock / Airplane Mode:**
   - If Airplane Mode is engaged or a SIM PIN is active, `SmsManager` cannot transmit. The system must report this accurately.
3. **Carrier & Roaming Constraints:**
   - International roaming and regional short-code restrictions may delay SMS delivery; therefore, Google Maps hyperlinks are formatted in universal standard coordinates (`https://maps.google.com/?q={lat},{lng}`).
