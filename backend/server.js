const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { testConnection } = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection on startup
testConnection();

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Hotel Management API is running',
        timestamp: new Date().toISOString(),
        database: 'Connected'
    });
});

// Basic API routes
app.get('/api', (req, res) => {
    res.json({ 
        message: 'Hotel Management API v1.0',
        endpoints: [
            'GET /api - This endpoint',
            'GET /health - Health check',
            'POST /api/migration/seed-database - Populate database',
            'GET /api/migration/database-status - Database status',
            'GET /api/customers - List customers',
            'GET /api/bookings - List bookings',
            'GET /api/analytics/customer-loyalty - Customer analytics'
        ]
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/migration', require('./routes/migration'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API docs: http://localhost:${PORT}/api`);
});

module.exports = app;
