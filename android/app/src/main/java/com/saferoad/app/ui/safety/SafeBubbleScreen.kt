package com.saferoad.app.ui.safety

import androidx.compose.foundation.BorderStroke
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
import com.saferoad.app.data.model.BoundaryStatus
import com.saferoad.app.data.repository.SafeBubbleRepository
import com.saferoad.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SafeBubbleScreen(
    repository: SafeBubbleRepository = remember { SafeBubbleRepository() },
    isLeader: Boolean = true,
    onNavigateBack: () -> Unit
) {
    val telemetry by repository.telemetry.collectAsState()
    var responseMessage by remember { mutableStateOf<String?>(null) }
    val themeSettings by ThemeManager.themeSettings.collectAsState()

    val statusColor = when (telemetry.boundaryStatus) {
        BoundaryStatus.SAFE_IN_BUBBLE -> GreenSafe
        BoundaryStatus.BREACH_WARNING -> YellowWarn
        BoundaryStatus.CRITICAL_BREACH -> RedDanger
    }

    val statusText = when (telemetry.boundaryStatus) {
        BoundaryStatus.SAFE_IN_BUBBLE -> "SAFE IN BUBBLE"
        BoundaryStatus.BREACH_WARNING -> "BREACH WARNING"
        BoundaryStatus.CRITICAL_BREACH -> "CRITICAL BREACH"
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "SMART SAFE BUBBLE",
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
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Main Telemetry Radar Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, statusColor),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Status Badge
                    Surface(
                        color = statusColor.copy(alpha = 0.2f),
                        border = BorderStroke(1.dp, statusColor),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = statusText,
                            color = statusColor,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }

                    // Circular Distance Display
                    Surface(
                        modifier = Modifier.size(130.dp),
                        shape = CircleShape,
                        color = SurfaceBg,
                        border = BorderStroke(3.dp, statusColor)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = "%.1f".format(telemetry.distanceFromLeaderMeters),
                                color = Color.White,
                                fontSize = 28.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "METERS",
                                color = TextSecondary,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    Text(
                        text = "Distance from Expedition Leader",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )

                    // Radius spec
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceAround
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("BUBBLE RADIUS", color = TextMuted, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                            Text("${telemetry.safeBubbleRadiusMeters}m", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("BREACH STREAK", color = TextMuted, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                            Text("${telemetry.breachStreak} cycles", color = if (telemetry.breachStreak > 0) YellowWarn else GreenSafe, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Boundary Alert Response Actions
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, BorderDark),
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "BOUNDARY RESPONSE CONTROLS",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "If you step outside the 100m bubble, confirm your status to inform the Expedition Leader.",
                        color = TextSecondary,
                        fontSize = 11.sp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = {
                                repository.submitBoundaryResponse("I_AM_SAFE")
                                responseMessage = "Status recorded: You are safe. Notification sent to leader."
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = GreenSafe, contentColor = Color.Black),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("I'M SAFE", fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, fontSize = 11.sp)
                        }

                        Button(
                            onClick = {
                                repository.submitBoundaryResponse("NEED_HELP")
                                responseMessage = "Help alert dispatched to Expedition Leader!"
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = RedDanger, contentColor = Color.White),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Icon(imageVector = Icons.Default.Warning, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("NEED HELP", fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, fontSize = 11.sp)
                        }
                    }

                    if (responseMessage != null) {
                        Text(
                            text = responseMessage!!,
                            color = PrimaryGreen,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Leader Radius Configuration (if leader)
            if (isLeader) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = CardBg),
                    border = BorderStroke(1.dp, BorderDark),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "LEADER GEOFENCE ADJUSTMENT",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Adjust the active safe perimeter based on terrain or activity.",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf(50, 100, 200, 500).forEach { r ->
                                val isSelected = telemetry.safeBubbleRadiusMeters == r
                                Surface(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { repository.setBubbleRadius(r) },
                                    color = if (isSelected) themeSettings.activeAccentColor.copy(alpha = 0.2f) else SurfaceBg,
                                    border = BorderStroke(1.dp, if (isSelected) themeSettings.activeAccentColor else BorderDark),
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Box(
                                        contentAlignment = Alignment.Center,
                                        modifier = Modifier.padding(vertical = 8.dp)
                                    ) {
                                        Text(
                                            text = "${r}m",
                                            color = if (isSelected) themeSettings.activeAccentColor else TextSecondary,
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                            fontSize = 11.sp
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
