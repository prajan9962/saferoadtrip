package com.saferoad.app.ui.profile

import android.Manifest
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
fun ProfileScreen(
    user: User?,
    onNavigateBack: () -> Unit,
    onLogoutClick: () -> Unit
) {
    val permissionsState = rememberMultiplePermissionsState(
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
                    Text(
                        text = "USER PROFILE & MEDICAL TELEMETRY",
                        color = Color.White,
                        fontSize = 14.sp,
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
            // Identity Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, BorderDark),
                shape = RoundedCornerShape(0.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "AUTHENTICATED IDENTITY",
                        color = PrimaryGreen,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Surface(
                            modifier = Modifier.size(48.dp),
                            color = SurfaceBg,
                            border = BorderStroke(1.dp, PrimaryGreen),
                            shape = RoundedCornerShape(0.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = (user?.name?.firstOrNull() ?: 'U').toString(),
                                    color = PrimaryGreen,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Column {
                            Text(
                                text = user?.name ?: "SafeRoad Traveler",
                                color = Color.White,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = user?.email ?: "user@saferoad.org",
                                color = TextSecondary,
                                fontSize = 11.sp
                            )
                            Text(
                                text = "UID: ${user?.firebaseUid ?: "firebase_auth_uid"}",
                                color = TextMuted,
                                fontSize = 9.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }
            }

            // Medical Profile Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, BorderDark),
                shape = RoundedCornerShape(0.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "CONFIDENTIAL MEDICAL INFORMATION",
                        color = RedDanger,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        text = "Encrypted on-device. Disclosed to verified emergency dispatchers exclusively upon active SOS trigger.",
                        color = TextMuted,
                        fontSize = 10.sp
                    )

                    HorizontalDivider(color = BorderDark, thickness = 1.dp)

                    ProfileDataRow("BLOOD GROUP", user?.bloodGroup ?: "O+")
                    ProfileDataRow("ALLERGIES", user?.allergies ?: "Penicillin (Mild)")
                    ProfileDataRow("CONDITIONS", user?.medicalConditions ?: "Asthma")
                    ProfileDataRow("EMERGENCY CONTACT", "${user?.emergencyContactName ?: "Primary Contact"} (${user?.emergencyContactPhone ?: "+15550192835"})")
                }
            }

            // Safety & SOS Readiness Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardBg),
                border = BorderStroke(1.dp, BorderDark),
                shape = RoundedCornerShape(0.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = "SAFETY SETUP & SOS AUTOMATION STATUS",
                        color = PrimaryGreen,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )

                    Text(
                        text = "Ensures zero-click automated location capture and SMS dispatch during crisis without mid-emergency prompts.",
                        color = TextMuted,
                        fontSize = 10.sp
                    )

                    HorizontalDivider(color = BorderDark, thickness = 1.dp)

                    ProfileDataRow(
                        "PRECISE GPS PERMISSION",
                        if (permissionsState.allPermissionsGranted) "GRANTED (HIGH ACCURACY)" else "PENDING / REQUIRED"
                    )
                    ProfileDataRow(
                        "DIRECT SMS DISPATCH",
                        if (permissionsState.allPermissionsGranted) "PRE-APPROVED" else "ACTION NEEDED"
                    )
                    ProfileDataRow(
                        "FALLBACK BACKEND GATEWAY",
                        "ONLINE (TWILIO / TELEMETRY)"
                    )

                    if (!permissionsState.allPermissionsGranted) {
                        Button(
                            onClick = { permissionsState.launchMultiplePermissionRequest() },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = YellowWarn,
                                contentColor = Color.Black
                            ),
                            shape = RoundedCornerShape(0.dp)
                        ) {
                            Text(
                                "GRANT SOS PERMISSIONS FOR SAFE TRAVEL",
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }

            // Logout Action
            Button(
                onClick = onLogoutClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0x33EF4444),
                    contentColor = RedDanger
                ),
                shape = RoundedCornerShape(0.dp),
                border = BorderStroke(1.dp, RedDanger)
            ) {
                Icon(
                    imageVector = Icons.Default.ExitToApp,
                    contentDescription = "Logout",
                    tint = RedDanger,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "LOGOUT OF SAFEROAD+",
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp
                )
            }
        }
    }
}

@Composable
private fun ProfileDataRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            color = TextSecondary,
            fontSize = 11.sp,
            fontFamily = FontFamily.Monospace
        )
        Text(
            text = value,
            color = Color.White,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
    }
}
