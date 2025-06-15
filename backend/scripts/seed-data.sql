-- Sample data for testing
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
('john_customer', 'password123', 'john@example.com'),
('alice_customer', 'password123', 'alice@example.com'),
('bob_employee', 'password123', 'bob@hotel.com'),
('manager_sarah', 'password123', 'sarah@hotel.com');

-- Insert Customers
INSERT INTO CUSTOMER (Loyalty_status, Points, Pending_points, UserID) VALUES
('Silver', 1250, 100, 1),
('Gold', 2500, 150, 2);

-- Insert Employees
INSERT INTO EMPLOYEE (Role, Name, Department, Hire_Date, Salary, UserID, ReportsTo) VALUES
('Manager', 'Sarah Wilson', 'Management', '2020-01-15', 65000.00, 4, NULL),
('Receptionist', 'Bob Johnson', 'Front Desk', '2022-03-10', 35000.00, 3, 1);

-- Insert Hotels
INSERT INTO HOTEL (Name, Location, Rating, Total_number_rooms) VALUES
('Grand Vienna Hotel', 'Vienna, Austria', 4.5, 100),
('City Center Inn', 'Vienna, Austria', 3.8, 50);

-- Insert Rooms
INSERT INTO ROOM (Room_type, Capacity, Price, Status, HotelID) VALUES
('Single', 1, 89.99, 'Available', 1),
('Double', 2, 129.99, 'Available', 1),
('Suite', 4, 249.99, 'Available', 1),
('Single', 1, 69.99, 'Available', 2),
('Double', 2, 99.99, 'Occupied', 2);

-- Insert Services
INSERT INTO SERVICE (Label, Price_per_unit, Description) VALUES
('Breakfast', 15.00, 'Continental breakfast buffet'),
('Airport Shuttle', 25.00, 'Round trip airport transportation'),
('Spa Treatment', 80.00, 'One hour massage therapy'),
('Laundry', 12.00, 'Same day laundry service');

-- Insert Bookings
INSERT INTO BOOKING (Check_in_date, Check_out_date, Status, Total_amount, Special_request, CustomerID, RoomID) VALUES
('2025-07-15', '2025-07-18', 'Future', 389.97, 'Late check-in please', 1, 2),
('2025-06-20', '2025-06-22', 'Future', 199.98, NULL, 2, 4);

-- Insert Booking-Service relationships
INSERT INTO BOOKING_SERVICE (BookingID, ServiceID, Quantity) VALUES
(1, 1, 3),  -- Breakfast for 3 days
(1, 2, 1),  -- Airport shuttle
(2, 1, 2),  -- Breakfast for 2 days
(2, 4, 1);  -- Laundry service

-- Insert Payments
INSERT INTO PAYMENT (PaymentID, BookingID, Amount, Payment_date, Status) VALUES
(1, 1, 389.97, '2025-06-15', 'Completed'),
(1, 2, 199.98, '2025-06-16', 'Completed');