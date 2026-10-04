package com.saferoad.app.data.repository

import com.saferoad.app.data.model.TripReview
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.UUID

class TripReviewRepository {
    private val reviewsCache = mutableMapOf<String, TripReview>() // tripId -> TripReview
    private val _submittedReviews = MutableStateFlow<List<TripReview>>(emptyList())
    val submittedReviews: StateFlow<List<TripReview>> = _submittedReviews.asStateFlow()

    fun submitReview(review: TripReview): Result<TripReview> {
        val reviewWithId = if (review.id.isBlank()) {
            review.copy(id = "rev_${UUID.randomUUID()}")
        } else {
            review
        }
        reviewsCache[review.tripId] = reviewWithId
        _submittedReviews.value = reviewsCache.values.toList()
        return Result.success(reviewWithId)
    }

    fun getReviewForTrip(tripId: String): TripReview? {
        return reviewsCache[tripId]
    }

    fun hasUserReviewedTrip(tripId: String): Boolean {
        return reviewsCache.containsKey(tripId)
    }
}
