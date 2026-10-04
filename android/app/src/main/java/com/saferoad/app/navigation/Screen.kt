package com.saferoad.app.navigation

sealed class Screen(val route: String, val title: String) {
    object Login : Screen("login", "Login")
    object Home : Screen("home", "Dashboard")
    object Map : Screen("map", "Safe Map & Routing")
    object Trips : Screen("trips", "Trip Management")
    object Profile : Screen("profile", "User Profile")
    object SOS : Screen("sos", "Emergency SOS")
    object TripReview : Screen("trip_review", "Trip Review")
}
