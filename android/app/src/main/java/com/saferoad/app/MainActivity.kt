package com.saferoad.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import com.saferoad.app.data.model.User
import com.saferoad.app.data.repository.AuthRepository
import com.saferoad.app.navigation.NavGraph
import com.saferoad.app.navigation.Screen
import com.saferoad.app.ui.theme.DarkBg
import com.saferoad.app.ui.theme.SafeRoadTheme

class MainActivity : ComponentActivity() {

    private val authRepository = AuthRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            SafeRoadTheme {
                val navController = rememberNavController()
                val currentUser by authRepository.currentUser.collectAsState()
                var isAuthLoading by remember { mutableStateOf(false) }
                var authErrorMessage by remember { mutableStateOf<String?>(null) }

                val startDestination = if (currentUser != null) {
                    Screen.Home.route
                } else {
                    Screen.Login.route
                }

                // Handle session updates: when user signs in, navigate to Home
                LaunchedEffect(currentUser) {
                    if (currentUser != null) {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Login.route) { inclusive = true }
                        }
                    }
                }

                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(DarkBg)
                ) {
                    NavGraph(
                        navController = navController,
                        startDestination = startDestination,
                        currentUser = currentUser,
                        isAuthLoading = isAuthLoading,
                        authErrorMessage = authErrorMessage,
                        onGoogleSignInClick = {
                            isAuthLoading = true
                            authErrorMessage = null
                            // In a real device with Google Play Services, launch GoogleSignInClient Intent.
                            // For development/preview, we seamlessly authenticate the user session.
                            val mockGoogleUser = User(
                                id = "google_usr_998811",
                                firebaseUid = "firebase_auth_uid_google_001",
                                email = "alex.rivera.google@gmail.com",
                                name = "Alex Rivera (Trip Leader)",
                                phone = "+15550192834"
                            )
                            authRepository.setUser(mockGoogleUser)
                            isAuthLoading = false
                        },
                        onDemoLoginClick = {
                            isAuthLoading = true
                            val demoUser = User(
                                id = "demo_usr_002",
                                firebaseUid = "firebase_auth_demo_002",
                                email = "samantha.chen@saferoad.org",
                                name = "Samantha Chen (Traveler)",
                                phone = "+15550192839"
                            )
                            authRepository.setUser(demoUser)
                            isAuthLoading = false
                        },
                        onLogoutClick = {
                            authRepository.signOut()
                            navController.navigate(Screen.Login.route) {
                                popUpTo(0) { inclusive = true }
                            }
                        }
                    )
                }
            }
        }
    }
}
