# TeaHaven Backend API

Enterprise-grade Node.js backend for TeaHaven e-commerce platform, built with MVC architecture and Sequelize ORM.

## Architecture

```
backend/
├── config/              # Configuration files
│   └── database.js      # Sequelize database configuration
├── controllers/         # Business logic
│   ├── authController.js    # Authentication logic
│   └── productController.js # Product management logic
├── middleware/          # Custom middleware
│   └── auth.js         # JWT authentication middleware
├── models/             # Sequelize models
│   ├── User.js         # User model
│   ├── Product.js      # Product model
│   └── index.js        # Model aggregator
├── routes/             # API route definitions
│   ├── authRoutes.js   # Authentication routes
│   └── productRoutes.js # Product routes
├── .env                # Environment variables (not in git)
├── .env.example        # Example environment variables
└── server.js           # Application entry point
```

## Features

- **MVC Architecture**: Clean separation of concerns
- **Sequelize ORM**: Type-safe database operations
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt encryption
- **Input Validation**: express-validator
- **Product Filtering**: Search, category, price range
- **Role-Based Access**: Customer and Admin roles
- **CORS Support**: Frontend integration ready

## Getting Started

### Prerequisites

- Node.js 16+
- MySQL 8+
- Docker (optional, for MySQL container)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Start MySQL (via Docker):
```bash
cd ..
docker-compose up -d
```

4. Start the server:
```bash
npm run dev    # Development with auto-reload
npm start      # Production
```

Server runs on `http://localhost:5000`

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create new account | None |
| POST | `/api/auth/login` | Login with credentials | None |
| GET | `/api/auth/me` | Get current user profile | Required |
| GET | `/api/auth/verify` | Verify JWT token | Required |
| POST | `/api/auth/logout` | Logout | Required |

### Products

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/products` | List all products with filters | None |
| GET | `/api/products/categories` | Get available categories | None |
| GET | `/api/products/:id` | Get product details | None |
| POST | `/api/products` | Create product | Admin |
| PUT | `/api/products/:id` | Update product | Admin |
| DELETE | `/api/products/:id` | Delete product (soft) | Admin |

### Product Filtering

Query parameters for `GET /api/products`:
- `category` - Filter by category (e.g., "Green Tea")
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `search` - Search in name and description
- `sortBy` - Sort field (name, price, etc.)
- `order` - Sort order (asc/desc)

**Example:**
```bash
GET /api/products?category=Green%20Tea&minPrice=10&maxPrice=20&sortBy=price&order=asc
```

## Models

### User Model
```javascript
{
  id: Integer (Primary Key)
  email: String (Unique)
  password: String (Hashed)
  firstName: String
  lastName: String
  role: Enum ['customer', 'admin']
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Product Model
```javascript
{
  id: Integer (Primary Key)
  name: String
  description: Text
  price: Decimal(10,2)
  stockQuantity: Integer
  category: String
  imageUrl: String
  isActive: Boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## Security

- Passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens signed with secret key
- Token expiration: 30 days (configurable)
- Input validation on all endpoints
- SQL injection prevention via Sequelize
- CORS configured for frontend origin

## Environment Variables

See [.env.example](./.env.example) for all required variables.

Key variables:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database config
- `JWT_SECRET` - Secret key for signing tokens
- `JWT_EXPIRES_IN` - Token expiration time
- `FRONTEND_URL` - Frontend URL for CORS

## Development

```bash
npm run dev    # Start with nodemon (auto-reload)
```

## Testing API

### Register a new user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "pass123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Get products
```bash
curl http://localhost:5000/api/products
```

### Get products by category
```bash
curl "http://localhost:5000/api/products?category=Green%20Tea"
```

## Next Features (Planned)

- Cart management
- Order processing
- Address management
- Payment integration
- Inventory tracking
- Admin dashboard

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Sequelize
- **Database**: MySQL
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator
- **CORS**: cors package
