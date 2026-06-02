import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
    // frontend always sends headers and authorization
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')) {
        const error = new Error('Authentication token required');
        error.status = 401;
        return next(error);
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (error) {
        error.message = 'Invalid or expired token';
        error.status = 401;
        next(error);
    }
};

export default authMiddleware;