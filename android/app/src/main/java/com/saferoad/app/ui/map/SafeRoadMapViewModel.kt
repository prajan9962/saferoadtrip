package com.saferoad.app.ui.map

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.saferoad.app.data.repository.RoutingRepository
import com.saferoad.app.data.repository.RoutingResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.maplibre.android.geometry.LatLng

data class RouteUiState(
    val isCalculating: Boolean = false,
    val errorMessage: String? = null,
    val routePoints: List<LatLng> = emptyList(),
    val distanceKm: Double? = null,
    val durationMinutes: Int? = null
)

class SafeRoadMapViewModel(
    private val repository: RoutingRepository = RoutingRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(RouteUiState())
    val uiState: StateFlow<RouteUiState> = _uiState.asStateFlow()

    fun calculateRoute(startLatLng: LatLng, destinationLatLng: LatLng) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isCalculating = true,
                errorMessage = null
            )

            when (val result = repository.calculateDrivingRoute(startLatLng, destinationLatLng)) {
                is RoutingResult.Success -> {
                    _uiState.value = _uiState.value.copy(
                        isCalculating = false,
                        errorMessage = null,
                        routePoints = result.routePoints,
                        distanceKm = result.distanceKm,
                        durationMinutes = result.durationMinutes
                    )
                }
                is RoutingResult.Error -> {
                    _uiState.value = _uiState.value.copy(
                        isCalculating = false,
                        errorMessage = result.message,
                        routePoints = emptyList(),
                        distanceKm = null,
                        durationMinutes = null
                    )
                }
            }
        }
    }

    fun clearRoute() {
        _uiState.value = RouteUiState()
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}
