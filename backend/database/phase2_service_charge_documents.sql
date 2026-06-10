CREATE SEQUENCE IF NOT EXISTS service_charge_demand_reference_seq;

ALTER TABLE service_charge_demands
    ADD COLUMN IF NOT EXISTS demand_reference VARCHAR(50),
    ADD COLUMN IF NOT EXISTS demand_title VARCHAR(150),
    ADD COLUMN IF NOT EXISTS payment_instruction TEXT,
    ADD COLUMN IF NOT EXISTS demand_note TEXT,
    ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS document_version INTEGER DEFAULT 1;

WITH numbered_demands AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY created_at, id) AS row_number
    FROM service_charge_demands
    WHERE demand_reference IS NULL
)
UPDATE service_charge_demands
SET demand_reference = 'SCD-' || EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::INT || '-' || LPAD(numbered_demands.row_number::TEXT, 4, '0')
FROM numbered_demands
WHERE service_charge_demands.id = numbered_demands.id;

UPDATE service_charge_demands
SET
    demand_title = COALESCE(demand_title, 'Service Charge Demand'),
    document_version = COALESCE(document_version, 1);

SELECT setval(
    'service_charge_demand_reference_seq',
    GREATEST(
        COALESCE((
            SELECT MAX((regexp_match(demand_reference, 'SCD-[0-9]{4}-([0-9]+)'))[1]::BIGINT)
            FROM service_charge_demands
            WHERE demand_reference ~ '^SCD-[0-9]{4}-[0-9]+$'
        ), 0),
        1
    ),
    TRUE
);

ALTER TABLE service_charge_demands
    ALTER COLUMN demand_title SET DEFAULT 'Service Charge Demand',
    ALTER COLUMN document_version SET DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_charge_demands_reference
    ON service_charge_demands(demand_reference);
