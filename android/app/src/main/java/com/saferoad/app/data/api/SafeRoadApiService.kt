package com.saferoad.app.data.api

import com.saferoad.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

data class VerifyTokenRequest(val idToken: String)
data class AuthResponse(val success: Boolean, val user: User)
data class UserResponse(val user: User)
data class CreateTripRequest(
    val destination: String,
    val transportMode: String,
    val targetMembersCount: Int,
    val startDate: String,
    val endDate: String,
    val hotelName: String? = null
)
data class ActiveTripResponse(val activeTrip: Trip?, val members: List<TripMember>, val role: String?)
data class CompletedTripsItem(val trip: Trip, val membersCount: Int, val hasReviewed: Boolean, val userReview: TripReview?)
data class CompletedTripsResponse(val completedTrips: List<CompletedTripsItem>)
data class JoinTripRequest(val tripCode: String)
data class UpdateStateRequest(val newState: String)
data class BubbleResponseRequest(val response: String)
data class InitiateSosRequest(val tripId: String, val latitude: Double, val longitude: Double, val accuracy: Float)
data class EscalateSosRequest(val authority: String)
data class SafetyGuideRequest(val destination: String, val language: String = "en")
data class SafetyGuideResponse(val guide: AIDestinationGuide, val reviewSummary: CommunityExperienceSummary?)
data class SendMessageRequest(val messageText: String)

interface SafeRoadApiService {

    // Auth
    @POST("api/v1/auth/verify-token")
    suspend fun verifyToken(@Body req: VerifyTokenRequest): Response<AuthResponse>

    @GET("api/v1/users/me")
    suspend fun getCurrentUser(): Response<UserResponse>

    @PUT("api/v1/users/me")
    suspend fun updateProfile(@Body user: User): Response<UserResponse>

    @POST("api/v1/users/me/test-emergency-sms")
    suspend fun testEmergencySms(): Response<Map<String, Any>>

    // Trips
    @POST("api/v1/trips")
    suspend fun createTrip(@Body req: CreateTripRequest): Response<Map<String, Any>>

    @GET("api/v1/trips/active")
    suspend fun getActiveTrip(): Response<ActiveTripResponse>

    @GET("api/v1/trips/completed")
    suspend fun getCompletedTrips(): Response<CompletedTripsResponse>

    @POST("api/v1/trips/join")
    suspend fun joinTrip(@Body req: JoinTripRequest): Response<Map<String, Any>>

    @POST("api/v1/trips/{tripId}/state")
    suspend fun updateTripState(
        @Path("tripId") tripId: String,
        @Body req: UpdateStateRequest
    ): Response<Map<String, Any>>

    // Safe Bubble
    @POST("api/v1/trips/{tripId}/bubble-response")
    suspend fun sendBubbleResponse(
        @Path("tripId") tripId: String,
        @Body req: BubbleResponseRequest
    ): Response<Map<String, Any>>

    // SOS
    @POST("api/v1/sos/initiate")
    suspend fun initiateSos(@Body req: InitiateSosRequest): Response<Map<String, Any>>

    @POST("api/v1/sos/{sosId}/cancel")
    suspend fun cancelSos(@Path("sosId") sosId: String): Response<Map<String, Any>>

    @POST("api/v1/sos/{sosId}/activate")
    suspend fun activateSos(
        @Path("sosId") sosId: String,
        @Body location: Map<String, Double>
    ): Response<Map<String, Any>>

    @POST("api/v1/sos/{sosId}/escalate")
    suspend fun escalateSos(
        @Path("sosId") sosId: String,
        @Body req: EscalateSosRequest
    ): Response<Map<String, Any>>

    // Trip Reviews
    @POST("api/v1/trips/{tripId}/reviews")
    suspend fun submitTripReview(
        @Path("tripId") tripId: String,
        @Body review: TripReview
    ): Response<Map<String, Any>>

    @GET("api/v1/trips/{tripId}/reviews/me")
    suspend fun getMyTripReview(@Path("tripId") tripId: String): Response<Map<String, Any>>

    @GET("api/v1/destinations/{destination}/reviews/summary")
    suspend fun getDestinationReviewSummary(@Path("destination") destination: String): Response<Map<String, Any>>

    // AI Safety
    @POST("api/v1/ai/safety-guide")
    suspend fun getSafetyGuide(@Body req: SafetyGuideRequest): Response<SafetyGuideResponse>

    // Trip Chat
    @GET("api/v1/trips/{tripId}/messages")
    suspend fun getMessages(@Path("tripId") tripId: String): Response<Map<String, Any>>

    @POST("api/v1/trips/{tripId}/messages")
    suspend fun sendMessage(
        @Path("tripId") tripId: String,
        @Body req: SendMessageRequest
    ): Response<Map<String, Any>>
}
