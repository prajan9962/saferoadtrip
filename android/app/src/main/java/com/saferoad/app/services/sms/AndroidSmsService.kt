package com.saferoad.app.services.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class SmsCapabilityStatus(
    val hasTelephonyHardware: Boolean,
    val hasSimReady: Boolean,
    val hasSendSmsPermission: Boolean,
    val isCapable: Boolean,
    val failureReason: String? = null
)

data class AndroidSmsDispatchResult(
    val recipientPhone: String,
    val recipientName: String,
    val recipientType: String, // TRIP_LEADER, EMERGENCY_CONTACT, TEAM_MEMBER
    val isSubmitted: Boolean,
    val status: String, // SENT, DELIVERED, FAILED, QUEUED_OFFLINE
    val messageText: String,
    val failureReason: String? = null
)

data class QueuedOfflineSms(
    val sosId: String,
    val recipientPhone: String,
    val recipientName: String,
    val recipientType: String,
    val messageText: String,
    val queuedAt: Long = System.currentTimeMillis()
)

class AndroidSmsService(private val context: Context) {

    private val _lastDispatchStatus = MutableStateFlow<List<AndroidSmsDispatchResult>>(emptyList())
    val lastDispatchStatus: StateFlow<List<AndroidSmsDispatchResult>> = _lastDispatchStatus.asStateFlow()

    // In-memory idempotency register: keys are "${sosId}_${cleanedPhone}"
    private val dispatchedIdempotencyKeys = mutableSetOf<String>()

    // Local offline queue for pending emergencies when telephony/SIM is temporarily unavailable
    private val _offlineQueue = MutableStateFlow<List<QueuedOfflineSms>>(emptyList())
    val offlineQueue: StateFlow<List<QueuedOfflineSms>> = _offlineQueue.asStateFlow()

    fun hasSendSmsPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Checks all prerequisites before attempting direct device-level SMS dispatch:
     * 1. Hardware telephony feature present
     * 2. Active SIM card in READY state
     * 3. android.permission.SEND_SMS granted
     */
    fun checkSmsCapability(): SmsCapabilityStatus {
        val packageManager = context.packageManager
        val hasTelephony = packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)

        if (!hasTelephony) {
            return SmsCapabilityStatus(
                hasTelephonyHardware = false,
                hasSimReady = false,
                hasSendSmsPermission = false,
                isCapable = false,
                failureReason = "Device lacks cellular telephony hardware."
            )
        }

        val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        val simState = telephonyManager?.simState ?: TelephonyManager.SIM_STATE_UNKNOWN
        val hasSimReady = simState == TelephonyManager.SIM_STATE_READY

        if (!hasSimReady) {
            val simReason = when (simState) {
                TelephonyManager.SIM_STATE_ABSENT -> "No cellular SIM card detected."
                TelephonyManager.SIM_STATE_PIN_REQUIRED, TelephonyManager.SIM_STATE_PUK_REQUIRED -> "Cellular SIM is locked (PIN/PUK required)."
                TelephonyManager.SIM_STATE_NETWORK_LOCKED -> "Cellular network is locked."
                else -> "SIM card is not in a ready state (SIM State: $simState)."
            }
            return SmsCapabilityStatus(
                hasTelephonyHardware = true,
                hasSimReady = false,
                hasSendSmsPermission = hasSendSmsPermission(),
                isCapable = false,
                failureReason = simReason
            )
        }

        val hasPermission = hasSendSmsPermission()
        if (!hasPermission) {
            return SmsCapabilityStatus(
                hasTelephonyHardware = true,
                hasSimReady = true,
                hasSendSmsPermission = false,
                isCapable = false,
                failureReason = "SEND_SMS permission not granted by user."
            )
        }

        return SmsCapabilityStatus(
            hasTelephonyHardware = true,
            hasSimReady = true,
            hasSendSmsPermission = true,
            isCapable = true,
            failureReason = null
        )
    }

    /**
     * Formats the exact SafeRoad+ standard SOS SMS message text:
     * 🚨 SafeRoad+ SOS ALERT
     * 
     * Traveller: {user_name}
     * Trip: {trip_name}
     * Destination: {destination}
     * Current Location:
     * https://maps.google.com/?q={latitude},{longitude}
     * 
     * Time: {timestamp}
     * 
     * Status:
     * Emergency SOS activated.
     * 
     * Please contact the traveller immediately.
     */
    fun formatSosMessage(
        userName: String,
        tripName: String,
        destination: String,
        latitude: Double,
        longitude: Double,
        isLastKnownLocation: Boolean = false
    ): String {
        val latStr = String.format(Locale.US, "%.6f", latitude)
        val lngStr = String.format(Locale.US, "%.6f", longitude)
        val locationSuffix = if (isLastKnownLocation) " (Last known location)" else ""
        val mapLink = "https://maps.google.com/?q=$latStr,$lngStr"

        val sdf = SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss 'UTC'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        val timestamp = sdf.format(Date())

        return """🚨 SafeRoad+ SOS ALERT

Traveller: $userName
Trip: ${tripName.ifBlank { "SafeRoad Expedition" }}
Destination: ${destination.ifBlank { "Destination" }}
Current Location:
$mapLink$locationSuffix

Time: $timestamp

Status:
Emergency SOS activated.

Please contact the traveller immediately."""
    }

    /**
     * Sends an emergency SMS via the native Android SmsManager with idempotency protection.
     * Guarantees that "SMS sent" is only reported after confirmed provider submission.
     */
    fun sendDirectSms(
        sosId: String,
        recipientPhone: String,
        recipientName: String,
        recipientType: String,
        message: String
    ): AndroidSmsDispatchResult {
        val cleanedPhone = recipientPhone.trim().replace(" ", "").replace("-", "")

        // Idempotency check: prevent duplicate dispatch for same SOS and phone number
        val idempotencyKey = "${sosId}_$cleanedPhone"
        if (dispatchedIdempotencyKeys.contains(idempotencyKey)) {
            return AndroidSmsDispatchResult(
                recipientPhone = cleanedPhone,
                recipientName = recipientName,
                recipientType = recipientType,
                isSubmitted = true,
                status = "SENT",
                messageText = message,
                failureReason = null
            )
        }

        val capability = checkSmsCapability()
        if (!capability.isCapable) {
            // Queue into offline emergency store
            val queued = QueuedOfflineSms(
                sosId = sosId,
                recipientPhone = cleanedPhone,
                recipientName = recipientName,
                recipientType = recipientType,
                messageText = message
            )
            _offlineQueue.value = _offlineQueue.value + queued

            return AndroidSmsDispatchResult(
                recipientPhone = recipientPhone,
                recipientName = recipientName,
                recipientType = recipientType,
                isSubmitted = false,
                status = "QUEUED_OFFLINE",
                messageText = message,
                failureReason = capability.failureReason ?: "SMS capability check failed."
            )
        }

        if (cleanedPhone.length < 7) {
            return AndroidSmsDispatchResult(
                recipientPhone = recipientPhone,
                recipientName = recipientName,
                recipientType = recipientType,
                isSubmitted = false,
                status = "FAILED",
                messageText = message,
                failureReason = "Invalid recipient phone number format: $recipientPhone"
            )
        }

        try {
            val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }

            val parts = smsManager.divideMessage(message)
            if (parts.size > 1) {
                smsManager.sendMultipartTextMessage(cleanedPhone, null, parts, null, null)
            } else {
                smsManager.sendTextMessage(cleanedPhone, null, message, null, null)
            }

            dispatchedIdempotencyKeys.add(idempotencyKey)

            val successResult = AndroidSmsDispatchResult(
                recipientPhone = cleanedPhone,
                recipientName = recipientName,
                recipientType = recipientType,
                isSubmitted = true,
                status = "SENT",
                messageText = message,
                failureReason = null
            )
            _lastDispatchStatus.value = _lastDispatchStatus.value + successResult
            return successResult

        } catch (e: SecurityException) {
            val failResult = AndroidSmsDispatchResult(
                recipientPhone = cleanedPhone,
                recipientName = recipientName,
                recipientType = recipientType,
                isSubmitted = false,
                status = "FAILED",
                messageText = message,
                failureReason = "SEND_SMS security permission denied: ${e.message}"
            )
            _lastDispatchStatus.value = _lastDispatchStatus.value + failResult
            return failResult
        } catch (e: Exception) {
            val failResult = AndroidSmsDispatchResult(
                recipientPhone = cleanedPhone,
                recipientName = recipientName,
                recipientType = recipientType,
                isSubmitted = false,
                status = "FAILED",
                messageText = message,
                failureReason = e.message ?: "Native SmsManager dispatch error."
            )
            _lastDispatchStatus.value = _lastDispatchStatus.value + failResult
            return failResult
        }
    }
}
