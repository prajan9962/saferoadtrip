package com.saferoad.app.data.model

data class User(
    val id: String,
    val firebaseUid: String,
    val email: String,
    val name: String,
    val phone: String = "+15550192834",
    val photoUrl: String? = null,
    val age: Int = 30,
    val gender: String = "Not Specified",
    val preferredLanguage: String = "en",
    val emergencyContactName: String = "Primary Contact",
    val emergencyContactPhone: String = "+15550192835",
    val bloodGroup: String = "O+",
    val medicalConditions: String = "None",
    val allergies: String = "None"
)
