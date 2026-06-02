import pool from '../db/pool.js';

async function getAllProperties() {
    const result = await pool.query(`
        SELECT *
        FROM properties
        ORDER BY id ASC
    `);

    return result.rows;
}

async function createProperty(data) {
    const { name, address, city, state, country } = data;

    const result = await pool.query(`
        INSERT INTO properties (name, address, city, state, country)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [name, address, city, state, country]
    );

    return result.rows[0];
}

export {
    getAllProperties,
    createProperty,
}