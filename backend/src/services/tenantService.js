import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';

const tenantColumns = `
    id,
    full_name,
    phone_number,
    email,
    alternative_contact,
    id_card_url,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
`;

const getAllTenants = async (filters = {}) => {
    const { search } = filters;
    const pagination = getPagination(filters);

    const result = await pool.query(
        `
            SELECT ${tenantColumns}
            FROM tenants
            WHERE (
                $1::text IS NULL
                OR full_name ILIKE '%' || $1 || '%'
                OR email ILIKE '%' || $1 || '%'
                OR phone_number ILIKE '%' || $1 || '%'
            )
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `,
        [search || null, pagination.limit, pagination.offset]
    );

    const countResult = await pool.query(
        `
            SELECT COUNT(*) AS total
            FROM tenants
            WHERE (
                $1::text IS NULL
                OR full_name ILIKE '%' || $1 || '%'
                OR email ILIKE '%' || $1 || '%'
                OR phone_number ILIKE '%' || $1 || '%'
            )
        `,
        [search || null]
    );

    return {
        tenants: result.rows,
        total: Number(countResult.rows[0].total),
        pagination
    };
}

const getTenantById = async (id) => {
    const result = await pool.query(
        `
            SELECT ${tenantColumns}
            FROM tenants
            WHERE id = $1
        `,
        [id]
    );

    const tenant = result.rows[0];

    if(!tenant) {
        const error = new Error('Tenant not found');
        error.status = 404;
        throw error;
    }

    return tenant;
}

const createTenant = async (tenantData) => {
    const {
        full_name,
        phone_number,
        email,
        alternative_contact,
        id_card_url
    } = tenantData;

    if(!full_name) {
        const error = new Error('Tenant full name is required');
        error.status = 400;
        throw error;
    }

    const result = await pool.query(
        `
            INSERT INTO tenants (
                full_name,
                phone_number,
                email,
                alternative_contact,
                id_card_url
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING ${tenantColumns}
        `,
        [
            full_name,
            phone_number,
            email,
            alternative_contact,
            id_card_url
        ]
    );

    return result.rows[0];
}

const updateTenant = async (id, tenantData) => {
    const existingTenant = await getTenantById(id);

    const {
        full_name = existingTenant.full_name,
        phone_number = existingTenant.phone_number,
        email = existingTenant.email,
        alternative_contact = existingTenant.alternative_contact,
        id_card_url = existingTenant.id_card_url
    } = tenantData;

    const result = await pool.query(
        `
            UPDATE tenants
            SET
                full_name = $1,
                phone_number = $2,
                email = $3,
                alternative_contact = $4,
                id_card_url = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING ${tenantColumns}
        `,
        [
            full_name,
            phone_number,
            email,
            alternative_contact,
            id_card_url,
            id
        ]
    );

    return result.rows[0];
};

const deleteTenant = async (id) => {
    let result;

    try {
        result = await pool.query(
            `
                DELETE FROM tenants
                WHERE id = $1
                RETURNING ${tenantColumns}
            `,
            [id]
        );
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Tenant cannot be deleted because they have related lease records';
            error.status = 400;
        }

        throw error;
    }

    const deletedTenant = result.rows[0];

    if(!deletedTenant) {
        const error = new Error('Tenant not found');
        error.status = 404;
        throw error;
    }

    return deletedTenant;
};

export default {
    getAllTenants,
    getTenantById,
    createTenant,
    updateTenant,
    deleteTenant
}
