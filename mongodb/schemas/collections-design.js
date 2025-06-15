// MongoDB Collection Design for Dragonfly Inn Hotel Management System

// Collection 1: customers (Main aggregation root)
{
  "_id": ObjectId("..."),
  "customer_id": 1,
  "user_info": {
    "username": "john_customer",
    "email": "john@starshollow.com",
    "password_hash": "hashed_password"
  },
  "loyalty": {
    "status": "Silver", 
    "current_points": 1250,
    "pending_points": 100,
    "tier_progress": {
      "current_tier": "Silver",
      "next_tier": "Gold", 
      "points_to_next": 1150
    }
  },
  "recent_bookings": [  // Embed recent bookings for fast access
    {
      "booking_id": 1,
      "check_in": ISODate("2025-07-15"),
      "check_out": ISODate("2025-07-18"),
      "status": "Future",
      "total_amount": 389.97,
      "loyalty_points_earned": 38,
      "room": {
        "room_id": 2,
        "room_type": "Romantic Double",
        "price_per_night": 129.99
      },
      "services": [
        {
          "service_id": 1,
          "name": "Sookie's Famous Breakfast",
          "quantity": 3,
          "unit_price": 25.00,
          "total_price": 75.00
        }
      ],
      "payment": {
        "payment_id": 1,
        "amount": 389.97,
        "date": ISODate("2025-06-15"),
        "status": "Completed",
        "method": "Credit Card"
      },
      "special_requests": "Late check-in please"
    }
  ],
  "booking_history": [  // Reference to archived bookings
    {
      "booking_id": 5,
      "total_spent": 199.99,
      "points_earned": 19,
      "stay_date": ISODate("2024-12-15")
    }
  ],
  "profile": {
    "created_date": ISODate("2024-01-15"),
    "last_login": ISODate("2025-06-15"),
    "preferred_room_type": "Double",
    "special_preferences": ["Late checkout", "Ground floor"]
  }
}

// Collection 2: rooms (Separate for independent management)
{
  "_id": ObjectId("..."),
  "room_id": 1,
  "room_type": "The Lorelai Suite",
  "capacity": 2,
  "price_per_night": 199.99,
  "status": "Available",
  "hotel": {
    "hotel_id": 1,
    "name": "The Dragonfly Inn",
    "location": "Stars Hollow, Connecticut"
  },
  "amenities": ["Coffee maker", "Fireplace", "Garden view"],
  "current_booking": null,  // Reference when occupied
  "maintenance_schedule": [],
  "booking_calendar": [  // Simplified availability tracking
    {
      "date": ISODate("2025-07-15"),
      "booking_id": 1,
      "customer_name": "john_customer"
    }
  ]
}

// Collection 3: services (Referenced, not embedded for flexibility)
{
  "_id": ObjectId("..."),
  "service_id": 1,
  "name": "Sookie's Famous Breakfast",
  "description": "Gourmet breakfast prepared by our amazing chef Sookie",
  "price_per_unit": 25.00,
  "category": "Dining",
  "availability": {
    "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "times": ["07:00", "08:00", "09:00", "10:00"]
  },
  "popularity_stats": {
    "total_orders": 156,
    "average_rating": 4.8,
    "revenue_generated": 3900.00
  }
}

// Collection 4: booking_analytics (Pre-aggregated for performance)
{
  "_id": ObjectId("..."),
  "date": ISODate("2025-06-15"),
  "daily_stats": {
    "total_bookings": 5,
    "total_revenue": 1250.75,
    "loyalty_points_distributed": 125,
    "average_booking_value": 250.15
  },
  "customer_metrics": [
    {
      "customer_id": 1,
      "username": "john_customer",
      "loyalty_status": "Silver",
      "total_bookings": 3,
      "total_spent": 850.00,
      "points_earned": 85
    }
  ],
  "service_performance": [
    {
      "service_id": 1,
      "service_name": "Sookie's Famous Breakfast", 
      "orders_today": 8,
      "revenue_today": 200.00
    }
  ]
}

// Collection 5: employees (Separate operational data)
{
  "_id": ObjectId("..."),
  "employee_id": 1,
  "user_info": {
    "username": "sarah_manager",
    "email": "sarah@dragonflyinn.com"
  },
  "role": "Manager",
  "department": "Management",
  "hire_date": ISODate("2020-01-15"),
  "salary": 65000.00,
  "reports_to": null,
  "manages": [
    {
      "employee_id": 2,
      "name": "Bob Johnson",
      "role": "Receptionist"
    }
  ]
}

/* 
DESIGN RATIONALE:

1. CUSTOMERS as Main Aggregate Root:
   - Embeds recent bookings (last 5-10) for fast dashboard loading
   - References older bookings to manage document size
   - Includes denormalized loyalty calculations
   - Optimized for customer-centric operations

2. ROOMS as Separate Collection:
   - Independent lifecycle from bookings
   - Staff need to manage rooms separately
   - Availability calendar embedded for quick checks
   - Prevents conflicts during simultaneous booking attempts

3. SERVICES as Referenced:
   - Pricing changes affect all references consistently
   - New services can be added without touching customer docs
   - Analytics can aggregate across all service usage

4. PRE-AGGREGATED ANALYTICS:
   - Daily/monthly summaries for fast reporting
   - Reduces need for complex real-time aggregations
   - Supports business intelligence queries

5. SCALABILITY CONSIDERATIONS:
   - Customer documents limited to ~16MB via archive strategy
   - Frequently accessed data embedded
   - Rarely accessed data referenced
   - Indexes on customer_id, loyalty.status, booking dates

TRADE-OFFS:
- More complex writes (update multiple collections)
- Eventual consistency for some analytics
- Denormalization requires careful update management
- BUT: Much faster reads for common operations
*/
