-- Tenora Database Schema
-- Property management MVP

-- =========================
-- Admins
-- Stores admin users who can log in and manage the system.
-- =========================
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Properties
-- Stores properties such as apartment buildings, houses, or commercial buildings.
-- =========================
CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nigeria',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Units
-- Stores individual rentable units inside a property.
-- A unit does not store tenant_id directly.
-- Tenant occupancy is tracked through leases.
-- =========================
CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    property_id INTEGER NOT NULL,
    unit_number VARCHAR(50) NOT NULL,
    unit_type VARCHAR(100),
    bedrooms INTEGER,
    bathrooms INTEGER,
    rent_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    service_charge_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'vacant',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_units_property
        FOREIGN KEY (property_id)
        REFERENCES properties(id)
        ON DELETE CASCADE
);

-- =========================
-- Tenants
-- Stores tenant information.
-- Tenants are connected to units through leases.
-- =========================
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(50),
    address TEXT,
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Leases
-- Connects tenants to units.
-- This is the main bridge between tenants and units.
-- =========================
CREATE TABLE leases (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER NOT NULL,
    tenant_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount NUMERIC(12,2) NOT NULL,
    service_charge_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    security_deposit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_leases_unit
        FOREIGN KEY (unit_id)
        REFERENCES units(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_leases_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON DELETE RESTRICT
);

-- =========================
-- Rent Charges
-- Stores rent bills/charges generated for a lease.
-- Example: January 2026 rent charge.
-- =========================
CREATE TABLE rent_charges (
    id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL,
    charge_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rent_charges_lease
        FOREIGN KEY (lease_id)
        REFERENCES leases(id)
        ON DELETE CASCADE
);

-- =========================
-- Service Charges
-- Stores service charge bills/charges generated for a lease.
-- Example: estate dues, cleaning fee, security fee.
-- =========================
CREATE TABLE service_charges (
    id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL,
    charge_date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_service_charges_lease
        FOREIGN KEY (lease_id)
        REFERENCES leases(id)
        ON DELETE CASCADE
);

-- =========================
-- Payments
-- Stores payments made by tenants.
-- Payments are connected to leases.
-- Payment type can be rent, service_charge, deposit, or other.
-- =========================
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    lease_id INTEGER NOT NULL,
    payment_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_type VARCHAR(50) NOT NULL DEFAULT 'rent',
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payments_lease
        FOREIGN KEY (lease_id)
        REFERENCES leases(id)
        ON DELETE CASCADE
);

-- =========================
-- Indexes
-- Helps speed up joins, lookups, dashboards, and reminder queries.
-- =========================

CREATE INDEX idx_units_property_id
ON units(property_id);

CREATE INDEX idx_leases_unit_id
ON leases(unit_id);

CREATE INDEX idx_leases_tenant_id
ON leases(tenant_id);

CREATE INDEX idx_leases_status
ON leases(status);

CREATE INDEX idx_rent_charges_lease_id
ON rent_charges(lease_id);

CREATE INDEX idx_rent_charges_status
ON rent_charges(status);

CREATE INDEX idx_rent_charges_due_date
ON rent_charges(due_date);

CREATE INDEX idx_service_charges_lease_id
ON service_charges(lease_id);

CREATE INDEX idx_service_charges_status
ON service_charges(status);

CREATE INDEX idx_service_charges_due_date
ON service_charges(due_date);

CREATE INDEX idx_payments_lease_id
ON payments(lease_id);

CREATE INDEX idx_payments_payment_date
ON payments(payment_date);