import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import pool from '../db/pool.js';

const loginUser = async (email, password) => {
   
    const result = await pool.query(
        `
            SELECT 
                id,
                full_name AS "fullName",
                email,
                password_hash AS "passwordHash",
                role,
                is_active AS "isActive"
            FROM users
            WHERE email = $1
        `,
        [email]
    );

    const user = result.rows[0];

    if(!user) {
        const error = new Error('Invalid email or password');
        error.status = 401;
        throw error;
    }

    if(user.isActive === false) {
        const error = new Error('User account is inactive');
        error.status = 403;
        throw error;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if(!passwordMatches) {
        const error = new Error('Invalid email or password');
        error.status = 401;
        throw error;
    }

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '1d'
        }
    );

    return {
        user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role
        },
        token
    };
};

export default {
    loginUser
};
