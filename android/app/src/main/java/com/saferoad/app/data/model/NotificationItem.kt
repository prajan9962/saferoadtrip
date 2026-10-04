package com.saferoad.app.data.model

enum class NotificationType {
    SOS,
    BOUNDARY_ALERT,
    LEADERSHIP,
    GENERAL
}

data class NotificationItem(
    val id: String,
    val userId: String,
    val tripId: String? = null,
    val type: NotificationType = NotificationType.GENERAL,
    val title: String,
    val message: String,
    val isRead: Boolean = false,
    val timestamp: Long = System.currentTimeMillis()
)
