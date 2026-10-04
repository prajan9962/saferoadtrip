package com.saferoad.app.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.saferoad.app.data.model.User
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthRepository(
    private val firebaseAuth: FirebaseAuth = FirebaseAuth.getInstance()
) {
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    init {
        // Check existing Firebase Auth session
        firebaseAuth.currentUser?.let { fbUser ->
            _currentUser.value = mapFirebaseUser(fbUser)
        }

        firebaseAuth.addAuthStateListener { auth ->
            val user = auth.currentUser
            if (user != null) {
                _currentUser.value = mapFirebaseUser(user)
            } else {
                _currentUser.value = null
            }
        }
    }

    private fun mapFirebaseUser(fbUser: FirebaseUser): User {
        return User(
            id = fbUser.uid,
            firebaseUid = fbUser.uid,
            email = fbUser.email ?: "user@saferoad.org",
            name = fbUser.displayName ?: "SafeRoad Traveler",
            photoUrl = fbUser.photoUrl?.toString()
        )
    }

    fun isUserLoggedIn(): Boolean {
        return firebaseAuth.currentUser != null
    }

    fun setUser(user: User) {
        _currentUser.value = user
    }

    fun signOut() {
        firebaseAuth.signOut()
        _currentUser.value = null
    }
}
