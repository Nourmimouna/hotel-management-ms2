// Nourelkamar_student1_Dragonflyinn
// MongoDB Migration Service
const { MongoClient } = require('mongodb');
const mysql = require('mysql2/promise');

class MigrationService {
    constructor() {
        this.mongoUrl = 'mongodb://mongodb:27017/hotel_nosql';
        this.mysqlConfig = {
            host: 'mariadb',
            user: 'hotel_user',
            password: 'hotel_user_pass',
            database: 'hotel_management'
        };
    }

    async migrateAllData() {
        let mongoClient, mysqlConnection;
        
        try {
            console.log('🚀 Starting complete data migration...');
            
            // Connect to databases
            mongoClient = new MongoClient(this.mongoUrl);
            await mongoClient.connect();
            const db = mongoClient.db('hotel_nosql');
            
            mysqlConnection = await mysql.createConnection(this.mysqlConfig);
            
            // Clear all MongoDB collections
            await this.clearCollections(db);
            
            // Migrate in dependency order
            await this.migrateServices(db, mysqlConnection);
            await this.migrateRooms(db, mysqlConnection);
            await this.migrateCustomers(db, mysqlConnection);
            await this.migrateActiveBookings(db, mysqlConnection);
            
            console.log('✅ Migration completed successfully!');
            return { success: true, message: 'All data migrated successfully' };
            
        } catch (error) {
            console.error('❌ Migration failed:', error);
            return { success: false, message: error.message };
        } finally {
            if (mongoClient) await mongoClient.close();
            if (mysqlConnection) await mysqlConnection.end();
        }
    }

    async clearCollections(db) {
        console.log('🧹 Clearing existing MongoDB data...');
        await db.collection('customers').deleteMany({});
        await db.collection('active_bookings').deleteMany({});
        await db.collection('room_inventory').deleteMany({});
        await db.collection('service_catalog').deleteMany({});
    }

    async migrateServices(db, mysqlConnection) {
        console.log('🛎️ Migrating services...');
        const [services] = await mysqlConnection.execute('SELECT * FROM SERVICE');
        
        const serviceDocs = services.map(service => ({
            service_id: service.ServiceID,
            service_info: {
                name: service.Label,
                description: service.Description || 'A delightful Stars Hollow experience',
                category: this.categorizeService(service.Label),
                price_per_unit: parseFloat(service.Price_per_unit)
            },
            availability: {
                active: true,
                schedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                time_slots: ['07:00', '08:00', '09:00', '10:00']
            },
            analytics: {
                total_orders: 0,
                revenue_generated: 0.0,
                average_rating: 4.5
            }
        }));
        
        if (serviceDocs.length > 0) {
            await db.collection('service_catalog').insertMany(serviceDocs);
            console.log(`✅ Migrated ${serviceDocs.length} services`);
        }
    }

    async migrateRooms(db, mysqlConnection) {
        console.log('🏨 Migrating rooms...');
        const [rooms] = await mysqlConnection.execute(`
            SELECT r.*, h.Name as HotelName, h.Location 
            FROM ROOM r 
            LEFT JOIN HOTEL h ON r.HotelID = h.HotelID
        `);
        
        const roomDocs = await Promise.all(rooms.map(async (room) => {
            // Get current booking calendar
            const [bookings] = await mysqlConnection.execute(`
                SELECT BookingID, Check_in_date, Check_out_date, Status 
                FROM BOOKING 
                WHERE RoomID = ? AND Status IN ('Future', 'Present')
            `, [room.RoomID]);
            
            const calendar = [];
            bookings.forEach(booking => {
                const checkin = new Date(booking.Check_in_date);
                const checkout = new Date(booking.Check_out_date);
                
                for (let d = new Date(checkin); d < checkout; d.setDate(d.getDate() + 1)) {
                    calendar.push({
                        date: new Date(d),
                        booking_id: booking.BookingID,
                        status: booking.Status === 'Present' ? 'Occupied' : 'Reserved'
                    });
                }
            });
            
            return {
                room_id: room.RoomID,
                room_details: {
                    room_type: room.Room_type,
                    capacity: room.Capacity,
                    base_price: parseFloat(room.Price),
                    amenities: this.getRoomAmenities(room.Room_type)
                },
                current_status: {
                    availability: room.Status,
                    current_booking_id: bookings.length > 0 ? bookings[0].BookingID : null,
                    checkout_date: bookings.length > 0 ? new Date(bookings[0].Check_out_date) : null,
                    last_cleaned: new Date()
                },
                booking_calendar: calendar,
                maintenance_log: []
            };
        }));
        
        if (roomDocs.length > 0) {
            await db.collection('room_inventory').insertMany(roomDocs);
            console.log(`✅ Migrated ${roomDocs.length} rooms`);
        }
    }

    async migrateCustomers(db, mysqlConnection) {
        console.log('👥 Migrating customers...');
        const [customers] = await mysqlConnection.execute(`
            SELECT c.*, u.Username, u.Email, u.Password 
            FROM CUSTOMER c 
            JOIN USER u ON c.UserID = u.UserID
        `);
        
        for (const customer of customers) {
            const customerDoc = await this.buildCustomerDocument(customer, mysqlConnection);
            await db.collection('customers').insertOne(customerDoc);
        }
        
        console.log(`✅ Migrated ${customers.length} customers`);
    }

    async buildCustomerDocument(customer, mysqlConnection) {
        // Get customer bookings
        const [bookings] = await mysqlConnection.execute(`
            SELECT b.*, r.Room_type, r.Price as RoomPrice
            FROM BOOKING b
            LEFT JOIN ROOM r ON b.RoomID = r.RoomID  
            WHERE b.CustomerID = ?
            ORDER BY b.Check_in_date DESC
        `, [customer.CustomerID]);
        
        const recentBookings = [];
        let totalSpent = 0;
        
        for (const booking of bookings.slice(0, 5)) { // Keep 5 most recent
            const [services] = await mysqlConnection.execute(`
                SELECT bs.*, s.Label, s.Price_per_unit
                FROM BOOKING_SERVICE bs
                JOIN SERVICE s ON bs.ServiceID = s.ServiceID
                WHERE bs.BookingID = ?
            `, [booking.BookingID]);
            
            const servicesTotal = services.reduce((sum, s) => sum + (parseFloat(s.Price_per_unit) * s.Quantity), 0);
            totalSpent += parseFloat(booking.Total_amount);
            
            recentBookings.push({
                booking_id: booking.BookingID,
                check_in: new Date(booking.Check_in_date),
                check_out: new Date(booking.Check_out_date),
                status: booking.Status,
                total_amount: parseFloat(booking.Total_amount),
                room_details: {
                    room_id: booking.RoomID,
                    room_type: booking.Room_type || 'Standard Room',
                    price_per_night: parseFloat(booking.RoomPrice || 0)
                },
                services_summary: {
                    count: services.length,
                    total_cost: servicesTotal,
                    items: services.map(s => `${s.Label} x${s.Quantity}`)
                },
                payment_info: {
                    amount: parseFloat(booking.Total_amount),
                    status: 'Completed',
                    date: new Date(booking.Check_in_date)
                }
            });
        }
        
        // Calculate loyalty progression
        const currentPoints = customer.Points || 0;
        let nextTier = '';
        let pointsToNext = 0;
        
        if (currentPoints < 1000) {
            nextTier = 'Silver'; pointsToNext = 1000 - currentPoints;
        } else if (currentPoints < 2500) {
            nextTier = 'Gold'; pointsToNext = 2500 - currentPoints;
        } else if (currentPoints < 5000) {
            nextTier = 'Diamond'; pointsToNext = 5000 - currentPoints;
        } else {
            nextTier = 'Stars Hollow Royalty'; pointsToNext = 0;
        }
        
        return {
            customer_id: customer.CustomerID,
            user_info: {
                username: customer.Username,
                email: customer.Email,
                password_hash: customer.Password
            },
            loyalty: {
                status: customer.Loyalty_status,
                current_points: currentPoints,
                pending_points: customer.Pending_points || 0,
                tier_progress: {
                    next_tier: nextTier,
                    points_to_next: pointsToNext
                }
            },
            recent_bookings: recentBookings,
            booking_statistics: {
                total_bookings: bookings.length,
                total_spent: totalSpent,
                average_booking: bookings.length > 0 ? totalSpent / bookings.length : 0,
                last_stay: bookings.length > 0 ? new Date(bookings[0].Check_in_date) : null
            }
        };
    }

    async migrateActiveBookings(db, mysqlConnection) {
        console.log('📋 Migrating active bookings...');
        const [activeBookings] = await mysqlConnection.execute(`
            SELECT b.*, c.CustomerID, u.Username, c.Loyalty_status, r.Room_type, r.Price
            FROM BOOKING b
            JOIN CUSTOMER c ON b.CustomerID = c.CustomerID
            JOIN USER u ON c.UserID = u.UserID
            JOIN ROOM r ON b.RoomID = r.RoomID
            WHERE b.Status IN ('Future', 'Present')
        `);
        
        for (const booking of activeBookings) {
            // Get services for this booking
            const [services] = await mysqlConnection.execute(`
                SELECT bs.*, s.Label, s.Price_per_unit
                FROM BOOKING_SERVICE bs
                JOIN SERVICE s ON bs.ServiceID = s.ServiceID
                WHERE bs.BookingID = ?
            `, [booking.BookingID]);
            
            const serviceCharges = services.reduce((sum, s) => sum + (parseFloat(s.Price_per_unit) * s.Quantity), 0);
            const roomCharges = parseFloat(booking.Total_amount) - serviceCharges;
            
            const activeBookingDoc = {
                booking_id: booking.BookingID,
                customer_ref: {
                    customer_id: booking.CustomerID,
                    username: booking.Username,
                    loyalty_status: booking.Loyalty_status
                },
                room_assignment: {
                    room_id: booking.RoomID,
                    room_type: booking.Room_type,
                    price_per_night: parseFloat(booking.Price),
                    current_status: booking.Status === 'Present' ? 'Occupied' : 'Reserved'
                },
                stay_details: {
                    check_in: new Date(booking.Check_in_date),
                    check_out: new Date(booking.Check_out_date),
                    actual_checkin: booking.Status === 'Present' ? new Date(booking.Check_in_date) : null,
                    status: booking.Status,
                    nights_stayed: Math.ceil((new Date(booking.Check_out_date) - new Date(booking.Check_in_date)) / (1000 * 60 * 60 * 24))
                },
                services_consumed: services.map(s => ({
                    service_id: s.ServiceID,
                    name: s.Label,
                    quantity: s.Quantity,
                    unit_price: parseFloat(s.Price_per_unit),
                    total: parseFloat(s.Price_per_unit) * s.Quantity,
                    date_consumed: new Date(booking.Check_in_date)
                })),
                billing: {
                    room_charges: roomCharges,
                    service_charges: serviceCharges,
                    total_amount: parseFloat(booking.Total_amount),
                    payment_status: booking.Status === 'Present' ? 'Pending_Checkout' : 'Pending_Arrival'
                },
                admin_notes: []
            };
            
            await db.collection('active_bookings').insertOne(activeBookingDoc);
        }
        
        console.log(`✅ Migrated ${activeBookings.length} active bookings`);
    }

    categorizeService(serviceName) {
        if (serviceName.toLowerCase().includes('breakfast') || serviceName.toLowerCase().includes('food')) return 'Dining';
        if (serviceName.toLowerCase().includes('coffee')) return 'Beverage';
        if (serviceName.toLowerCase().includes('spa') || serviceName.toLowerCase().includes('massage')) return 'Wellness';
        if (serviceName.toLowerCase().includes('shuttle') || serviceName.toLowerCase().includes('transport')) return 'Transportation';
        return 'General';
    }

    getRoomAmenities(roomType) {
        const amenities = ['Wi-Fi', 'Coffee Maker', 'Room Service'];
        if (roomType.toLowerCase().includes('suite')) amenities.push('Separate Living Area', 'Premium Amenities');
        if (roomType.toLowerCase().includes('lorelai')) amenities.push('Fireplace', 'Garden View');
        if (roomType.toLowerCase().includes('double')) amenities.push('King Size Bed');
        return amenities;
    }
}

module.exports = MigrationService;
