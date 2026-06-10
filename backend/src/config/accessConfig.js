const ACCESS_EXPIRED_MESSAGE = 'Access period has expired. Please contact the administrator.';
const ACCESS_CONFIG_MESSAGE = 'Access expiry is not configured correctly. Please contact the administrator.';

const parseExpiryDate = () => {
    const configuredValue = process.env.ACCESS_EXPIRES_AT;
    const expiresAt = configuredValue ? new Date(configuredValue) : null;

    if (!expiresAt || Number.isNaN(expiresAt.getTime())) {
        const error = new Error(ACCESS_CONFIG_MESSAGE);
        error.status = 503;
        error.code = 'ACCESS_CONFIG_INVALID';
        throw error;
    }

    return expiresAt;
};

const getAccessStatus = () => {
    const expiresAt = parseExpiryDate();
    const serverTime = new Date();
    const remainingMilliseconds = expiresAt.getTime() - serverTime.getTime();

    return {
        expiresAt: expiresAt.toISOString(),
        serverTime: serverTime.toISOString(),
        isExpired: remainingMilliseconds <= 0,
        remainingSeconds: Math.max(0, Math.floor(remainingMilliseconds / 1000))
    };
};

const assertAccessActive = () => {
    const status = getAccessStatus();

    if (status.isExpired) {
        const error = new Error(ACCESS_EXPIRED_MESSAGE);
        error.status = 403;
        error.code = 'ACCESS_EXPIRED';
        throw error;
    }

    return status;
};

export {
    ACCESS_CONFIG_MESSAGE,
    ACCESS_EXPIRED_MESSAGE,
    assertAccessActive,
    getAccessStatus
};
