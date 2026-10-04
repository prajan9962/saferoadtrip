# SafeRoad+ Android Application

Native Android Companion app built with **Kotlin**, **Jetpack Compose**, **MapLibre Native Android SDK**, **Google Play Services Location (`FusedLocationProviderClient`)**, and **Retrofit 2**.

---

## 📱 Features

- **Real-Time GPS Location Tracking**: High-accuracy `FusedLocationProviderClient` emitting live telemetry to SafeRoad+ backend.
- **MapLibre Navigation Map**: OpenStreetMap raster tiles rendered locally with custom convoy bubble overlay.
- **Dynamic Safe Bubble Monitoring**: Real-time geofence calculation with automatic leader-following logic.
- **1-Tap SOS Emergency Distress**: Broadcasts victim location, medical badges, and emergency contacts to Police (112), Ambulance (108), and Fire (101).
- **Offline Mode & SQLite / Room DB**: Caches telemetry and queued SOS beacons with automatic sync on reconnect.

---

## 🛠️ Tech Stack & Dependencies

- **Language**: Kotlin (v2.0+)
- **UI Framework**: Jetpack Compose + Material 3 Design
- **Architecture**: MVVM (Model-View-ViewModel) + StateFlow / Coroutines
- **Maps & GIS**: `org.maplibre.gl:android-sdk:11.5.1` + OpenRouteService Directions API
- **Networking**: Retrofit 2 + OkHttp 4 + Moshi
- **Location**: `com.google.android.gms:play-services-location:21.3.0`
- **Dependency Injection**: Android Hilt / ViewModelProvider

---

## 🚀 Setup & Build Instructions

1. Open Android Studio (Ladybug / Koala or newer).
2. Open the `SafeRoad+/android` directory as an Android Studio Project.
3. Create a `local.properties` file:
   ```properties
   sdk.dir=/Users/<username>/Library/Android/sdk
   ORS_API_KEY=your_openrouteservice_api_key_here
   ```
4. Sync Gradle files (`File -> Sync Project with Gradle Files`).
5. Run the app on an Android Device or Emulator running Android 8.0 (API 26) or higher.
