package com.saferoad.app.data.model

enum class TripStatus {
    PLANNING, ACTIVE, COMPLETED, CANCELLED
}

enum class MemberRole {
    LEADER, MEMBER, DISPATCHER
}

data class TripMember(
    val userId: String,
    val name: String,
    val email: String,
    val role: MemberRole = MemberRole.MEMBER,
    val isApproved: Boolean = true,
    val lastKnownLat: Double? = null,
    val lastKnownLng: Double? = null,
    val isSafe: Boolean = true
)

data class Trip(
    val id: String,
    val tripCode: String,
    val title: String,
    val destinationName: String,
    val destinationLat: Double,
    val destinationLng: Double,
    val startLocationName: String,
    val startLat: Double,
    val startLng: Double,
    val leaderId: String,
    val leaderName: String,
    val hotelName: String = "Grand Plaza Hotel",
    val transportMode: String = "Driving",
    val status: TripStatus = TripStatus.ACTIVE,
    val members: List<TripMember> = emptyList(),
    val safeBubbleRadiusMeters: Int = 100
)
