# SafeRoad+ UI Color Customization & Theme Architecture

## 1. Objective & Requirements (Phases 17 & 18)
The SafeRoad+ Android application includes a dedicated **Appearance & Theme Customization System** in Settings that allows users to personalize the look and feel of the app according to their preference, while strictly protecting standard emergency safety visual semantics.

---

## 2. Theme Customization Features
Users can configure:
1. **Theme Mode:**
   - `SYSTEM_DEFAULT` (Matches device dark/light state)
   - `LIGHT`
   - `DARK` (Optimized for tactical night-time expedition clarity)

2. **Application Brand / Accent Color Swatches:**
   - 🟢 **Emerald Green (Default):** `#4ADE80` (Tactical safety tone)
   - 🔵 **Ocean Blue:** `#38BDF8` (Maritime navigation feel)
   - 🔷 **Safety Cyan:** `#06B6D4` (High-visibility expedition)
   - 🟣 **Royal Purple:** `#A855F7` (Modern vibrant aesthetic)
   - 🟡 **Amber Gold:** `#F59E0B` (Warm desert glow)
   - 🔴 **Crimson Red:** `#F43F5E` (High-contrast bold)
   - 🎨 **Custom Color:** User-entered custom 6-digit Hex code with real-time contrast validation.

3. **Dynamic MaterialTheme Integration:**
   - When a user selects an accent, the `MaterialTheme.colorScheme` updates:
     - `primary`: Selected accent color
     - `primaryContainer`: Selected accent with 20% alpha background
     - `onPrimary`: Contrast-adjusted black or white
     - `outline`: Tinted border based on accent
     - Affects: Primary buttons, bottom navigation active icons, tab indicators, switches, progress bars, interactive star ratings, and selection chips.

---

## 3. Strict Safety Semantics Preservation Rule
⚠️ **CRITICAL DIRECTIVE:**
The user-selected theme color modifies **APPLICATION BRANDING**, NEVER emergency safety states!
Regardless of user theme choice:
- **Emergency SOS:** ALWAYS strictly **Red** (`#EF4444` / `#DC2626`).
- **Boundary Breach & Safety Warnings:** ALWAYS strictly **Amber/Orange** (`#F59E0B`).
- **Safe in Bubble Status:** ALWAYS strictly **Emerald Green** (`#22C55E` / `#4ADE80`).

---

## 4. Persistence Architecture
- State managed via `ThemePreferencesRepository` using Android Jetpack **DataStore**.
- Selection persisted across application restarts, device reboots, and user login/logout cycles.
- Observed via `StateFlow<ThemePreferences>` at the root of `MainActivity`.
