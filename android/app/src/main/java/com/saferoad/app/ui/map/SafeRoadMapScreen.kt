package com.saferoad.app.ui.map

import android.Manifest
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Compass
import androidx.compose.material.icons.filled.Directions
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import org.maplibre.android.MapLibre
import org.maplibre.android.annotations.Marker
import org.maplibre.android.annotations.MarkerOptions
import org.maplibre.android.annotations.Polyline
import org.maplibre.android.annotations.PolylineOptions
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.geometry.LatLngBounds
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style

const val OSM_RASTER_STYLE_JSON = """
{
  "version": 8,
  "sources": {
    "osm-tiles": {
      "type": "raster",
      "tiles": [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      ],
      "tileSize": 256,
      "attribution": "© OpenStreetMap contributors"
    }
  },
  "layers": [
    {
      "id": "osm-tiles-layer",
      "type": "raster",
      "source": "osm-tiles",
      "minzoom": 0,
      "maxzoom": 19
    }
  ]
}
"""

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun SafeRoadMapScreen(
    modifier: Modifier = Modifier,
    onNavigateBack: (() -> Unit)? = null,
    viewModel: SafeRoadMapViewModel = viewModel()
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        MapLibre.getInstance(context)
    }

    val locationPermissionsState = rememberMultiplePermissionsState(
        permissions = listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
    )

    var userLatLng by remember { mutableStateOf<LatLng?>(null) }
    var selectedDestinationLatLng by remember { mutableStateOf<LatLng?>(null) }
    var mapLibreMapInstance by remember { mutableStateOf<MapLibreMap?>(null) }
    var userMarker by remember { mutableStateOf<Marker?>(null) }
    var destinationMarker by remember { mutableStateOf<Marker?>(null) }
    var routePolyline by remember { mutableStateOf<Polyline?>(null) }

    val fusedLocationClient = remember { LocationServices.getFusedLocationProviderClient(context) }

    LaunchedEffect(Unit) {
        if (!locationPermissionsState.allPermissionsGranted) {
            locationPermissionsState.launchMultiplePermissionRequest()
        }
    }

    fun fetchUserLocation() {
        if (locationPermissionsState.allPermissionsGranted) {
            try {
                fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                    .addOnSuccessListener { location ->
                        location?.let {
                            val newLatLng = LatLng(it.latitude, it.longitude)
                            userLatLng = newLatLng

                            mapLibreMapInstance?.let { map ->
                                map.animateCamera(
                                    CameraUpdateFactory.newCameraPosition(
                                        CameraPosition.Builder()
                                            .target(newLatLng)
                                            .zoom(14.0)
                                            .build()
                                    )
                                )

                                userMarker?.remove()
                                userMarker = map.addMarker(
                                    MarkerOptions()
                                        .position(newLatLng)
                                        .title("MY_CURRENT_LOCATION")
                                )
                            }
                        }
                    }
            } catch (e: SecurityException) {
                e.printStackTrace()
            }
        }
    }

    LaunchedEffect(locationPermissionsState.allPermissionsGranted) {
        if (locationPermissionsState.allPermissionsGranted) {
            fetchUserLocation()
        }
    }

    // Effect to render Polyline on MapLibre when route points update
    LaunchedEffect(uiState.routePoints, mapLibreMapInstance) {
        val map = mapLibreMapInstance
        if (map != null) {
            routePolyline?.remove()
            routePolyline = null

            if (uiState.routePoints.isNotEmpty()) {
                val polylineOptions = PolylineOptions()
                    .addAll(uiState.routePoints)
                    .color(android.graphics.Color.parseColor("#3B82F6")) // Vivid Blue Route
                    .width(6f)

                routePolyline = map.addPolyline(polylineOptions)

                // Adjust camera bounds to fit entire calculated route
                val builder = LatLngBounds.Builder()
                uiState.routePoints.forEach { builder.include(it) }
                val bounds = builder.build()

                map.animateCamera(CameraUpdateFactory.newLatLngBounds(bounds, 80))
            }
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF0A0B0E))
    ) {
        // Top Header Control Bar
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F1218)),
            border = CardBorder(Color(0xFF2D3139))
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (onNavigateBack != null) {
                            IconButton(
                                onClick = onNavigateBack,
                                modifier = Modifier.size(28.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ArrowBack,
                                    contentDescription = "Back",
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(4.dp))
                        }
                        Icon(
                            imageVector = Icons.Default.Compass,
                            contentDescription = null,
                            tint = Color(0xFF4ADE80),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "OPENROUTESERVICE_ONLINE_ROUTING",
                            color = Color(0xFF4ADE80),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Button(
                        onClick = {
                            if (locationPermissionsState.allPermissionsGranted) {
                                fetchUserLocation()
                            } else {
                                locationPermissionsState.launchMultiplePermissionRequest()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1A1D24)),
                        border = CardBorder(Color(0xFF2D3139)),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.MyLocation,
                            contentDescription = "Center on Location",
                            tint = Color(0xFF4ADE80),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "MY_LOCATION",
                            color = Color(0xFF4ADE80),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                }
            }
        }

        // Error Banner
        uiState.errorMessage?.let { errorMsg ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0x33EF4444)),
                border = CardBorder(Color(0xFFEF4444))
            ) {
                Row(
                    modifier = Modifier
                        .padding(10.dp)
                        .fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = Color(0xFFEF4444),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = errorMsg,
                            color = Color(0xFFFCA5A5),
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }
                    IconButton(
                        onClick = { viewModel.clearError() },
                        modifier = Modifier.size(20.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Clear,
                            contentDescription = "Dismiss",
                            tint = Color.White
                        )
                    }
                }
            }
        }

        // Map Viewport Frame
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            AndroidView(
                factory = { ctx ->
                    MapView(ctx).apply {
                        onCreate(null)
                        getMapAsync { map ->
                            mapLibreMapInstance = map
                            map.setStyle(Style.Builder().fromJson(OSM_RASTER_STYLE_JSON)) { style ->
                                val initialTarget = userLatLng ?: LatLng(20.5937, 78.9629)
                                val initialZoom = if (userLatLng != null) 14.0 else 4.0
                                map.cameraPosition = CameraPosition.Builder()
                                    .target(initialTarget)
                                    .zoom(initialZoom)
                                    .build()

                                map.addOnMapClickListener { latLng ->
                                    selectedDestinationLatLng = latLng

                                    // Clear existing calculated route when selecting a new destination
                                    viewModel.clearRoute()
                                    routePolyline?.remove()
                                    routePolyline = null

                                    destinationMarker?.remove()
                                    destinationMarker = map.addMarker(
                                        MarkerOptions()
                                            .position(latLng)
                                            .title("SELECTED_DESTINATION")
                                    )
                                    true
                                }

                                userLatLng?.let { pos ->
                                    userMarker?.remove()
                                    userMarker = map.addMarker(
                                        MarkerOptions()
                                            .position(pos)
                                            .title("MY_CURRENT_LOCATION")
                                    )
                                }
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxSize()
            )

            // Floating Debug Telemetry & Route Action Card
            Card(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(12.dp)
                    .width(300.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xEC0F1218)),
                border = CardBorder(Color(0xFF2D3139))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = "OPENROUTESERVICE_TELEMETRY",
                        color = Color(0xFF4ADE80),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "START_LOCATION (GPS):",
                        color = Color.Gray,
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = userLatLng?.let { "LAT: ${String.format("%.5f", it.latitude)} | LNG: ${String.format("%.5f", it.longitude)}" }
                            ?: "Acquiring GPS fix...",
                        color = if (userLatLng != null) Color(0xFF4ADE80) else Color.LightGray,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "DESTINATION_PIN:",
                            color = Color.Gray,
                            fontSize = 9.sp,
                            fontFamily = FontFamily.Monospace
                        )

                        if (selectedDestinationLatLng != null) {
                            IconButton(
                                onClick = {
                                    selectedDestinationLatLng = null
                                    viewModel.clearRoute()
                                    destinationMarker?.remove()
                                    destinationMarker = null
                                    routePolyline?.remove()
                                    routePolyline = null
                                },
                                modifier = Modifier.size(16.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Clear,
                                    contentDescription = "Clear",
                                    tint = Color.Red
                                )
                            }
                        }
                    }

                    Text(
                        text = selectedDestinationLatLng?.let {
                            "LAT: ${String.format("%.5f", it.latitude)} | LNG: ${String.format("%.5f", it.longitude)}"
                        } ?: "Tap map anywhere to select target",
                        color = if (selectedDestinationLatLng != null) Color(0xFFEF4444) else Color.Gray,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )

                    // Route Summary metrics if calculated
                    if (uiState.distanceKm != null && uiState.durationMinutes != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Divider(color = Color(0xFF2D3139))
                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text(
                                    text = "DISTANCE",
                                    color = Color.Gray,
                                    fontSize = 9.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                                Text(
                                    text = "${uiState.distanceKm} km",
                                    color = Color(0xFF60A5FA),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "EST. DURATION",
                                    color = Color.Gray,
                                    fontSize = 9.sp,
                                    fontFamily = FontFamily.Monospace
                                )
                                Text(
                                    text = "${uiState.durationMinutes} min",
                                    color = Color(0xFF34D399),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }

                    // Calculate Route Action Button
                    if (userLatLng != null && selectedDestinationLatLng != null) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(
                            onClick = {
                                viewModel.calculateRoute(userLatLng!!, selectedDestinationLatLng!!)
                            },
                            enabled = !uiState.isCalculating,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                            shape = RoundedCornerShape(4.dp),
                            contentPadding = PaddingValues(vertical = 8.dp)
                        ) {
                            if (uiState.isCalculating) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(14.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "CALCULATING_ROUTE...",
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            } else {
                                Icon(
                                    imageVector = Icons.Default.Directions,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (uiState.routePoints.isNotEmpty()) "RECALCULATE_ROUTE" else "CALCULATE_ROUTE",
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CardBorder(color: Color) = androidx.compose.foundation.BorderStroke(1.dp, color)
