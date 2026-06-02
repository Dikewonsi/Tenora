import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';

import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import tenantRoutes from './routes/tenantRoutes.js';
import leaseRoutes from './routes/leaseRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import serviceChargeDemandRoutes from './routes/serviceChargeDemandRoutes.js';
import serviceChargeDemandItemRoutes from './routes/serviceChargeDemandItemRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '127.0.0.1';

// Adds secure HTTP headers
app.use(helmet());

/*
|--------------------------------------------------------------------------
| Body Parsers
|--------------------------------------------------------------------------
*/

//Prevent huge payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({
    extended: false,
    limit: '10kb'
}));

// Add cors so frontend and backend can communicate
const allowedOrigins = [
    'http://localhost:5173',
    'https://payorbit.dikewonsi.cloud'
];

app.use(cors({
    origin: allowedOrigins
}));

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/service-charge-demands', serviceChargeDemandRoutes);
app.use('/api/service-charge-demand-items', serviceChargeDemandItemRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/dashboard', dashboardRoutes);

/*
|--------------------------------------------------------------------------
| Error Handling
|--------------------------------------------------------------------------
*/

// 404 handler
app.use(notFound);

// GLobal error handler
app.use(errorHandler);


/*
|--------------------------------------------------------------------------
| Server
|--------------------------------------------------------------------------
*/

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
