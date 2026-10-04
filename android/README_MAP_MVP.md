# SafeRoad+ Android Map System MVP Documentation

This document provides a complete technical guide for the **Map MVP** implemented using **MapLibre Android SDK** and **OpenStreetMap (OSM)** data, without any Google Maps SDK or API dependencies.

---

## 📁 Created & Modified Files

### Web React Preview Application (AI Studio Browser Preview)
- `src/components/SafeRoadMapScreen.tsx` (Created) - Interactive MapLibre GL JS + OpenStreetMap map screen for instant testing in the AI Studio web container.
- `src/components/Header.tsx` (Modified) - Added `00_MAP_MVP` navigation tab in the top header.
- `src/App.tsx` (Modified) - Set default active tab to `map` and rendered `SafeRoadMapScreen`.

### Android Native Application (Kotlin + Jetpack Compose)
- `android/app/build.gradle.kts` (Created) - Added MapLibre Native Android SDK, Google Play Location Services, and Accompanist Permissions.
- `android/app/src/main/AndroidManifest.xml` (Created) - Declared `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, and `INTERNET` permissions.
- `android/app/src/main/java/com/saferoad/app/ui/map/SafeRoadMapScreen.kt` (Created) - Reusable Jetpack Compose map screen with MapLibre, FusedLocationProviderClient, destination marker tap listener, and lat/lng telemetry overlay.

---

## 📦 Dependencies Added

### Android (`android/app/build.gradle.kts`)
```kotlin
// MapLibre Native SDK for Android (OpenSource OpenStreetMap rendering - No Google Maps SDK/API key required)
implementation("org.maplibre.gl:android-sdk:11.5.1")

// Location Services for GPS telemetry
implementation("com.google.android.gms:play-services-location:21.3.0")

// Permissions handling for Jetpack Compose
implementation("com.google.accompanist:accompanist-permissions:0.37.0")
```

### Web (`package.json`)
```json
"maplibre-gl": "^5.0.0"
```

---

## 🗺️ How the MapLibre Map Works

1. **OpenStreetMap Tile Engine**:
   The map uses an open-source raster style (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) rendered via the MapLibre engine (`org.maplibre.gl:android-sdk` on Android, `maplibre-gl` on Web).
2. **Zero Google API Key Requirement**:
   Because it relies on MapLibre and OpenStreetMap tiles, no Google Maps API Key or billing account is needed.
3. **OpenStreetMap Attribution**:
   OpenStreetMap copyright attribution is rendered visibly on the map view as required by OSM licenses.

---

## 📍 How Location Permission is Handled

1. **Permission Requests**:
   - On Android, `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` are declared in `AndroidManifest.xml`.
   - In `SafeRoadMapScreen.kt`, Accompanist's `rememberMultiplePermissionsState` manages runtime permission prompts on startup.
   - On Web, HTML5 Geolocation API prompts the user for browser location access.
2. **GPS Fix Acquisition**:
   - Android uses `FusedLocationProviderClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)`.
   - On permission approval, a marker is placed at the user's latitude and longitude, and the camera flies to center on the user.
3. **"Center on My Location" Button**:
   - Tapping the `CENTER_LOCATION` button re-triggers a GPS fix and smoothly animates the camera target to the current coordinates.

---

## 🎯 How Destination Selection Works

1. **Map Tap Listener**:
   - On Android: `map.addOnMapClickListener { latLng -> ... }`.
   - On Web: `map.on('click', (e) => ... )`.
2. **Destination Pin Rendering**:
   - When the user taps anywhere on the map, a destination marker is instantly rendered at those coordinates.
3. **Lat/Lng Debug Telemetry**:
   - The selected destination's latitude and longitude are displayed in real time in a floating debug box on the top-left of the screen (`LAT: xx.xxxxx | LNG: xx.xxxxx`).
4. **Modular Architecture**:
   - The selected destination coordinates (`LatLng`) are held in a top-level state callback, allowing routing engines (such as OSRM, Valhalla, or GraphHopper) to be plugged in seamlessly in future iterations.

---

## 🚀 How to Run & Test on an Android Device

1. Open Android Studio and choose **Open an Existing Project**, selecting the `android` folder.
2. Connect your Android device via USB or launch an Android Virtual Device (AVD).
3. Ensure Location Services / GPS is toggled ON on your device.
4. Click **Run 'app'** (`Shift + F10`).
5. Grant Location Permissions when prompted upon app startup.
6. Verify that:
   - The OpenStreetMap map loads with OSM attribution visible.
   - Your location is displayed with a marker.
   - Tapping the map drops a red destination marker and updates the Lat/Lng debug panel.
