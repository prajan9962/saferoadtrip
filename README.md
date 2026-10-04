## SafeRoad+ — AI-Powered Tourist Safety & Emergency Response Platform

**Tagline:** *Proactive Safety. Smarter Travel. Faster Response.*

**SafeRoad+** is an AI-powered, group-aware travel safety platform designed to protect tourists and travelling groups before, during, and after their journey. Unlike conventional navigation applications that primarily optimize for distance or travel time, SafeRoad+ combines **AI-driven safety intelligence, safety-aware navigation, real-time group monitoring, geofencing, offline communication, and structured emergency response** into a single platform.

Before a trip, SafeRoad+ analyzes relevant safety information such as **accident history, road conditions, government advisories, crime-related risks, and destination safety information**. Its AI-powered Destination Safety Guide summarizes important risks and precautions in the traveller's preferred language. The system can recommend a **safer route**, while the Trip Leader retains final authority to approve the recommended route before travel.

During an active trip, SafeRoad+ continuously monitors the participating group's locations using GPS and provides a **Smart Safe Bubble** around the group. If a member moves outside the configured safety radius, the system generates an alert and allows the traveller to indicate whether they are safe or need assistance. Critical safety information and the approved route can also remain available during network interruptions.

The platform provides an **offline-capable emergency communication mechanism** using cellular SMS and device-to-device communication where supported. When a traveller confirms an SOS, SafeRoad+ automatically captures the best available location, creates an SOS incident, and attempts to send an emergency SMS containing the traveller's location to the configured **Emergency Contact and Trip Leader**, without requiring a second manual location-sharing action. When internet connectivity is available, the system can additionally use **Firebase Cloud Messaging and the backend emergency service** for real-time alerts and synchronization.

The SOS workflow includes a **10-second cancellation window**, automatic location capture, structured emergency records, leader-first notification, and controlled escalation to authorized emergency authorities such as police, hospitals, or fire and rescue services. Sensitive information such as **blood group, medical conditions, allergies, and emergency contact details** is protected through role-based access and is not exposed through ordinary SMS messages.

SafeRoad+ is built using **Kotlin, Jetpack Compose, MVVM, Room, FastAPI, Python, PostgreSQL, Firebase Authentication, Firebase Cloud Messaging, Google Maps, Google Places, Google Routes, Gemini AI, BLE, and Wear OS technologies**.

### Key Innovation

The major innovation of SafeRoad+ is the integration of:

* **AI-powered destination safety intelligence**
* **Safety-aware route recommendation**
* **Leader-approved navigation**
* **Real-time group GPS monitoring**
* **Smart Safe Bubble geofencing**
* **Offline safety communication**
* **Automatic SOS location SMS**
* **Structured emergency escalation**
* **Privacy-controlled medical information**
* **AI-generated safety guidance**

### Project Objective

The objective of SafeRoad+ is to transform travel safety from a **reactive emergency-response model into a proactive, AI-driven, group-aware safety ecosystem** that helps travellers identify risks early, stay connected throughout their journey, and respond rapidly when an emergency occurs.

### One-line Project Description

> **SafeRoad+ is an AI-powered, group-aware and offline-capable travel safety platform that analyzes travel risks, recommends safer routes, monitors group safety, automatically communicates SOS locations, and enables structured emergency response when it matters most.**
