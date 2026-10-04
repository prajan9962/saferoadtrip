package com.saferoad.app.data.model

data class EmergencyContactsInfo(
    val police: String = "112 / Regional Police",
    val ambulance: String = "108 / Medical Emergency",
    val touristHelpline: String = "1363 / Tourist Police"
)

data class CommunityExperienceSummary(
    val totalReviews: Int = 0,
    val avgSafetyScore: Float = 4.8f,
    val communitySentiment: String = "",
    val observedExperiences: List<String> = emptyList()
)

data class AIDestinationGuide(
    val destinationName: String,
    val language: String = "en",
    val overallSafetyRating: String = "HIGH", // "HIGH" | "MODERATE" | "CAUTION"
    val safetySummary: String,
    val verifiedAdvisories: List<String> = emptyList(),
    val crimePrecautions: List<String> = emptyList(),
    val roadConditions: List<String> = emptyList(),
    val emergencyServicesInfo: EmergencyContactsInfo = EmergencyContactsInfo(),
    val communityExperience: CommunityExperienceSummary? = null,
    val generatedAt: String = ""
)
