-- Hotel Management System Database Schema
-- Based on MS1 with corrections from professor feedback

CREATE DATABASE IF NOT EXISTS hotel_management;
USE hotel_management;

-- User table (base for IS-A relationship)
CREATE TABLE USER (
    UserID INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(50) UNIQUE NOT NULL,
    Password VARCHAR(255) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL
);

-- Customer table (IS-A relationship with User)
CREATE TABLE CUSTOMER (
    CustomerID INT PRIMARY KEY AUTO_INCREMENT,
    Loyalty_status ENUM('Classic', 'Silver', 'Gold', 'Diamond') DEFAULT 'Classic',
    Points INT DEFAULT 0,
    Pending_points INT DEFAULT 0,
    UserID INT UNIQUE,
    FOREIGN KEY (UserID) REFERENCES USER(UserID) ON DELETE CASCADE
);

-- Employee table (IS-A relationship with User) - FIXED FROM MS1
CREATE TABLE EMPLOYEE (
    EmployeeID INT PRIMARY KEY AUTO_INCREMENT,
    Role VARCHAR(50) NOT NULL,
    Name VARCHAR(100) NOT NULL,           -- Added based on feedback
    Department VARCHAR(50) NOT NULL,       -- Added based on feedback
    Hire_Date DATE NOT NULL,              -- Added based on feedback
    Salary DECIMAL(10,2) NOT NULL,        -- Added based on feedback
    UserID INT UNIQUE,
    ReportsTo INT,                        -- Added "Manages" relationship
    FOREIGN KEY (UserID) REFERENCES USER(UserID) ON DELETE CASCADE,
    FOREIGN KEY (ReportsTo) REFERENCES EMPLOYEE(EmployeeID)
);

-- Hotel table
CREATE TABLE HOTEL (
    HotelID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Location VARCHAR(200) NOT NULL,
    Rating DECIMAL(2,1) CHECK (Rating >= 1 AND Rating <= 5),
    Total_number_rooms INT NOT NULL
);

-- Room table
CREATE TABLE ROOM (
    RoomID INT PRIMARY KEY AUTO_INCREMENT,
    Room_type VARCHAR(50) NOT NULL,
    Capacity INT NOT NULL,
    Price DECIMAL(8,2) NOT NULL,
    Status ENUM('Available', 'Occupied', 'Cleaning', 'Maintenance') DEFAULT 'Available',
    HotelID INT,
    FOREIGN KEY (HotelID) REFERENCES HOTEL(HotelID)
);

-- Booking table - FIXED relationship with Room (1:N not M:N)
CREATE TABLE BOOKING (
    BookingID INT PRIMARY KEY AUTO_INCREMENT,
    Check_in_date DATE NOT NULL,
    Check_out_date DATE NOT NULL,
    Status ENUM('Future', 'Present', 'Past', 'Cancelled') DEFAULT 'Future',
    Total_amount DECIMAL(10,2) NOT NULL,
    Special_request TEXT,
    CustomerID INT,
    RoomID INT,                           -- Fixed: Each booking has exactly one room
    FOREIGN KEY (CustomerID) REFERENCES CUSTOMER(CustomerID),
    FOREIGN KEY (RoomID) REFERENCES ROOM(RoomID)
);

-- Service table
CREATE TABLE SERVICE (
    ServiceID INT PRIMARY KEY AUTO_INCREMENT,
    Label VARCHAR(100) NOT NULL,
    Price_per_unit DECIMAL(8,2) NOT NULL,
    Description TEXT
);

-- Booking-Service junction table - FIXED M:N relationship
CREATE TABLE BOOKING_SERVICE (
    BookingID INT,
    ServiceID INT,
    Quantity INT DEFAULT 1,
    PRIMARY KEY (BookingID, ServiceID),
    FOREIGN KEY (BookingID) REFERENCES BOOKING(BookingID) ON DELETE CASCADE,
    FOREIGN KEY (ServiceID) REFERENCES SERVICE(ServiceID)
);

-- Payment table (weak entity)
CREATE TABLE PAYMENT (
    PaymentID INT,
    BookingID INT,
    Amount DECIMAL(10,2) NOT NULL,
    Payment_date DATE NOT NULL,
    Status ENUM('Pending', 'Completed', 'Failed') DEFAULT 'Pending',
    PRIMARY KEY (PaymentID, BookingID),
    FOREIGN KEY (BookingID) REFERENCES BOOKING(BookingID) ON DELETE CASCADE
);