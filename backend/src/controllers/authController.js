import authService from '../services/authService.js'; 

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if(!email || !password) {
            const error = new Error('Email and password are required');
            error.status = 400;
            throw error;
        }

        const result = await authService.loginUser(email, password);

        res.status(200).json({
            success: true,
            message: 'Login Successful',
            data: {
                user: result.user,
                token: result.token
            }
        });
    } catch (error) {
        next(error);
    }
}

const me = async (req, res, next) => {
    try {
        const user = await authService.getCurrentUser(req.user.id);

        res.status(200).json({
            success: true,
            message: 'Current user retrieved successfully',
            data: {
                user
            }
        });
    } catch (error) {
        next(error);
    }
}

export default {
    login,
    me
};
