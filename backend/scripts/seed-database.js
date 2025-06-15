// backend/scripts/seed-database.js
const bcrypt = require('bcryptjs');
const { executeTransaction, clearAllData, testConnection } = require('../config/database');

// Helper function to generate random data
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Generate sample data
async function generateSampleData() {
    console.log('🌱 Generating sample data...');
    
    // Sample data arrays
    const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack', 'Kate', 'Liam', 'Maya', 'Noah', 'Olivia'];
    const lastNames = ['Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Garcia', 'Rodriguez'];
    const roomTypes = ['Standard', 'Deluxe', 'Suite', 'Executive', 'Presidential'];
    const serviceLabels = ['Breakfast', 'Spa Treatment', 'Airport Shuttle', 'Late Checkout', 'Room Service', 'Laundry', 'Gym Access', 'WiFi Premium'];
    const loyaltyStatuses = ['Classic', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    const employeeRoles = ['Manager', 'Receptionist', 'Housekeeping', 'Maintenance', 'Security'];
    const departments = ['Front Desk', 'Housekeeping', 'Maintenance', 'Security', 'Management'];
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Generate randomized data
    const data = {
        users: [],
        customers: [],
        employees: [],
        hotels: [],
        rooms: [],
        services: [],
        bookings: [],
        payments: []
    };
    
    // 1. Generate Users (20 users: 15 customers + 5 employees)
    for (let i = 1; i <= 20; i++) {
        const firstName = getRandomElement(firstNames);
        const lastName = getRandomElement(lastNames);
        data.users.push({
            id: i,
            username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`,
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
            password: hashedPassword
        });
    }
    
    // 2. Generate Customers (first 15 users)
    for (let i = 1; i <= 15; i++) {
        const loyaltyStatus = getRandomElement(loyaltyStatuses);
        const basePoints = { Classic: 0, Silver: 250, Gold: 750, Platinum: 1500, Diamond: 3000 };
        const points = basePoints[loyaltyStatus] + getRandomInt(0, 500);
        
        data.customers.push({
            id: i,
            userId: i,
            loyaltyStatus,
            points,
            pendingPoints: getRandomInt(0, 200)
        });
    }
    
    // 3. Generate Employees (last 5 users)
    for (let i = 1; i <= 5; i++) {
        const firstName = getRandomElement(firstNames);
        const lastName = getRandomElement(lastNames);
        const role = getRandomElement(employeeRoles);
        const department = getRandomElement(departments);
        const hireDate = getRandomDate(new Date(2020, 0, 1), new Date(2024, 0, 1));
        const salary = getRandomInt(35000, 85000);
        
        data.employees.push({
            id: i,
            userId: 15 + i, // Users 16-20
            role,
            firstName,
            lastName,
            hireDate: formatDate(hireDate),
            salary,
            department,
            supervisorId: i > 1 ? 1 : null // Everyone reports to employee 1 (manager)
        });
    }
    
    // 4. Generate Hotels (3 hotels)
    const hotelData = [
        { name: 'Grand Vienna Hotel', location: 'Vienna, Austria', rating: 5, rooms: 50 },
        { name: 'City Center Inn', location: 'Vienna, Austria', rating: 4, rooms: 30 },
        { name: 'Airport Business Hotel', location: 'Vienna Airport, Austria', rating: 4, rooms: 25 }
    ];
    
    hotelData.forEach((hotel, index) => {
        data.hotels.push({
            id: index + 1,
            name: hotel.name,
            location: hotel.location,
            rating: hotel.rating,
            totalRooms: hotel.rooms
        });
    });
    
    // 5. Generate Rooms (distributed across hotels)
    let roomId = 1;
    data.hotels.forEach(hotel => {
        for (let i = 1; i <= hotel.totalRooms; i++) {
            const roomType = getRandomElement(roomTypes);
            const basePrice = { Standard: 120, Deluxe: 180, Suite: 350, Executive: 450, Presidential: 800 };
            const price = basePrice[roomType] + getRandomInt(-20, 50);
            
            data.rooms.push({
                id: roomId++,
                hotelId: hotel.id,
                roomType,
                capacity: roomType === 'Presidential' ? 6 : roomType === 'Suite' ? 4 : roomType === 'Executive' ? 3 : 2,
                price,
                status: getRandomElement(['Available', 'Occupied', 'Maintenance'])
            });
        }
    });
    
    // 6. Generate Services
    serviceLabels.forEach((label, index) => {
        const basePrices = { 'Breakfast': 25, 'Spa Treatment': 120, 'Airport Shuttle': 45, 'Late Checkout': 30, 'Room Service': 35, 'Laundry': 20, 'Gym Access': 15, 'WiFi Premium': 10 };
        const price = basePrices[label] || getRandomInt(10, 100);
        
        data.services.push({
            id: index + 1,
            label,
            description: `Professional ${label.toLowerCase()} service`,
            pricePerUnit: price,
            category: label.includes('Spa') ? 'Wellness' : label.includes('Food') || label.includes('Breakfast') ? 'Food' : label.includes('Transport') || label.includes('Shuttle') ? 'Transport' : 'Convenience'
        });
    });
    
    // 7. Generate Bookings (30 bookings)
    for (let i = 1; i <= 30; i++) {
        const customerId = getRandomInt(1, 15);
        const roomId = getRandomInt(1, data.rooms.length);
        const checkIn = getRandomDate(new Date(2024, 0, 1), new Date(2025, 11, 31));
        const checkOut = new Date(checkIn.getTime() + (getRandomInt(1, 7) * 24 * 60 * 60 * 1000));
        const statuses = ['Future', 'Present', 'Past', 'Cancelled'];
        const status = getRandomElement(statuses);
        const room = data.rooms.find(r => r.id === roomId);
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const totalAmount = room.price * nights;
        
        data.bookings.push({
            id: i,
            customerId,
            roomId,
            checkIn: formatDate(checkIn),
            checkOut: formatDate(checkOut),
            status,
            totalAmount,
            specialRequest: getRandomInt(1, 3) === 1 ? 'Late checkout requested' : null,
            managedByEmployeeId: getRandomInt(1, 5)
        });
    }
    
    // 8. Generate Payments (one per booking)
    data.bookings.forEach((booking, index) => {
        const paymentMethods = ['Credit Card', 'Debit Card', 'Cash', 'Bank Transfer'];
        const paymentDate = new Date(booking.checkIn);
        paymentDate.setDate(paymentDate.getDate() - getRandomInt(1, 30));
        
        data.payments.push({
            paymentId: index + 1,
            bookingId: booking.id,
            amount: booking.totalAmount,
            paymentDate: formatDate(paymentDate),
            status: booking.status === 'Cancelled' ? 'Refunded' : 'Completed',
            paymentMethod: getRandomElement(paymentMethods)
        });
    });
    
    console.log('✅ Sample data generated');
    console.log(`📊 Generated: ${data.users.length} users, ${data.customers.length} customers, ${data.employees.length} employees`);
    console.log(`📊 Generated: ${data.hotels.length} hotels, ${data.rooms.length} rooms, ${data.bookings.length} bookings`);
    
    return data;
}

// Insert data into database
async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');
        
        // Test connection first
        const connected = await testConnection();
        if (!connected) {
            throw new Error('Database connection failed');
        }
        
        // Clear existing data
        console.log('🧹 Clearing existing data...');
        const clearResult = await clearAllData();
        if (!clearResult.success) {
            throw new Error(`Failed to clear data: ${clearResult.error}`);
        }
        
        // Generate sample data
        const data = await generateSampleData();
        
        // Build queries
        const queries = [];
        
        // Insert Users
        data.users.forEach(user => {
            queries.push({
                query: 'INSERT INTO USER (Username, Password, Email) VALUES (?, ?, ?)',
                params: [user.username, user.password, user.email]
            });
        });
        
        // Insert Customers
        data.customers.forEach(customer => {
            queries.push({
                query: 'INSERT INTO CUSTOMER (Loyalty_status, Points, Pending_Points, UserID) VALUES (?, ?, ?, ?)',
                params: [customer.loyaltyStatus, customer.points, customer.pendingPoints, customer.userId]
            });
        });
        
        // Insert Employees
        data.employees.forEach(employee => {
            queries.push({
                query: 'INSERT INTO EMPLOYEE (Role, First_Name, Last_Name, Hire_Date, Salary, Department, UserID, SupervisorID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                params: [employee.role, employee.firstName, employee.lastName, employee.hireDate, employee.salary, employee.department, employee.userId, employee.supervisorId]
            });
        });
        
        // Insert Hotels
        data.hotels.forEach(hotel => {
            queries.push({
                query: 'INSERT INTO HOTEL (Name, Location, Rating, Total_number_rooms) VALUES (?, ?, ?, ?)',
                params: [hotel.name, hotel.location, hotel.rating, hotel.totalRooms]
            });
        });
        
        // Insert Rooms
        data.rooms.forEach(room => {
            queries.push({
                query: 'INSERT INTO ROOM (Room_type, Capacity, Price, Status, HotelID) VALUES (?, ?, ?, ?, ?)',
                params: [room.roomType, room.capacity, room.price, room.status, room.hotelId]
            });
        });
        
        // Insert Services
        data.services.forEach(service => {
            queries.push({
                query: 'INSERT INTO SERVICE (Label, Description, Price_per_unit, Category) VALUES (?, ?, ?, ?)',
                params: [service.label, service.description, service.pricePerUnit, service.category]
            });
        });
        
        // Insert Bookings
        data.bookings.forEach(booking => {
            queries.push({
                query: 'INSERT INTO BOOKING (Check_in_date, Check_out_date, Status, Total_amount, Special_request, CustomerID, RoomID, ManagedByEmployeeID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                params: [booking.checkIn, booking.checkOut, booking.status, booking.totalAmount, booking.specialRequest, booking.customerId, booking.roomId, booking.managedByEmployeeId]
            });
        });
        
        // Insert Payments
        data.payments.forEach(payment => {
            queries.push({
                query: 'INSERT INTO PAYMENT (PaymentID, BookingID, Amount, Payment_Date, Status, Payment_Method) VALUES (?, ?, ?, ?, ?, ?)',
                params: [payment.paymentId, payment.bookingId, payment.amount, payment.paymentDate, payment.status, payment.paymentMethod]
            });
        });
        
        // Execute all queries in transaction
        console.log('💾 Inserting data into database...');
        const result = await executeTransaction(queries);
        
        if (!result.success) {
            throw new Error(`Failed to insert data: ${result.error}`);
        }
        
        console.log('✅ Database seeding completed successfully!');
        return {
            success: true,
            message: 'Database seeded successfully',
            recordsCreated: {
                users: data.users.length,
                customers: data.customers.length,
                employees: data.employees.length,
                hotels: data.hotels.length,
                rooms: data.rooms.length,
                services: data.services.length,
                bookings: data.bookings.length,
                payments: data.payments.length
            }
        };
        
    } catch (error) {
        console.error('❌ Database seeding failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Export for use in routes
module.exports = {
    seedDatabase,
    generateSampleData
};

// Run if called directly
if (require.main === module) {
    seedDatabase().then(result => {
        console.log('Final result:', result);
        process.exit(result.success ? 0 : 1);
    });
}
