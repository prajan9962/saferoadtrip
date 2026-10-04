-- ==============================================================================
-- SafeRoad+ Mission-Critical Relational PostgreSQL / Cloud SQL Database Schema
-- Migration: 001_initial_saferoad_schema.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. USERS & PROFILES TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) UNIQUE NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(32) DEFAULT 'USER' CHECK (role IN ('USER', 'TRIP_LEADER', 'AUTHORITY', 'ADMIN')),
    medical_blood_group VARCHAR(8),
    medical_allergies TEXT,
    medical_conditions TEXT,
    emergency_contact_name VARCHAR(120),
    emergency_contact_phone VARCHAR(30),
    emergency_contact_relation VARCHAR(60),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TRIPS & CONVOYS TABLE
CREATE TABLE IF NOT EXISTS trips (
    id VARCHAR(64) PRIMARY KEY,
    trip_code VARCHAR(6) UNIQUE NOT NULL,
    destination VARCHAR(255) NOT NULL,
    transport_mode VARCHAR(64) DEFAULT 'Car',
    leader_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    leader_latitude DOUBLE PRECISION,
    leader_longitude DOUBLE PRECISION,
    leader_accuracy_meters DOUBLE PRECISION,
    leader_last_location_update TIMESTAMP WITH TIME ZONE,
    safe_bubble_radius_meters INT DEFAULT 100,
    status VARCHAR(32) DEFAULT 'ACTIVE' CHECK (status IN ('UPCOMING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    is_archived BOOLEAN DEFAULT FALSE,
    hotel_name VARCHAR(255),
    hotel_latitude DOUBLE PRECISION,
    hotel_longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_code ON trips(trip_code);
CREATE INDEX IF NOT EXISTS idx_trips_leader ON trips(leader_id);

-- 3. TRIP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS trip_members (
    id VARCHAR(64) PRIMARY KEY,
    trip_id VARCHAR(64) REFERENCES trips(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    is_leader BOOLEAN DEFAULT FALSE,
    is_joined BOOLEAN DEFAULT TRUE,
    role VARCHAR(32) DEFAULT 'MEMBER' CHECK (role IN ('LEADER', 'MEMBER', 'TAIL_SWEEPER', 'MEDIC')),
    vehicle_info VARCHAR(120),
    fcm_token TEXT,
    battery_level INT,
    last_latitude DOUBLE PRECISION,
    last_longitude DOUBLE PRECISION,
    last_accuracy DOUBLE PRECISION,
    last_location_update TIMESTAMP WITH TIME ZONE,
    is_inside_bubble BOOLEAN DEFAULT TRUE,
    distance_to_leader_meters DOUBLE PRECISION,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_trip_member UNIQUE(trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user ON trip_members(user_id);

-- 4. SOS EMERGENCY DISTRESS RECORDS TABLE
CREATE TABLE IF NOT EXISTS sos_records (
    id VARCHAR(64) PRIMARY KEY,
    trip_id VARCHAR(64) REFERENCES trips(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(120) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    is_last_known_location BOOLEAN DEFAULT FALSE,
    status VARCHAR(32) DEFAULT 'ACTIVE' CHECK (status IN ('COUNTDOWN', 'ACTIVE', 'RESOLVED', 'CANCELLED')),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    grace_expires_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(64) REFERENCES users(id),
    resolution_notes TEXT,
    idempotency_key VARCHAR(128) UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_sos_trip ON sos_records(trip_id);
CREATE INDEX IF NOT EXISTS idx_sos_status ON sos_records(status);

-- 5. EMERGENCY CONTACT DISPATCH AUDIT LOGS
CREATE TABLE IF NOT EXISTS sos_dispatch_logs (
    id VARCHAR(64) PRIMARY KEY,
    sos_id VARCHAR(64) REFERENCES sos_records(id) ON DELETE CASCADE,
    authority_name VARCHAR(120) NOT NULL,
    authority_phone VARCHAR(30) NOT NULL,
    channel VARCHAR(32) CHECK (channel IN ('SMS', 'WHATSAPP', 'AUTOMATED_VOICE', 'WEBHOOK')),
    status VARCHAR(32) DEFAULT 'SENT' CHECK (status IN ('QUEUED', 'SENT', 'DELIVERED', 'FAILED')),
    payload TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. LOCATION HISTORY TELEMETRY AUDIT TABLE
CREATE TABLE IF NOT EXISTS location_history (
    id VARCHAR(64) PRIMARY KEY,
    trip_id VARCHAR(64) REFERENCES trips(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    bearing DOUBLE PRECISION,
    is_inside_bubble BOOLEAN,
    distance_to_leader DOUBLE PRECISION,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loc_history_trip_time ON location_history(trip_id, recorded_at DESC);

-- 7. GEOFENCE EVENT AUDIT LOG
CREATE TABLE IF NOT EXISTS geofence_events (
    id VARCHAR(64) PRIMARY KEY,
    trip_id VARCHAR(64) REFERENCES trips(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(64) CHECK (event_type IN ('BUBBLE_BREACH_EXIT', 'BUBBLE_ENTER', 'STRAGGLER_TIMEOUT', 'RADIUS_ADJUSTED')),
    distance_meters DOUBLE PRECISION,
    severity VARCHAR(32) CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
