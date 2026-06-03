import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';

const demandItemColumns = `
    service_charge_demand_items.id,
    service_charge_demand_items.demand_id,
    service_charge_demand_items.category,
    service_charge_demand_items.total_property_cost,
    service_charge_demand_items.total_lettable_space,
    service_charge_demand_items.occupied_space,
    service_charge_demand_items.cost_per_sqm,
    service_charge_demand_items.tenant_amount,
    service_charge_demand_items.notes,
    service_charge_demand_items.created_at AS "createdAt",
    service_charge_demand_items.updated_at AS "updatedAt"
`;

const demandItemReturningColumns = `
    id,
    demand_id,
    category,
    total_property_cost,
    total_lettable_space,
    occupied_space,
    cost_per_sqm,
    tenant_amount,
    notes,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
`;

const selectDemandItemQuery = `
    SELECT
        ${demandItemColumns},
        service_charge_demands.property_id,
        service_charge_demands.lease_id,
        service_charge_demands.period_start,
        service_charge_demands.period_end
    FROM service_charge_demand_items
    INNER JOIN service_charge_demands
        ON service_charge_demands.id = service_charge_demand_items.demand_id
`;

const calculateCostPerSqm = (costPerSqm, totalPropertyCost, totalLettableSpace) => {
    if(costPerSqm !== undefined && costPerSqm !== null) {
        return costPerSqm;
    }

    const cost = Number(totalPropertyCost);
    const space = Number(totalLettableSpace);

    if(!space) {
        return null;
    }

    return cost / space;
}

const isMissing = (value) => value === undefined || value === null || value === '';

const getAllServiceChargeDemandItems = async (filters = {}) => {
    const { demand_id, category } = filters;
    const pagination = getPagination(filters);
    const whereClause = `
        WHERE ($1::uuid IS NULL OR service_charge_demand_items.demand_id = $1)
          AND ($2::text IS NULL OR service_charge_demand_items.category ILIKE '%' || $2 || '%')
    `;
    const params = [demand_id || null, category || null];

    const result = await pool.query(
        `
            ${selectDemandItemQuery}
            ${whereClause}
            ORDER BY service_charge_demand_items.created_at DESC
            LIMIT $3 OFFSET $4
        `,
        [...params, pagination.limit, pagination.offset]
    );

    const countResult = await pool.query(
        `
            SELECT COUNT(*) AS total
            FROM service_charge_demand_items
            ${whereClause}
        `,
        params
    );

    return {
        items: result.rows,
        total: Number(countResult.rows[0].total),
        pagination
    };
}

const getServiceChargeDemandItemById = async (id) => {
    const result = await pool.query(
        `
            ${selectDemandItemQuery}
            WHERE service_charge_demand_items.id = $1
        `,
        [id]
    );

    const item = result.rows[0];

    if(!item) {
        const error = new Error('Service charge demand item not found');
        error.status = 404;
        throw error;
    }

    return item;
}

const createServiceChargeDemandItem = async (itemData) => {
    const {
        demand_id,
        category,
        total_property_cost,
        total_lettable_space,
        occupied_space,
        cost_per_sqm,
        tenant_amount,
        notes
    } = itemData;

    if(
        isMissing(demand_id) ||
        isMissing(category) ||
        isMissing(total_property_cost) ||
        isMissing(total_lettable_space) ||
        isMissing(occupied_space) ||
        isMissing(tenant_amount)
    ) {
        const error = new Error('Demand, category, property cost, lettable space, occupied space, and tenant amount are required');
        error.status = 400;
        throw error;
    }

    const calculatedCostPerSqm = calculateCostPerSqm(cost_per_sqm, total_property_cost, total_lettable_space);

    try {
        const result = await pool.query(
            `
                INSERT INTO service_charge_demand_items (
                    demand_id,
                    category,
                    total_property_cost,
                    total_lettable_space,
                    occupied_space,
                    cost_per_sqm,
                    tenant_amount,
                    notes
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING ${demandItemReturningColumns}
            `,
            [
                demand_id,
                category,
                total_property_cost,
                total_lettable_space,
                occupied_space,
                calculatedCostPerSqm,
                tenant_amount,
                notes
            ]
        );

        return result.rows[0];
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Service charge demand does not exist';
            error.status = 400;
        }

        throw error;
    }
}

const updateServiceChargeDemandItem = async (id, itemData) => {
    const existingItem = await getServiceChargeDemandItemById(id);

    const {
        demand_id = existingItem.demand_id,
        category = existingItem.category,
        total_property_cost = existingItem.total_property_cost,
        total_lettable_space = existingItem.total_lettable_space,
        occupied_space = existingItem.occupied_space,
        cost_per_sqm = existingItem.cost_per_sqm,
        tenant_amount = existingItem.tenant_amount,
        notes = existingItem.notes
    } = itemData;

    const calculatedCostPerSqm = calculateCostPerSqm(cost_per_sqm, total_property_cost, total_lettable_space);

    try {
        const result = await pool.query(
            `
                UPDATE service_charge_demand_items
                SET
                    demand_id = $1,
                    category = $2,
                    total_property_cost = $3,
                    total_lettable_space = $4,
                    occupied_space = $5,
                    cost_per_sqm = $6,
                    tenant_amount = $7,
                    notes = $8,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $9
                RETURNING ${demandItemReturningColumns}
            `,
            [
                demand_id,
                category,
                total_property_cost,
                total_lettable_space,
                occupied_space,
                calculatedCostPerSqm,
                tenant_amount,
                notes,
                id
            ]
        );

        return result.rows[0];
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Service charge demand does not exist';
            error.status = 400;
        }

        throw error;
    }
}

const deleteServiceChargeDemandItem = async (id) => {
    const result = await pool.query(
        `
            DELETE FROM service_charge_demand_items
            WHERE id = $1
            RETURNING ${demandItemReturningColumns}
        `,
        [id]
    );

    const deletedItem = result.rows[0];

    if(!deletedItem) {
        const error = new Error('Service charge demand item not found');
        error.status = 404;
        throw error;
    }

    return deletedItem;
}

export default {
    getAllServiceChargeDemandItems,
    getServiceChargeDemandItemById,
    createServiceChargeDemandItem,
    updateServiceChargeDemandItem,
    deleteServiceChargeDemandItem
};
