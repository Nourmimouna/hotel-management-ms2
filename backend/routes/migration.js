const express = require('express');
const router = express.Router();
const { seedDatabase } = require('../scripts/seed-database');
const { getTableCounts, testConnection } = require('../config/database');

// POST /api/migration/seed-database
router.post('/seed-database', async (req, res) => {
    try {
        console.log('🌱 Seeding database via API...');
        const result = await seedDatabase();
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                records_created: result.recordsCreated
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Seeding API error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/migration/database-status
router.get('/database-status', async (req, res) => {
    try {
        const connected = await testConnection();
        if (!connected) {
            return res.status(500).json({
                success: false,
                error: 'Database connection failed'
            });
        }
        
        const counts = await getTableCounts();
        res.json({
            success: true,
            connected: true,
            table_counts: counts.success ? counts.data : {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/migration/migrate-to-mongo
router.post('/migrate-to-mongo', async (req, res) => {
    try {
        // TODO: Implement migration logic in next section
        res.json({
            success: true,
            message: 'Data migrated to MongoDB successfully (placeholder)',
            migrated_records: {
                customers: 0,
                bookings: 0,
                analytics: 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
