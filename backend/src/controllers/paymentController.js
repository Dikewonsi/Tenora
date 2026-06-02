import paymentService from '../services/paymentService.js';

const getPayments = async (req, res, next) => {
    try {
        const payments = await paymentService.getAllPayments();

        res.status(200).json({
            success: true,
            message: 'Payments retrieved successfully',
            data: {
                count: payments.length,
                payments
            }
        });
    } catch (error) {
        next(error);
    }
}

const getPayment = async (req, res, next) => {
    try {
        const payment = await paymentService.getPaymentById(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Payment retrieved successfully',
            data: {
                payment
            }
        });
    } catch (error) {
        next(error);
    }
}

const createPayment = async (req, res, next) => {
    try {
        const payment = await paymentService.createPayment(req.body);

        res.status(201).json({
            success: true,
            message: 'Payment created successfully',
            data: {
                payment
            }
        });
    } catch (error) {
        next(error);
    }
}

const updatePayment = async (req, res, next) => {
    try {
        const payment = await paymentService.updatePayment(req.params.id, req.body);

        res.status(200).json({
            success: true,
            message: 'Payment updated successfully',
            data: {
                payment
            }
        });
    } catch (error) {
        next(error);
    }
}

const deletePayment = async (req, res, next) => {
    try {
        const payment = await paymentService.deletePayment(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Payment deleted successfully',
            data: {
                payment
            }
        });
    } catch (error) {
        next(error);
    }
}

export default {
    getPayments,
    getPayment,
    createPayment,
    updatePayment,
    deletePayment
};
