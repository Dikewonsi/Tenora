import jwt from 'jsonwebtoken';
import { assertAccessActive } from '../config/accessConfig.js';
import pool from '../db/pool.js';

const authMiddleware = async (req, res, next) => {
    try {
        assertAccessActive();
    } catch (error) {
        return next(error);
    }

    // frontend always sends headers and authorization
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = new Error('Authentication token required');
        error.status = 401;
        return next(error);
    }

    const token = authHeader.split(' ')[1];

    let decoded;

    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        error.message = 'Invalid or expired token';
        error.status = 401;
        error.code = 'TOKEN_INVALID';
        return next(error);
    }

    try {
        const result = await pool.query(
            `
                SELECT
                    id,
                    full_name AS "fullName",
                    email,
                    role,
                    is_active AS "isActive",
                    token_version AS "tokenVersion",
                    last_login_at AS "lastLoginAt",
                    password_changed_at AS "passwordChangedAt",
                    created_at AS "createdAt",
                    updated_at AS "updatedAt"
                FROM users
                WHERE id = $1
            `,
            [decoded.id]
        );
        const user = result.rows[0];

        if(!user) {
            const error = new Error('User account no longer exists');
            error.status = 401;
            error.code = 'ACCOUNT_NOT_FOUND';
            return next(error);
        }

        if(!user.isActive) {
            const error = new Error('User account is disabled');
            error.status = 403;
            error.code = 'ACCOUNT_DISABLED';
            return next(error);
        }

        if(Number(decoded.tokenVersion) !== Number(user.tokenVersion)) {
            const error = new Error('Your session is no longer valid. Please sign in again.');
            error.status = 401;
            error.code = 'TOKEN_REVOKED';
            return next(error);
        }

        req.user = user;
        return next();
    } catch (error) {
        return next(error);
    }
};

export default authMiddleware;
