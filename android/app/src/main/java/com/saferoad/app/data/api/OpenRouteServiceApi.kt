package com.saferoad.app.data.api

import com.saferoad.app.data.model.OrsDirectionsResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Query

/**
 * OpenRouteService Directions API Retrofit Interface
 * Base URL: https://api.heigit.org/openrouteservice/
 * Profile: driving-car
 */
interface OpenRouteServiceApi {

    @GET("v2/directions/driving-car")
    suspend fun getDrivingRoute(
        @Header("Authorization") apiKey: String,
        @Query("start") startCoordinates: String, // Format: "lng,lat" e.g. "77.2090,28.6139"
        @Query("end") endCoordinates: String      // Format: "lng,lat" e.g. "77.1734,31.1048"
    ): Response<OrsDirectionsResponse>
}
