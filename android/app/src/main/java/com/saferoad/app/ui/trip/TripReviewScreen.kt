package com.saferoad.app.ui.trip

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Star
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

private val OVERALL_LABELS = mapOf(
    1 to "Very Poor",
    2 to "Poor",
    3 to "Average",
    4 to "Good",
    5 to "Excellent"
)

private val SAFETY_LABELS = mapOf(
    1 to "Very Unsafe",
    2 to "Unsafe",
    3 to "Neutral",
    4 to "Safe",
    5 to "Very Safe"
)

private val DEST_EXPERIENCE_OPTIONS = listOf(
    "Safe environment",
    "Heavy crowd",
    "Poor road conditions",
    "Traffic issues",
    "Unsafe area",
    "Helpful local support",
    "Emergency assistance required",
    "No major issues",
    "Other"
)

private val SAFETY_FEATURES = listOf(
    "AI Safety Guide",
    "Safe Route Recommendation",
    "Smart Safe Bubble",
    "Safety Alerts",
    "SOS / Emergency Support",
    "Offline Safety Features"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TripReviewScreen(
    tripId: String = "trip_demo",
    tripTitle: String = "Expedition",
    destination: String = "Banff National Park, AB",
    userId: String = "usr_current",
    userName: String = "Traveler",
    viewModel: TripReviewViewModel = androidx.lifecycle.viewmodel.compose.viewModel(),
    onNavigateBack: () -> Unit,
    onSubmitComplete: () -> Unit = onNavigateBack
) {
    LaunchedEffect(tripId) {
        viewModel.initializeTrip(tripId, tripTitle, destination)
    }

    val state by viewModel.uiState.collectAsState()
    var showSuccessDialog by remember { mutableStateOf(false) }

    if (showSuccessDialog) {
        AlertDialog(
            onDismissRequest = {
                showSuccessDialog = false
                onSubmitComplete()
            },
            title = {
                Text(
                    text = "Review Submitted! 🎉",
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    color = Color.White
                )
            },
            text = {
                Text(
                    text = "Thank you for your feedback! Your review helps enhance SafeRoad+'s destination safety intelligence.",
                    color = TextSecondary,
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showSuccessDialog = false
                        onSubmitComplete()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryGreen, contentColor = Color.Black)
                ) {
                    Text("OK", fontWeight = FontWeight.Bold)
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
                    Column {
                        Text(
                            text = "Trip Review",
                            color = Color.White,
                            fontSize = 16.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Help us understand your travel experience.",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    }
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
            // Trip Summary Tag Card
            Surface(
                color = SurfaceBg,
                border = BorderStroke(1.dp, BorderDark),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = RedDanger,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = destination,
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Surface(
                        color = Color(0x224ADE80),
                        border = BorderStroke(1.dp, PrimaryGreen),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = "COMPLETED",
                            color = PrimaryGreen,
                            fontSize = 9.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
            }

            // SECTION 1 — OVERALL EXPERIENCE
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
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "1. OVERALL EXPERIENCE",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = OVERALL_LABELS[state.overallRating] ?: "",
                            color = YellowWarn,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = "How was your overall trip experience?",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )

                    // 5-Star Interactive Rating Control
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        for (i in 1..5) {
                            val isSelected = i <= state.overallRating
                            IconButton(
                                onClick = { viewModel.setOverallRating(i) },
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    imageVector = if (isSelected) Icons.Default.Star else Icons.Outlined.Star,
                                    contentDescription = "$i stars",
                                    tint = if (isSelected) YellowWarn else TextMuted,
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                        }
                    }
                }
            }

            // SECTION 2 — SAFETY EXPERIENCE
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
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "2. SAFETY EXPERIENCE",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${SAFETY_LABELS[state.safetyRating]} (${state.safetyRating}/5)",
                            color = PrimaryGreen,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = "How safe did you feel during the trip?",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )

                    // 5-point rating buttons (Very Unsafe -> Very Safe)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        for (i in 1..5) {
                            val isSelected = state.safetyRating == i
                            val btnColor = when (i) {
                                1 -> RedDanger
                                2 -> Color(0xFFF97316)
                                3 -> YellowWarn
                                4 -> Color(0xFFA3E635)
                                else -> PrimaryGreen
                            }

                            Surface(
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { viewModel.setSafetyRating(i) },
                                color = if (isSelected) btnColor.copy(alpha = 0.25f) else SurfaceBg,
                                border = BorderStroke(1.dp, if (isSelected) btnColor else BorderDark),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(vertical = 8.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = "$i",
                                        color = if (isSelected) btnColor else Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp
                                    )
                                    Text(
                                        text = when(i) {
                                            1 -> "Unsafe"
                                            3 -> "Neutral"
                                            5 -> "Safe"
                                            else -> ""
                                        },
                                        color = TextSecondary,
                                        fontSize = 8.sp,
                                        maxLines = 1
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // SECTION 3 — ROUTE EXPERIENCE
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
                        text = "3. ROUTE EXPERIENCE",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "How was the recommended route?",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )

                    val routeOptions = listOf("Very Poor", "Poor", "Average", "Good", "Excellent")
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        routeOptions.forEach { opt ->
                            val isSelected = state.routeRating == opt
                            Surface(
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { viewModel.setRouteRating(opt) },
                                color = if (isSelected) BlueAccent.copy(alpha = 0.2f) else SurfaceBg,
                                border = BorderStroke(1.dp, if (isSelected) BlueAccent else BorderDark),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier.padding(vertical = 8.dp)
                                ) {
                                    Text(
                                        text = opt,
                                        color = if (isSelected) BlueAccent else TextSecondary,
                                        fontSize = 10.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Did the recommended route feel safe?",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )
                    val safeOptions = listOf("Yes", "Partially", "No", "Not Applicable")
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        safeOptions.forEach { opt ->
                            val isSelected = state.routeFeltSafe == opt
                            Surface(
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { viewModel.setRouteFeltSafe(opt) },
                                color = if (isSelected) PrimaryGreen.copy(alpha = 0.2f) else SurfaceBg,
                                border = BorderStroke(1.dp, if (isSelected) PrimaryGreen else BorderDark),
                                shape = RoundedCornerShape(4.dp)
                            ) {
                                Box(
                                    contentAlignment = Alignment.Center,
                                    modifier = Modifier.padding(vertical = 8.dp)
                                ) {
                                    Text(
                                        text = opt,
                                        color = if (isSelected) PrimaryGreen else TextSecondary,
                                        fontSize = 10.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // SECTION 4 — DESTINATION EXPERIENCE
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
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "4. DESTINATION EXPERIENCE",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${state.destinationRating} / 5 Stars",
                            color = YellowWarn,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = "How was your experience at the destination?",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )

                    // 5-Star Destination Rating
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        for (i in 1..5) {
                            val isSelected = i <= state.destinationRating
                            IconButton(
                                onClick = { viewModel.setDestinationRating(i) },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Icon(
                                    imageVector = if (isSelected) Icons.Default.Star else Icons.Outlined.Star,
                                    contentDescription = "$i stars",
                                    tint = if (isSelected) YellowWarn else TextMuted,
                                    modifier = Modifier.size(28.dp)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "What did you experience? (Multiple selections allowed):",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )

                    // Checkboxes for experiences
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        DEST_EXPERIENCE_OPTIONS.forEach { exp ->
                            val isChecked = state.selectedExperiences.contains(exp)
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { viewModel.toggleExperience(exp) }
                                    .background(if (isChecked) SurfaceBg else Color.Transparent)
                                    .padding(vertical = 4.dp, horizontal = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Checkbox(
                                    checked = isChecked,
                                    onCheckedChange = { viewModel.toggleExperience(exp) },
                                    colors = CheckboxDefaults.colors(
                                        checkedColor = PrimaryGreen,
                                        checkmarkColor = Color.Black
                                    )
                                )
                                Text(
                                    text = exp,
                                    color = if (isChecked) Color.White else TextSecondary,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }
            }

            // SECTION 5 — INCIDENT / PROBLEM REPORTING
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
                        text = "5. INCIDENT / PROBLEM REPORTING",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Did you face any safety-related issue during this trip?",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )

                    val issues = listOf("No issues", "Minor issue", "Safety concern", "Emergency situation")
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        issues.forEach { issue ->
                            val isSelected = state.safetyIssueType == issue
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { viewModel.setSafetyIssueType(issue) }
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                RadioButton(
                                    selected = isSelected,
                                    onClick = { viewModel.setSafetyIssueType(issue) },
                                    colors = RadioButtonDefaults.colors(
                                        selectedColor = if (issue == "Emergency situation") RedDanger else if (issue == "No issues") PrimaryGreen else YellowWarn
                                    )
                                )
                                Text(
                                    text = issue,
                                    color = if (isSelected) Color.White else TextSecondary,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }

                    // Multiline text box if safety issue occurred
                    if (state.safetyIssueType != "No issues") {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "What happened? (Required for reporting)",
                            color = YellowWarn,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        OutlinedTextField(
                            value = state.safetyIssueDetails,
                            onValueChange = { viewModel.setSafetyIssueDetails(it) },
                            placeholder = {
                                Text(
                                    text = "Describe what happened, where it happened, and any important details...",
                                    fontSize = 11.sp,
                                    color = TextMuted
                                )
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(100.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = YellowWarn,
                                unfocusedBorderColor = BorderDark,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            shape = RoundedCornerShape(4.dp)
                        )
                    }
                }
            }

            // SECTION 6 — AI / SAFE ROAD EXPERIENCE
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
                        text = "6. AI / SAFEROAD+ FEATURES",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "How helpful were SafeRoad+'s safety features?",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )

                    SAFETY_FEATURES.forEach { feature ->
                        val rating = state.featureRatings[feature]
                        val isNotUsed = rating == null

                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(SurfaceBg)
                                .border(BorderStroke(1.dp, BorderDark))
                                .padding(8.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = feature,
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Surface(
                                    modifier = Modifier.clickable {
                                        viewModel.setFeatureRating(feature, if (isNotUsed) 5 else null)
                                    },
                                    color = if (isNotUsed) Color(0xFF334155) else Color.Transparent,
                                    border = BorderStroke(1.dp, if (isNotUsed) PrimaryGreen else BorderDark),
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = if (isNotUsed) "Not Used" else "Used",
                                        color = if (isNotUsed) Color.White else TextMuted,
                                        fontSize = 9.sp,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }

                            if (!isNotUsed) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    for (star in 1..5) {
                                        val isFilled = (rating ?: 0) >= star
                                        IconButton(
                                            onClick = { viewModel.setFeatureRating(feature, star) },
                                            modifier = Modifier.size(24.dp)
                                        ) {
                                            Icon(
                                                imageVector = if (isFilled) Icons.Default.Star else Icons.Outlined.Star,
                                                contentDescription = "$star",
                                                tint = if (isFilled) YellowWarn else TextMuted,
                                                modifier = Modifier.size(20.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // SECTION 7 — OPEN FEEDBACK
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
                        text = "7. OPEN FEEDBACK",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Suggestions for improvement or any thoughts for SafeRoad+?",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )
                    OutlinedTextField(
                        value = state.suggestions,
                        onValueChange = { viewModel.setSuggestions(it) },
                        placeholder = {
                            Text(
                                text = "Share your suggestions to make expeditions safer...",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(90.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = PrimaryGreen,
                            unfocusedBorderColor = BorderDark,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        shape = RoundedCornerShape(4.dp)
                    )
                }
            }

            // Error display if any
            state.errorMessage?.let { err ->
                Text(
                    text = err,
                    color = RedDanger,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            // SECTION 8 — SUBMIT ACTION
            Button(
                onClick = {
                    viewModel.submitReview(userId, userName) {
                        showSuccessDialog = true
                    }
                },
                enabled = !state.isSubmitting,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = PrimaryGreen,
                    contentColor = Color.Black
                ),
                shape = RoundedCornerShape(4.dp)
            ) {
                if (state.isSubmitting) {
                    CircularProgressIndicator(
                        color = Color.Black,
                        modifier = Modifier.size(20.dp)
                    )
                } else {
                    Text(
                        text = if (state.isSubmitted) "UPDATE TRIP REVIEW" else "SUBMIT TRIP REVIEW",
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
