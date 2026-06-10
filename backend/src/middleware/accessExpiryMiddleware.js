import { assertAccessActive } from '../config/accessConfig.js';

const accessExpiryMiddleware = (req, res, next) => {
    try {
        assertAccessActive();
        next();
    } catch (error) {
        next(error);
    }
};

export default accessExpiryMiddleware;
