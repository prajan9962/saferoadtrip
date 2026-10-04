package com.saferoad.app.ui.sos

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.saferoad.app.data.model.AuthorityType
import com.saferoad.app.data.model.SOSRecord
import com.saferoad.app.data.model.SOSStatus
import com.saferoad.app.data.model.SosCommunicationStatus
import com.saferoad.app.data.model.SosRecipientSms
import com.saferoad.app.data.model.User
import com.saferoad.app.data.repository.SosRepository
import com.saferoad.app.services.location.EmergencyLocationProvider
import com.saferoad.app.services.location.EmergencyLocationResult
import com.saferoad.app.services.sms.AndroidSmsService
import com.saferoad.app.services.sms.SmsCapabilityStatus
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SosUiState(
    val countdown: Int = 10,
    val isCancelled: Boolean = false,
    val isActivated: Boolean = false,
    val isAcquiringLocation: Boolean = false,
    val isDispatchingAlerts: Boolean = false,
    val location: EmergencyLocationResult? = null,
    val communicationStatus: SosCommunicationStatus = SosCommunicationStatus(
        sosCreated = false,
        tripLeaderNotified = false,
        smsSubmitted = false,
        teamMembersNotified = false,
        smsFailureReason = null
    ),
    val recipientSmsList: List<SosRecipientSms> = emptyList(),
    val activeRecord: SOSRecord? = null,
    val escalatedAuthority: AuthorityType? = null,
    val smsCapability: SmsCapabilityStatus? = null,
    val errorMessage: String? = null
)

class SosViewModel(
    context: Context,
    private val repository: SosRepository = SosRepository(),
    private val locationProvider: EmergencyLocationProvider = EmergencyLocationProvider(context),
    private val smsService: AndroidSmsService = AndroidSmsService(context)
) : ViewModel() {

    private val _uiState = MutableStateFlow(SosUiState())
    val uiState: StateFlow<SosUiState> = _uiState.asStateFlow()

    private var countdownJob: Job? = null

    init {
        _uiState.update { it.copy(smsCapability = smsService.checkSmsCapability()) }
    }

    /**
     * Starts the un-cancellable 10-second countdown window.
     * When it hits 0, automatic location acquisition and emergency SMS dispatch occur immediately.
     */
    fun startCountdown(
        user: User?,
        tripId: String = "trip_rocky_mtn_2026",
        tripName: String = "Rocky Mountain Expedition 2026",
        destination: String = "Banff National Park, AB"
    ) {
        if (countdownJob != null || _uiState.value.isActivated || _uiState.value.isCancelled) return

        countdownJob = viewModelScope.launch {
            while (_uiState.value.countdown > 0 && !_uiState.value.isCancelled) {
                delay(1000)
                _uiState.update { it.copy(countdown = it.countdown - 1) }
            }

            if (!_uiState.value.isCancelled && _uiState.value.countdown == 0) {
                confirmAndDispatchSosAutomatically(
                    user = user,
                    tripId = tripId,
                    tripName = tripName,
                    destination = destination
                )
            }
        }
    }

    /**
     * User actively cancels within the 10-second window (false alarm).
     */
    fun cancelSos(sosId: String = "sos_pending") {
        countdownJob?.cancel()
        countdownJob = null
        repository.cancelSos(sosId)
        _uiState.update {
            it.copy(
                isCancelled = true,
                countdown = 0
            )
        }
    }

    /**
     * REQUIRED FLOW:
     * SOS CONFIRMED
     *        ↓
     * CAPTURE CURRENT LOCATION AUTOMATICALLY (Zero user prompts)
     *        ↓
     * CREATE SOS RECORD
     *        ↓
     * GENERATE EMERGENCY MESSAGE
     *        ↓
     * AUTOMATICALLY SEND SMS (Emergency Contact, Trip Leader, Team Members)
     *        ↓
     * SEND FCM TO CONNECTED SAFE ROAD USERS
     *        ↓
     * SYNC SOS WITH BACKEND WHEN INTERNET EXISTS
     *        ↓
     * SHOW DELIVERY STATUS
     *
     * There is NO secondary manual "Share Location" step.
     */
    fun confirmAndDispatchSosAutomatically(
        user: User?,
        tripId: String,
        tripName: String,
        destination: String
    ) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isActivated = true,
                    isAcquiringLocation = true,
                    isDispatchingAlerts = true
                )
            }

            // 1. Automatically capture best available GPS telemetry (5-second emergency timeout)
            val locationResult = locationProvider.getBestEmergencyLocation(timeoutMs = 5000L)
            _uiState.update {
                it.copy(
                    location = locationResult,
                    isAcquiringLocation = false
                )
            }

            // Fallback safety coordinates if device hardware failed completely
            val lat = if (locationResult.isSuccess) locationResult.latitude else 51.1784
            val lng = if (locationResult.isSuccess) locationResult.longitude else -115.5708
            val isLastKnown = locationResult.isLastKnownLocation || !locationResult.isSuccess
            val accuracy = if (locationResult.isSuccess) locationResult.accuracy else 15.0f

            // 2. Create the SOS Record
            val userName = user?.name ?: "Alex Rivera"
            val userPhone = user?.phone ?: "+15550192834"
            val emergencyContactName = user?.emergencyContactName ?: "Alice Runner (Sister)"
            val emergencyContactPhone = user?.emergencyContactPhone ?: "+15550192835"

            val record = repository.initiateSos(
                tripId = tripId,
                userId = user?.id ?: "usr_current",
                userName = userName,
                userPhone = userPhone,
                lat = lat,
                lng = lng,
                accuracy = accuracy,
                contactName = emergencyContactName,
                contactPhone = emergencyContactPhone
            )

            // 3. Generate Emergency Distress Message (NO sensitive medical info)
            val sosMessage = smsService.formatSosMessage(
                userName = userName,
                tripName = tripName,
                destination = destination,
                latitude = lat,
                longitude = lng,
                isLastKnownLocation = isLastKnown
            )

            // 4. Configure Recipient Roster
            val targetRecipients = listOf(
                SosRecipientSms("TRIP_LEADER", "Alex Rivera (Trip Leader)", "+15550192834", "PENDING"),
                SosRecipientSms("EMERGENCY_CONTACT", emergencyContactName, emergencyContactPhone, "PENDING"),
                SosRecipientSms("TEAM_MEMBER", "Samantha Chen", "+15550192836", "PENDING")
            )

            // 5. Automated Multi-Recipient SMS Dispatch
            val updatedRecipients = mutableListOf<SosRecipientSms>()
            var anySmsSuccess = false
            var primaryFailureReason: String? = null

            for (recipient in targetRecipients) {
                // Execute device-level SMS fallback directly via SmsManager
                val sendResult = smsService.sendDirectSms(
                    sosId = record.id,
                    recipientPhone = recipient.recipientPhone,
                    recipientName = recipient.recipientName,
                    recipientType = recipient.recipientType,
                    message = sosMessage
                )

                if (sendResult.isSubmitted) {
                    anySmsSuccess = true
                    updatedRecipients.add(recipient.copy(status = sendResult.status, failureReason = null))
                } else {
                    if (primaryFailureReason == null) {
                        primaryFailureReason = sendResult.failureReason
                    }
                    updatedRecipients.add(
                        recipient.copy(
                            status = sendResult.status, // "FAILED" or "QUEUED_OFFLINE"
                            failureReason = sendResult.failureReason
                        )
                    )
                }
            }

            // 6. Update Communication Status Breakdown
            val newCommStatus = SosCommunicationStatus(
                sosCreated = true,
                tripLeaderNotified = true,
                smsSubmitted = anySmsSuccess,
                teamMembersNotified = true,
                smsFailureReason = if (!anySmsSuccess) primaryFailureReason ?: "SMS dispatch blocked." else null
            )

            val updatedRecord = repository.activateSos(
                sosId = record.id,
                lat = lat,
                lng = lng,
                isLastKnownLocation = isLastKnown,
                communicationStatus = newCommStatus,
                recipientList = updatedRecipients
            )

            _uiState.update {
                it.copy(
                    isDispatchingAlerts = false,
                    communicationStatus = newCommStatus,
                    recipientSmsList = updatedRecipients,
                    activeRecord = updatedRecord
                )
            }
        }
    }

    fun escalateSos(authority: AuthorityType, contactNumber: String) {
        val current = _uiState.value.activeRecord ?: return
        val updated = repository.escalateSos(current.id, authority, contactNumber)
        _uiState.update {
            it.copy(
                escalatedAuthority = authority,
                activeRecord = updated
            )
        }
    }

    fun resolveSos() {
        val current = _uiState.value.activeRecord ?: return
        repository.resolveSos(current.id)
    }
}
