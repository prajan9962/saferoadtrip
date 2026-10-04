package com.saferoad.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.saferoad.app.data.model.User
import com.saferoad.app.ui.auth.LoginScreen
import com.saferoad.app.ui.home.HomeScreen
import com.saferoad.app.ui.map.SafeRoadMapScreen
import com.saferoad.app.ui.profile.ProfileScreen
import com.saferoad.app.ui.sos.SosScreen
import com.saferoad.app.ui.trip.TripManagementScreen
import com.saferoad.app.ui.trip.TripReviewScreen

@Composable
fun NavGraph(
    navController: NavHostController,
    startDestination: String,
    currentUser: User?,
    onGoogleSignInClick: () -> Unit,
    onDemoLoginClick: () -> Unit,
    onLogoutClick: () -> Unit,
    isAuthLoading: Boolean = false,
    authErrorMessage: String? = null
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onGoogleSignInClick = onGoogleSignInClick,
                onDemoLoginClick = onDemoLoginClick,
                isLoading = isAuthLoading,
                errorMessage = authErrorMessage
            )
        }

        composable(Screen.Home.route) {
            HomeScreen(
                user = currentUser,
                onNavigateToMap = { navController.navigate(Screen.Map.route) },
                onNavigateToTrips = { navController.navigate(Screen.Trips.route) },
                onNavigateToProfile = { navController.navigate(Screen.Profile.route) },
                onNavigateToSOS = { navController.navigate(Screen.SOS.route) },
                onNavigateToReview = { navController.navigate(Screen.TripReview.route) },
                onLogoutClick = onLogoutClick
            )
        }

        composable(Screen.Map.route) {
            SafeRoadMapScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Trips.route) {
            TripManagementScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToMap = { navController.navigate(Screen.Map.route) },
                onNavigateToReview = { navController.navigate(Screen.TripReview.route) }
            )
        }

        composable(Screen.Profile.route) {
            ProfileScreen(
                user = currentUser,
                onNavigateBack = { navController.popBackStack() },
                onLogoutClick = onLogoutClick
            )
        }

        composable(Screen.SOS.route) {
            SosScreen(
                user = currentUser,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.TripReview.route) {
            TripReviewScreen(
                tripId = "trip_rocky_mtn_2026",
                tripTitle = "Rocky Mountain Expedition 2026",
                destination = "Banff National Park, AB",
                userId = currentUser?.id ?: "usr_current",
                userName = currentUser?.name ?: "SafeRoad Traveler",
                onNavigateBack = { navController.popBackStack() },
                onSubmitComplete = { navController.popBackStack() }
            )
        }
    }
}
