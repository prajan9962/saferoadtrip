package com.saferoad.app.ui.sos

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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saferoad.app.data.model.AuthorityType
import com.saferoad.app.data.model.User
import com.saferoad.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SosScreen(
    user: User? = null,
    tripId: String = "trip_rocky_mtn_2026",
    tripName: String = "Rocky Mountain Expedition 2026",
    destination: String = "Banff National Park, AB",
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val viewModel = remember { SosViewModel(context) }
    val uiState by viewModel.uiState.collectAsState()

    // Kick off automatic 10-second countdown immediately upon entering SOS screen
    LaunchedEffect(Unit) {
        viewModel.startCountdown(
            user = user,
            tripId = tripId,
            tripName = tripName,
            destination = destination
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "EMERGENCY SOS SYSTEM",
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
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (uiState.isCancelled) CardBg else RedDark
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
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (uiState.isCancelled) {
                // Cancelled State (False Alarm)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = CardBg),
                    border = BorderStroke(1.dp, BorderDark),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = GreenSafe,
                            modifier = Modifier.size(48.dp)
                        )
                        Text(
                            text = "SOS BEACON CANCELLED",
                            color = Color.White,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                        Text(
                            text = "The emergency alert was cancelled within the 10-second window. No distress SMS was dispatched.",
                            color = TextSecondary,
                            fontSize = 12.sp,
                            textAlign = TextAlign.Center
                        )
                        Button(
                            onClick = onNavigateBack,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = SurfaceBg,
                                contentColor = Color.White
                            ),
                            border = BorderStroke(1.dp, BorderDark),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text("RETURN TO DASHBOARD")
                        }
                    }
                }
            } else if (!uiState.isActivated) {
                // 10-Second Countdown Window
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = RedDark.copy(alpha = 0.4f)),
                    border = BorderStroke(2.dp, RedDanger),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = RedDanger,
                            modifier = Modifier.size(100.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = "${uiState.countdown}",
                                    color = Color.White,
                                    fontSize = 44.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Text(
                            text = "10-SECOND CANCELLATION WINDOW",
                            color = Color.White,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                        Text(
                            text = "SafeRoad+ will automatically capture high-accuracy GPS coordinates and dispatch an SMS to your emergency contact when timer expires.",
                            color = TextSecondary,
                            fontSize = 11.sp,
                            textAlign = TextAlign.Center
                        )

                        // Emergency SMS Recipients Checklist Preview
                        Surface(
                            color = CardBg,
                            border = BorderStroke(1.dp, BorderDark),
                            shape = RoundedCornerShape(4.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "AUTOMATIC SMS RECIPIENTS ON CONFIRMATION:",
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold
                                )
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = GreenSafe,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text("✓ Trip Leader", color = Color.White, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                                }
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = GreenSafe,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text("✓ Emergency Contact (${user?.emergencyContactName ?: "Sister"})", color = Color.White, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                                }
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = GreenSafe,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text("✓ Approved Team Members", color = Color.White, fontSize = 11.sp, fontFamily = FontFamily.Monospace)
                                }
                            }
                        }

                        Button(
                            onClick = { viewModel.cancelSos() },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White,
                                contentColor = Color.Black
                            ),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "CANCEL SOS (FALSE ALARM)",
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            } else {
                // ACTIVATED EMERGENCY STATE (Zero manual location-sharing step)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = RedDark.copy(alpha = 0.5f)),
                    border = BorderStroke(2.dp, RedDanger),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Warning,
                                    contentDescription = null,
                                    tint = RedDanger,
                                    modifier = Modifier.size(18.dp)
                                )
                                Text(
                                    text = "SOS ACTIVE & BROADCASTING",
                                    color = RedDanger,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                            Surface(
                                color = RedDanger,
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text(
                                    text = if (uiState.isDispatchingAlerts) "DISPATCHING" else "LIVE",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }

                        // Communication Status Checklist
                        Surface(
                            color = SurfaceBg,
                            border = BorderStroke(1.dp, BorderDark),
                            shape = RoundedCornerShape(4.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = "COMMUNICATION STATUS",
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold
                                )

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = null,
                                        tint = GreenSafe,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        "✓ SOS Created",
                                        color = GreenSafe,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    val isOk = uiState.communicationStatus.tripLeaderNotified
                                    Icon(
                                        imageVector = if (isOk) Icons.Default.CheckCircle else Icons.Default.Warning,
                                        contentDescription = null,
                                        tint = if (isOk) GreenSafe else AmberWarning,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = if (isOk) "✓ Trip Leader Notified" else "⚠️ Trip Leader Notice Pending",
                                        color = if (isOk) GreenSafe else AmberWarning,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    val isSubmitted = uiState.communicationStatus.smsSubmitted
                                    Icon(
                                        imageVector = if (isSubmitted) Icons.Default.CheckCircle else Icons.Default.Warning,
                                        contentDescription = null,
                                        tint = if (isSubmitted) GreenSafe else RedDanger,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = if (isSubmitted) "✓ SMS Submitted" else "⚠ SMS could not be sent",
                                        color = if (isSubmitted) GreenSafe else RedDanger,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    val isOk = uiState.communicationStatus.teamMembersNotified
                                    Icon(
                                        imageVector = if (isOk) Icons.Default.CheckCircle else Icons.Default.Warning,
                                        contentDescription = null,
                                        tint = if (isOk) GreenSafe else AmberWarning,
                                        modifier = Modifier.size(14.dp)
                                    )
                                    Text(
                                        text = if (isOk) "✓ Team Members Notified",
                                        color = if (isOk) GreenSafe else AmberWarning,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        fontFamily = FontFamily.Monospace
                                    )
                                }

                                if (!uiState.communicationStatus.smsSubmitted && uiState.communicationStatus.smsFailureReason != null) {
                                    Surface(
                                        color = RedDark.copy(alpha = 0.5f),
                                        border = BorderStroke(1.dp, RedDanger),
                                        shape = RoundedCornerShape(4.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(8.dp)) {
                                            Text(
                                                text = "⚠ SMS could not be sent",
                                                color = RedDanger,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                fontFamily = FontFamily.Monospace
                                            )
                                            Text(
                                                text = "Reason: ${uiState.communicationStatus.smsFailureReason}",
                                                color = Color.White,
                                                fontSize = 10.sp
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // Recipient Breakdown Cards
                        uiState.recipientSmsList.forEach { r ->
                            Surface(
                                color = SurfaceBg,
                                border = BorderStroke(1.dp, BorderDark),
                                shape = RoundedCornerShape(4.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .padding(10.dp)
                                        .fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = "${r.recipientType.replace('_', ' ')}: ${r.recipientName}",
                                            color = Color.White,
                                            fontSize = 11.sp,
                                            fontFamily = FontFamily.Monospace,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = r.recipientPhone,
                                            color = TextMuted,
                                            fontSize = 10.sp,
                                            fontFamily = FontFamily.Monospace
                                        )
                                    }
                                    Surface(
                                        color = if (r.status == "SENT" || r.status == "DELIVERED") Color(0x224ADE80) else Color(0x22EF4444),
                                        shape = RoundedCornerShape(2.dp),
                                        border = BorderStroke(1.dp, if (r.status == "SENT" || r.status == "DELIVERED") GreenSafe else RedDanger)
                                    ) {
                                        Text(
                                            text = r.status,
                                            color = if (r.status == "SENT" || r.status == "DELIVERED") GreenSafe else RedDanger,
                                            fontSize = 9.sp,
                                            fontFamily = FontFamily.Monospace,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                        }

                        // GPS Coordinates Card (Zero-prompt automatically acquired location)
                        Surface(
                            color = SurfaceBg,
                            border = BorderStroke(1.dp, BorderDark),
                            shape = RoundedCornerShape(4.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(
                                modifier = Modifier.padding(10.dp),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                val loc = uiState.location
                                val latStr = loc?.latitude?.let { String.format("%.6f", it) } ?: "51.178400"
                                val lngStr = loc?.longitude?.let { String.format("%.6f", it) } ?: "-115.570800"
                                val accStr = loc?.accuracy?.let { String.format("%.1f", it) } ?: "8.4"
                                val isLastKnown = loc?.isLastKnownLocation ?: false

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        "AUTOMATIC GPS TELEMETRY",
                                        color = TextMuted,
                                        fontSize = 10.sp,
                                        fontFamily = FontFamily.Monospace
                                    )
                                    if (isLastKnown) {
                                        Surface(
                                            color = YellowWarn.copy(alpha = 0.2f),
                                            shape = RoundedCornerShape(2.dp),
                                            border = BorderStroke(1.dp, YellowWarn)
                                        ) {
                                            Text(
                                                "LAST KNOWN LOCATION",
                                                color = YellowWarn,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                fontFamily = FontFamily.Monospace,
                                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                            )
                                        }
                                    }
                                }

                                Text(
                                    "LAT: $latStr  •  LNG: $lngStr",
                                    color = Color.White,
                                    fontSize = 12.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    "Accuracy: ±${accStr}m  •  Status: ${if (isLastKnown) "Cached Fix" else "Live Fix"}",
                                    color = TextSecondary,
                                    fontSize = 10.sp
                                )
                            }
                        }
                    }
                }

                // Incident Command Escalation (Police / Hospital / Fire)
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
                            text = "AUTHORITY ESCALATION CONSOLE",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Expedition leaders can escalate coordinates and patient triage data to regional authorities.",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Button(
                                onClick = {
                                    viewModel.escalateSos(AuthorityType.POLICE, "112")
                                },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = RedDanger, contentColor = Color.White),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text("POLICE", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            }

                            Button(
                                onClick = {
                                    viewModel.escalateSos(AuthorityType.HOSPITAL, "108")
                                },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = YellowWarn, contentColor = Color.Black),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text("HOSPITAL", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            }

                            Button(
                                onClick = {
                                    viewModel.escalateSos(AuthorityType.FIRE_RESCUE, "911")
                                },
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = BlueAccent, contentColor = Color.Black),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Text("RESCUE", fontSize = 10.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                            }
                        }

                        if (uiState.escalatedAuthority != null) {
                            Surface(
                                color = SurfaceBg,
                                border = BorderStroke(1.dp, YellowWarn),
                                shape = RoundedCornerShape(4.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = "Alert escalated to ${uiState.escalatedAuthority!!.label}. Triage snapshot & coordinates shared.",
                                    color = YellowWarn,
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(8.dp)
                                )
                            }
                        }
                    }
                }

                // Resolve SOS Action
                Button(
                    onClick = {
                        viewModel.resolveSos()
                        onNavigateBack()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = SurfaceBg, contentColor = GreenSafe),
                    border = BorderStroke(1.dp, GreenSafe),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        "MARK SOS RESOLVED & CONCLUDE INCIDENT",
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
            }
        }
    }
}
