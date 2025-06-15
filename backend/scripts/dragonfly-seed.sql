USE hotel_management;

-- Clear existing data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE PAYMENT;
TRUNCATE TABLE BOOKING_SERVICE;
TRUNCATE TABLE BOOKING;
TRUNCATE TABLE SERVICE;
TRUNCATE TABLE ROOM;
TRUNCATE TABLE HOTEL;
TRUNCATE TABLE EMPLOYEE;
TRUNCATE TABLE CUSTOMER;
TRUNCATE TABLE USER;
SET FOREIGN_KEY_CHECKS = 1;

-- Insert Users
INSERT INTO USER (Username, Password, Email) VALUES
('john_customer', 'password123', 'john@starshollow.com'),
('alice_customer', 'password123', 'alice@starshollow.com'),
('lorelai_gilmore', 'password123', 'lorelai@dragonflyinn.com'),
('rory_gilmore', 'password123', 'rory@yale.edu');

-- Insert Customers
INSERT INTO CUSTOMER (Loyalty_status, Points, Pending_points, UserID) VALUES
('Silver', 1250, 100, 1),
('Gold', 2500, 150, 2),
('Diamond', 5000, 200, 3),
('Classic', 500, 50, 4);

-- Insert The Dragonfly Inn
INSERT INTO HOTEL (Name, Location, Rating, Total_number_rooms) VALUES 
('The Dragonfly Inn', 'Stars Hollow, Connecticut', 5.0, 12);

-- Insert Themed Rooms
INSERT INTO ROOM (Room_type, Capacity, Price, Status, HotelID) VALUES 
('The Lorelai Suite', 2, 199.99, 'Available', 1),
('The Rory Room', 1, 129.99, 'Available', 1),
('Luke\'s Diner View', 2, 159.99, 'Available', 1),
('Stars Hollow Cozy', 1, 99.99, 'Available', 1),
('Sookie\'s Garden Room', 2, 179.99, 'Available', 1),
('Michel\'s Fancy Suite', 4, 299.99, 'Available', 1);

-- Insert Services
INSERT INTO SERVICE (Label, Price_per_unit, Description) VALUES
('Sookie\'s Famous Breakfast', 25.00, 'Gourmet breakfast prepared by our chef'),
('Luke\'s Coffee Delivery', 15.00, 'Fresh coffee delivered to your room'),
('Stars Hollow Tour', 35.00, 'Guided tour of charming Stars Hollow'),
('Doose\'s Market Snacks', 20.00, 'Local treats and snacks basket');
