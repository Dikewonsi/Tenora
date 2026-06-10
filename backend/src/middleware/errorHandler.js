const errorHandler = (err, req, res, next) => {
    const statusCode = err.status || 500;
    const response = {
        success: false,
        message: err.message || 'Server error'
    };

    if (err.code) {
        response.code = err.code;
    }

    res.status(statusCode).json(response);
};

export default errorHandler;
