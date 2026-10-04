# SafeRoad+ Database Design Specification (PostgreSQL)

## Core Database Schema

### 1. `users`
- `id` (UUID, Primary Key)
- `firebase_uid` (VARCHAR, Unique, Indexed)
- `email` (VARCHAR, Nullable)
- `phone_number` (VARCHAR, Nullable)
- `name` (VARCHAR, Not Null)
- `age` (INTEGER, Not Null)
- `gender` (VARCHAR, Not Null)
- `preferred_language` (VARCHAR, Default 'en')
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### 2. `user_medical_info`
- `id` (UUID, Primary Key)
- `user_id` (UUID, FK -> `users.id`, Unique)
- `emergency_contact_name` (VARCHAR, Not Null)
- `emergency_contact_phone` (VARCHAR, Not Null)
- `blood_group` (VARCHAR, Not Null)
- `medical_conditions` (TEXT, Nullable)
- `allergies` (TEXT, Nullable)
- `created_at` (TIMESTAMP WITH TIME ZONE)

### 3. `trips`
- `id` (UUID, Primary Key)
- `code` (VARCHAR(6), Unique, Indexed)
- `destination` (VARCHAR, Not Null)
- `transport_mode` (VARCHAR, Not Null)
- `target_members_count` (INTEGER, Not Null)
- `current_members_count` (INTEGER, Default 1)
- `leader_id` (UUID, FK -> `users.id`)
- `start_date` (DATE, Not Null)
- `end_date` (DATE, Not Null)
- `status` (VARCHAR, Default 'UPCOMING') -- UPCOMING, ACTIVE, COMPLETED, CANCELLED, ARCHIVED
- `safe_bubble_radius_meters` (DOUBLE PRECISION, Default 100.0)
- `hotel_place_id` (VARCHAR, Nullable)
- `hotel_name` (VARCHAR, Nullable)
- `hotel_address` (VARCHAR, Nullable)
- `hotel_latitude` (DOUBLE PRECISION, Nullable)
- `hotel_longitude` (DOUBLE PRECISION, Nullable)
- `selected_route_json` (JSONB, Nullable)
- `is_archived` (BOOLEAN, Default False)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### 4. `trip_members`
- `id` (UUID, Primary Key)
- `trip_id` (UUID, FK -> `trips.id`)
- `user_id` (UUID, FK -> `users.id`)
- `role` (VARCHAR) -- LEADER, MEMBER
- `status` (VARCHAR) -- PENDING, APPROVED, REJECTED, LEFT
- `joined_at` (TIMESTAMP WITH TIME ZONE)
- Unique Constraint (`trip_id`, `user_id`)

### 5. `destinations`
- `id` (UUID, Primary Key)
- `name` (VARCHAR, Not Null)
- `latitude` (DOUBLE PRECISION)
- `longitude` (DOUBLE PRECISION)
- `safety_score` (DOUBLE PRECISION)
- `created_at` (TIMESTAMP WITH TIME ZONE)

### 6. `sos_records`
- `id` (UUID, Primary Key)
- `trip_id` (UUID, FK -> `trips.id`)
- `user_id` (UUID, FK -> `users.id`)
- `latitude` (DOUBLE PRECISION, Not Null)
- `longitude` (DOUBLE PRECISION, Not Null)
- `status` (VARCHAR) -- INITIATED, CANCELLED, ACTIVE, ESCALATED, RESOLVED
- `escalated_authority` (VARCHAR, Nullable) -- POLICE, HOSPITAL, FIRE_RESCUE
- `cancellation_window_expires_at` (TIMESTAMP WITH TIME ZONE)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `resolved_at` (TIMESTAMP WITH TIME ZONE, Nullable)

### 7. `ai_guides`
- `id` (UUID, Primary Key)
- `destination_name` (VARCHAR, Not Null, Indexed)
- `safety_summary` (TEXT, Not Null)
- `verified_advisories` (JSONB)
- `crime_precautions` (JSONB)
- `road_conditions` (JSONB)
- `language` (VARCHAR, Default 'en')
- `created_at` (TIMESTAMP WITH TIME ZONE)

### 8. `notifications`
- `id` (UUID, Primary Key)
- `user_id` (UUID, FK -> `users.id`)
- `trip_id` (UUID, FK -> `trips.id`, Nullable)
- `type` (VARCHAR) -- SOS, BOUNDARY_ALERT, LEADERSHIP, GENERAL
- `title` (VARCHAR, Not Null)
- `message` (TEXT, Not Null)
- `is_read` (BOOLEAN, Default False)
- `created_at` (TIMESTAMP WITH TIME ZONE)

### 9. `emergency_requests`
- `id` (UUID, Primary Key)
- `sos_id` (UUID, FK -> `sos_records.id`)
- `authority_type` (VARCHAR) -- POLICE, HOSPITAL, FIRE_RESCUE
- `contact_number` (VARCHAR)
- `dispatch_status` (VARCHAR) -- PENDING, SENT, ACKNOWLEDGED
- `created_at` (TIMESTAMP WITH TIME ZONE)

### 10. `audit_logs`
- `id` (UUID, Primary Key)
- `user_id` (UUID, Nullable)
- `action` (VARCHAR, Not Null) -- e.g., TRIP_CREATED, SOS_TRIGGERED, LEADERSHIP_TRANSFERRED
- `details` (JSONB, Nullable)
- `ip_address` (VARCHAR, Nullable)
- `created_at` (TIMESTAMP WITH TIME ZONE)
