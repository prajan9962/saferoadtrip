package com.saferoad.app.data.model

enum class BoundaryStatus {
    SAFE_IN_BUBBLE,
    BREACH_WARNING,
    CRITICAL_BREACH
}

data class SafeBubbleTelemetry(
    val memberId: String,
    val memberName: String,
    val distanceFromLeaderMeters: Float,
    val safeBubbleRadiusMeters: Int = 100,
    val boundaryStatus: BoundaryStatus = BoundaryStatus.SAFE_IN_BUBBLE,
    val breachStreak: Int = 0,
    val lastResponse: String? = null, // "I_AM_SAFE" | "NEED_HELP"
    val lastUpdated: Long = System.currentTimeMillis()
)
