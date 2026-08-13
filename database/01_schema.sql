-- Fleet Operations AI Prototype
-- Phase 1: PostgreSQL schema
-- Creates the core fleet tables and useful indexes.

CREATE TABLE IF NOT EXISTS locations (
    location_id SERIAL PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    airport_code VARCHAR(10),
    vehicle_demand_score NUMERIC(5,2) NOT NULL DEFAULT 50.00
        CHECK (vehicle_demand_score >= 0 AND vehicle_demand_score <= 100),
    sedan_demand VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (sedan_demand IN ('LOW', 'MEDIUM', 'HIGH')),
    suv_demand VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (suv_demand IN ('LOW', 'MEDIUM', 'HIGH')),
    truck_demand VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'
        CHECK (truck_demand IN ('LOW', 'MEDIUM', 'HIGH')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (city, state)
);

CREATE TABLE IF NOT EXISTS vehicles (
    vehicle_id VARCHAR(20) PRIMARY KEY,
    vin VARCHAR(17) UNIQUE NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    model_year INTEGER NOT NULL CHECK (model_year BETWEEN 2000 AND 2100),
    vehicle_type VARCHAR(30) NOT NULL
        CHECK (vehicle_type IN ('SEDAN', 'SUV', 'TRUCK', 'MINIVAN', 'LUXURY', 'EV')),
    location_id INTEGER NOT NULL REFERENCES locations(location_id),
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (status IN ('AVAILABLE', 'RENTED', 'MAINTENANCE', 'RESERVED', 'TRANSFER_PENDING', 'OUT_OF_SERVICE')),
    mileage INTEGER NOT NULL DEFAULT 0 CHECK (mileage >= 0),
    utilization_percent NUMERIC(5,2) NOT NULL DEFAULT 0
        CHECK (utilization_percent >= 0 AND utilization_percent <= 100),
    daily_revenue NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (daily_revenue >= 0),
    last_service_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_records (
    maintenance_id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(20) NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    issue VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    estimated_cost NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (estimated_cost >= 0),
    opened_date DATE NOT NULL,
    completed_date DATE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS utilization_history (
    utilization_id BIGSERIAL PRIMARY KEY,
    vehicle_id VARCHAR(20) NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    recorded_date DATE NOT NULL,
    utilization_percent NUMERIC(5,2) NOT NULL
        CHECK (utilization_percent >= 0 AND utilization_percent <= 100),
    rental_days INTEGER NOT NULL DEFAULT 0 CHECK (rental_days >= 0),
    available_days INTEGER NOT NULL DEFAULT 0 CHECK (available_days >= 0),
    UNIQUE (vehicle_id, recorded_date)
);

CREATE TABLE IF NOT EXISTS transfer_requests (
    transfer_id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(20) NOT NULL REFERENCES vehicles(vehicle_id),
    from_location_id INTEGER NOT NULL REFERENCES locations(location_id),
    to_location_id INTEGER NOT NULL REFERENCES locations(location_id),
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL'
        CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
    recommended_by VARCHAR(50) NOT NULL DEFAULT 'AI_AGENT',
    approved_by VARCHAR(100),
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    CHECK (from_location_id <> to_location_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles(location_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_utilization ON vehicles(utilization_percent);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_utilization_vehicle_date ON utilization_history(vehicle_id, recorded_date);
CREATE INDEX IF NOT EXISTS idx_transfer_status ON transfer_requests(status);
