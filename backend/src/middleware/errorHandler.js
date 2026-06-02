const errorHandler = (err, req, res, next) => {
    const statusCode = err.status || 500;

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Server error'
    });
};

export default errorHandler;