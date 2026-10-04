package com.saferoad.app.services.location

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

/**
 * Result model representing an automatic emergency location capture.
 */
data class EmergencyLocationResult(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val timestamp: Long,
    val isLastKnownLocation: Boolean,
    val source: String, // "GPS_FRESH", "GPS_LAST_KNOWN", or "UNAVAILABLE"
    val isSuccess: Boolean,
    val errorMessage: String? = null
)

/**
 * High-priority zero-click emergency location acquisition service.
 * Priority:
 *  1. Fresh High-Accuracy GPS fix via FusedLocationProviderClient (within emergency timeout).
 *  2. Fallback to device's last known location (clearly labeled).
 *  3. Transparent failure if no coordinates can be obtained without fabricating data.
 */
class EmergencyLocationProvider(private val context: Context) {

    private val fusedLocationClient: FusedLocationProviderClient by lazy {
        LocationServices.getFusedLocationProviderClient(context)
    }

    /**
     * Checks if at least COARSE or FINE location permission has been granted.
     */
    fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val coarse = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        return fine || coarse
    }

    /**
     * Automatically captures the best available location when SOS is confirmed.
     * Zero user interaction required.
     */
    suspend fun getBestEmergencyLocation(timeoutMs: Long = 5000L): EmergencyLocationResult = withContext(Dispatchers.IO) {
        if (!hasLocationPermission()) {
            return@withContext EmergencyLocationResult(
                latitude = 0.0,
                longitude = 0.0,
                accuracy = 0.0f,
                timestamp = System.currentTimeMillis(),
                isLastKnownLocation = false,
                source = "UNAVAILABLE",
                isSuccess = false,
                errorMessage = "Location permission is not granted."
            )
        }

        // 1. Attempt fresh high-accuracy location with timeout
        val freshLocation = withTimeoutOrNull(timeoutMs) {
            fetchFreshLocation()
        }

        if (freshLocation != null) {
            return@withContext EmergencyLocationResult(
                latitude = freshLocation.latitude,
                longitude = freshLocation.longitude,
                accuracy = freshLocation.accuracy,
                timestamp = freshLocation.time.takeIf { it > 0 } ?: System.currentTimeMillis(),
                isLastKnownLocation = false,
                source = "GPS_FRESH",
                isSuccess = true,
                errorMessage = null
            )
        }

        // 2. Fallback to Last Known Location
        val lastLocation = fetchLastKnownLocation()
        if (lastLocation != null) {
            return@withContext EmergencyLocationResult(
                latitude = lastLocation.latitude,
                longitude = lastLocation.longitude,
                accuracy = lastLocation.accuracy,
                timestamp = lastLocation.time.takeIf { it > 0 } ?: System.currentTimeMillis(),
                isLastKnownLocation = true,
                source = "GPS_LAST_KNOWN",
                isSuccess = true,
                errorMessage = null
            )
        }

        // 3. Coordinate acquisition failed
        return@withContext EmergencyLocationResult(
            latitude = 0.0,
            longitude = 0.0,
            accuracy = 0.0f,
            timestamp = System.currentTimeMillis(),
            isLastKnownLocation = false,
            source = "UNAVAILABLE",
            isSuccess = false,
            errorMessage = "Unable to acquire GPS fix or cached location within $timeoutMs ms."
        )
    }

    @SuppressLint("MissingPermission")
    private suspend fun fetchFreshLocation(): Location? = suspendCancellableCoroutine { continuation ->
        try {
            val cts = CancellationTokenSource()
            continuation.invokeOnCancellation { cts.cancel() }

            fusedLocationClient.getCurrentLocation(
                Priority.PRIORITY_HIGH_ACCURACY,
                cts.token
            ).addOnSuccessListener { location ->
                if (continuation.isActive) {
                    continuation.resume(location)
                }
            }.addOnFailureListener {
                if (continuation.isActive) {
                    continuation.resume(null)
                }
            }
        } catch (e: SecurityException) {
            if (continuation.isActive) {
                continuation.resume(null)
            }
        } catch (e: Exception) {
            if (continuation.isActive) {
                continuation.resume(null)
            }
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun fetchLastKnownLocation(): Location? = suspendCancellableCoroutine { continuation ->
        try {
            fusedLocationClient.lastLocation
                .addOnSuccessListener { location ->
                    if (continuation.isActive) {
                        continuation.resume(location)
                    }
                }
                .addOnFailureListener {
                    if (continuation.isActive) {
                        continuation.resume(null)
                    }
                }
        } catch (e: SecurityException) {
            if (continuation.isActive) {
                continuation.resume(null)
            }
        } catch (e: Exception) {
            if (continuation.isActive) {
                continuation.resume(null)
            }
        }
    }
}
