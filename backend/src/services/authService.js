import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import pool from '../db/pool.js';

const loginAdmin = async (email, password) => {
   
    const result = await pool.query(
        `
            SELECT 
                id,
                name,
                email,
                password_hash AS "passwordHash",
                role
            FROM admins
            WHERE email = $1
        `,
        [email]
    );

    const admin = result.rows[0];

    if(!admin) {
        const error = new Error('Invalid email or password');
        error.status = 401;
        throw error;
    }

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);

    if(!passwordMatches) {
        const error = new Error('Invalid email or password');
        error.status = 401;
        throw error;
    }

    const token = jwt.sign(
        {
            id: admin.id,
            email: admin.email,
            role: admin.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '1d'
        }
    );

    return {
        admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role
        },
        token
    };
};

export default {
    loginAdmin
};