CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS service_charge_demand_items CASCADE;
DROP TABLE IF EXISTS service_charge_demands CASCADE;
DROP TABLE IF EXISTS leases CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS rent_charges CASCADE;
DROP TABLE IF EXISTS service_charges CASCADE;

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
    property_code VARCHAR(50) UNIQUE,
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

CREATE TABLE leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    unit_number VARCHAR(100),
    unit_description VARCHAR(150),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount DECIMAL(14,2) DEFAULT 0,
    service_charge_amount DECIMAL(14,2) DEFAULT 0,
    payment_frequency VARCHAR(30) DEFAULT 'yearly',
    status VARCHAR(30) DEFAULT 'active',
    next_rent_due_date DATE,
    reminder_6_month_date DATE,
    reminder_3_month_date DATE,
    last_reviewed_date DATE,
    rent_review_note TEXT,
    occupied_space DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE service_charge_demands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount DECIMAL(14,2) DEFAULT 0,
    amount_paid DECIMAL(14,2) DEFAULT 0,
    balance DECIMAL(14,2) DEFAULT 0,
    due_date DATE,
    status VARCHAR(30) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE service_charge_demand_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id UUID NOT NULL REFERENCES service_charge_demands(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    total_property_cost DECIMAL(14,2) NOT NULL,
    total_lettable_space DECIMAL(12,2) NOT NULL,
    occupied_space DECIMAL(12,2) NOT NULL,
    cost_per_sqm DECIMAL(14,2),
    tenant_amount DECIMAL(14,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
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
    lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
    service_charge_demand_id UUID REFERENCES service_charge_demands(id) ON DELETE CASCADE,
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
