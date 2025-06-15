// Simple MongoDB initialization without authentication
print("Starting MongoDB initialization...");

// Use hotel_nosql database
db = db.getSiblingDB('hotel_nosql');

// Create collections based on our design
db.createCollection("customers");
db.createCollection("active_bookings");
db.createCollection("room_inventory");
db.createCollection("service_catalog");

// Create indexes for performance
db.customers.createIndex({ "customer_id": 1 }, { unique: true });
db.customers.createIndex({ "user_info.email": 1 }, { unique: true });
db.customers.createIndex({ "loyalty.status": 1 });
db.customers.createIndex({ "recent_bookings.check_in": 1 });

db.active_bookings.createIndex({ "booking_id": 1 }, { unique: true });
db.active_bookings.createIndex({ "stay_details.status": 1 });
db.active_bookings.createIndex({ "stay_details.check_out": 1 });

db.room_inventory.createIndex({ "room_id": 1 }, { unique: true });
db.room_inventory.createIndex({ "current_status.availability": 1 });

db.service_catalog.createIndex({ "service_id": 1 }, { unique: true });

print("Collections created: " + db.getCollectionNames());
print("MongoDB initialization completed successfully!");
