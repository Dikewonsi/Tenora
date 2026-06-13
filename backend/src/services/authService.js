import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import pool from '../db/pool.js';

const loginUser = async (email, password) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const result = await pool.query(
        `
            SELECT 
                id,
                full_name AS "fullName",
                email,
                password_hash AS "passwordHash",
                role,
                is_active AS "isActive",
                token_version AS "tokenVersion"
            FROM users
            WHERE LOWER(email) = $1
        `,
        [normalizedEmail]
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
            role: user.role,
            tokenVersion: user.tokenVersion
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '1d'
        }
    );

    const loginResult = await pool.query(
        `
            UPDATE users
            SET last_login_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND is_active = TRUE
            RETURNING last_login_at AS "lastLoginAt"
        `,
        [user.id]
    );

    return {
        user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            isActive: true,
            lastLoginAt: loginResult.rows[0]?.lastLoginAt || null
        },
        token
    };
};

const getCurrentUser = async (userId) => {
    const result = await pool.query(
        `
            SELECT
                id,
                full_name AS "fullName",
                email,
                role,
                is_active AS "isActive",
                last_login_at AS "lastLoginAt",
                password_changed_at AS "passwordChangedAt",
                created_at AS "createdAt",
                updated_at AS "updatedAt"
            FROM users
            WHERE id = $1
        `,
        [userId]
    );

    const user = result.rows[0];

    if(!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }

    if(user.isActive === false) {
        const error = new Error('User account is inactive');
        error.status = 403;
        throw error;
    }

    return user;
}

export default {
    loginUser,
    getCurrentUser
};
