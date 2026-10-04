package com.saferoad.app.ui.home

import android.Manifest
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.saferoad.app.data.model.User
import com.saferoad.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
@Composable
fun HomeScreen(
    user: User?,
    onNavigateToMap: () -> Unit,
    onNavigateToTrips: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToSOS: () -> Unit,
    onNavigateToReview: () -> Unit = {},
    onLogoutClick: () -> Unit
) {
    val scrollState = rememberScrollState()

    // Proactive Pre-Trip Permissions Check for Automatic SOS SMS & Location
    val sosPermissionsState = rememberMultiplePermissionsState(
        permissions = listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.SEND_SMS
        )
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            color = PrimaryGreen,
                            modifier = Modifier.size(28.dp),
                            shape = RoundedCornerShape(0.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = "Σ",
                                    color = Color.Black,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 16.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                        Column {
                            Text(
                                text = "SAFEROAD+",
                                color = Color.White,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                            Text(
                                text = "TRAVEL SAFER. STAY CONNECTED.",
                                color = PrimaryGreen,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToSOS) {
                        Surface(
                            color = RedDanger,
                            shape = RoundedCornerShape(0.dp)
                        ) {
                            Text(
                                text = "SOS",
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                fontSize = 11.sp,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                    IconButton(onClick = onNavigateToProfile) {
                        Icon(
                            imageVector = Icons.Default.AccountCircle,
                            contentDescription = "Profile",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = CardBg
                )
            )
        },
        containerColor = DarkBg
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
                .verticalScroll(scrollState),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // User Welcome & Status Badge
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, BorderDark),
                shape = RoundedCornerShape(0.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "ACTIVE_OPERATOR",
                            color = TextMuted,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = user?.name ?: "SafeRoad Traveler",
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = user?.email ?: "user@saferoad.org",
                            color = PrimaryGreen,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Surface(
                        color = Color(0x224ADE80),
                        border = BorderStroke(1.dp, PrimaryGreen),
                        shape = RoundedCornerShape(0.dp)
                    ) {
                        Text(
                            text = "GRID: ONLINE",
                            color = PrimaryGreen,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            // Proactive Pre-Trip SOS Safety & Permissions Status Card
            if (!sosPermissionsState.allPermissionsGranted) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = AmberWarning.copy(alpha = 0.15f)),
                    border = BorderStroke(1.dp, AmberWarning),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = "Warning",
                                tint = AmberWarning,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = "AUTOMATIC SOS SMS SETUP WARNING",
                                color = AmberWarning,
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Text(
                            text = "Automatic SOS SMS is not fully configured.\nPlease enable the required permissions before starting your trip.",
                            color = Color.White,
                            fontSize = 12.sp,
                            lineHeight = 16.sp
                        )

                        Text(
                            text = "Requires: Precise GPS Location (for automatic coordinates) and SMS (for offline emergency fallback dispatch without manual prompts).",
                            color = TextSecondary,
                            fontSize = 10.sp
                        )

                        Button(
                            onClick = { sosPermissionsState.launchMultiplePermissionRequest() },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = AmberWarning,
                                contentColor = Color.Black
                            ),
                            shape = RoundedCornerShape(4.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "GRANT REQUIRED SOS PERMISSIONS",
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            } else {
                Surface(
                    color = Color(0x154ADE80),
                    border = BorderStroke(1.dp, GreenSafe),
                    shape = RoundedCornerShape(4.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Ready",
                            tint = GreenSafe,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "AUTOMATIC SOS READY: GPS & DIRECT SMS PRE-APPROVED",
                            color = GreenSafe,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Quick Map Action Banner (Hero Card)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNavigateToMap() },
                colors = CardDefaults.cardColors(containerColor = SurfaceBg),
                border = BorderStroke(1.dp, PrimaryGreen),
                shape = RoundedCornerShape(0.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Navigation,
                                contentDescription = "Map",
                                tint = PrimaryGreen,
                                modifier = Modifier.size(20.dp)
                            )
                            Text(
                                text = "MAP & ROUTING ENGINE",
                                color = Color.White,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }

                        Surface(
                            color = Color.Black,
                            border = BorderStroke(1.dp, BorderDark),
                            shape = RoundedCornerShape(0.dp)
                        ) {
                            Text(
                                text = "OPENSTREETMAP",
                                color = BlueAccent,
                                fontSize = 9.sp,
                                fontFamily = FontFamily.Monospace,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Text(
                        text = "MapLibre Native interactive raster viewport with GPS auto-centering, tap-to-destination selection, and OpenRouteService driving polyline.",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )

                    Button(
                        onClick = onNavigateToMap,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PrimaryGreen,
                            contentColor = Color.Black
                        ),
                        shape = RoundedCornerShape(0.dp)
                    ) {
                        Text(
                            text = "LAUNCH SAFE MAP →",
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            // Grid Tiles for features
            Text(
                text = "SYSTEM MODULES",
                color = TextMuted,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                DashboardTile(
                    title = "TRIP MGMT",
                    subtitle = "Join codes & roster",
                    icon = Icons.Default.Groups,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToTrips
                )

                DashboardTile(
                    title = "SAFE BUBBLE",
                    subtitle = "100m Geofence",
                    icon = Icons.Default.GpsFixed,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToMap
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                DashboardTile(
                    title = "PROFILE",
                    subtitle = "Medical & contact",
                    icon = Icons.Default.Person,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToProfile
                )

                DashboardTile(
                    title = "EMERGENCY SOS",
                    subtitle = "10s auto dispatch",
                    icon = Icons.Default.Warning,
                    tint = RedDanger,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToSOS
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                DashboardTile(
                    title = "TRIP REVIEWS",
                    subtitle = "8-part safety feedback",
                    icon = Icons.Default.Star,
                    tint = Color(0xFFFBBF24),
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToReview
                )

                DashboardTile(
                    title = "AI SAFETY GUIDE",
                    subtitle = "Live intelligence",
                    icon = Icons.Default.Shield,
                    tint = PrimaryGreen,
                    modifier = Modifier.weight(1f),
                    onClick = onNavigateToTrips
                )
            }
        }
    }
}

@Composable
fun DashboardTile(
    title: String,
    subtitle: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    tint: Color = PrimaryGreen,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier.clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = CardBg),
        border = BorderStroke(1.dp, BorderDark),
        shape = RoundedCornerShape(0.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = tint,
                modifier = Modifier.size(24.dp)
            )

            Column {
                Text(
                    text = title,
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace
                )
                Text(
                    text = subtitle,
                    color = TextMuted,
                    fontSize = 10.sp
                )
            }
        }
    }
}
