# 🔐 Authentication & Product CRUD Features

## Overview
Added complete user authentication system and product catalog CRUD operations for administrators.

---

## 🆕 New Features

### 1. User Authentication System

#### User Service (Port 8086)
- **Backend:** Node.js + Express + PostgreSQL
- **JWT-based authentication** with 7-day token expiration
- **bcrypt password hashing** for security

#### API Endpoints

**Authentication:**
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout (client-side token removal)
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

**Admin Only:**
- `GET /api/users` - List all users (with pagination, filtering)
- `DELETE /api/users/:userId` - Delete user account

#### Database Schema

**users table:**
```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE NOT NULL
password_hash VARCHAR(255) NOT NULL
first_name VARCHAR(100)
last_name VARCHAR(100)
role VARCHAR(50) DEFAULT 'customer'  -- 'customer' or 'admin'
created_at TIMESTAMP
updated_at TIMESTAMP
last_login TIMESTAMP
is_active BOOLEAN DEFAULT true
```

**user_profiles table:**
```sql
user_id UUID PRIMARY KEY (FK)
phone VARCHAR(20)
address_line1 VARCHAR(255)
address_line2 VARCHAR(255)
city VARCHAR(100)
state VARCHAR(100)
postal_code VARCHAR(20)
country VARCHAR(100) DEFAULT 'US'
avatar_url VARCHAR(500)
preferences JSONB
```

---

### 2. Frontend Authentication UI

#### Login/Register Modal
- **Toggle between Login and Register modes**
- Email and password fields
- First name and last name (register only)
- Real-time validation
- Loading states with spinners
- Toast notifications for feedback

#### Sidebar User Section
- **Not logged in:** Shows "Login / Sign Up" button
- **Logged in:** Shows user avatar with initials, name, email, and logout button

#### Session Persistence
- JWT token stored in localStorage
- Auto-login on page reload
- Token verification on mount

---

### 3. Product CRUD Operations

#### Admin Controls (For logged-in admins only)
- **Add Product** button in catalog view
- **Edit** and **Delete** buttons on each product card
- Modal form for creating/editing products

#### Product Form Fields:
- Product Name *
- Category *
- Price ($) *
- Stock quantity *
- Image (emoji)
- Description (textarea)

#### API Integration:
- `POST /api/catalog` - Create new product
- `PUT /api/catalog/:productId` - Update existing product
- `DELETE /api/catalog/:productId` - Delete product

#### Features:
- Form validation
- Loading states
- Success/error feedback
- Automatic page refresh after changes
- Only visible to admin users

---

## 🚀 Getting Started

### 1. Start All Services

```bash
cd /home/dharunthegreat/Downloads/kafka
docker-compose up -d
```

The user service will automatically:
- Create database tables
- Initialize on port 8086
- Connect to PostgreSQL

### 2. Create an Admin Account

**Method 1: Register via UI**
1. Open http://localhost:3001
2. Click "Login / Sign Up"
3. Click "Don't have an account? Sign up"
4. Fill in details and register
5. Manually update role in database:

```bash
docker exec -it kafka-postgres-1 psql -U ecommerce -d ecommerce -c "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
```

**Method 2: Direct API Call**
```bash
curl -X POST http://localhost:8086/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

### 3. Login

1. Open UI at http://localhost:3001
2. Click "Login / Sign Up" button
3. Enter credentials
4. Click "Login"

You'll see:
- ✅ Your name and email in sidebar
- ✅ "Add Product" button in catalog
- ✅ Edit/Delete buttons on all products (admin only)

---

## 🧪 Testing

### Test User Registration
```bash
curl -X POST http://localhost:8086/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Expected Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "customer",
    "createdAt": "2025-11-22T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Test Login
```bash
curl -X POST http://localhost:8086/api/auth/login \
  -H "Content-Type": application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Get Profile
```bash
# Use token from login response
TOKEN="your-jwt-token-here"

curl http://localhost:8086/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Test Product Creation (Admin Only)
```bash
TOKEN="admin-jwt-token-here"

curl -X POST http://localhost:8083/api/catalog \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "New Laptop",
    "category": "Electronics",
    "price": 999.99,
    "stock": 50,
    "image": "💻",
    "description": "High-performance laptop"
  }'
```

### Test Product Update
```bash
curl -X PUT http://localhost:8083/api/catalog/PRODUCT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Updated Laptop",
    "price": 899.99
  }'
```

### Test Product Delete
```bash
curl -X DELETE http://localhost:8083/api/catalog/PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔒 Security Features

### Password Security
- Minimum 6 characters required
- Bcrypt hashing with salt rounds = 10
- Passwords never stored in plain text

### JWT Tokens
- 7-day expiration
- HS256 algorithm
- Secret key configurable via environment variable
- Token required for protected routes

### Role-Based Access Control
- **Customer role:** Can browse, add to cart, checkout
- **Admin role:** Full CRUD access to products, user management

### API Protection
- `authenticateToken` middleware for protected routes
- `requireAdmin` middleware for admin-only endpoints
- Token validation on every request
- Invalid/expired tokens return 403 Forbidden

---

## 🎨 UI Features

### Login/Register Modal
- **Design:** Glass morphism with dark theme
- **Animation:** Fade-in and zoom effects
- **Validation:** Real-time field validation
- **UX:** Toggle between login/register modes
- **Feedback:** Toast notifications for success/error

### Sidebar User Section
**Logged In State:**
- User initials avatar (gradient background)
- Full name display
- Email address
- Red logout button with icon

**Logged Out State:**
- Large gradient "Login / Sign Up" button
- Indigo to purple gradient
- Login icon

### Product Management
**Add Product Button:**
- Visible only to admins
- Emerald gradient
- Plus icon
- Top-right of catalog view

**Product Cards (Admin View):**
- Edit button (blue) - Opens modal with product data
- Delete button (red) - Confirmation before deletion
- Both buttons below "Add to Cart"

**Product Modal:**
- Large 2-column form
- All fields pre-filled when editing
- Validation indicators
- Save button changes text (Create/Update)
- Loading state with spinner

---

## 📊 Database Management

### View All Users
```bash
docker exec -it kafka-postgres-1 psql -U ecommerce -d ecommerce -c "SELECT id, email, first_name, last_name, role, created_at FROM users;"
```

### Make User Admin
```bash
docker exec -it kafka-postgres-1 psql -U ecommerce -d ecommerce -c "UPDATE users SET role = 'admin' WHERE email = 'user@example.com';"
```

### Reset User Password
```bash
# Hash new password first (use bcrypt)
# Then update:
docker exec -it kafka-postgres-1 psql -U ecommerce -d ecommerce -c "UPDATE users SET password_hash = 'NEW_HASH_HERE' WHERE email = 'user@example.com';"
```

### Delete User
```bash
docker exec -it kafka-postgres-1 psql -U ecommerce -d ecommerce -c "DELETE FROM users WHERE email = 'user@example.com';"
```

---

## 🐛 Troubleshooting

### Issue: "Database does not exist"
```bash
docker exec -it kafka-postgres-1 psql -U ecommerce -d orders_db -c "CREATE DATABASE ecommerce;"
docker-compose restart user-service
```

### Issue: "Invalid credentials"
- Check email is correct (case-insensitive)
- Verify password is correct
- Check user exists in database

### Issue: "Token expired"
- Login again to get new token
- Token expires after 7 days

### Issue: "Admin access required"
- Verify user role is 'admin' in database
- Re-login after role change

### Issue: Product CRUD not working
- Ensure you're logged in as admin
- Check browser console for errors
- Verify catalog service is running on port 8083

### Issue: UI not showing auth modal
- Check browser console for errors
- Verify user-service is running on 8086
- Check CORS is enabled

---

## 🔧 Configuration

### Environment Variables (docker-compose.yml)

**user-service:**
```yaml
PORT: 8086
DATABASE_HOST: postgres
DATABASE_PORT: 5432
DATABASE_NAME: ecommerce
DATABASE_USER: ecommerce
DATABASE_PASSWORD: ecommerce123
JWT_SECRET: your-super-secret-jwt-key-change-in-production-123456
```

**Change JWT Secret:**
```yaml
JWT_SECRET: your-new-secret-key-here-make-it-long-and-random
```

**Change Token Expiration:**
Edit `services/user-service/src/index.ts`:
```typescript
const JWT_EXPIRES_IN = '30d'; // Change to 30 days, or '24h', '7d', etc.
```

---

## 📈 Features Comparison

| Feature | Customer | Admin |
|---------|----------|-------|
| Browse Products | ✅ | ✅ |
| Search/Filter | ✅ | ✅ |
| Add to Cart | ✅ | ✅ |
| Checkout | ✅ | ✅ |
| View Orders | ✅ | ✅ |
| **Add Products** | ❌ | ✅ |
| **Edit Products** | ❌ | ✅ |
| **Delete Products** | ❌ | ✅ |
| **View All Users** | ❌ | ✅ |
| **Delete Users** | ❌ | ✅ |

---

## 🎯 Next Steps

### Recommended Enhancements:
1. **Email Verification** - Send verification email on registration
2. **Password Reset** - "Forgot password" flow with email link
3. **OAuth Integration** - Google/GitHub login
4. **User Profiles** - Editable profile page
5. **Order History** - Per-user order tracking
6. **Product Images** - Upload real images instead of emojis
7. **Bulk Operations** - Import/export products via CSV
8. **Audit Logs** - Track who created/modified/deleted products
9. **Permissions** - Fine-grained role permissions
10. **2FA** - Two-factor authentication

---

## 📝 API Documentation

### Full API Endpoints

**User Service (8086):**
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- PUT /api/auth/profile
- POST /api/auth/change-password
- GET /api/users (admin)
- DELETE /api/users/:id (admin)
- GET /health

**Catalog Service (8083):**
- POST /api/catalog (admin)
- PUT /api/catalog/:id (admin)
- DELETE /api/catalog/:id (admin)
- GET /api/catalog/:id
- GET /api/catalog
- GET /api/catalog/search/:query
- GET /health

---

## 🎉 Success!

You now have:
- ✅ Complete user authentication system
- ✅ Login/Register UI with JWT tokens
- ✅ Role-based access control
- ✅ Product CRUD operations for admins
- ✅ Secure password hashing
- ✅ Session persistence
- ✅ Beautiful UI with animations

**Create your admin account and start managing products!** 🚀

### Quick Start Commands:
```bash
# 1. Start all services
docker-compose up -d

# 2. Check user service
curl http://localhost:8086/health

# 3. Register admin
curl -X POST http://localhost:8086/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123","firstName":"Admin","lastName":"User"}'

# 4. Make them admin
docker exec -it kafka-postgres-1 psql -U ecommerce -d ecommerce -c "UPDATE users SET role = 'admin' WHERE email = 'admin@test.com';"

# 5. Open UI and login
http://localhost:3001
```

Happy coding! 🎊
