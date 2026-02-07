# Quick Reference Guide - Node.js Backend

## Project Structure Explained

### MVC Pattern (Model-View-Controller)

```
REQUEST → ROUTE → MIDDLEWARE → CONTROLLER → MODEL → DATABASE
                                    ↓
RESPONSE ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

### What Each Folder Does

**config/** - Configuration files
- `database.js` - Connects to MySQL using Sequelize

**models/** - Database structure (the "M" in MVC)
- Defines what data looks like
- Handles database operations
- Example: User.js defines user structure

**controllers/** - Business logic (the "C" in MVC)
- Processes requests
- Calls models to get/save data
- Sends responses
- Example: authController.js handles login logic

**routes/** - URL endpoints (like the "View" router in MVC)
- Maps URLs to controllers
- Adds validation
- Example: `/api/auth/login` → authController.login

**middleware/** - Functions that run BEFORE controllers
- Checks authentication
- Validates input
- Logs requests
- Example: verifyToken checks if user is logged in

**server.js** - Entry point
- Starts the server
- Connects everything together

## Key Concepts

### 1. Sequelize ORM

**What is ORM?** Object-Relational Mapping
- Write JavaScript instead of SQL
- Safer (prevents SQL injection)
- Easier to maintain

**Example:**

Instead of SQL:
```sql
SELECT * FROM users WHERE email = 'test@example.com'
```

Use Sequelize:
```javascript
await User.findOne({ where: { email: 'test@example.com' } })
```

### 2. Async/Await

**Why?** Database operations take time

```javascript
// ❌ Wrong - doesn't wait
const user = User.findOne({ where: { email } });

// ✅ Correct - waits for result
const user = await User.findOne({ where: { email } });
```

### 3. Middleware

Functions that run in order:

```javascript
app.get('/api/auth/me', verifyToken, authController.getProfile)
                        ↑            ↑
                   Runs first    Runs second
```

### 4. JWT (JSON Web Token)

**Flow:**
1. User logs in → Server creates token
2. Client stores token
3. Client sends token with each request
4. Server verifies token → Allows access

**Token contains:**
```javascript
{
  id: 1,
  email: "user@example.com",
  role: "customer",
  exp: 1234567890  // Expiration time
}
```

### 5. Password Hashing

**Never store plain passwords!**

```javascript
// User enters: "password123"
// Stored in DB: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
```

Why? If database is hacked, passwords are still safe.

## How Requests Work

### Example: User Login

**1. Client sends request:**
```javascript
POST /api/auth/login
{
  "email": "user@test.com",
  "password": "test123"
}
```

**2. Route receives it:**
```javascript
// routes/authRoutes.js
router.post('/login', loginValidation, authController.login)
```

**3. Validation middleware checks:**
```javascript
// Is email valid format?
// Is password provided?
```

**4. Controller processes:**
```javascript
// controllers/authController.js
exports.login = async (req, res) => {
  // 1. Find user by email
  const user = await User.findOne({ where: { email } })

  // 2. Check password
  const isValid = await user.comparePassword(password)

  // 3. Create token
  const token = jwt.sign({...}, process.env.JWT_SECRET)

  // 4. Send response
  res.json({ success: true, token })
}
```

**5. Model handles database:**
```javascript
// models/User.js
User.findOne({ where: { email } })
// Sequelize converts to: SELECT * FROM users WHERE email = ?
```

**6. Response sent back:**
```javascript
{
  "success": true,
  "data": {
    "user": {...},
    "token": "eyJhbGc..."
  }
}
```

## Common Patterns

### Creating a New Feature

**1. Create Model** (if needed)
```javascript
// models/Cart.js
const Cart = sequelize.define('Cart', {
  userId: DataTypes.INTEGER,
  productId: DataTypes.INTEGER,
  quantity: DataTypes.INTEGER
});
```

**2. Create Controller**
```javascript
// controllers/cartController.js
exports.addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  const cart = await Cart.create({
    userId: req.user.id,
    productId,
    quantity
  });
  res.json({ success: true, data: cart });
};
```

**3. Create Route**
```javascript
// routes/cartRoutes.js
router.post('/', verifyToken, cartController.addToCart);
```

**4. Register in server.js**
```javascript
// server.js
const cartRoutes = require('./routes/cartRoutes');
app.use('/api/cart', cartRoutes);
```

## Environment Variables

**Why use .env?**
- Keeps secrets safe
- Easy to change between dev/production
- Never commit to Git

**How to use:**
```javascript
// .env file
DB_PASSWORD=secret123

// In code
const password = process.env.DB_PASSWORD
```

## Error Handling

**Always use try-catch for async code:**

```javascript
exports.someFunction = async (req, res) => {
  try {
    // Your code here
    const result = await someAsyncOperation();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong'
    });
  }
};
```

## Status Codes

- `200` - OK (success)
- `201` - Created (new resource)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not allowed)
- `404` - Not Found
- `409` - Conflict (email already exists)
- `500` - Server Error (something broke)

## REST API Conventions

```
GET    /api/products       - List all
GET    /api/products/:id   - Get one
POST   /api/products       - Create new
PUT    /api/products/:id   - Update
DELETE /api/products/:id   - Delete
```

## Useful Commands

```bash
# Install package
npm install package-name

# Start server (auto-reload on changes)
npm run dev

# Start server (no reload)
npm start

# View logs
Check terminal where server is running
```

## Common Issues & Solutions

**Port already in use:**
```bash
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <process-id> /F
```

**Database connection failed:**
- Check MySQL is running: `docker ps`
- Check .env has correct credentials
- Check database exists

**Token expired:**
- User needs to login again
- Frontend should handle TOKEN_EXPIRED error

## Next Steps to Learn

1. **Add Cart feature** - Practice models & controllers
2. **Add Orders** - Learn model associations
3. **Add Admin panel** - Practice role-based access
4. **Add file uploads** - Learn multer
5. **Add email** - Learn nodemailer

## Helpful Resources

- Sequelize Docs: https://sequelize.org/docs/v6/
- Express Docs: https://expressjs.com/
- JWT: https://jwt.io/
- Node.js: https://nodejs.org/docs/

## Questions?

Check these files:
- `backend/README.md` - Full API documentation
- `SETUP_COMPLETE.md` - Feature overview
- `REFACTORING_SUMMARY.md` - What changed

---

Happy coding! 🚀
