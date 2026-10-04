package com.saferoad.app.ui.settings

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saferoad.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppearanceScreen(
    onNavigateBack: () -> Unit
) {
    val themeSettings by ThemeManager.themeSettings.collectAsState()
    var customHexInput by remember { mutableStateOf(themeSettings.customHexColor ?: "#4ADE80") }
    var customHexError by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "APPEARANCE & THEME",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = CardBg)
            )
        },
        containerColor = DarkBg
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(18.dp)
        ) {
            // Theme Mode Selector
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, BorderDark),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "THEME MODE",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ThemeMode.values().forEach { mode ->
                            val isSelected = themeSettings.mode == mode
                            Surface(
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { ThemeManager.updateThemeMode(mode) },
                                color = if (isSelected) themeSettings.activeAccentColor.copy(alpha = 0.2f) else SurfaceBg,
                                border = BorderStroke(1.dp, if (isSelected) themeSettings.activeAccentColor else BorderDark),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier.padding(vertical = 10.dp)
                                ) {
                                    Text(
                                        text = when(mode) {
                                            ThemeMode.SYSTEM_DEFAULT -> "System"
                                            ThemeMode.LIGHT -> "Light"
                                            ThemeMode.DARK -> "Dark"
                                        },
                                        color = if (isSelected) themeSettings.activeAccentColor else TextSecondary,
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Accent Color Presets
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, BorderDark),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "BRAND ACCENT COLOR",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = themeSettings.accent.label,
                            color = themeSettings.activeAccentColor,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // Color Swatches Grid
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        ThemeAccent.values().chunked(3).forEach { rowAccents ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                rowAccents.forEach { acc ->
                                    val isSelected = themeSettings.accent == acc && themeSettings.customHexColor == null
                                    Surface(
                                        modifier = Modifier
                                            .weight(1f)
                                            .clickable { ThemeManager.updateAccent(acc) },
                                        color = SurfaceBg,
                                        border = BorderStroke(if (isSelected) 2.dp else 1.dp, if (isSelected) acc.color else BorderDark),
                                        shape = RoundedCornerShape(6.dp)
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(vertical = 12.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                            verticalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(24.dp)
                                                    .background(acc.color, CircleShape)
                                                    .border(BorderStroke(1.dp, Color.White.copy(alpha = 0.4f)), CircleShape)
                                            )
                                            Text(
                                                text = acc.label.split(" ")[0],
                                                color = if (isSelected) Color.White else TextSecondary,
                                                fontSize = 10.sp,
                                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Custom Color Input
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "CUSTOM ACCENT COLOR (HEX)",
                        color = TextSecondary,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = customHexInput,
                            onValueChange = {
                                customHexInput = it
                                customHexError = null
                            },
                            placeholder = { Text("#4ADE80", color = TextMuted) },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = themeSettings.activeAccentColor,
                                unfocusedBorderColor = BorderDark,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            shape = RoundedCornerShape(4.dp)
                        )
                        Button(
                            onClick = {
                                val clean = customHexInput.trim()
                                if (clean.matches(Regex("^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$"))) {
                                    ThemeManager.updateCustomColor(clean)
                                    customHexError = null
                                } else {
                                    customHexError = "Enter valid 6-char hex (e.g. #38BDF8)"
                                }
                            },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = themeSettings.activeAccentColor,
                                contentColor = Color.Black
                            ),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text("APPLY", fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        }
                    }
                    if (customHexError != null) {
                        Text(text = customHexError!!, color = RedDanger, fontSize = 11.sp)
                    }
                }
            }

            // Live Safety vs Brand Contrast Verification Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, themeSettings.activeAccentColor.copy(alpha = 0.5f)),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "SAFETY SEMANTICS GUARANTEE",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Notice: Emergency alerts retain standardized safety colors regardless of brand theme customization.",
                        color = TextSecondary,
                        fontSize = 11.sp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            modifier = Modifier.weight(1f),
                            color = RedDanger.copy(alpha = 0.2f),
                            border = BorderStroke(1.dp, RedDanger),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text("SOS", color = RedDanger, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                Text("Always Red", color = Color.White, fontSize = 9.sp)
                            }
                        }

                        Surface(
                            modifier = Modifier.weight(1f),
                            color = YellowWarn.copy(alpha = 0.2f),
                            border = BorderStroke(1.dp, YellowWarn),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text("WARNING", color = YellowWarn, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                Text("Always Amber", color = Color.White, fontSize = 9.sp)
                            }
                        }

                        Surface(
                            modifier = Modifier.weight(1f),
                            color = GreenSafe.copy(alpha = 0.2f),
                            border = BorderStroke(1.dp, GreenSafe),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text("SAFE", color = GreenSafe, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                Text("Always Green", color = Color.White, fontSize = 9.sp)
                            }
                        }
                    }

                    // Button sample preview with user's accent color
                    Button(
                        onClick = { },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = themeSettings.activeAccentColor,
                            contentColor = Color.Black
                        ),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "PRIMARY BRAND ACTION PREVIEW",
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }
    }
}
