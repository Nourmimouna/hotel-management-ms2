// Nourelkamar_student1_Dragonflyinn
// Nourelkamar_student1_Dragonflyinn
// MongoDB Indexing Analysis and Implementation
const { MongoClient } = require('mongodb');

class IndexingAnalysis {
    constructor() {
        this.mongoUrl = 'mongodb://mongodb:27017/hotel_nosql';
    }

    async createOptimalIndexes() {
        let client;
        try {
            client = new MongoClient(this.mongoUrl);
            await client.connect();
            const db = client.db('hotel_nosql');

            console.log('Creating optimal indexes for analytics performance...');

            // Customers collection indexes for analytics
            await db.collection('customers').createIndex({ 'customer_id': 1 }, { unique: true });
            
            // Compound index for loyalty analytics (most selective first)
            await db.collection('customers').createIndex({ 
                'loyalty.status': 1, 
                'loyalty.current_points': 1,
                'booking_statistics.total_spent': -1
            });
            
            // Analytics-specific indexes
            await db.collection('customers').createIndex({ 'booking_statistics.last_stay': -1 });
            await db.collection('customers').createIndex({ 'booking_statistics.total_bookings': 1 });
            
            // Recent bookings embedded array indexes
            await db.collection('customers').createIndex({ 'recent_bookings.check_in': 1 });
            await db.collection('customers').createIndex({ 'recent_bookings.status': 1 });

            // Active bookings collection
            await db.collection('active_bookings').createIndex({ 'booking_id': 1 }, { unique: true });
            await db.collection('active_bookings').createIndex({ 'customer_ref.customer_id': 1 });
            await db.collection('active_bookings').createIndex({ 'stay_details.check_out': 1 });

            // Room inventory
            await db.collection('room_inventory').createIndex({ 'room_id': 1 }, { unique: true });
            await db.collection('room_inventory').createIndex({ 'current_status.availability': 1 });

            console.log('✅ All indexes created successfully');
            return { success: true, message: 'Indexes created successfully' };

        } catch (error) {
            console.error('Indexing error:', error);
            return { success: false, message: error.message };
        } finally {
            if (client) await client.close();
        }
    }

    async analyzeQueryPerformance() {
        let client;
        try {
            client = new MongoClient(this.mongoUrl);
            await client.connect();
            const db = client.db('hotel_nosql');

            const results = {};

            // Test 1: Analytics query performance
            console.log('Testing analytics query performance...');
            const analyticsExplain = await db.collection('customers').aggregate([
                { 
                    $match: { 
                        'loyalty.status': 'Gold', 
                        'booking_statistics.last_stay': {
                            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
                        }
                    } 
                },
                { 
                    $project: { 
                        username: '$user_info.username', 
                        total_spent: '$booking_statistics.total_spent',
                        current_points: '$loyalty.current_points'
                    } 
                },
                { $sort: { total_spent: -1 } }
            ], { explain: true });

            results.analytics_query = this.extractExplainStats(analyticsExplain);

            // Test 2: Customer booking lookup
            console.log('Testing customer booking lookup...');
            const bookingExplain = await db.collection('customers').find({
                'customer_id': 1,
                'recent_bookings.status': 'Future'
            }).explain('executionStats');

            results.booking_lookup = this.extractFindStats(bookingExplain);

            // Test 3: Loyalty status filter
            console.log('Testing loyalty status filter...');
            const loyaltyExplain = await db.collection('customers').find({
                'loyalty.status': { $in: ['Gold', 'Platinum'] },
                'loyalty.current_points': { $gte: 1000 }
            }).explain('executionStats');

            results.loyalty_filter = this.extractFindStats(loyaltyExplain);

            return { success: true, results };

        } catch (error) {
            console.error('Performance analysis error:', error);
            return { success: false, message: error.message };
        } finally {
            if (client) await client.close();
        }
    }

    extractFindStats(explain) {
        const stats = explain.executionStats;
        return {
            totalDocsExamined: stats.totalDocsExamined,
            totalDocsReturned: stats.nReturned,
            indexesUsed: stats.inputStage ? (stats.inputStage.indexName || 'COLLSCAN') : 'COLLSCAN',
            executionTimeMillis: stats.executionTimeMillis,
            keysExamined: stats.totalKeysExamined || 0
        };
    }

    extractExplainStats(explain) {
        // Extract stats from aggregation explain
        const stage = explain.stages && explain.stages[0];
        if (stage && stage.$cursor) {
            const stats = stage.$cursor.executionStats;
            return {
                totalDocsExamined: stats.totalDocsExamined,
                totalDocsReturned: stats.nReturned,
                indexesUsed: stats.inputStage ? (stats.inputStage.indexName || 'COLLSCAN') : 'COLLSCAN',
                executionTimeMillis: stats.executionTimeMillis,
                keysExamined: stats.totalKeysExamined || 0
            };
        }
        return { error: 'Could not extract aggregation stats' };
    }

    async getIndexInformation() {
        let client;
        try {
            client = new MongoClient(this.mongoUrl);
            await client.connect();
            const db = client.db('hotel_nosql');

            const collections = ['customers', 'active_bookings', 'room_inventory', 'service_catalog'];
            const indexInfo = {};

            for (const collection of collections) {
                try {
                    const indexes = await db.collection(collection).indexes();
                    indexInfo[collection] = indexes.map(index => ({
                        name: index.name,
                        key: index.key,
                        unique: index.unique || false,
                        size: index.size || 'unknown'
                    }));
                } catch (err) {
                    indexInfo[collection] = { error: `Collection not found: ${err.message}` };
                }
            }

            return { success: true, indexes: indexInfo };

        } catch (error) {
            console.error('Index information error:', error);
            return { success: false, message: error.message };
        } finally {
            if (client) await client.close();
        }
    }

    async comparePerformanceBeforeAfter() {
        let client;
        try {
            client = new MongoClient(this.mongoUrl);
            await client.connect();
            const db = client.db('hotel_nosql');

            // Drop indexes to test performance without them
            console.log('Testing performance without indexes...');
            await db.collection('customers').dropIndexes();
            
            const beforeResults = await this.runPerformanceTests(db);
            
            // Recreate indexes
            console.log('Recreating indexes...');
            await this.createOptimalIndexes();
            
            const afterResults = await this.runPerformanceTests(db);

            return {
                success: true,
                comparison: {
                    before: beforeResults,
                    after: afterResults,
                    improvement: this.calculateImprovement(beforeResults, afterResults)
                }
            };

        } catch (error) {
            console.error('Performance comparison error:', error);
            return { success: false, message: error.message };
        } finally {
            if (client) await client.close();
        }
    }

    async runPerformanceTests(db) {
        const testQuery = await db.collection('customers').find({
            'loyalty.status': 'Gold',
            'booking_statistics.total_spent': { $gte: 1000 }
        }).explain('executionStats');

        return this.extractFindStats(testQuery);
    }

    calculateImprovement(before, after) {
        return {
            docsExaminedReduction: before.totalDocsExamined - after.totalDocsExamined,
            timeImprovement: before.executionTimeMillis - after.executionTimeMillis,
            indexUsage: after.indexesUsed !== 'COLLSCAN' ? 'Index used' : 'Still using collection scan'
        };
    }
}

module.exports = IndexingAnalysis;
