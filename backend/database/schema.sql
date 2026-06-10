CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS service_charge_demands CASCADE;
DROP TABLE IF EXISTS service_charge_allocations CASCADE;
DROP TABLE IF EXISTS service_charge_budgets CASCADE;
DROP TABLE IF EXISTS leases CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS rent_charges CASCADE;
DROP TABLE IF EXISTS service_charges CASCADE;
DROP SEQUENCE IF EXISTS service_charge_demand_reference_seq;

CREATE SEQUENCE service_charge_demand_reference_seq;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_name VARCHAR(150),
    address TEXT NOT NULL,
    location VARCHAR(150),
    property_description VARCHAR(150),
    total_units INT DEFAULT 1,
    total_lettable_space DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(50),
    email VARCHAR(150),
    alternative_contact VARCHAR(150),
    id_card_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    unit_name VARCHAR(100) NOT NULL,
    floor_area_sqm DECIMAL(12,2),
    bedrooms INT,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (property_id, unit_name),
    CHECK (floor_area_sqm IS NULL OR floor_area_sqm >= 0),
    CHECK (bedrooms IS NULL OR bedrooms >= 0)
);

CREATE INDEX idx_units_property_id ON units(property_id);

CREATE TABLE leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    unit_id UUID REFERENCES units(id) ON DELETE RESTRICT,
    unit_number VARCHAR(100),
    unit_description VARCHAR(150),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount DECIMAL(14,2) DEFAULT 0,
    service_charge_amount DECIMAL(14,2) DEFAULT 0,
    payment_frequency VARCHAR(30) DEFAULT 'yearly',
    status VARCHAR(30) DEFAULT 'active',
    last_reviewed_date DATE,
    rent_review_note TEXT,
    occupied_space DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leases_unit_id ON leases(unit_id);

CREATE TABLE service_charge_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    budget_title VARCHAR(150) NOT NULL,
    total_budget DECIMAL(14,2) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculation_method VARCHAR(30) NOT NULL,
    basis VARCHAR(30),
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    total_units INT DEFAULT 0,
    total_area_sqm DECIMAL(14,2) DEFAULT 0,
    calculated_total DECIMAL(14,2) DEFAULT 0,
    final_total DECIMAL(14,2) DEFAULT 0,
    due_date DATE,
    payment_instruction TEXT,
    budget_note TEXT,
    calculated_at TIMESTAMP,
    approved_at TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    issued_at TIMESTAMP,
    issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (total_budget >= 0),
    CHECK (period_end >= period_start),
    CHECK (calculation_method IN ('flat_rate', 'pro_rata')),
    CHECK (
        (calculation_method = 'flat_rate' AND basis IS NULL)
        OR (calculation_method = 'pro_rata' AND basis = 'floor_area')
    ),
    CHECK (status IN ('draft', 'calculated', 'approved', 'issued'))
);

CREATE INDEX idx_service_charge_budgets_property_id
ON service_charge_budgets(property_id);

CREATE TABLE service_charge_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES service_charge_budgets(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    unit_name_snapshot VARCHAR(100) NOT NULL,
    tenant_name_snapshot VARCHAR(150),
    tenant_email_snapshot VARCHAR(150),
    tenant_phone_snapshot VARCHAR(50),
    floor_area_sqm_snapshot DECIMAL(12,2),
    percentage_share DECIMAL(18,10) NOT NULL DEFAULT 0,
    calculated_charge DECIMAL(14,2) NOT NULL DEFAULT 0,
    final_charge DECIMAL(14,2) NOT NULL DEFAULT 0,
    adjustment_note TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'calculated',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (budget_id, unit_id),
    CHECK (floor_area_sqm_snapshot IS NULL OR floor_area_sqm_snapshot >= 0),
    CHECK (percentage_share >= 0),
    CHECK (calculated_charge >= 0),
    CHECK (final_charge >= 0),
    CHECK (status IN ('calculated', 'adjusted', 'issued'))
);

CREATE INDEX idx_service_charge_allocations_budget_id
ON service_charge_allocations(budget_id);

CREATE TABLE service_charge_demands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_reference VARCHAR(50) UNIQUE,
    demand_title VARCHAR(150) DEFAULT 'Service Charge Demand',
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    unit_id UUID REFERENCES units(id) ON DELETE RESTRICT,
    budget_id UUID REFERENCES service_charge_budgets(id) ON DELETE RESTRICT,
    allocation_id UUID UNIQUE REFERENCES service_charge_allocations(id) ON DELETE RESTRICT,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount DECIMAL(14,2) DEFAULT 0,
    amount_paid DECIMAL(14,2) DEFAULT 0,
    balance DECIMAL(14,2) DEFAULT 0,
    due_date DATE,
    status VARCHAR(30) DEFAULT 'draft',
    payment_instruction TEXT,
    demand_note TEXT,
    issued_at TIMESTAMP,
    issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sent_at TIMESTAMP,
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    document_version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_service_charge_demands_budget_id
ON service_charge_demands(budget_id);

CREATE INDEX idx_service_charge_demands_unit_id
ON service_charge_demands(unit_id);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE RESTRICT,
    service_charge_demand_id UUID REFERENCES service_charge_demands(id) ON DELETE SET NULL,
    payment_category VARCHAR(50) NOT NULL,
    amount_paid DECIMAL(14,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_for_period_start DATE,
    payment_for_period_end DATE,
    payment_method VARCHAR(50),
    receipt_number VARCHAR(100),
    status VARCHAR(30) DEFAULT 'paid',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
    service_charge_demand_id UUID REFERENCES service_charge_demands(id) ON DELETE SET NULL,
    reminder_type VARCHAR(50) NOT NULL,
    due_date DATE,
    scheduled_send_date DATE,
    sent_date TIMESTAMP,
    channel VARCHAR(30) DEFAULT 'email',
    status VARCHAR(30) DEFAULT 'pending',
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    message_content TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
