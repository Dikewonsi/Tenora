import bcrypt from 'bcrypt';
import pool from '../db/pool.js';

const passwordHash = await bcrypt.hash('password123', 10);

await pool.query(
    `
        INSERT INTO users (full_name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
    `,
    ['Admin User', 'admin@tenora.com', passwordHash, 'super_admin']
);

console.log('User created');
process.exit(0);
