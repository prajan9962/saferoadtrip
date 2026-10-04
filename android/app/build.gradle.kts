import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localProperties.load(localPropertiesFile.inputStream())
}

val orsApiKey: String = localProperties.getProperty("OPENROUTESERVICE_API_KEY")
    ?: System.getenv("OPENROUTESERVICE_API_KEY")
    ?: ""

android {
    namespace = "com.saferoad.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.saferoad.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "ORS_API_KEY", "\"$orsApiKey\"")
        buildConfigField("String", "ORS_BASE_URL", "\"https://api.heigit.org/openrouteservice/\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    // AndroidX & Jetpack Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")

    // Navigation Compose
    implementation("androidx.navigation:navigation-compose:2.8.7")

    // Firebase BoM & Firebase Authentication (Google Sign-In)
    implementation(platform("com.google.firebase:firebase-bom:33.9.0"))
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.android.gms:play-services-auth:21.3.0")

    // Android Location Services (FusedLocationProviderClient)
    implementation("com.google.android.gms:play-services-location:21.3.0")

    // MapLibre Native SDK for Android
    implementation("org.maplibre.gl:android-sdk:11.5.1")

    // Permissions handling for Jetpack Compose
    implementation("com.google.accompanist:accompanist-permissions:0.37.0")

    // Retrofit & OkHttp networking for OpenRouteService & FastAPI backend
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
}
