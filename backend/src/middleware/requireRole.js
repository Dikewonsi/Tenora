const requireAnyRole = (allowedRoles = []) => (req, res, next) => {
    if(!req.user || !allowedRoles.includes(req.user.role)) {
        const error = new Error('You do not have permission to perform this action');
        error.status = 403;
        error.code = 'FORBIDDEN';
        return next(error);
    }

    return next();
};

const requireRole = (role) => requireAnyRole([role]);

export {
    requireAnyRole,
    requireRole
};
