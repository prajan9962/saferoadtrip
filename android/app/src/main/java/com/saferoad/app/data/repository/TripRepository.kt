package com.saferoad.app.data.repository

import com.saferoad.app.data.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class TripRepository {
    private val _activeTrip = MutableStateFlow<Trip?>(
        Trip(
            id = "trip_rocky_mtn_2026",
            tripCode = "SFR-8821",
            title = "Rocky Mountain Expedition 2026",
            destinationName = "Banff National Park, AB",
            destinationLat = 51.1784,
            destinationLng = -115.5708,
            startLocationName = "Calgary International Airport",
            startLat = 51.1215,
            startLng = -114.0076,
            leaderId = "usr_1",
            leaderName = "Alex Rivera (Trip Leader)",
            hotelName = "Fairmont Chateau Lake Louise",
            transportMode = "Car",
            status = TripStatus.ACTIVE,
            members = listOf(
                TripMember("usr_1", "Alex Rivera (Trip Leader)", "alex.rivera@saferoad.org", MemberRole.LEADER, isApproved = true),
                TripMember("usr_2", "Samantha Chen", "samantha.chen@saferoad.org", MemberRole.MEMBER, isApproved = true),
                TripMember("usr_3", "Marcus Vance", "marcus.vance@saferoad.org", MemberRole.MEMBER, isApproved = true)
            ),
            safeBubbleRadiusMeters = 100
        )
    )
    val activeTrip: StateFlow<Trip?> = _activeTrip.asStateFlow()

    private val _completedTrips = MutableStateFlow<List<Trip>>(emptyList())
    val completedTrips: StateFlow<List<Trip>> = _completedTrips.asStateFlow()

    fun updateTripStatus(newStatus: TripStatus) {
        val current = _activeTrip.value ?: return
        val updated = current.copy(status = newStatus)
        _activeTrip.value = updated
        if (newStatus == TripStatus.COMPLETED) {
            _completedTrips.value = _completedTrips.value + updated
        }
    }

    fun joinTrip(code: String): Result<Trip> {
        val current = _activeTrip.value
        return if (current != null && current.tripCode.equals(code.trim(), ignoreCase = true)) {
            Result.success(current)
        } else {
            Result.failure(Exception("Invalid trip code. Please check the code and try again."))
        }
    }

    fun createTrip(
        destination: String,
        hotel: String,
        transport: String,
        membersCount: Int,
        leader: User
    ): Trip {
        val newTrip = Trip(
            id = "trip_${System.currentTimeMillis()}",
            tripCode = "SFR-${(1000..9999).random()}",
            title = "$destination Journey",
            destinationName = destination,
            destinationLat = 51.1784,
            destinationLng = -115.5708,
            startLocationName = "Origin City",
            startLat = 51.1215,
            startLng = -114.0076,
            leaderId = leader.id,
            leaderName = leader.name,
            hotelName = hotel,
            transportMode = transport,
            status = TripStatus.ACTIVE,
            members = listOf(
                TripMember(leader.id, leader.name, leader.email, MemberRole.LEADER, isApproved = true)
            ),
            safeBubbleRadiusMeters = 100
        )
        _activeTrip.value = newTrip
        return newTrip
    }
}
