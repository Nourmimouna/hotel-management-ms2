// MongoDB initialization for hotel_nosql database
db = db.getSiblingDB('hotel_nosql');

// Create customers collection with validation
db.createCollection("customers", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["customer_id", "user_info", "loyalty"],
         properties: {
            customer_id: { bsonType: "int" },
            user_info: {
               bsonType: "object", 
               required: ["username", "email"],
               properties: {
                  username: { bsonType: "string" },
                  email: { bsonType: "string" }
               }
            },
            loyalty: {
               bsonType: "object",
               required: ["status", "current_points"],
               properties: {
                  status: { enum: ["Classic", "Silver", "Gold", "Diamond"] },
                  current_points: { bsonType: "int", minimum: 0 }
               }
            }
         }
      }
   }
});

// Create other collections
db.createCollection("rooms");
db.createCollection("services"); 
db.createCollection("booking_analytics");

// Create indexes for performance
db.customers.createIndex({ "customer_id": 1 }, { unique: true });
db.customers.createIndex({ "user_info.email": 1 }, { unique: true });
db.customers.createIndex({ "loyalty.status": 1 });
db.customers.createIndex({ "recent_bookings.check_in": 1 });

db.rooms.createIndex({ "room_id": 1 }, { unique: true });
db.rooms.createIndex({ "status": 1 });

db.services.createIndex({ "service_id": 1 }, { unique: true });

print("Hotel NoSQL database initialized with collections and indexes!");
