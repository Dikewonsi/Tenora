import healthService from '../services/healthService.js';

const getHealth = async (req, res, next) => {
    try {
        const health = await healthService.getHealth();

        res.status(200).json({
            success: true,
            message: 'Health check passed',
            data: {
                health
            }
        });
    } catch (error) {
        next(error);
    }
}

export default {
    getHealth
};
