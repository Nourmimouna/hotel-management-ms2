// backend/config/database.js
const mysql = require('mysql2/promise');

// Database connection configuration
const dbConfig = {
    host: process.env.DB_HOST || 'mariadb',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'hotel_user',
    password: process.env.DB_PASSWORD || 'hotel_pass123',
    database: process.env.DB_NAME || 'hotel_management',
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    multipleStatements: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Execute query with error handling
async function executeQuery(query, params = []) {
    try {
        const [rows] = await pool.execute(query, params);
        return { success: true, data: rows };
    } catch (error) {
        console.error('Database query error:', error);
        return { success: false, error: error.message };
    }
}

// Execute multiple queries in transaction
async function executeTransaction(queries) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const results = [];
        for (const { query, params } of queries) {
            const [rows] = await connection.execute(query, params || []);
            results.push(rows);
        }
        
        await connection.commit();
        return { success: true, data: results };
    } catch (error) {
        await connection.rollback();
        console.error('Transaction error:', error);
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
}

// Get table counts for verification
async function getTableCounts() {
    try {
        const tables = ['USER', 'CUSTOMER', 'EMPLOYEE', 'HOTEL', 'ROOM', 'BOOKING', 'SERVICE', 'PAYMENT'];
        const counts = {};
        
        for (const table of tables) {
            const result = await executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
            counts[table] = result.success ? result.data[0].count : 0;
        }
        
        return { success: true, data: counts };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Clear all data from tables (for fresh import)
async function clearAllData() {
    const queries = [
        { query: 'SET FOREIGN_KEY_CHECKS = 0' },
        { query: 'DELETE FROM PAYMENT' },
        { query: 'DELETE FROM BOOKING_SERVICE' },
        { query: 'DELETE FROM BOOKING' },
        { query: 'DELETE FROM SERVICE' },
        { query: 'DELETE FROM ROOM' },
        { query: 'DELETE FROM HOTEL' },
        { query: 'DELETE FROM CUSTOMER' },
        { query: 'DELETE FROM EMPLOYEE' },
        { query: 'DELETE FROM USER' },
        { query: 'SET FOREIGN_KEY_CHECKS = 1' },
        // Reset auto-increment counters
        { query: 'ALTER TABLE USER AUTO_INCREMENT = 1' },
        { query: 'ALTER TABLE CUSTOMER AUTO_INCREMENT = 1' },
        { query: 'ALTER TABLE EMPLOYEE AUTO_INCREMENT = 1' },
        { query: 'ALTER TABLE HOTEL AUTO_INCREMENT = 1' },
        { query: 'ALTER TABLE ROOM AUTO_INCREMENT = 1' },
        { query: 'ALTER TABLE BOOKING AUTO_INCREMENT = 1' },
        { query: 'ALTER TABLE SERVICE AUTO_INCREMENT = 1' }
    ];
    
    return await executeTransaction(queries);
}

module.exports = {
    pool,
    testConnection,
    executeQuery,
    executeTransaction,
    getTableCounts,
    clearAllData
};
