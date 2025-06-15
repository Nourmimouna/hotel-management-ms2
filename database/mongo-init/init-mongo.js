// MongoDB Initialization Script
db = db.getSiblingDB('hotel_nosql');

// Create collections and initial documents
db.createCollection('customers');
db.createCollection('bookings');
db.createCollection('analytics');

// Create indexes
db.customers.createIndex({ "user.email": 1 });
db.bookings.createIndex({ "check_in_date": 1, "check_out_date": 1 });
db.bookings.createIndex({ "customer.customer_id": 1 });

print("MongoDB initialized successfully");
