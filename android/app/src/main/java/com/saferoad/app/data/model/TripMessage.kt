package com.saferoad.app.data.model

data class TripMessage(
    val id: String,
    val tripId: String,
    val senderId: String,
    val senderName: String,
    val senderRole: MemberRole = MemberRole.MEMBER,
    val messageText: String,
    val timestamp: Long = System.currentTimeMillis()
)
