package com.saferoad.app.data.model

import com.google.gson.annotations.SerializedName

/**
/ OpenRouteService Directions API v2 Response DTOs
/ API Endpoint: https://api.heigit.org/openrouteservice/v2/directions/driving-car
 */

data class OrsDirectionsResponse(
    @SerializedName("features") val features: List<OrsFeature>? = null,
    @SerializedName("type") val type: String? = null,
    @SerializedName("bbox") val bbox: List<Double>? = null
)

data class OrsFeature(
    @SerializedName("type") val type: String? = null,
    @SerializedName("properties") val properties: OrsProperties? = null,
    @SerializedName("geometry") val geometry: OrsGeometry? = null
)

data class OrsProperties(
    @SerializedName("summary") val summary: OrsSummary? = null
)

data class OrsSummary(
    @SerializedName("distance") val distanceMeters: Double? = 0.0,
    @SerializedName("duration") val durationSeconds: Double? = 0.0
)

data class OrsGeometry(
    @SerializedName("type") val type: String? = null,
    @SerializedName("coordinates") val coordinates: List<List<Double>>? = null // Each item is [lng, lat]
)

data class OrsErrorResponse(
    @SerializedName("error") val error: OrsErrorDetails? = null
)

data class OrsErrorDetails(
    @SerializedName("code") val code: Int? = null,
    @SerializedName("message") val message: String? = null
)
