package com.saferoad.app.ui.trip

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import com.saferoad.app.data.model.Trip
import com.saferoad.app.data.model.TripMember
import com.saferoad.app.data.model.TripStatus
import com.saferoad.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TripManagementScreen(
    onNavigateBack: () -> Unit,
    onNavigateToMap: () -> Unit,
    onNavigateToReview: () -> Unit = {}
) {
    var tripCodeInput by remember { mutableStateOf("") }
    var destinationInput by remember { mutableStateOf("Banff National Park, AB") }
    var hotelInput by remember { mutableStateOf("Fairmont Chateau Lake Louise") }
    var showCreateDialog by remember { mutableStateOf(false) }
    var tripStatus by remember { mutableStateOf(TripStatus.ACTIVE) }
    var showReviewPromptDialog by remember { mutableStateOf(false) }

    val sampleMembers = remember {
        listOf(
            TripMember("usr_1", "Alex Rivera (Trip Leader)", "alex.rivera@saferoad.org", isApproved = true),
            TripMember("usr_2", "Samantha Chen", "samantha.chen@saferoad.org", isApproved = true),
            TripMember("usr_3", "Marcus Vance", "marcus.vance@saferoad.org", isApproved = true)
        )
    }

    // Review Prompt Dialog when trip reaches COMPLETED
    if (showReviewPromptDialog) {
        AlertDialog(
            onDismissRequest = { showReviewPromptDialog = false },
            title = {
                Text(
                    text = "Trip Completed! 🎉",
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = Color.White
                )
            },
            text = {
                Text(
                    text = "How was your experience with this trip?\nHelp fellow travelers by sharing your route, destination, and safety experience.",
                    color = TextSecondary,
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showReviewPromptDialog = false
                        onNavigateToReview()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen, contentColor = Color.Black)
                ) {
                    Text("Review Trip", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showReviewPromptDialog = false }
                ) {
                    Text("Skip for Now", color = TextSecondary)
                }
            },
            containerColor = CardBg,
            shape = RoundedCornerShape(8.dp)
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "TRIP MANAGEMENT",
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
            // Active Trip Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = CardBg),
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
                        Text(
                            text = if (tripStatus == TripStatus.COMPLETED) "COMPLETED TRIP 🎉" else "ACTIVE TRIP",
                            color = PrimaryGreen,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                        Surface(
                            color = Color(0x224ADE80),
                            border = BorderStroke(1.dp, PrimaryGreen),
                            shape = RoundedCornerShape(0.dp)
                        ) {
                            Text(
                                text = "TRIP_CODE: SFR-8821",
                                color = PrimaryGreen,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }

                    Text(
                        text = "Rocky Mountain Expedition 2026",
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = "Destination",
                            tint = RedDanger,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Destination: $destinationInput",
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Hotel,
                            contentDescription = "Hotel",
                            tint = BlueAccent,
                            modifier = Modifier.size(16.dp)
                        )
                        Text(
                            text = "Hotel: $hotelInput",
                            color = TextSecondary,
                            fontSize = 12.sp
                        )
                    }

                    Button(
                        onClick = onNavigateToMap,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = SurfaceBg,
                            contentColor = PrimaryGreen
                        ),
                        shape = RoundedCornerShape(0.dp),
                        border = BorderStroke(1.dp, PrimaryGreen)
                    ) {
                        Text(
                            text = "VIEW APPROVED ROUTE ON MAP",
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp
                        )
                    }

                    // Trip Leader End Trip Action & Review Action
                    if (tripStatus == TripStatus.ACTIVE) {
                        Button(
                            onClick = {
                                tripStatus = TripStatus.COMPLETED
                                showReviewPromptDialog = true
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = DarkGreen,
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(0.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "END TRIP (LEADER ACTION)",
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }
                    } else if (tripStatus == TripStatus.COMPLETED) {
                        Button(
                            onClick = onNavigateToReview,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = PrimaryGreen,
                                contentColor = Color.Black
                            ),
                            shape = RoundedCornerShape(0.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "REVIEW TRIP EXPERIENCE",
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }
                    }
                }
            }

            // Join Trip Section
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
                        text = "JOIN AN EXISTING TRIP",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )

                    OutlinedTextField(
                        value = tripCodeInput,
                        onValueChange = { tripCodeInput = it.uppercase() },
                        label = { Text("ENTER 6-DIGIT TRIP CODE") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PrimaryGreen,
                            unfocusedBorderColor = BorderDark,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        shape = RoundedCornerShape(0.dp),
                        singleLine = true
                    )

                    Button(
                        onClick = { /* Join trip */ },
                        enabled = tripCodeInput.isNotEmpty(),
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = PrimaryGreen,
                            contentColor = Color.Black
                        ),
                        shape = RoundedCornerShape(0.dp)
                    ) {
                        Text(
                            text = "REQUEST TO JOIN TRIP",
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 12.sp
                        )
                    }
                }
            }

            // Trip Members Roster
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
                        text = "GROUP ROSTER (3 MEMBERS)",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )

                    sampleMembers.forEach { member ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(SurfaceBg)
                                .border(BorderStroke(1.dp, BorderDark))
                                .padding(10.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = member.name,
                                    color = Color.White,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = member.email,
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                            }

                            Surface(
                                color = Color(0x224ADE80),
                                border = BorderStroke(1.dp, PrimaryGreen),
                                shape = RoundedCornerShape(0.dp)
                            ) {
                                Text(
                                    text = "SAFE_IN_BUBBLE",
                                    color = PrimaryGreen,
                                    fontSize = 9.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
