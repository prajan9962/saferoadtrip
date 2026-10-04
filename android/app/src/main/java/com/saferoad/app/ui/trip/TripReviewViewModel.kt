package com.saferoad.app.ui.trip

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.saferoad.app.data.model.TripReview
import com.saferoad.app.data.repository.TripReviewRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class TripReviewUiState(
    val tripId: String = "",
    val tripTitle: String = "",
    val destination: String = "",
    val overallRating: Int = 5,
    val safetyRating: Int = 5,
    val routeRating: String = "Good",
    val routeFeltSafe: String = "Yes",
    val destinationRating: Int = 5,
    val selectedExperiences: Set<String> = setOf("Safe environment", "No major issues"),
    val safetyIssueType: String = "No issues",
    val safetyIssueDetails: String = "",
    val featureRatings: Map<String, Int?> = mapOf(
        "AI Safety Guide" to 5,
        "Safe Route Recommendation" to 5,
        "Smart Safe Bubble" to 5,
        "Safety Alerts" to 5,
        "SOS / Emergency Support" to 5,
        "Offline Safety Features" to null
    ),
    val suggestions: String = "",
    val isSubmitting: Boolean = false,
    val isSubmitted: Boolean = false,
    val errorMessage: String? = null
)

class TripReviewViewModel(
    private val repository: TripReviewRepository = TripReviewRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(TripReviewUiState())
    val uiState: StateFlow<TripReviewUiState> = _uiState.asStateFlow()

    fun initializeTrip(tripId: String, tripTitle: String, destination: String) {
        val existing = repository.getReviewForTrip(tripId)
        if (existing != null) {
            _uiState.value = _uiState.value.copy(
                tripId = tripId,
                tripTitle = tripTitle,
                destination = destination,
                overallRating = existing.overallRating,
                safetyRating = existing.safetyRating,
                routeRating = existing.routeRating,
                routeFeltSafe = existing.routeFeltSafe,
                destinationRating = existing.destinationRating,
                selectedExperiences = existing.destinationExperiences.toSet(),
                safetyIssueType = existing.safetyIssueType,
                safetyIssueDetails = existing.safetyIssueDetails ?: "",
                featureRatings = existing.featureRatings.ifEmpty { _uiState.value.featureRatings },
                suggestions = existing.suggestions ?: "",
                isSubmitted = true
            )
        } else {
            _uiState.value = _uiState.value.copy(
                tripId = tripId,
                tripTitle = tripTitle,
                destination = destination
            )
        }
    }

    fun setOverallRating(rating: Int) {
        _uiState.value = _uiState.value.copy(overallRating = rating)
    }

    fun setSafetyRating(rating: Int) {
        _uiState.value = _uiState.value.copy(safetyRating = rating)
    }

    fun setRouteRating(rating: String) {
        _uiState.value = _uiState.value.copy(routeRating = rating)
    }

    fun setRouteFeltSafe(feltSafe: String) {
        _uiState.value = _uiState.value.copy(routeFeltSafe = feltSafe)
    }

    fun setDestinationRating(rating: Int) {
        _uiState.value = _uiState.value.copy(destinationRating = rating)
    }

    fun toggleExperience(experience: String) {
        val current = _uiState.value.selectedExperiences.toMutableSet()
        if (current.contains(experience)) {
            current.remove(experience)
        } else {
            current.add(experience)
        }
        _uiState.value = _uiState.value.copy(selectedExperiences = current)
    }

    fun setSafetyIssueType(type: String) {
        _uiState.value = _uiState.value.copy(safetyIssueType = type)
    }

    fun setSafetyIssueDetails(details: String) {
        _uiState.value = _uiState.value.copy(safetyIssueDetails = details)
    }

    fun setFeatureRating(feature: String, rating: Int?) {
        val updated = _uiState.value.featureRatings.toMutableMap()
        updated[feature] = rating
        _uiState.value = _uiState.value.copy(featureRatings = updated)
    }

    fun setSuggestions(text: String) {
        _uiState.value = _uiState.value.copy(suggestions = text)
    }

    fun submitReview(userId: String, userName: String, onSuccess: () -> Unit) {
        val state = _uiState.value

        if (state.safetyIssueType != "No issues" && state.safetyIssueDetails.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Please describe what happened for the safety issue.")
            return
        }

        _uiState.value = state.copy(isSubmitting = true, errorMessage = null)

        viewModelScope.launch {
            val review = TripReview(
                id = "",
                tripId = state.tripId,
                userId = userId,
                userName = userName,
                destination = state.destination,
                overallRating = state.overallRating,
                safetyRating = state.safetyRating,
                routeRating = state.routeRating,
                routeFeltSafe = state.routeFeltSafe,
                destinationRating = state.destinationRating,
                destinationExperiences = state.selectedExperiences.toList(),
                safetyIssueType = state.safetyIssueType,
                safetyIssueDetails = if (state.safetyIssueType != "No issues") state.safetyIssueDetails.trim() else null,
                featureRatings = state.featureRatings,
                suggestions = state.suggestions.ifBlank { null },
                createdAt = System.currentTimeMillis().toString()
            )

            val result = repository.submitReview(review)
            if (result.isSuccess) {
                _uiState.value = _uiState.value.copy(isSubmitting = false, isSubmitted = true)
                onSuccess()
            } else {
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = result.exceptionOrNull()?.message ?: "Failed to submit review"
                )
            }
        }
    }
}
