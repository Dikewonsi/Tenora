const toPositiveInteger = (value, fallback) => {
    const number = Number(value);

    if(!Number.isInteger(number) || number < 1) {
        return fallback;
    }

    return number;
}

const getPagination = (query = {}) => {
    const page = toPositiveInteger(query.page, 1);
    const limit = Math.min(toPositiveInteger(query.limit, 20), 100);
    const offset = (page - 1) * limit;

    return {
        page,
        limit,
        offset
    };
}

const getPaginationMeta = (total, pagination) => ({
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.ceil(total / pagination.limit)
});

export {
    getPagination,
    getPaginationMeta
};
