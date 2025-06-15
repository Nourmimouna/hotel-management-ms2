// Nourelkamar_student1_Dragonflyinn
// Nourelkamar_student1_Dragonflyinn
// MongoDB Booking Service - NoSQL Implementation (No Transactions)
const { MongoClient, ObjectId } = require('mongodb');

class MongoBookingService {
    constructor() {
        this.mongoUrl = 'mongodb://mongodb:27017/hotel_nosql';
        this.dbName = 'hotel_nosql';
    }

    async createBooking(bookingData) {
        let client;

        try {
            client = new MongoClient(this.mongoUrl);
            await client.connect();
            const db = client.db(this.dbName);

            // 1. Get customer document
            const customer = await db.collection('customers').findOne(
                { customer_id: bookingData.customerId }
            );

            if (!customer) {
                throw new Error('Customer not found');
            }

            // 2. Get room details and check availability
            const room = await db.collection('room_inventory').findOne(
                {
                    room_id: bookingData.roomId,
                    'current_status.availability': 'Available'
                }
            );

            if (!room) {
                throw new Error('Room not available');
            }

            // 3. Get service details
            const serviceDetails = [];
            let serviceCharges = 0;

            if (bookingData.services && bookingData.services.length > 0) {
                for (const service of bookingData.services) {
                    const serviceDoc = await db.collection('service_catalog').findOne(
                        { service_id: service.serviceId }
                    );

                    if (serviceDoc) {
                        const serviceTotal = serviceDoc.service_info.price_per_unit * service.quantity;
                        serviceCharges += serviceTotal;

                        serviceDetails.push({
                            service_id: service.serviceId,
                            name: serviceDoc.service_info.name,
                            quantity: service.quantity,
                            unit_price: serviceDoc.service_info.price_per_unit,
                            total: serviceTotal,
                            date_consumed: new Date()
                        });
                    }
                }
            }

            // 4. Calculate totals and loyalty points
            const checkinDate = new Date(bookingData.checkinDate);
            const checkoutDate = new Date(bookingData.checkoutDate);
            const nights = Math.ceil((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
            const roomCharges = room.room_details.base_price * nights;
            const totalAmount = roomCharges + serviceCharges;
            const loyaltyPoints = Math.floor(totalAmount / 10);

            // Generate new booking ID (simulate auto-increment)
            const lastBooking = await db.collection('active_bookings')
                .findOne({}, { sort: { booking_id: -1 } });
            const newBookingId = (lastBooking?.booking_id || 0) + 1;

            // 5. Create active booking document
            const activeBookingDoc = {
                booking_id: newBookingId,
                customer_ref: {
                    customer_id: customer.customer_id,
                    username: customer.user_info.username,
                    loyalty_status: customer.loyalty.status
                },
                room_assignment: {
                    room_id: room.room_id,
                    room_type: room.room_details.room_type,
                    price_per_night: room.room_details.base_price,
                    current_status: 'Reserved'
                },
                stay_details: {
                    check_in: checkinDate,
                    check_out: checkoutDate,
                    actual_checkin: null,
                    status: 'Future',
                    nights_stayed: nights
                },
                services_consumed: serviceDetails,
                billing: {
                    room_charges: roomCharges,
                    service_charges: serviceCharges,
                    total_amount: totalAmount,
                    payment_status: 'Completed'
                },
                admin_notes: [],
                special_requests: bookingData.specialRequest || '',
                created_date: new Date()
            };

            // 6. Insert active booking
            await db.collection('active_bookings').insertOne(activeBookingDoc);

            // 7. Create recent booking summary for customer
            const recentBookingSummary = {
                booking_id: newBookingId,
                check_in: checkinDate,
                check_out: checkoutDate,
                status: 'Future',
                total_amount: totalAmount,
                room_details: {
                    room_id: room.room_id,
                    room_type: room.room_details.room_type,
                    price_per_night: room.room_details.base_price
                },
                services_summary: {
                    count: serviceDetails.length,
                    total_cost: serviceCharges,
                    items: serviceDetails.map(s => `${s.name} x${s.quantity}`)
                },
                payment_info: {
                    amount: totalAmount,
                    status: 'Completed',
                    date: new Date()
                }
            };

            // 8. Update customer document with new booking and loyalty points
            const newPendingPoints = customer.loyalty.pending_points + loyaltyPoints;

            await db.collection('customers').updateOne(
                { customer_id: bookingData.customerId },
                {
                    $push: {
                        recent_bookings: {
                            $each: [recentBookingSummary],
                            $position: 0,
                            $slice: 10  // Keep only 10 most recent
                        }
                    },
                    $inc: {
                        'loyalty.pending_points': loyaltyPoints,
                        'booking_statistics.total_bookings': 1,
                        'booking_statistics.total_spent': totalAmount
                    },
                    $set: {
                        'booking_statistics.average_booking': (customer.booking_statistics.total_spent + totalAmount) / (customer.booking_statistics.total_bookings + 1),
                        'booking_statistics.last_stay': checkinDate
                    }
                }
            );

            // 9. Update room availability calendar
            const calendarEntries = [];
            for (let d = new Date(checkinDate); d < checkoutDate; d.setDate(d.getDate() + 1)) {
                calendarEntries.push({
                    date: new Date(d),
                    booking_id: newBookingId,
                    status: 'Reserved'
                });
            }

            await db.collection('room_inventory').updateOne(
                { room_id: bookingData.roomId },
                {
                    $push: {
                        booking_calendar: { $each: calendarEntries }
                    },
                    $set: {
                        'current_status.current_booking_id': newBookingId,
                        'current_status.checkout_date': checkoutDate
                    }
                }
            );

            return {
                success: true,
                bookingId: newBookingId,
                totalAmount: totalAmount.toFixed(2),
                loyaltyPoints: loyaltyPoints,
                newPendingPoints: newPendingPoints,
                message: 'Booking created successfully in MongoDB'
            };

        } catch (error) {
            console.error('MongoDB booking creation error:', error);
            return {
                success: false,
                message: error.message
            };
        } finally {
            if (client) await client.close();
        }
    }

    async getCustomerLoyaltyAnalytics(filters = {}) {
        let client;

        try {
            client = new MongoClient(this.mongoUrl);
            await client.connect();
            const db = client.db(this.dbName);

            // Build aggregation pipeline for analytics
            const pipeline = [
                // Match filters if provided
                {
                    $match: {
                        ...(filters.loyaltyStatus && { 'loyalty.status': filters.loyaltyStatus }),
                        ...(filters.minPoints && { 'loyalty.current_points': { $gte: parseInt(filters.minPoints) } })
                    }
                },

                // Add computed fields and reshape data
                {
                    $project: {
                        username: '$user_info.username',
                        email: '$user_info.email',
                        loyalty_status: '$loyalty.status',
                        current_points: '$loyalty.current_points',
                        pending_points: '$loyalty.pending_points',
                        total_bookings: '$booking_statistics.total_bookings',
                        total_spent: '$booking_statistics.total_spent',
                        average_booking: '$booking_statistics.average_booking',
                        last_stay: '$booking_statistics.last_stay',
                        recent_booking_count: { $size: { $ifNull: ['$recent_bookings', []] } }
                    }
                },

                // Sort by total spent (descending) then by points
                {
                    $sort: {
                        total_spent: -1,
                        current_points: -1
                    }
                }
            ];

            // Add date filter if provided
            if (filters.dateFrom || filters.dateTo) {
                const dateMatch = {};
                if (filters.dateFrom) dateMatch.$gte = new Date(filters.dateFrom);
                if (filters.dateTo) dateMatch.$lte = new Date(filters.dateTo);

                pipeline.unshift({
                    $match: {
                        'booking_statistics.last_stay': dateMatch
                    }
                });
            }

            const results = await db.collection('customers').aggregate(pipeline).toArray();

            return {
                success: true,
                data: results,
                query_info: {
                    total_customers: results.length,
                    database_type: 'MongoDB',
                    pipeline_stages: pipeline.length
                }
            };

        } catch (error) {
            console.error('MongoDB analytics error:', error);
            return {
                success: false,
                message: error.message
            };
        } finally {
            if (client) await client.close();
        }
    }

    async getAvailableRooms(checkinDate, checkoutDate) {
        let client;

        try {
            client = new MongoClient(this.mongoUrl);
            await client.connect();
            const db = client.db(this.dbName);

            const checkin = new Date(checkinDate);
            const checkout = new Date(checkoutDate);

            // Find rooms not booked during the requested dates
            const availableRooms = await db.collection('room_inventory').find({
                $and: [
                    { 'current_status.availability': { $in: ['Available', 'Cleaning'] } },
                    {
                        $or: [
                            { 'booking_calendar': { $size: 0 } },  // No bookings
                            {
                                'booking_calendar': {
                                    $not: {
                                        $elemMatch: {
                                            date: {
                                                $gte: checkin,
                                                $lt: checkout
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ]
            }).project({
                room_id: 1,
                'room_details.room_type': 1,
                'room_details.capacity': 1,
                'room_details.base_price': 1,
                'current_status.availability': 1
            }).toArray();

            return availableRooms.map(room => ({
                RoomID: room.room_id,
                Room_type: room.room_details.room_type,
                Capacity: room.room_details.capacity,
                Price: room.room_details.base_price,
                Status: room.current_status.availability
            }));

        } catch (error) {
            console.error('MongoDB room availability error:', error);
            return [];
        } finally {
            if (client) await client.close();
        }
    }

    async getServices() {
        let client;

        try {
            client = new MongoClient(this.mongoUrl);
            await client.connect();
            const db = client.db(this.dbName);

            const services = await db.collection('service_catalog').find({
                'availability.active': true
            }).project({
                service_id: 1,
                'service_info.name': 1,
                'service_info.description': 1,
                'service_info.price_per_unit': 1
            }).toArray();

            return services.map(service => ({
                ServiceID: service.service_id,
                Label: service.service_info.name,
                Description: service.service_info.description,
                Price_per_unit: service.service_info.price_per_unit
            }));

        } catch (error) {
            console.error('MongoDB services error:', error);
            return [];
        } finally {
            if (client) await client.close();
        }
    }
}

module.exports = MongoBookingService;
