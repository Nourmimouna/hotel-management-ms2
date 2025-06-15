-- Hotel Management Database Creation Script
CREATE DATABASE IF NOT EXISTS hotel_management;
USE hotel_management;

-- User table (parent for IS-A relationship)
CREATE TABLE USER (
    UserID INT PRIMARY KEY AUTO_INCREMENT,
    Username VARCHAR(50) UNIQUE NOT NULL,
    Password VARCHAR(255) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer table (child of USER)
CREATE TABLE CUSTOMER (
    CustomerID INT PRIMARY KEY AUTO_INCREMENT,
    Loyalty_status VARCHAR(20) DEFAULT 'Classic',
    Points INT DEFAULT 0,
    Pending_Points INT DEFAULT 0,
    UserID INT UNIQUE NOT NULL,
    FOREIGN KEY (UserID) REFERENCES USER(UserID) ON DELETE CASCADE
);

-- Employee table (child of USER with recursive relationship)
CREATE TABLE EMPLOYEE (
    EmployeeID INT PRIMARY KEY AUTO_INCREMENT,
    Role VARCHAR(50) NOT NULL,
    First_Name VARCHAR(50) NOT NULL,
    Last_Name VARCHAR(50) NOT NULL,
    Hire_Date DATE NOT NULL,
    Salary DECIMAL(10,2),
    Department VARCHAR(50),
    UserID INT UNIQUE NOT NULL,
    SupervisorID INT,
    FOREIGN KEY (UserID) REFERENCES USER(UserID) ON DELETE CASCADE,
    FOREIGN KEY (SupervisorID) REFERENCES EMPLOYEE(EmployeeID) ON DELETE SET NULL
);

-- Hotel table
CREATE TABLE HOTEL (
    HotelID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Location VARCHAR(200) NOT NULL,
    Rating INT CHECK (Rating >= 1 AND Rating <= 5),
    Total_number_rooms INT NOT NULL
);

-- Room table
CREATE TABLE ROOM (
    RoomID INT PRIMARY KEY AUTO_INCREMENT,
    Room_type VARCHAR(50) NOT NULL,
    Capacity INT NOT NULL,
    Price DECIMAL(8,2) NOT NULL,
    Status VARCHAR(20) DEFAULT 'Available',
    HotelID INT NOT NULL,
    FOREIGN KEY (HotelID) REFERENCES HOTEL(HotelID) ON DELETE CASCADE
);

-- Booking table
CREATE TABLE BOOKING (
    BookingID INT PRIMARY KEY AUTO_INCREMENT,
    Check_in_date DATE NOT NULL,
    Check_out_date DATE NOT NULL,
    Status VARCHAR(20) DEFAULT 'Future',
    Total_amount DECIMAL(10,2),
    Special_request TEXT,
    CustomerID INT NOT NULL,
    RoomID INT,
    ManagedByEmployeeID INT,
    Created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CustomerID) REFERENCES CUSTOMER(CustomerID) ON DELETE CASCADE,
    FOREIGN KEY (RoomID) REFERENCES ROOM(RoomID) ON DELETE SET NULL,
    FOREIGN KEY (ManagedByEmployeeID) REFERENCES EMPLOYEE(EmployeeID) ON DELETE SET NULL,
    CHECK (Check_out_date > Check_in_date)
);

-- Service table
CREATE TABLE SERVICE (
    ServiceID INT PRIMARY KEY AUTO_INCREMENT,
    Label VARCHAR(100) NOT NULL,
    Description TEXT,
    Price_per_unit DECIMAL(8,2) NOT NULL,
    Category VARCHAR(50)
);

-- Booking_Service junction table (m:n relationship)
CREATE TABLE BOOKING_SERVICE (
    BookingID INT,
    ServiceID INT,
    Quantity INT DEFAULT 1,
    Total_Price DECIMAL(8,2),
    PRIMARY KEY (BookingID, ServiceID),
    FOREIGN KEY (BookingID) REFERENCES BOOKING(BookingID) ON DELETE CASCADE,
    FOREIGN KEY (ServiceID) REFERENCES SERVICE(ServiceID) ON DELETE CASCADE
);

-- Payment table (weak entity)
CREATE TABLE PAYMENT (
    PaymentID INT,
    BookingID INT,
    Amount DECIMAL(10,2) NOT NULL,
    Payment_Date DATE NOT NULL,
    Status VARCHAR(20) DEFAULT 'Pending',
    Payment_Method VARCHAR(50),
    PRIMARY KEY (PaymentID, BookingID),
    FOREIGN KEY (BookingID) REFERENCES BOOKING(BookingID) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_booking_dates ON BOOKING(Check_in_date, Check_out_date);
CREATE INDEX idx_customer_loyalty ON CUSTOMER(Loyalty_status);
CREATE INDEX idx_room_type ON ROOM(Room_type);
CREATE INDEX idx_booking_status ON BOOKING(Status);
