package com.saferoad.app.data.model

enum class RouteRating(val label: String) {
    VERY_POOR("Very Poor"),
    POOR("Poor"),
    AVERAGE("Average"),
    GOOD("Good"),
    EXCELLENT("Excellent")
}

enum class RouteSafetyOption(val label: String) {
    YES("Yes"),
    PARTIALLY("Partially"),
    NO("No"),
    NOT_APPLICABLE("Not Applicable")
}

enum class SafetyIssueType(val label: String) {
    NO_ISSUES("No issues"),
    MINOR_ISSUE("Minor issue"),
    SAFETY_CONCERN("Safety concern"),
    EMERGENCY_SITUATION("Emergency situation")
}

data class TripReview(
    val id: String,
    val tripId: String,
    val userId: String,
    val userName: String,
    val destination: String,
    val overallRating: Int, // 1 - 5
    val safetyRating: Int, // 1 - 5
    val routeRating: String = "Good",
    val routeFeltSafe: String = "Yes",
    val destinationRating: Int = 5,
    val destinationExperiences: List<String> = emptyList(),
    val safetyIssueType: String = "No issues",
    val safetyIssueDetails: String? = null,
    val featureRatings: Map<String, Int?> = emptyMap(),
    val suggestions: String? = null,
    val createdAt: String = ""
)

data class DestinationExperienceOption(
    val id: String,
    val label: String
)
