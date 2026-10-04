package com.saferoad.app.data.repository

import com.google.gson.Gson
import com.saferoad.app.data.api.OpenRouteServiceApi
import com.saferoad.app.data.model.OrsErrorResponse
import com.saferoad.app.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.maplibre.android.geometry.LatLng
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

sealed class RoutingResult {
    data class Success(
        val routePoints: List<LatLng>,
        val distanceKm: Double,
        val durationMinutes: Int
    ) : RoutingResult()

    data class Error(val message: String) : RoutingResult()
}

class RoutingRepository {

    private val api: OpenRouteServiceApi

    init {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()

        val baseUrl = if (BuildConfig.ORS_BASE_URL.endsWith("/")) {
            BuildConfig.ORS_BASE_URL
        } else {
            "${BuildConfig.ORS_BASE_URL}/"
        }

        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        api = retrofit.create(OpenRouteServiceApi::class.java)
    }

    suspend fun calculateDrivingRoute(
        startLatLng: LatLng,
        destinationLatLng: LatLng
    ): RoutingResult {
        val apiKey = BuildConfig.ORS_API_KEY.trim()

        if (apiKey.isEmpty() || apiKey == "your_openrouteservice_api_key_here") {
            return RoutingResult.Error(
                "Missing OpenRouteService API Key. Please add OPENROUTESERVICE_API_KEY to local.properties."
            )
        }

        val startParam = "${startLatLng.longitude},${startLatLng.latitude}"
        val endParam = "${destinationLatLng.longitude},${destinationLatLng.latitude}"

        return try {
            val response = api.getDrivingRoute(
                apiKey = apiKey,
                startCoordinates = startParam,
                endCoordinates = endParam
            )

            if (response.isSuccessful) {
                val body = response.body()
                val feature = body?.features?.firstOrNull()
                val geometry = feature?.geometry
                val summary = feature?.properties?.summary

                if (geometry != null && !geometry.coordinates.isNullOrEmpty()) {
                    // OpenRouteService returns coordinates as [longitude, latitude]
                    val points = geometry.coordinates.map { coord ->
                        LatLng(coord[1], coord[0])
                    }

                    val distanceMeters = summary?.distanceMeters ?: 0.0
                    val durationSeconds = summary?.durationSeconds ?: 0.0

                    val distanceKm = (distanceMeters / 1000.0 * 10.0).roundToInt() / 10.0
                    val durationMinutes = (durationSeconds / 60.0).roundToInt()

                    RoutingResult.Success(
                        routePoints = points,
                        distanceKm = distanceKm,
                        durationMinutes = durationMinutes
                    )
                } else {
                    RoutingResult.Error("No valid route geometry returned by routing engine.")
                }
            } else {
                val errorBody = response.errorBody()?.string()
                val orsError = try {
                    Gson().fromJson(errorBody, OrsErrorResponse::class.java)?.error?.message
                } catch (e: Exception) {
                    null
                }

                val errorMessage = when (response.code()) {
                    401, 403 -> "Invalid API Key (HTTP ${response.code()}). Check OPENROUTESERVICE_API_KEY in local.properties."
                    429 -> "API rate limit/quota exceeded (HTTP 429). Please try again later."
                    400, 404, 422 -> orsError ?: "Invalid route request or coordinates out of drivable region (HTTP ${response.code()})."
                    in 500..599 -> "OpenRouteService server error (HTTP ${response.code()}). Please try again."
                    else -> orsError ?: "Routing failed with HTTP error ${response.code()}."
                }

                RoutingResult.Error(errorMessage)
            }
        } catch (e: IOException) {
            RoutingResult.Error("No internet connection. Please check your network and try again.")
        } catch (e: Exception) {
            RoutingResult.Error("Routing error: ${e.localizedMessage ?: "Unknown network failure"}")
        }
    }
}
