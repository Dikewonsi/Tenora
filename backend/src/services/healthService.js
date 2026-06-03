import pool from '../db/pool.js';

const getHealth = async () => {
    await pool.query('SELECT 1');

    return {
        status: 'ok',
        database: 'connected',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    };
}

export default {
    getHealth
};
