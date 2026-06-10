ALTER TABLE leases
    DROP COLUMN IF EXISTS next_rent_due_date,
    DROP COLUMN IF EXISTS reminder_6_month_date,
    DROP COLUMN IF EXISTS reminder_3_month_date;

DROP TABLE IF EXISTS service_charge_demand_item_periods;
DROP TABLE IF EXISTS service_charge_demand_items;
