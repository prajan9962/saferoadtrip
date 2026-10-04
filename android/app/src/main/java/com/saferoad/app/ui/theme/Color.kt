package com.saferoad.app.ui.theme

import androidx.compose.ui.graphics.Color

// Standard Dark Base Theme Colors
val DarkBg = Color(0xFF0A0B0E)
val CardBg = Color(0xFF0F1218)
val SurfaceBg = Color(0xFF1A1D24)
val BorderDark = Color(0xFF2D3139)

// Standard Light Base Theme Colors
val LightBg = Color(0xFFF8FAFC)
val LightCardBg = Color(0xFFFFFFFF)
val LightSurfaceBg = Color(0xFFF1F5F9)
val LightBorder = Color(0xFFE2E8F0)

// Text Colors
val TextPrimary = Color(0xFFF8FAFC)
val TextSecondary = Color(0xFF94A3B8)
val TextMuted = Color(0xFF64748B)

val LightTextPrimary = Color(0xFF0F172A)
val LightTextSecondary = Color(0xFF475569)
val LightTextMuted = Color(0xFF94A3B8)

// =========================================================================
// STRICT CRITICAL SAFETY SEMANTICS (IMMUTABLE ACROSS ALL USER THEMES)
// Emergency states must retain recognizable safety semantics at all times.
// =========================================================================
val RedDanger = Color(0xFFEF4444)
val RedDark = Color(0xFF7F1D1D)
val YellowWarn = Color(0xFFF59E0B)
val GreenSafe = Color(0xFF22C55E)

// =========================================================================
// USER CUSTOMIZABLE BRAND ACCENT PRESETS (PHASES 17 & 18)
// =========================================================================
val PrimaryGreen = Color(0xFF4ADE80)    // Emerald Green (Default)
val DarkGreen = Color(0xFF16A34A)
val BlueAccent = Color(0xFF38BDF8)      // Ocean Blue
val SafetyCyan = Color(0xFF06B6D4)      // Safety Cyan
val PurpleAccent = Color(0xFFA855F7)    // Royal Purple
val AmberAccent = Color(0xFFF59E0B)     // Amber Gold
val CrimsonAccent = Color(0xFFF43F5E)   // Crimson Red

enum class ThemeAccent(val label: String, val color: Color, val hex: String) {
    EMERALD("Emerald Green", PrimaryGreen, "#4ADE80"),
    OCEAN_BLUE("Ocean Blue", BlueAccent, "#38BDF8"),
    CYAN("Safety Cyan", SafetyCyan, "#06B6D4"),
    PURPLE("Royal Purple", PurpleAccent, "#A855F7"),
    AMBER("Amber Gold", AmberAccent, "#F59E0B"),
    CRIMSON("Crimson Red", CrimsonAccent, "#F43F5E")
}

enum class ThemeMode {
    SYSTEM_DEFAULT,
    LIGHT,
    DARK
}

data class ThemeSettings(
    val mode: ThemeMode = ThemeMode.DARK,
    val accent: ThemeAccent = ThemeAccent.EMERALD,
    val customHexColor: String? = null
) {
    val activeAccentColor: Color
        get() {
            if (!customHexColor.isNullOrBlank()) {
                try {
                    val cleanHex = customHexColor.removePrefix("#")
                    val colorInt = cleanHex.toLong(16)
                    val alphaColor = if (cleanHex.length == 6) 0xFF000000 or colorInt else colorInt
                    return Color(alphaColor)
                } catch (e: Exception) {
                    // Fallback to default preset
                }
            }
            return accent.color
        }
}
