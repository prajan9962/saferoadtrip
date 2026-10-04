# SafeRoad+ Web to Android Component Mapping

This document provides a line-by-line mapping between the React components in the SafeRoad+ web application and the native Jetpack Compose screens and ViewModels in Android.

| React Web Component (`src/components/`) | Jetpack Compose Screen (`ui/`) | Supporting ViewModel | Mobile UX Enhancements |
|------------------------------------------|--------------------------------|----------------------|------------------------|
| `LoginScreen.tsx` | `ui/auth/LoginScreen.kt` | `AuthViewModel` | Native One-Tap Google Sign-In, SMS auto-fill for OTP, biometric unlock |
| `UserProfileView.tsx` | `ui/profile/ProfileScreen.kt` | `ProfileViewModel` | Bottom sheet for medical details, lock icon badge for privacy |
| `EmergencyContactScreen.tsx` | `ui/profile/EmergencyContactSection.kt` | `ProfileViewModel` | Native phone book picker, 1-tap backend SMS test dispatch |
| `TripManagement.tsx` | `ui/trip/TripManagementScreen.kt` | `TripViewModel` | Card-based roster, swipe-to-refresh, modal sheets for creation |
| `TripReviewPromptModal.tsx` | `ui/trip/TripReviewPromptDialog.kt` | `TripReviewViewModel` | Native Compose `AlertDialog` with celebration animations |
| `TripReviewModal.tsx` | `ui/trip/TripReviewScreen.kt` | `TripReviewViewModel` | Interactive haptic star ratings, segmented safety slider, smooth chips |
| `DestinationCommunitySafetyModal.tsx` | `ui/safety/DestinationCommunityModal.kt` | `AiSafetyViewModel` | Native bottom sheet with metric summary cards and community tags |
| `SafeRoadMapScreen.tsx` | `ui/map/SafeRoadMapScreen.kt` | `SafeRoadMapViewModel` | Native hardware-accelerated 60fps vector maps, smooth camera transitions |
| `SafeBubbleMonitor.tsx` | `ui/safety/SafeBubbleScreen.kt` | `SafeBubbleViewModel` | Circular distance progress indicator, persistent notification quick actions |
| `AiSafetyGuideView.tsx` | `ui/safety/AiSafetyGuideScreen.kt` | `AiSafetyViewModel` | Expandable advisory accordions, 1-tap emergency service phone intent dialer |
| `SosEmergencyModal.tsx` | `ui/sos/SosScreen.kt` | `SosViewModel` | Full-screen critical red beacon with haptic pulse & 10s cancellation ring |
| `LeaderSosCommand.tsx` | `ui/sos/LeaderSosCommandSection.kt` | `SosViewModel` | High-priority card with direct police/hospital escalation quick triggers |
| `AuthorityDashboard.tsx` | `ui/authority/AuthorityDashboardScreen.kt` | `AuthorityViewModel` | High-contrast emergency triage sheet with blood group, allergies & victim route |
| `TripChat.tsx` | `ui/chat/TripChatScreen.kt` | `TripChatViewModel` | LazyColumn with reverse layout, auto-scroll to bottom, leader announcement banner |
| `OfflineBleSimulator.tsx` | `ui/offline/OfflineBleScreen.kt` | `OfflineBleViewModel` | Bluetooth radar visualizer showing nearby discovered group peers |
| `AuditLogsView.tsx` | `ui/admin/AuditLogsScreen.kt` | `AuditLogsViewModel` | Filterable log cards with action badges and JSON inspector |
| *Appearance Settings* | `ui/settings/AppearanceScreen.kt` | `ThemeViewModel` | Dynamic color swatches with live preview card & contrast validation |
