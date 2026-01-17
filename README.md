# TeaHaven - Premium E-Commerce Tea Shop

A modern, full-stack e-commerce platform for selling premium teas with Google Maps integration, advanced filtering, and clean UX design.

## Quick Start

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup .env files (see Configuration section)

# Start backend
cd backend && npm run dev

# Start frontend (new terminal)
cd frontend && npm start

# Seed products
cd backend && node seedProducts.js
```

Visit: http://localhost:3000

## Features

- Modern homepage with hero, categories, reviews
- Advanced product filtering (category, imported/local, search)
- Product detail pages with reviews
- Shopping cart with shipping estimates
- **Google Maps address autocomplete**
- Complete checkout flow
- User dashboard with stats
- Order history
- Fully responsive design

## Tech Stack

**Frontend:** React, React Router, Context API, Google Maps API  
**Backend:** Node.js, Express, MySQL, Sequelize, JWT  
**Design:** Custom CSS with modern design system

## Configuration

Create `backend/.env`:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=teahaven_db
JWT_SECRET=your_secret
```

Create `frontend/.env`:
```env
REACT_APP_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## Documentation

- [BACKEND_DOCUMENTATION.md](BACKEND_DOCUMENTATION.md) - API reference
- [FINAL_SETUP_GUIDE.md](FINAL_SETUP_GUIDE.md) - Setup guide
- [UX_REDESIGN_COMPLETE.md](UX_REDESIGN_COMPLETE.md) - UX documentation
- [FIXES_APPLIED.md](FIXES_APPLIED.md) - Latest improvements

## Key Pages

- `/` - Homepage
- `/products` - All products with filters
- `/products/:id` - Product detail
- `/cart` - Shopping cart
- `/checkout` - Order placement
- `/profile` - User dashboard
- `/orders` - Order history
- `/addresses` - Address management

Enjoy your premium tea shopping experience! 🍵
