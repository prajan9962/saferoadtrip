package com.saferoad.app.data.repository

import com.saferoad.app.data.model.BoundaryStatus
import com.saferoad.app.data.model.SafeBubbleTelemetry
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class SafeBubbleRepository {
    private val _telemetry = MutableStateFlow(
        SafeBubbleTelemetry(
            memberId = "usr_current",
            memberName = "Traveler",
            distanceFromLeaderMeters = 24.5f,
            safeBubbleRadiusMeters = 100,
            boundaryStatus = BoundaryStatus.SAFE_IN_BUBBLE,
            breachStreak = 0
        )
    )
    val telemetry: StateFlow<SafeBubbleTelemetry> = _telemetry.asStateFlow()

    fun updateMemberLocation(distanceFromLeader: Float) {
        val current = _telemetry.value
        val radius = current.safeBubbleRadiusMeters
        val status = when {
            distanceFromLeader <= radius -> BoundaryStatus.SAFE_IN_BUBBLE
            distanceFromLeader <= radius * 1.5f -> BoundaryStatus.BREACH_WARNING
            else -> BoundaryStatus.CRITICAL_BREACH
        }
        val streak = if (status != BoundaryStatus.SAFE_IN_BUBBLE) current.breachStreak + 1 else 0

        _telemetry.value = current.copy(
            distanceFromLeaderMeters = distanceFromLeader,
            boundaryStatus = status,
            breachStreak = streak,
            lastUpdated = System.currentTimeMillis()
        )
    }

    fun submitBoundaryResponse(response: String) {
        _telemetry.value = _telemetry.value.copy(
            lastResponse = response,
            lastUpdated = System.currentTimeMillis()
        )
    }

    fun setBubbleRadius(newRadiusMeters: Int) {
        _telemetry.value = _telemetry.value.copy(
            safeBubbleRadiusMeters = newRadiusMeters
        )
    }
}
