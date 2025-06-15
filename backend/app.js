const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));



// Database connection with reconnection handling
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'mariadb',
    user: process.env.DB_USER || 'hotel_user',
    password: process.env.DB_PASSWORD || 'hotel_user_pass',
    database: process.env.DB_NAME || 'hotel_management',
    multipleStatements: true,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
});

// Handle connection errors and reconnection
function handleDisconnect() {
    db.on('error', function(err) {
        console.log('Database error:', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log('Reconnecting to database...');
            handleDisconnect();
        } else {
            throw err;
        }
    });
}

handleDisconnect();

// Test database connection
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        setTimeout(() => {
            console.log('Retrying database connection...');
            db.connect();
        }, 5000);
    } else {
        console.log('Connected to MariaDB database');
    }
});



// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Hotel Management API is running' });
});

// Import sample data endpoint
app.post('/api/import-data', (req, res) => {
    try {
        const seedData = fs.readFileSync('/app/scripts/seed-data.sql', 'utf8');
        
        db.query(seedData, (err, results) => {
            if (err) {
                console.error('Database seeding error:', err);
                res.status(500).json({ success: false, message: err.message });
            } else {
                res.json({ success: true, message: 'Sample data imported successfully' });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not read seed file: ' + error.message });
    }
});

// Get all customers with user info
app.get('/api/customers', (req, res) => {
    const query = `
        SELECT c.CustomerID, c.Loyalty_status, c.Points, c.Pending_points,
               u.Username, u.Email
        FROM CUSTOMER c
        JOIN USER u ON c.UserID = u.UserID
        ORDER BY c.CustomerID
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// Get specific customer by ID
app.get('/api/customers/:id', (req, res) => {
    const customerId = req.params.id;
    const query = `
        SELECT c.CustomerID, c.Loyalty_status, c.Points, c.Pending_points,
               u.Username, u.Email
        FROM CUSTOMER c
        JOIN USER u ON c.UserID = u.UserID
        WHERE c.CustomerID = ?
    `;
    
    db.query(query, [customerId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (results.length === 0) {
            res.status(404).json({ error: 'Customer not found' });
        } else {
            res.json(results[0]);
        }
    });
});

// Get all rooms
app.get('/api/rooms', (req, res) => {
    const query = `
        SELECT r.RoomID, r.Room_type, r.Capacity, r.Price, r.Status, h.Name as HotelName
        FROM ROOM r
        JOIN HOTEL h ON r.HotelID = h.HotelID
        WHERE r.Status = 'Available'
        ORDER BY r.Price
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// Get available rooms for specific dates
app.get('/api/rooms/available', (req, res) => {
    const { checkin, checkout } = req.query;
    
    if (!checkin || !checkout) {
        return res.status(400).json({ error: 'Check-in and check-out dates are required' });
    }
    
    const query = `
        SELECT r.RoomID, r.Room_type, r.Capacity, r.Price, r.Status, h.Name as HotelName
        FROM ROOM r
        JOIN HOTEL h ON r.HotelID = h.HotelID
        WHERE r.Status = 'Available'
        AND r.RoomID NOT IN (
            SELECT DISTINCT b.RoomID 
            FROM BOOKING b 
            WHERE b.Status IN ('Future', 'Present')
            AND (
                (b.Check_in_date <= ? AND b.Check_out_date > ?) OR
                (b.Check_in_date < ? AND b.Check_out_date >= ?) OR
                (b.Check_in_date >= ? AND b.Check_out_date <= ?)
            )
        )
        ORDER BY r.Price
    `;
    
    db.query(query, [checkin, checkin, checkout, checkout, checkin, checkout], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// Get all services
app.get('/api/services', (req, res) => {
    const query = 'SELECT * FROM SERVICE ORDER BY Label';
    
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// Get all bookings
app.get('/api/bookings', (req, res) => {
    const query = `
        SELECT b.*, c.Loyalty_status, u.Username, r.Room_type, r.Price as RoomPrice
        FROM BOOKING b
        JOIN CUSTOMER c ON b.CustomerID = c.CustomerID
        JOIN USER u ON c.UserID = u.UserID
        JOIN ROOM r ON b.RoomID = r.RoomID
        ORDER BY b.BookingID DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// CREATE BOOKING - Your main use case implementation
app.post('/api/create-booking', (req, res) => {
    const { customerId, checkinDate, checkoutDate, roomId, specialRequest, services } = req.body;
    
    // Validate input
    if (!customerId || !checkinDate || !checkoutDate || !roomId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required fields: customerId, checkinDate, checkoutDate, roomId' 
        });
    }
    
    // Start transaction
    db.beginTransaction((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Transaction failed to start' });
        }
        
        // Step 1: Get room price and calculate nights
        const getRoomQuery = 'SELECT Price FROM ROOM WHERE RoomID = ? AND Status = "Available"';
        
        db.query(getRoomQuery, [roomId], (err, roomResults) => {
            if (err || roomResults.length === 0) {
                return db.rollback(() => {
                    res.status(400).json({ success: false, message: 'Room not available or not found' });
                });
            }
            
            const roomPrice = roomResults[0].Price;
            const checkin = new Date(checkinDate);
            const checkout = new Date(checkoutDate);
            const nights = Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24));
            const roomTotal = roomPrice * nights;
            
            // Step 2: Calculate services total
            let servicesTotal = 0;
            let servicePromises = [];
            
            if (services && services.length > 0) {
                services.forEach(service => {
                    servicePromises.push(new Promise((resolve, reject) => {
                        db.query('SELECT Price_per_unit FROM SERVICE WHERE ServiceID = ?', [service.serviceId], (err, serviceResults) => {
                            if (err) reject(err);
                            else if (serviceResults.length === 0) reject(new Error(`Service ${service.serviceId} not found`));
                            else {
                                servicesTotal += serviceResults[0].Price_per_unit * service.quantity;
                                resolve();
                            }
                        });
                    }));
                });
            }
            
            Promise.all(servicePromises)
            .then(() => {
                const totalAmount = roomTotal + servicesTotal;
                const loyaltyPoints = Math.floor(totalAmount / 10); // 1 point per €10
                
                // Step 3: Create booking
                const createBookingQuery = `
                    INSERT INTO BOOKING (Check_in_date, Check_out_date, Status, Total_amount, Special_request, CustomerID, RoomID)
                    VALUES (?, ?, 'Future', ?, ?, ?, ?)
                `;
                
                db.query(createBookingQuery, [checkinDate, checkoutDate, totalAmount, specialRequest, customerId, roomId], (err, bookingResult) => {
                    if (err) {
                        return db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Failed to create booking: ' + err.message });
                        });
                    }
                    
                    const bookingId = bookingResult.insertId;
                    
                    // Step 4: Add services to booking
                    let serviceInsertPromises = [];
                    
                    if (services && services.length > 0) {
                        services.forEach(service => {
                            serviceInsertPromises.push(new Promise((resolve, reject) => {
                                const insertServiceQuery = 'INSERT INTO BOOKING_SERVICE (BookingID, ServiceID, Quantity) VALUES (?, ?, ?)';
                                db.query(insertServiceQuery, [bookingId, service.serviceId, service.quantity], (err) => {
                                    if (err) reject(err);
                                    else resolve();
                                });
                            }));
                        });
                    }
                    
                    Promise.all(serviceInsertPromises)
                    .then(() => {
                        // Step 5: Update customer loyalty points
                        const updatePointsQuery = 'UPDATE CUSTOMER SET Pending_points = Pending_points + ? WHERE CustomerID = ?';
                        
                        db.query(updatePointsQuery, [loyaltyPoints, customerId], (err) => {
                            if (err) {
                                return db.rollback(() => {
                                    res.status(500).json({ success: false, message: 'Failed to update loyalty points: ' + err.message });
                                });
                            }
                            
                            // Step 6: Get updated customer points
                            db.query('SELECT Pending_points FROM CUSTOMER WHERE CustomerID = ?', [customerId], (err, customerResult) => {
                                if (err) {
                                    return db.rollback(() => {
                                        res.status(500).json({ success: false, message: 'Failed to get updated points: ' + err.message });
                                    });
                                }
                                
                                // Step 7: Create payment record
                                const createPaymentQuery = 'INSERT INTO PAYMENT (PaymentID, BookingID, Amount, Payment_date, Status) VALUES (1, ?, ?, CURDATE(), "Completed")';
                                
                                db.query(createPaymentQuery, [bookingId, totalAmount], (err) => {
                                    if (err) {
                                        return db.rollback(() => {
                                            res.status(500).json({ success: false, message: 'Failed to create payment: ' + err.message });
                                        });
                                    }
                                    
                                    // Commit transaction
                                    db.commit((err) => {
                                        if (err) {
                                            return db.rollback(() => {
                                                res.status(500).json({ success: false, message: 'Failed to commit transaction' });
                                            });
                                        }
                                        
                                        // Success response
                                        res.json({
                                            success: true,
                                            bookingId: bookingId,
                                            totalAmount: totalAmount.toFixed(2),
                                            loyaltyPoints: loyaltyPoints,
                                            newPendingPoints: customerResult[0].Pending_points,
                                            message: 'Booking created successfully'
                                        });
                                    });
                                });
                            });
                        });
                    })
                    .catch(serviceErr => {
                        db.rollback(() => {
                            res.status(500).json({ success: false, message: 'Failed to add services: ' + serviceErr.message });
                        });
                    });
                });
            })
            .catch(serviceErr => {
                db.rollback(() => {
                    res.status(400).json({ success: false, message: 'Service calculation failed: ' + serviceErr.message });
                });
            });
        });
    });
});

// ANALYTICS REPORT - Customer Loyalty Analysis
app.get('/api/analytics/customer-loyalty', (req, res) => {
    const query = `
        SELECT 
            u.Username,
            u.Email,
            c.Loyalty_status,
            c.Points,
            c.Pending_points,
            COUNT(b.BookingID) as total_bookings,
            COALESCE(SUM(b.Total_amount), 0) as total_spent,
            COALESCE(AVG(b.Total_amount), 0) as avg_booking_value
        FROM USER u
        JOIN CUSTOMER c ON u.UserID = c.UserID
        LEFT JOIN BOOKING b ON c.CustomerID = b.CustomerID
        WHERE b.Status != 'Cancelled' OR b.Status IS NULL
        GROUP BY u.UserID, c.CustomerID
        HAVING total_bookings > 0 OR c.Points > 0
        ORDER BY total_spent DESC, c.Points DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// ANALYTICS REPORT - Detailed customer booking analysis (your MS1 analytics)
app.get('/api/analytics/booking-performance', (req, res) => {
    const { loyaltyStatus, minPoints, dateFrom, dateTo } = req.query;
    
    let query = `
        SELECT 
            u.Username,
            u.Email,
            c.Loyalty_status,
            c.Points,
            COUNT(b.BookingID) as booking_count,
            SUM(b.Total_amount) as total_revenue,
            AVG(b.Total_amount) as avg_booking_value,
            COUNT(DISTINCT bs.ServiceID) as unique_services_used
        FROM USER u
        JOIN CUSTOMER c ON u.UserID = c.UserID
        LEFT JOIN BOOKING b ON c.CustomerID = b.CustomerID AND b.Status != 'Cancelled'
        LEFT JOIN BOOKING_SERVICE bs ON b.BookingID = bs.BookingID
    `;
    
    let whereConditions = [];
    let queryParams = [];
    
    if (loyaltyStatus) {
        whereConditions.push('c.Loyalty_status = ?');
        queryParams.push(loyaltyStatus);
    }
    
    if (minPoints) {
        whereConditions.push('c.Points >= ?');
        queryParams.push(parseInt(minPoints));
    }
    
    if (dateFrom) {
        whereConditions.push('b.Check_in_date >= ?');
        queryParams.push(dateFrom);
    }
    
    if (dateTo) {
        whereConditions.push('b.Check_in_date <= ?');
        queryParams.push(dateTo);
    }
    
    if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += `
        GROUP BY u.UserID, c.CustomerID
        HAVING booking_count > 0
        ORDER BY total_revenue DESC, c.Points DESC
    `;
    
    db.query(query, queryParams, (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});


// Get all services endpoint
app.get('/api/services', (req, res) => {
    const query = 'SELECT * FROM SERVICE ORDER BY Label';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Services query error:', err);
            res.status(500).json({ error: err.message });
        } else {
            console.log('Services loaded:', results.length);
            res.json(results);
        }
    });
});


// MongoDB Migration endpoint
app.post('/api/migrate-to-nosql', async (req, res) => {
    try {
        const MigrationService = require('./nosql/migration-service');
        const migrationService = new MigrationService();
        
        console.log('Starting migration process...');
        const result = await migrationService.migrateAllData();
        
        if (result.success) {
            console.log('Migration completed successfully');
        } else {
            console.error('Migration failed:', result.message);
        }
        
        res.json(result);
    } catch (error) {
        console.error('Migration endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Migration failed: ' + error.message 
        });
    }
});

// Check migration status endpoint
app.get('/api/nosql-status', async (req, res) => {
    try {
        const { MongoClient } = require('mongodb');
        const mongoUrl = 'mongodb://mongodb:27017/hotel_nosql';
        
        const client = new MongoClient(mongoUrl);
        await client.connect();
        const db = client.db('hotel_nosql');
        
        const collections = await db.listCollections().toArray();
        const customerCount = await db.collection('customers').countDocuments();
        const bookingCount = await db.collection('active_bookings').countDocuments();
        const roomCount = await db.collection('room_inventory').countDocuments();
        const serviceCount = await db.collection('service_catalog').countDocuments();
        
        await client.close();
        
        res.json({
            success: true,
            collections: collections.map(c => c.name),
            counts: {
                customers: customerCount,
                active_bookings: bookingCount,
                rooms: roomCount,
                services: serviceCount
            },
            total_documents: customerCount + bookingCount + roomCount + serviceCount
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'MongoDB connection failed: ' + error.message 
        });
    }
});


// NoSQL Booking Endpoints
app.post('/api/nosql/create-booking', async (req, res) => {
    try {
        const MongoBookingService = require('./nosql/booking-service');
        const bookingService = new MongoBookingService();
        
        const result = await bookingService.createBooking(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'NoSQL booking creation failed: ' + error.message
        });
    }
});

app.get('/api/nosql/analytics/customer-loyalty', async (req, res) => {
    try {
        const MongoBookingService = require('./nosql/booking-service');
        const bookingService = new MongoBookingService();
        
        const result = await bookingService.getCustomerLoyaltyAnalytics(req.query);
        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.message });
        }
    } catch (error) {
        res.status(500).json({
            error: 'NoSQL analytics failed: ' + error.message
        });
    }
});

app.get('/api/nosql/rooms/available', async (req, res) => {
    try {
        const MongoBookingService = require('./nosql/booking-service');
        const bookingService = new MongoBookingService();
        
        const rooms = await bookingService.getAvailableRooms(req.query.checkin, req.query.checkout);
        res.json(rooms);
    } catch (error) {
        res.status(500).json({
            error: 'NoSQL room availability failed: ' + error.message
        });
    }
});

app.get('/api/nosql/services', async (req, res) => {
    try {
        const MongoBookingService = require('./nosql/booking-service');
        const bookingService = new MongoBookingService();
        
        const services = await bookingService.getServices();
        res.json(services);
    } catch (error) {
        res.status(500).json({
            error: 'NoSQL services failed: ' + error.message
        });
    }
});



// MongoDB Indexing Analysis Endpoints
app.post('/api/nosql/create-indexes', async (req, res) => {
    try {
        const IndexingAnalysis = require('./nosql/indexing-analysis');
        const indexing = new IndexingAnalysis();
        
        const result = await indexing.createOptimalIndexes();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Index creation failed: ' + error.message
        });
    }
});

app.get('/api/nosql/analyze-performance', async (req, res) => {
    try {
        const IndexingAnalysis = require('./nosql/indexing-analysis');
        const indexing = new IndexingAnalysis();
        
        const result = await indexing.analyzeQueryPerformance();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Performance analysis failed: ' + error.message
        });
    }
});

app.get('/api/nosql/index-info', async (req, res) => {
    try {
        const IndexingAnalysis = require('./nosql/indexing-analysis');
        const indexing = new IndexingAnalysis();
        
        const result = await indexing.getIndexInformation();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Index information failed: ' + error.message
        });
    }
});
// Add these endpoints to your backend/app.js file before app.listen()

// MongoDB Indexing Analysis Endpoints
app.post('/api/nosql/create-indexes', async (req, res) => {
    try {
        const IndexingAnalysis = require('./nosql/indexing-analysis');
        const indexing = new IndexingAnalysis();
        
        const result = await indexing.createOptimalIndexes();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Index creation failed: ' + error.message
        });
    }
});

app.get('/api/nosql/analyze-performance', async (req, res) => {
    try {
        const IndexingAnalysis = require('./nosql/indexing-analysis');
        const indexing = new IndexingAnalysis();
        
        const result = await indexing.analyzeQueryPerformance();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Performance analysis failed: ' + error.message
        });
    }
});

app.get('/api/nosql/index-info', async (req, res) => {
    try {
        const IndexingAnalysis = require('./nosql/indexing-analysis');
        const indexing = new IndexingAnalysis();
        
        const result = await indexing.getIndexInformation();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Index information failed: ' + error.message
        });
    }
});

app.get('/api/nosql/performance-comparison', async (req, res) => {
    try {
        const IndexingAnalysis = require('./nosql/indexing-analysis');
        const indexing = new IndexingAnalysis();
        
        const result = await indexing.comparePerformanceBeforeAfter();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Performance comparison failed: ' + error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
