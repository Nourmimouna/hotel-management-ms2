# 🏨 Dragonfly Inn - Hotel Management System

![Dragonfly Inn Logo](./logo.png)

*A hotel management system with booking and loyalty tracking - because even small inns need big dreams.*

---

## 🚀 Quick Start

**What you need:**
- Docker Desktop
- WSL 2 (Windows users)

**Get it running:**
```bash
# Get everything set up
make build
make up

# Check it's working
make health
```

**Access your system:**
- Website: https://localhost 
- API: http://localhost:3000
- Health check: http://localhost:3000/health

---

## 🏗️ What's Inside

**Frontend** - React app with booking forms and customer dashboard  
**Backend** - Node.js API handling reservations and analytics  
**PostgreSQL** - Main database with customer and booking data  
**MongoDB** - Document storage for analytics and preferences  

Everything runs in Docker containers, so it works the same everywhere.

---

## ⚡ Main Features

**For Guests:**
- Make reservations online
- Track loyalty points
- Add services (breakfast, spa, etc.)
- View booking history

**For Management:**
- Customer analytics and reports
- Booking management
- Loyalty program insights
- Revenue tracking

---

## 📖 Commands

```bash
# Basic operations
make build          # Build everything
make up             # Start all services
make down           # Stop everything
make logs           # See what's happening

# Database stuff
make seed-db        # Add sample data
make migrate-db     # Copy data to MongoDB
make clean          # Reset everything

# Debugging
make health         # Check if services are running
make status         # Show container status
```

---

## 🔧 Development

**Local setup:**
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend  
cd frontend
npm install
npm start
```

**Environment:**
```bash
DB_HOST=localhost
DB_NAME=hotel_management
DB_USER=postgres
JWT_SECRET=your_secret_here
```

---

## 🗄️ Database Design

**PostgreSQL Tables:**
- Users, Customers, Employees
- Hotels, Rooms, Bookings
- Services, Payments

**MongoDB Collections:**
- Customer profiles with booking history
- Room availability and pricing
- Analytics data

---

## 🚨 Troubleshooting

**Docker won't start?**
```bash
docker --version
make clean && make build
```

**Database connection issues?**
```bash
make logs
# Check if PostgreSQL is running
```

**Can't access the website?**
- Try https://localhost (not http)
- Accept the SSL certificate warning

---

## 📊 API Endpoints

- `GET /health` - System status
- `POST /api/bookings` - Create booking
- `GET /api/analytics/loyalty` - Customer analysis
- `POST /api/migration/seed-database` - Load sample data

---

## 👤 Author

**Nour Elkamar** - MS2 Information Management Project
Group 39, Student 1

Built with Node.js, React, PostgreSQL, MongoDB, and Docker.

---

*A complete hotel management system for the modern age.*
