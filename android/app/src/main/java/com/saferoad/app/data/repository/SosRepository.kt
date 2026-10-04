package com.saferoad.app.data.repository

import com.saferoad.app.data.model.AuthorityType
import com.saferoad.app.data.model.SOSRecord
import com.saferoad.app.data.model.SOSStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

class SosRepository {
    private val _activeSos = MutableStateFlow<SOSRecord?>(null)
    val activeSos: StateFlow<SOSRecord?> = _activeSos.asStateFlow()

    fun initiateSos(
        tripId: String,
        userId: String,
        userName: String,
        userPhone: String,
        lat: Double,
        lng: Double,
        accuracy: Float,
        contactName: String,
        contactPhone: String
    ): SOSRecord {
        val record = SOSRecord(
            id = "sos_${UUID.randomUUID()}",
            tripId = tripId,
            userId = userId,
            userName = userName,
            userPhone = userPhone,
            latitude = lat,
            longitude = lng,
            accuracy = accuracy,
            status = SOSStatus.INITIATED,
            cancellationWindowExpiresAt = System.currentTimeMillis() + 10_000L,
            emergencyContactName = contactName,
            emergencyContactPhone = contactPhone
        )
        _activeSos.value = record
        return record
    }

    fun cancelSos(sosId: String) {
        val current = _activeSos.value
        if (current != null && current.id == sosId) {
            _activeSos.value = current.copy(status = SOSStatus.CANCELLED)
        }
    }

    fun activateSos(
        sosId: String,
        lat: Double,
        lng: Double,
        isLastKnownLocation: Boolean = false,
        communicationStatus: com.saferoad.app.data.model.SosCommunicationStatus = com.saferoad.app.data.model.SosCommunicationStatus(),
        recipientList: List<com.saferoad.app.data.model.SosRecipientSms> = emptyList()
    ): SOSRecord? {
        val current = _activeSos.value
        if (current != null && current.id == sosId) {
            val activated = current.copy(
                status = SOSStatus.ACTIVE,
                latitude = lat,
                longitude = lng,
                isLastKnownLocation = isLastKnownLocation,
                smsDeliveryStatus = if (communicationStatus.smsSubmitted) "DELIVERED" else "FAILED",
                communicationStatus = communicationStatus,
                recipientSmsList = recipientList
            )
            _activeSos.value = activated
            return activated
        }
        return null
    }

    fun escalateSos(sosId: String, authority: AuthorityType, contactNumber: String): SOSRecord? {
        val current = _activeSos.value
        if (current != null && current.id == sosId) {
            val escalated = current.copy(
                status = SOSStatus.ESCALATED,
                escalatedAuthority = authority,
                escalatedContactNumber = contactNumber
            )
            _activeSos.value = escalated
            return escalated
        }
        return null
    }

    fun resolveSos(sosId: String) {
        val current = _activeSos.value
        if (current != null && current.id == sosId) {
            _activeSos.value = current.copy(status = SOSStatus.RESOLVED)
        }
    }
}
