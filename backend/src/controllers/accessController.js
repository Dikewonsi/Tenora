import { getAccessStatus } from '../config/accessConfig.js';

const status = (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            data: getAccessStatus()
        });
    } catch (error) {
        next(error);
    }
};

export default {
    status
};
