# SafeRoad+ Database Architecture & Schemas

Relational Database schema designed for **PostgreSQL 15+** / **Google Cloud SQL** with PostGIS spatial telemetry extensions and Firebase Firestore cross-synchronization.

---

## 🗄️ Database Tables

1. **`users`**: User identity, medical profiles (blood group, allergies, conditions), and ICE emergency contacts.
2. **`trips`**: Active convoy sessions, destination, leader coordinates, dynamic bubble radius (100m - 5000m), and status.
3. **`trip_members`**: Real-time convoy participants, battery levels, distance to leader, and safe bubble containment state.
4. **`sos_records`**: Emergency distress beacons, GPS accuracy, countdown status, resolution notes, and idempotency keys.
5. **`sos_dispatch_logs`**: Automated SMS, WhatsApp, and webhook dispatch audits to emergency authorities.
6. **`location_history`**: Time-series GPS telemetry tracking speed, bearing, accuracy, and geofence status.
7. **`geofence_events`**: Audit log of convoy safe bubble breaches and straggler warning triggers.
8. **`emergency_authorities`**: National directory for Police (112), Ambulance (108), Fire (101), and Disaster Relief (1070).

---

## 🚀 Running Migrations

```bash
# Using standard psql client
psql -h <HOST> -U <USER> -d saferoad -f migrations/001_initial_saferoad_schema.sql
psql -h <HOST> -U <USER> -d saferoad -f seeds/01_emergency_authorities_seed.sql
```
