package com.saferoad.app.ui.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.saferoad.app.ui.theme.*

@Composable
fun LoginScreen(
    onGoogleSignInClick: () -> Unit,
    onDemoLoginClick: () -> Unit,
    isLoading: Boolean = false,
    errorMessage: String? = null
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.92f)
                .padding(16.dp),
            colors = CardDefaults.cardColors(containerColor = CardBg),
            border = BorderStroke(1.dp, BorderDark),
            shape = RoundedCornerShape(0.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Logo Badge
                Surface(
                    modifier = Modifier.size(48.dp),
                    color = PrimaryGreen,
                    shape = RoundedCornerShape(0.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "Σ",
                            color = Color.Black,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Black,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }

                // Title & Tagline
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "SAFEROAD+",
                        color = Color.White,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "Travel safer. Stay connected.",
                        color = PrimaryGreen,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                HorizontalDivider(color = BorderDark, thickness = 1.dp)

                // Error alert if present
                if (errorMessage != null) {
                    Surface(
                        color = Color(0x33EF4444),
                        border = BorderStroke(1.dp, RedDanger),
                        shape = RoundedCornerShape(0.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Warning,
                                contentDescription = "Error",
                                tint = RedDanger,
                                modifier = Modifier.size(18.dp)
                            )
                            Text(
                                text = errorMessage,
                                color = Color(0xFFFCA5A5),
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }

                // Primary Google Sign In Button
                Button(
                    onClick = onGoogleSignInClick,
                    enabled = !isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SurfaceBg,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(0.dp),
                    border = BorderStroke(1.dp, BorderDark)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = PrimaryGreen,
                            strokeWidth = 2.dp
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = "AUTHENTICATING...",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                    } else {
                        Text(
                            text = "CONTINUE WITH GOOGLE",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Demo bypass button for quick verification
                TextButton(
                    onClick = onDemoLoginClick,
                    enabled = !isLoading
                ) {
                    Text(
                        text = "Or Test with Quick Demo Account",
                        color = TextSecondary,
                        fontSize = 11.sp
                    )
                }

                // Security Note
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "Secured",
                        tint = PrimaryGreen,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = "Secured with Firebase Auth & Google OAuth 2.0",
                        color = TextMuted,
                        fontSize = 10.sp,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}
