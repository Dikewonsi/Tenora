import bcrypt from 'bcrypt';

import pool from '../db/pool.js';
import { getPagination } from '../utils/pagination.js';

const allowedRoles = ['super_admin', 'admin', 'user'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userColumns = `
    id,
    full_name AS "fullName",
    email,
    role,
    is_active AS "isActive",
    last_login_at AS "lastLoginAt",
    password_changed_at AS "passwordChangedAt",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
`;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const validateUserFields = ({ fullName, email, role, password, requirePassword = false }) => {
    if(!String(fullName || '').trim()) {
        const error = new Error('Full name is required');
        error.status = 400;
        throw error;
    }

    if(!emailPattern.test(email)) {
        const error = new Error('Enter a valid email address');
        error.status = 400;
        throw error;
    }

    if(!allowedRoles.includes(role)) {
        const error = new Error('Role must be super_admin, admin, or user');
        error.status = 400;
        throw error;
    }

    if(requirePassword && !password) {
        const error = new Error('Password is required');
        error.status = 400;
        throw error;
    }

    if(password && String(password).length < 8) {
        const error = new Error('Password must be at least 8 characters');
        error.status = 400;
        throw error;
    }
};

const mapDatabaseError = (error) => {
    if(error.code === '23505') {
        error.message = 'A user with this email address already exists';
        error.status = 400;
    }

    if(error.code === '23514') {
        error.message = 'User role or security values are invalid';
        error.status = 400;
    }

    return error;
};

const getAllUsers = async (filters = {}) => {
    const { search, role, status } = filters;
    const pagination = getPagination(filters);
    const activeFilter = status === 'active'
        ? true
        : status === 'disabled'
            ? false
            : null;

    if(role && !allowedRoles.includes(role)) {
        const error = new Error('Invalid user role filter');
        error.status = 400;
        throw error;
    }

    const params = [search || null, role || null, activeFilter];
    const whereClause = `
        WHERE (
            $1::text IS NULL
            OR full_name ILIKE '%' || $1 || '%'
            OR email ILIKE '%' || $1 || '%'
        )
          AND ($2::text IS NULL OR role = $2)
          AND ($3::boolean IS NULL OR is_active = $3)
    `;
    const [usersResult, countResult, summaryResult] = await Promise.all([
        pool.query(
            `
                SELECT ${userColumns}
                FROM users
                ${whereClause}
                ORDER BY is_active DESC, full_name ASC, created_at ASC
                LIMIT $4 OFFSET $5
            `,
            [...params, pagination.limit, pagination.offset]
        ),
        pool.query(
            `
                SELECT COUNT(*) AS total
                FROM users
                ${whereClause}
            `,
            params
        ),
        pool.query(
            `
                SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE is_active)::int AS active,
                    COUNT(*) FILTER (WHERE NOT is_active)::int AS disabled,
                    COUNT(*) FILTER (WHERE role = 'super_admin')::int AS super_admins
                FROM users
            `
        )
    ]);

    return {
        users: usersResult.rows,
        total: Number(countResult.rows[0].total),
        summary: summaryResult.rows[0],
        pagination
    };
};

const getUserById = async (id, client = pool) => {
    const result = await client.query(
        `
            SELECT ${userColumns}
            FROM users
            WHERE id = $1
        `,
        [id]
    );
    const user = result.rows[0];

    if(!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }

    return user;
};

const getUserByIdForUpdate = async (id, client) => {
    const result = await client.query(
        `
            SELECT ${userColumns}
            FROM users
            WHERE id = $1
            FOR UPDATE
        `,
        [id]
    );
    const user = result.rows[0];

    if(!user) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }

    return user;
};

const createUser = async (userData) => {
    const fullName = String(userData.full_name || userData.fullName || '').trim();
    const email = normalizeEmail(userData.email);
    const role = userData.role || 'user';
    const password = String(userData.password || '');
    const isActive = userData.is_active ?? userData.isActive ?? true;

    validateUserFields({ fullName, email, role, password, requirePassword: true });

    if(typeof isActive !== 'boolean') {
        const error = new Error('User status must be active or disabled');
        error.status = 400;
        throw error;
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `
                INSERT INTO users (
                    full_name,
                    email,
                    password_hash,
                    role,
                    is_active,
                    password_changed_at
                )
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                RETURNING ${userColumns}
            `,
            [fullName, email, passwordHash, role, isActive]
        );

        return result.rows[0];
    } catch (error) {
        throw mapDatabaseError(error);
    }
};

const lockActiveSuperAdmins = async (client) => {
    const result = await client.query(
        `
            SELECT id
            FROM users
            WHERE role = 'super_admin'
              AND is_active = TRUE
            ORDER BY id
            FOR UPDATE
        `
    );

    return result.rows;
};

const assertLastSuperAdminPreserved = ({ target, nextRole, nextIsActive, activeSuperAdmins }) => {
    const removesPrivilege = (
        target.role === 'super_admin'
        && target.isActive
        && (nextRole !== 'super_admin' || !nextIsActive)
    );

    if(removesPrivilege && activeSuperAdmins.length <= 1) {
        const error = new Error('The last active super admin cannot be disabled or demoted');
        error.status = 400;
        error.code = 'LAST_SUPER_ADMIN';
        throw error;
    }
};

const updateUser = async (id, userData) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const activeSuperAdmins = await lockActiveSuperAdmins(client);
        const existingUser = await getUserByIdForUpdate(id, client);

        const fullName = String(
            userData.full_name ?? userData.fullName ?? existingUser.fullName
        ).trim();
        const email = Object.hasOwn(userData, 'email')
            ? normalizeEmail(userData.email)
            : existingUser.email;
        const role = userData.role ?? existingUser.role;
        const isActive = Object.hasOwn(userData, 'is_active')
            ? userData.is_active
            : Object.hasOwn(userData, 'isActive')
                ? userData.isActive
                : existingUser.isActive;

        validateUserFields({ fullName, email, role });

        if(typeof isActive !== 'boolean') {
            const error = new Error('User status must be active or disabled');
            error.status = 400;
            throw error;
        }

        assertLastSuperAdminPreserved({
            target: existingUser,
            nextRole: role,
            nextIsActive: isActive,
            activeSuperAdmins
        });

        const result = await client.query(
            `
                UPDATE users
                SET
                    full_name = $1,
                    email = $2,
                    role = $3,
                    is_active = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $5
                RETURNING ${userColumns}
            `,
            [fullName, email, role, isActive, id]
        );

        await client.query('COMMIT');
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw mapDatabaseError(error);
    } finally {
        client.release();
    }
};

const setUserStatus = async (id, isActive) => {
    if(typeof isActive !== 'boolean') {
        const error = new Error('is_active must be true or false');
        error.status = 400;
        throw error;
    }

    return updateUser(id, { is_active: isActive });
};

const resetUserPassword = async (id, password) => {
    const normalizedPassword = String(password || '');

    if(normalizedPassword.length < 8) {
        const error = new Error('Password must be at least 8 characters');
        error.status = 400;
        throw error;
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);
    const result = await pool.query(
        `
            UPDATE users
            SET
                password_hash = $1,
                password_changed_at = CURRENT_TIMESTAMP,
                token_version = token_version + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING ${userColumns}
        `,
        [passwordHash, id]
    );

    if(!result.rows[0]) {
        const error = new Error('User not found');
        error.status = 404;
        throw error;
    }

    return result.rows[0];
};

export default {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    setUserStatus,
    resetUserPassword
};
