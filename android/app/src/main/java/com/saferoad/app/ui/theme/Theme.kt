package com.saferoad.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

// Global Theme State Holder
object ThemeManager {
    private val _themeSettings = MutableStateFlow(ThemeSettings())
    val themeSettings: StateFlow<ThemeSettings> = _themeSettings.asStateFlow()

    fun updateThemeMode(mode: ThemeMode) {
        _themeSettings.value = _themeSettings.value.copy(mode = mode)
    }

    fun updateAccent(accent: ThemeAccent) {
        _themeSettings.value = _themeSettings.value.copy(accent = accent, customHexColor = null)
    }

    fun updateCustomColor(hex: String) {
        _themeSettings.value = _themeSettings.value.copy(customHexColor = hex)
    }
}

@Composable
fun SafeRoadTheme(
    settings: ThemeSettings = ThemeManager.themeSettings.collectAsState().value,
    content: @Composable () -> Unit
) {
    val systemInDark = isSystemInDarkTheme()
    val isDark = when (settings.mode) {
        ThemeMode.SYSTEM_DEFAULT -> systemInDark
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
    }

    val primaryColor = settings.activeAccentColor

    val colorScheme = if (isDark) {
        darkColorScheme(
            primary = primaryColor,
            onPrimary = Color.Black,
            primaryContainer = primaryColor.copy(alpha = 0.25f),
            onPrimaryContainer = primaryColor,
            secondary = primaryColor,
            onSecondary = Color.Black,
            background = DarkBg,
            onBackground = TextPrimary,
            surface = CardBg,
            onSurface = TextPrimary,
            surfaceVariant = SurfaceBg,
            onSurfaceVariant = TextSecondary,
            outline = BorderDark,
            error = RedDanger,
            onError = TextPrimary
        )
    } else {
        lightColorScheme(
            primary = primaryColor,
            onPrimary = Color.White,
            primaryContainer = primaryColor.copy(alpha = 0.2f),
            onPrimaryContainer = Color.Black,
            secondary = primaryColor,
            onSecondary = Color.White,
            background = LightBg,
            onBackground = LightTextPrimary,
            surface = LightCardBg,
            onSurface = LightTextPrimary,
            surfaceVariant = LightSurfaceBg,
            onSurfaceVariant = LightTextSecondary,
            outline = LightBorder,
            error = RedDanger,
            onError = Color.White
        )
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
