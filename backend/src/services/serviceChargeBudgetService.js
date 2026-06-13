import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';
import { generateDemandReference } from './serviceChargeDemandService.js';

const budgetColumns = `
    service_charge_budgets.id,
    service_charge_budgets.property_id,
    service_charge_budgets.budget_title,
    service_charge_budgets.total_budget,
    service_charge_budgets.period_start,
    service_charge_budgets.period_end,
    service_charge_budgets.calculation_method,
    service_charge_budgets.basis,
    service_charge_budgets.status,
    service_charge_budgets.total_units,
    service_charge_budgets.total_area_sqm,
    service_charge_budgets.denominator_area_sqm,
    service_charge_budgets.configured_area_sqm,
    service_charge_budgets.occupied_billed_area_sqm,
    service_charge_budgets.vacant_area_sqm,
    service_charge_budgets.inactive_area_sqm,
    service_charge_budgets.unconfigured_area_sqm,
    service_charge_budgets.calculated_total,
    service_charge_budgets.final_total,
    service_charge_budgets.tenant_demand_total,
    service_charge_budgets.owner_liability_total,
    service_charge_budgets.due_date,
    service_charge_budgets.payment_instruction,
    service_charge_budgets.budget_note,
    service_charge_budgets.calculated_at,
    service_charge_budgets.approved_at,
    service_charge_budgets.approved_by,
    service_charge_budgets.issued_at,
    service_charge_budgets.issued_by,
    service_charge_budgets.created_at AS "createdAt",
    service_charge_budgets.updated_at AS "updatedAt"
`;

const budgetReturningColumns = `
    id,
    property_id,
    budget_title,
    total_budget,
    period_start,
    period_end,
    calculation_method,
    basis,
    status,
    total_units,
    total_area_sqm,
    denominator_area_sqm,
    configured_area_sqm,
    occupied_billed_area_sqm,
    vacant_area_sqm,
    inactive_area_sqm,
    unconfigured_area_sqm,
    calculated_total,
    final_total,
    tenant_demand_total,
    owner_liability_total,
    due_date,
    payment_instruction,
    budget_note,
    calculated_at,
    approved_at,
    approved_by,
    issued_at,
    issued_by,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
`;

const allocationColumns = `
    service_charge_allocations.id,
    service_charge_allocations.budget_id,
    service_charge_allocations.unit_id,
    service_charge_allocations.lease_id,
    service_charge_allocations.tenant_id,
    service_charge_allocations.unit_name_snapshot,
    service_charge_allocations.tenant_name_snapshot,
    service_charge_allocations.tenant_email_snapshot,
    service_charge_allocations.tenant_phone_snapshot,
    service_charge_allocations.floor_area_sqm_snapshot,
    service_charge_allocations.unit_status_snapshot,
    service_charge_allocations.billing_eligible,
    service_charge_allocations.percentage_share,
    service_charge_allocations.calculated_charge,
    service_charge_allocations.final_charge,
    service_charge_allocations.adjustment_note,
    service_charge_allocations.status,
    service_charge_allocations.created_at AS "createdAt",
    service_charge_allocations.updated_at AS "updatedAt"
`;

const isMissing = (value) => value === undefined || value === null || value === '';
const toCents = (value) => Math.round(Number(value) * 100);
const fromCents = (value) => value / 100;

const validateBudgetData = ({
    property_id,
    budget_title,
    total_budget,
    period_start,
    period_end,
    calculation_method,
    basis
}) => {
    if(!property_id || !String(budget_title || '').trim() || !period_start || !period_end || isMissing(total_budget)) {
        const error = new Error('Property, budget title, total budget, period start, and period end are required');
        error.status = 400;
        throw error;
    }

    const totalBudget = Number(total_budget);

    if(Number.isNaN(totalBudget) || totalBudget <= 0) {
        const error = new Error('Total budget must be greater than zero');
        error.status = 400;
        throw error;
    }

    if(period_end < period_start) {
        const error = new Error('Budget period end cannot be before period start');
        error.status = 400;
        throw error;
    }

    if(calculation_method !== 'pro_rata') {
        const error = new Error('New service charge budgets must use pro rata floor-area allocation');
        error.status = 400;
        throw error;
    }

    if(basis !== 'floor_area') {
        const error = new Error('Pro rata budgets must use floor_area as the basis');
        error.status = 400;
        throw error;
    }
};

const getBudgetById = async (id, client = pool) => {
    const result = await client.query(
        `
            SELECT
                ${budgetColumns},
                properties.property_name,
                properties.total_lettable_space AS property_total_lettable_space
            FROM service_charge_budgets
            INNER JOIN properties ON properties.id = service_charge_budgets.property_id
            WHERE service_charge_budgets.id = $1
        `,
        [id]
    );
    const budget = result.rows[0];

    if(!budget) {
        const error = new Error('Service charge budget not found');
        error.status = 404;
        throw error;
    }

    return budget;
};

const getAllBudgets = async (filters = {}) => {
    const { property_id, status, calculation_method } = filters;
    const pagination = getPagination(filters);
    const params = [property_id || null, status || null, calculation_method || null];
    const whereClause = `
        WHERE ($1::uuid IS NULL OR service_charge_budgets.property_id = $1)
          AND ($2::text IS NULL OR service_charge_budgets.status = $2)
          AND ($3::text IS NULL OR service_charge_budgets.calculation_method = $3)
    `;

    const result = await pool.query(
        `
            SELECT
                ${budgetColumns},
                properties.property_name,
                COUNT(service_charge_allocations.id)::int AS allocation_count,
                COUNT(service_charge_demands.id)::int AS demand_count
            FROM service_charge_budgets
            INNER JOIN properties ON properties.id = service_charge_budgets.property_id
            LEFT JOIN service_charge_allocations
                ON service_charge_allocations.budget_id = service_charge_budgets.id
            LEFT JOIN service_charge_demands
                ON service_charge_demands.allocation_id = service_charge_allocations.id
            ${whereClause}
            GROUP BY service_charge_budgets.id, properties.id
            ORDER BY service_charge_budgets.created_at DESC
            LIMIT $4 OFFSET $5
        `,
        [...params, pagination.limit, pagination.offset]
    );
    const countResult = await pool.query(
        `
            SELECT COUNT(*) AS total
            FROM service_charge_budgets
            ${whereClause}
        `,
        params
    );

    return {
        budgets: result.rows,
        total: Number(countResult.rows[0].total),
        pagination
    };
};

const createBudget = async (budgetData) => {
    const normalizedData = {
        ...budgetData,
        basis: budgetData.calculation_method === 'pro_rata' ? 'floor_area' : null
    };

    validateBudgetData(normalizedData);

    try {
        const result = await pool.query(
            `
                INSERT INTO service_charge_budgets (
                    property_id,
                    budget_title,
                    total_budget,
                    period_start,
                    period_end,
                    calculation_method,
                    basis,
                    due_date,
                    payment_instruction,
                    budget_note
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING ${budgetReturningColumns}
            `,
            [
                normalizedData.property_id,
                String(normalizedData.budget_title).trim(),
                Number(normalizedData.total_budget),
                normalizedData.period_start,
                normalizedData.period_end,
                normalizedData.calculation_method,
                normalizedData.basis,
                normalizedData.due_date || null,
                normalizedData.payment_instruction || null,
                normalizedData.budget_note || null
            ]
        );

        return result.rows[0];
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Selected property does not exist';
            error.status = 400;
        }

        throw error;
    }
};

const updateBudget = async (id, budgetData) => {
    const existingBudget = await getBudgetById(id);

    if(existingBudget.status === 'issued') {
        const error = new Error('Issued budgets cannot be edited');
        error.status = 400;
        throw error;
    }

    const nextData = {
        property_id: budgetData.property_id ?? existingBudget.property_id,
        budget_title: budgetData.budget_title ?? existingBudget.budget_title,
        total_budget: budgetData.total_budget ?? existingBudget.total_budget,
        period_start: budgetData.period_start ?? existingBudget.period_start,
        period_end: budgetData.period_end ?? existingBudget.period_end,
        calculation_method: budgetData.calculation_method ?? existingBudget.calculation_method,
        basis: null,
        due_date: budgetData.due_date ?? existingBudget.due_date,
        payment_instruction: budgetData.payment_instruction ?? existingBudget.payment_instruction,
        budget_note: budgetData.budget_note ?? existingBudget.budget_note
    };
    nextData.basis = nextData.calculation_method === 'pro_rata' ? 'floor_area' : null;
    validateBudgetData(nextData);

    const calculationInputsChanged =
        nextData.property_id !== existingBudget.property_id ||
        Number(nextData.total_budget) !== Number(existingBudget.total_budget) ||
        String(nextData.period_start).slice(0, 10) !== String(existingBudget.period_start).slice(0, 10) ||
        String(nextData.period_end).slice(0, 10) !== String(existingBudget.period_end).slice(0, 10) ||
        nextData.calculation_method !== existingBudget.calculation_method;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        if(calculationInputsChanged) {
            await client.query('DELETE FROM service_charge_allocations WHERE budget_id = $1', [id]);
        }

        const result = await client.query(
            `
                UPDATE service_charge_budgets
                SET
                    property_id = $1,
                    budget_title = $2,
                    total_budget = $3,
                    period_start = $4,
                    period_end = $5,
                    calculation_method = $6,
                    basis = $7,
                    due_date = $8,
                    payment_instruction = $9,
                    budget_note = $10,
                    status = CASE WHEN $12::boolean THEN 'draft' ELSE status END,
                    total_units = CASE WHEN $12::boolean THEN 0 ELSE total_units END,
                    total_area_sqm = CASE WHEN $12::boolean THEN 0 ELSE total_area_sqm END,
                    denominator_area_sqm = CASE WHEN $12::boolean THEN NULL ELSE denominator_area_sqm END,
                    configured_area_sqm = CASE WHEN $12::boolean THEN NULL ELSE configured_area_sqm END,
                    occupied_billed_area_sqm = CASE WHEN $12::boolean THEN NULL ELSE occupied_billed_area_sqm END,
                    vacant_area_sqm = CASE WHEN $12::boolean THEN NULL ELSE vacant_area_sqm END,
                    inactive_area_sqm = CASE WHEN $12::boolean THEN NULL ELSE inactive_area_sqm END,
                    unconfigured_area_sqm = CASE WHEN $12::boolean THEN NULL ELSE unconfigured_area_sqm END,
                    calculated_total = CASE WHEN $12::boolean THEN 0 ELSE calculated_total END,
                    final_total = CASE WHEN $12::boolean THEN 0 ELSE final_total END,
                    tenant_demand_total = CASE WHEN $12::boolean THEN NULL ELSE tenant_demand_total END,
                    owner_liability_total = CASE WHEN $12::boolean THEN NULL ELSE owner_liability_total END,
                    calculated_at = CASE WHEN $12::boolean THEN NULL ELSE calculated_at END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $11
                RETURNING ${budgetReturningColumns}
            `,
            [
                nextData.property_id,
                String(nextData.budget_title).trim(),
                Number(nextData.total_budget),
                nextData.period_start,
                nextData.period_end,
                nextData.calculation_method,
                nextData.basis,
                nextData.due_date || null,
                nextData.payment_instruction || null,
                nextData.budget_note || null,
                id,
                calculationInputsChanged
            ]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');

        if(error.code === '23503') {
            error.message = 'Selected property does not exist';
            error.status = 400;
        }

        throw error;
    } finally {
        client.release();
    }
};

const deleteBudget = async (id) => {
    const budget = await getBudgetById(id);

    if(budget.status === 'issued') {
        const error = new Error('Issued budgets cannot be deleted');
        error.status = 400;
        throw error;
    }

    try {
        const result = await pool.query(
            `
                DELETE FROM service_charge_budgets
                WHERE id = $1
                RETURNING ${budgetReturningColumns}
            `,
            [id]
        );

        return result.rows[0];
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Budget cannot be deleted because it has issued demand records';
            error.status = 400;
        }

        throw error;
    }
};

const buildRoundedAllocations = (units, totalBudget, denominatorArea) => {
    const totalCents = toCents(totalBudget);
    const configuredArea = units.reduce((total, unit) => total + Number(unit.floor_area_sqm), 0);
    const components = [
        ...units.map((unit) => ({ ...unit, isUnconfigured: false })),
        {
            id: null,
            unit_name: 'Unconfigured area',
            floor_area_sqm: Math.max(denominatorArea - configuredArea, 0),
            isUnconfigured: true
        }
    ];
    const rawAllocations = components.map((unit, index) => {
        const percentageShare = Number(unit.floor_area_sqm) / denominatorArea;
        const rawCents = totalCents * percentageShare;

        return {
            ...unit,
            index,
            percentageShare,
            chargeCents: Math.floor(rawCents),
            fraction: rawCents - Math.floor(rawCents)
        };
    });
    let remainder = totalCents - rawAllocations.reduce((total, unit) => total + unit.chargeCents, 0);
    const remainderOrder = [...rawAllocations].sort((first, second) => (
        second.fraction - first.fraction || first.index - second.index
    ));

    for(let index = 0; index < remainder; index += 1) {
        remainderOrder[index % remainderOrder.length].chargeCents += 1;
    }

    return rawAllocations
        .sort((first, second) => first.index - second.index)
        .filter((unit) => !unit.isUnconfigured)
        .map((unit) => ({
            ...unit,
            charge: fromCents(unit.chargeCents)
        }));
};

const calculateBudget = async (id) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const budget = await getBudgetById(id, client);

        if(budget.status === 'issued') {
            const error = new Error('Issued budgets cannot be recalculated');
            error.status = 400;
            throw error;
        }

        if(budget.calculation_method !== 'pro_rata') {
            const error = new Error('Legacy flat-rate budgets cannot be recalculated. Create a pro rata floor-area budget instead.');
            error.status = 400;
            throw error;
        }

        await client.query(
            'SELECT id FROM properties WHERE id = $1 FOR SHARE',
            [budget.property_id]
        );
        const denominatorArea = Number(budget.property_total_lettable_space || 0);

        if(denominatorArea <= 0) {
            const error = new Error('Enter a positive total lettable space for this property before calculating service charges');
            error.status = 400;
            throw error;
        }

        const unitResult = await client.query(
            `
                SELECT
                    units.id,
                    units.unit_name,
                    units.floor_area_sqm,
                    units.status AS unit_status,
                    occupancy.lease_id,
                    occupancy.tenant_id,
                    occupancy.tenant_name,
                    occupancy.tenant_email,
                    occupancy.tenant_phone
                FROM units
                LEFT JOIN LATERAL (
                    SELECT
                        leases.id AS lease_id,
                        tenants.id AS tenant_id,
                        tenants.full_name AS tenant_name,
                        tenants.email AS tenant_email,
                        tenants.phone_number AS tenant_phone
                    FROM leases
                    INNER JOIN tenants ON tenants.id = leases.tenant_id
                    WHERE leases.unit_id = units.id
                      AND leases.status = 'active'
                      AND leases.start_date <= $2
                      AND leases.end_date >= $1
                    ORDER BY leases.start_date DESC, leases.created_at DESC
                    LIMIT 1
                ) occupancy ON TRUE
                WHERE units.property_id = $3
                ORDER BY units.unit_name ASC
            `,
            [budget.period_start, budget.period_end, budget.property_id]
        );
        const units = unitResult.rows;

        const invalidUnits = units.filter((unit) => Number(unit.floor_area_sqm || 0) <= 0);

        if(invalidUnits.length > 0) {
            const names = invalidUnits.map((unit) => unit.unit_name).join(', ');
            const error = new Error(`Floor area must be greater than zero for every configured unit before service charge calculation. Check: ${names}`);
            error.status = 400;
            throw error;
        }

        const configuredArea = units.reduce((total, unit) => total + Number(unit.floor_area_sqm || 0), 0);

        if(configuredArea - denominatorArea > 0.0001) {
            const error = new Error(`Configured unit area (${configuredArea.toFixed(2)} sqm) exceeds the property total lettable space (${denominatorArea.toFixed(2)} sqm)`);
            error.status = 400;
            throw error;
        }

        const allocations = buildRoundedAllocations(units, budget.total_budget, denominatorArea)
            .map((allocation) => ({
                ...allocation,
                billingEligible: (
                    allocation.unit_status === 'active'
                    && Boolean(allocation.lease_id)
                    && Boolean(allocation.tenant_id)
                )
            }));
        const occupiedBilledArea = allocations
            .filter((allocation) => allocation.billingEligible)
            .reduce((total, allocation) => total + Number(allocation.floor_area_sqm), 0);
        const vacantArea = allocations
            .filter((allocation) => allocation.unit_status === 'active' && !allocation.billingEligible)
            .reduce((total, allocation) => total + Number(allocation.floor_area_sqm), 0);
        const inactiveArea = allocations
            .filter((allocation) => allocation.unit_status === 'inactive')
            .reduce((total, allocation) => total + Number(allocation.floor_area_sqm), 0);
        const unconfiguredArea = Math.max(denominatorArea - configuredArea, 0);
        const tenantDemandTotal = allocations
            .filter((allocation) => allocation.billingEligible)
            .reduce((total, allocation) => total + Number(allocation.charge), 0);
        const ownerLiabilityTotal = Math.max(Number(budget.total_budget) - tenantDemandTotal, 0);
        await client.query('DELETE FROM service_charge_allocations WHERE budget_id = $1', [id]);

        for(const allocation of allocations) {
            await client.query(
                `
                    INSERT INTO service_charge_allocations (
                        budget_id,
                        unit_id,
                        lease_id,
                        tenant_id,
                        unit_name_snapshot,
                        tenant_name_snapshot,
                        tenant_email_snapshot,
                        tenant_phone_snapshot,
                        floor_area_sqm_snapshot,
                        unit_status_snapshot,
                        billing_eligible,
                        percentage_share,
                        calculated_charge,
                        final_charge,
                        status
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, 'calculated')
                `,
                [
                    id,
                    allocation.id,
                    allocation.lease_id,
                    allocation.tenant_id,
                    allocation.unit_name,
                    allocation.tenant_name,
                    allocation.tenant_email,
                    allocation.tenant_phone,
                    allocation.floor_area_sqm,
                    allocation.unit_status,
                    allocation.billingEligible,
                    allocation.percentageShare,
                    allocation.charge
                ]
            );
        }

        await client.query(
            `
                UPDATE service_charge_budgets
                SET
                    status = 'calculated',
                    total_units = $2,
                    total_area_sqm = $3,
                    denominator_area_sqm = $4,
                    configured_area_sqm = $3,
                    occupied_billed_area_sqm = $5,
                    vacant_area_sqm = $6,
                    inactive_area_sqm = $7,
                    unconfigured_area_sqm = $8,
                    calculated_total = $9,
                    final_total = $9,
                    tenant_demand_total = $9,
                    owner_liability_total = $10,
                    calculated_at = CURRENT_TIMESTAMP,
                    approved_at = NULL,
                    approved_by = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `,
            [
                id,
                units.length,
                configuredArea,
                denominatorArea,
                occupiedBilledArea,
                vacantArea,
                inactiveArea,
                unconfiguredArea,
                tenantDemandTotal,
                ownerLiabilityTotal
            ]
        );

        await client.query('COMMIT');
        return getBudgetSchedule(id);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const getBudgetSchedule = async (id) => {
    const budget = await getBudgetById(id);
    const result = await pool.query(
        `
            SELECT
                ${allocationColumns},
                service_charge_demands.id AS demand_id,
                service_charge_demands.demand_reference,
                service_charge_demands.status AS demand_status,
                service_charge_demands.total_amount AS demand_total,
                service_charge_demands.amount_paid,
                service_charge_demands.balance
            FROM service_charge_allocations
            LEFT JOIN service_charge_demands
                ON service_charge_demands.allocation_id = service_charge_allocations.id
            WHERE service_charge_allocations.budget_id = $1
            ORDER BY service_charge_allocations.unit_name_snapshot ASC
        `,
        [id]
    );

    const allocations = result.rows;
    const isBillingEligible = (allocation) => allocation.billing_eligible === null
        ? Boolean(allocation.lease_id && allocation.tenant_id)
        : allocation.billing_eligible;
    const tenantDemandTotal = allocations
        .filter(isBillingEligible)
        .reduce((total, allocation) => total + Number(allocation.final_charge || 0), 0);
    const ownerLiabilityTotal = Math.max(Number(budget.total_budget || 0) - tenantDemandTotal, 0);

    return {
        budget,
        allocations,
        validation: {
            tenant_demand_total: tenantDemandTotal,
            owner_liability_total: ownerLiabilityTotal,
            reconciliation_total: tenantDemandTotal + ownerLiabilityTotal,
            total_matches_budget: Math.abs(
                tenantDemandTotal + ownerLiabilityTotal - Number(budget.total_budget || 0)
            ) < 0.01,
            billing_eligible_units: allocations
                .filter(isBillingEligible)
                .map((allocation) => allocation.unit_name_snapshot),
            owner_liability_units: allocations
                .filter((allocation) => !isBillingEligible(allocation))
                .map((allocation) => allocation.unit_name_snapshot)
        }
    };
};

const updateAllocation = async (id, allocationData) => {
    if(isMissing(allocationData.final_charge)) {
        const error = new Error('Final charge is required');
        error.status = 400;
        throw error;
    }

    const finalCharge = Number(allocationData.final_charge);

    if(Number.isNaN(finalCharge) || finalCharge < 0) {
        const error = new Error('Final charge must be zero or greater');
        error.status = 400;
        throw error;
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const allocationResult = await client.query(
            `
                SELECT id, budget_id, calculated_charge, billing_eligible, lease_id, tenant_id
                FROM service_charge_allocations
                WHERE id = $1
                FOR UPDATE
            `,
            [id]
        );
        const allocation = allocationResult.rows[0];

        if(!allocation) {
            const error = new Error('Service charge allocation not found');
            error.status = 404;
            throw error;
        }

        const budget = await getBudgetById(allocation.budget_id, client);

        if(['approved', 'issued'].includes(budget.status)) {
            const error = new Error('Approved or issued schedules cannot be adjusted');
            error.status = 400;
            throw error;
        }

        const isBillingEligible = allocation.billing_eligible === null
            ? Boolean(allocation.lease_id && allocation.tenant_id)
            : allocation.billing_eligible;

        if(!isBillingEligible) {
            const error = new Error('Owner/unallocated liability rows cannot be adjusted as tenant charges');
            error.status = 400;
            throw error;
        }

        const result = await client.query(
            `
                UPDATE service_charge_allocations
                SET
                    final_charge = $1,
                    adjustment_note = $2,
                    status = CASE
                        WHEN $1 = calculated_charge THEN 'calculated'
                        ELSE 'adjusted'
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING ${allocationColumns.replaceAll('service_charge_allocations.', '')}
            `,
            [finalCharge, allocationData.adjustment_note || null, id]
        );
        const tenantTotalResult = await client.query(
            `
                SELECT COALESCE(SUM(final_charge), 0) AS tenant_demand_total
                FROM service_charge_allocations
                WHERE budget_id = $1
                  AND COALESCE(
                      billing_eligible,
                      lease_id IS NOT NULL AND tenant_id IS NOT NULL
                  )
            `,
            [allocation.budget_id]
        );
        const tenantDemandTotal = Number(tenantTotalResult.rows[0].tenant_demand_total || 0);

        if(tenantDemandTotal - Number(budget.total_budget) >= 0.01) {
            const error = new Error('Tenant demand charges cannot exceed the total service charge budget');
            error.status = 400;
            throw error;
        }
        const ownerLiabilityTotal = Math.max(Number(budget.total_budget) - tenantDemandTotal, 0);

        await client.query(
            `
                UPDATE service_charge_budgets
                SET
                    final_total = $2,
                    tenant_demand_total = $2,
                    owner_liability_total = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `,
            [allocation.budget_id, tenantDemandTotal, ownerLiabilityTotal]
        );

        await client.query('COMMIT');
        return {
            allocation: result.rows[0],
            schedule: await getBudgetSchedule(allocation.budget_id)
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const issueBudget = async (id, userId) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const budgetResult = await client.query(
            `
                SELECT *
                FROM service_charge_budgets
                WHERE id = $1
                FOR UPDATE
            `,
            [id]
        );
        const budget = budgetResult.rows[0];

        if(!budget) {
            const error = new Error('Service charge budget not found');
            error.status = 404;
            throw error;
        }

        if(budget.status === 'issued') {
            await client.query('COMMIT');
            return getBudgetSchedule(id);
        }

        if(!budget.calculated_at) {
            const error = new Error('Calculate the service charge schedule before issuing demands');
            error.status = 400;
            throw error;
        }

        const allocationResult = await client.query(
            `
                SELECT *
                FROM service_charge_allocations
                WHERE budget_id = $1
                ORDER BY unit_name_snapshot ASC
                FOR UPDATE
            `,
            [id]
        );
        const allocations = allocationResult.rows;

        if(allocations.length === 0) {
            const error = new Error('This budget has no calculated allocations to issue');
            error.status = 400;
            throw error;
        }

        const isBillingEligible = (allocation) => allocation.billing_eligible === null
            ? Boolean(allocation.lease_id && allocation.tenant_id)
            : allocation.billing_eligible;
        const billableAllocations = allocations.filter(isBillingEligible);
        const invalidCharges = billableAllocations.filter((allocation) => (
            allocation.final_charge === null ||
            Number.isNaN(Number(allocation.final_charge)) ||
            Number(allocation.final_charge) < 0
        ));

        if(invalidCharges.length > 0) {
            const error = new Error('Every allocation must have a valid final charge before issuing');
            error.status = 400;
            throw error;
        }

        if(billableAllocations.length === 0) {
            const error = new Error('There are no occupied active units eligible for tenant demands');
            error.status = 400;
            throw error;
        }
        const finalTotal = billableAllocations.reduce((total, allocation) => total + Number(allocation.final_charge), 0);

        if(finalTotal - Number(budget.total_budget) >= 0.01) {
            const error = new Error('Tenant demand charges cannot exceed the total service charge budget');
            error.status = 400;
            throw error;
        }

        for(const allocation of billableAllocations) {
            const existingDemand = await client.query(
                'SELECT id FROM service_charge_demands WHERE allocation_id = $1',
                [allocation.id]
            );

            if(existingDemand.rows[0]) {
                continue;
            }

            const demandReference = await generateDemandReference(client);

            await client.query(
                `
                    INSERT INTO service_charge_demands (
                        demand_reference,
                        demand_title,
                        property_id,
                        lease_id,
                        tenant_id,
                        unit_id,
                        budget_id,
                        allocation_id,
                        period_start,
                        period_end,
                        total_amount,
                        amount_paid,
                        balance,
                        due_date,
                        status,
                        payment_instruction,
                        demand_note,
                        issued_at,
                        issued_by
                    )
                    VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                        $11, 0, $11, $12, 'issued', $13, $14, CURRENT_TIMESTAMP, $15
                    )
                `,
                [
                    demandReference,
                    `${budget.budget_title} - ${allocation.unit_name_snapshot}`,
                    budget.property_id,
                    allocation.lease_id,
                    allocation.tenant_id,
                    allocation.unit_id,
                    budget.id,
                    allocation.id,
                    budget.period_start,
                    budget.period_end,
                    allocation.final_charge,
                    budget.due_date,
                    budget.payment_instruction,
                    budget.budget_note,
                    userId
                ]
            );
        }

        await client.query(
            `
                UPDATE service_charge_allocations
                SET status = 'issued', updated_at = CURRENT_TIMESTAMP
                WHERE budget_id = $1
            `,
            [id]
        );
        await client.query(
            `
                UPDATE service_charge_budgets
                SET
                    status = 'issued',
                    final_total = $2,
                    tenant_demand_total = $2,
                    owner_liability_total = $4,
                    approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
                    approved_by = $3,
                    issued_at = COALESCE(issued_at, CURRENT_TIMESTAMP),
                    issued_by = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `,
            [id, finalTotal, userId, Math.max(Number(budget.total_budget) - finalTotal, 0)]
        );

        await client.query('COMMIT');
        return getBudgetSchedule(id);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export default {
    getAllBudgets,
    getBudgetById,
    createBudget,
    updateBudget,
    deleteBudget,
    calculateBudget,
    getBudgetSchedule,
    updateAllocation,
    issueBudget
};
