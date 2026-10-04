-- ==============================================================================
-- SafeRoad+ Emergency Response Services & Authority Directory Seeds
-- ==============================================================================

CREATE TABLE IF NOT EXISTS emergency_authorities (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(64) NOT NULL,
    helpline_number VARCHAR(30) NOT NULL,
    state_jurisdiction VARCHAR(100) DEFAULT 'ALL_INDIA',
    is_active BOOLEAN DEFAULT TRUE,
    response_sla_minutes INT DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO emergency_authorities (id, name, category, helpline_number, state_jurisdiction, response_sla_minutes)
VALUES
    ('auth_police_112', 'National Emergency Response Police Control Room', 'POLICE', '112', 'ALL_INDIA', 10),
    ('auth_ambulance_108', 'National Emergency Medical & Ambulance Service', 'MEDICAL_AMBULANCE', '108', 'ALL_INDIA', 12),
    ('auth_fire_101', 'Fire and Rescue Disaster Command', 'FIRE_SAFETY', '101', 'ALL_INDIA', 10),
    ('auth_disaster_ndrf', 'National Disaster Response Force (NDRF)', 'DISASTER_MANAGEMENT', '1070', 'ALL_INDIA', 20),
    ('auth_highway_nhai', 'NHAI Highway Emergency Highway Patrol', 'HIGHWAY_PATROL', '1033', 'ALL_INDIA', 15)
ON CONFLICT (id) DO NOTHING;
