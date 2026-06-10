CREATE TABLE IF NOT EXISTS units (
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

CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);

ALTER TABLE leases
    ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON leases(unit_id);

CREATE TABLE IF NOT EXISTS service_charge_budgets (
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

CREATE INDEX IF NOT EXISTS idx_service_charge_budgets_property_id
ON service_charge_budgets(property_id);

CREATE TABLE IF NOT EXISTS service_charge_allocations (
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

CREATE INDEX IF NOT EXISTS idx_service_charge_allocations_budget_id
ON service_charge_allocations(budget_id);

ALTER TABLE service_charge_demands
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES units(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES service_charge_budgets(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS allocation_id UUID REFERENCES service_charge_allocations(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_charge_demands_allocation_id
ON service_charge_demands(allocation_id)
WHERE allocation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_charge_demands_budget_id
ON service_charge_demands(budget_id);

CREATE INDEX IF NOT EXISTS idx_service_charge_demands_unit_id
ON service_charge_demands(unit_id);

-- Backfill units from legacy lease unit data without changing existing leases.
INSERT INTO units (
    property_id,
    unit_name,
    floor_area_sqm,
    status
)
SELECT
    leases.property_id,
    leases.unit_number,
    MAX(leases.occupied_space),
    'active'
FROM leases
WHERE leases.unit_number IS NOT NULL
  AND BTRIM(leases.unit_number) <> ''
GROUP BY leases.property_id, leases.unit_number
ON CONFLICT (property_id, unit_name) DO NOTHING;

UPDATE leases
SET unit_id = units.id
FROM units
WHERE leases.unit_id IS NULL
  AND units.property_id = leases.property_id
  AND units.unit_name = leases.unit_number;
