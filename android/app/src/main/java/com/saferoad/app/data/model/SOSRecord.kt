package com.saferoad.app.data.model

enum class SOSStatus {
    INITIATED,
    ACTIVE,
    ACKNOWLEDGED,
    ESCALATED,
    RESOLVED,
    CANCELLED
}

enum class AuthorityType(val label: String) {
    POLICE("Police Department"),
    HOSPITAL("Emergency Hospital Triage"),
    FIRE_RESCUE("Fire & Mountain Rescue")
}

data class SosCommunicationStatus(
    val sosCreated: Boolean = true,
    val tripLeaderNotified: Boolean = true,
    val smsSubmitted: Boolean = true,
    val teamMembersNotified: Boolean = true,
    val smsFailureReason: String? = null
)

data class SosRecipientSms(
    val recipientType: String, // TRIP_LEADER, EMERGENCY_CONTACT, TEAM_MEMBER
    val recipientName: String,
    val recipientPhone: String,
    val status: String = "SENT", // SENT, DELIVERED, FAILED, QUEUED_OFFLINE
    val failureReason: String? = null
)

data class SOSRecord(
    val id: String,
    val tripId: String,
    val userId: String,
    val userName: String,
    val userPhone: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val status: SOSStatus = SOSStatus.INITIATED,
    val escalatedAuthority: AuthorityType? = null,
    val escalatedContactNumber: String? = null,
    val cancellationWindowExpiresAt: Long = System.currentTimeMillis() + 10_000L,
    val createdAt: Long = System.currentTimeMillis(),
    val smsDeliveryStatus: String = "SENT",
    val emergencyContactName: String = "Emergency Contact",
    val emergencyContactPhone: String = "",
    val isLastKnownLocation: Boolean = false,
    val communicationStatus: SosCommunicationStatus = SosCommunicationStatus(),
    val recipientSmsList: List<SosRecipientSms> = emptyList()
)
