import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';

const propertyColumns = `
    id,
    property_code,
    property_name,
    address,
    location,
    property_description,
    total_units,
    total_lettable_space,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
`;

const getAllProperties = async (filters = {}) => {
    const { search, location } = filters;
    const pagination = getPagination(filters);

    const result = await pool.query(
        `
            SELECT ${propertyColumns}
            FROM properties
            WHERE (
                $1::text IS NULL
                OR property_name ILIKE '%' || $1 || '%'
                OR property_code ILIKE '%' || $1 || '%'
                OR location ILIKE '%' || $1 || '%'
                OR address ILIKE '%' || $1 || '%'
            )
            AND (
                $2::text IS NULL
                OR location ILIKE '%' || $2 || '%'
            )
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        `,
        [search || null, location || null, pagination.limit, pagination.offset]
    );

    const countResult = await pool.query(
        `
            SELECT COUNT(*) AS total
            FROM properties
            WHERE (
                $1::text IS NULL
                OR property_name ILIKE '%' || $1 || '%'
                OR property_code ILIKE '%' || $1 || '%'
                OR location ILIKE '%' || $1 || '%'
                OR address ILIKE '%' || $1 || '%'
            )
            AND (
                $2::text IS NULL
                OR location ILIKE '%' || $2 || '%'
            )
        `,
        [search || null, location || null]
    );

    return {
        properties: result.rows,
        total: Number(countResult.rows[0].total),
        pagination
    };
}

const getPropertyById = async (id) => {
    const result = await pool.query(
        `
            SELECT ${propertyColumns}
            FROM properties
            WHERE id = $1
        `, [id]
    );

    const property = result.rows[0];

    if(!property) {
        const error = new Error('Property not found');
        error.status = 400;
        throw error;
    }

    return property;
}

const createProperty = async (propertyData) => {
    const {
        property_code,
        property_name,
        name,
        address,
        location,
        property_description,
        total_units,
        total_lettable_space
    } = propertyData;

    if(!address) {
        const error = new Error('Property address is required');
        error.status = 400;
        throw error;
    }

    const result = await pool.query(`
        INSERT INTO properties (
            property_code,
            property_name,
            address,
            location,
            property_description,
            total_units,
            total_lettable_space
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${propertyColumns}
        `,
        [
            property_code,
            property_name || name,
            address,
            location,
            property_description,
            total_units,
            total_lettable_space
        ]
    );

    return result.rows[0];
}

const updateProperty = async (id, propertyData) => {
    const existingProperty = await getPropertyById(id);

    const {
        property_code = existingProperty.property_code,
        property_name = existingProperty.property_name,
        name,
        address = existingProperty.address,
        location = existingProperty.location,
        property_description = existingProperty.property_description,
        total_units = existingProperty.total_units,
        total_lettable_space = existingProperty.total_lettable_space
    } = propertyData;

    const result = await pool.query(
        `
            UPDATE properties
            SET
                property_code = $1,
                property_name = $2,
                address = $3,
                location = $4,
                property_description = $5,
                total_units = $6,
                total_lettable_space = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING ${propertyColumns}
        `,
        [
            property_code,
            property_name || name,
            address,
            location,
            property_description,
            total_units,
            total_lettable_space,
            id
        ]
    );

    return result.rows[0];
};

const deleteProperty = async (id) => {
    let result;

    try {
        result = await pool.query(
            `
                DELETE FROM properties
                WHERE id = $1
                RETURNING
                    id,
                    property_code,
                    property_name,
                    address,
                    location,
                    property_description,
                total_units,
                total_lettable_space,
                created_at AS "createdAt",
                updated_at AS "updatedAt"
            `,
            [id]
        );
    } catch (error) {
        if(error.code === '23503') {
            error.message = 'Property cannot be deleted because it has related lease or service charge records';
            error.status = 400;
        }

        throw error;
    }

    const deletedProperty = result.rows[0];

    if(!deletedProperty) {
        const error = new Error('Property not found');
        error.status = 404;
        throw error;
    }

    return deletedProperty;
};


export default {
    getAllProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty
}
