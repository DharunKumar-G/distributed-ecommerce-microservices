# 🎯 Quick Guide: How to See the "Add Product" Button

## The "Add Product" button is ONLY visible to admin users!

### Step-by-Step Instructions:

#### 1. Open the Application
```
http://localhost:3001
```

#### 2. Login with Admin Account
- Look at the **sidebar** (left side)
- You'll see a **"Login / Sign Up"** button at the bottom
- Click it

#### 3. Enter Admin Credentials
```
Email: admin@test.com
Password: admin123
```
- Click "Login"

#### 4. Go to Product Catalog
- Click **"Product Catalog"** in the sidebar
- You should now see:
  - ✅ Green text: "Admin access - You can manage products"
  - ✅ Green **"Add Product"** button (top right)
  - ✅ Blue **"Edit"** buttons on each product card
  - ✅ Red **"Delete"** buttons on each product card

---

## 🔍 What You'll See Based on Login Status:

### Not Logged In:
```
Product Catalog
🔓 Login as admin to manage products
```
- NO "Add Product" button
- NO Edit/Delete buttons on products

### Logged In as Customer:
```
Product Catalog
Logged in as: customer@example.com (customer)
```
- NO "Add Product" button
- NO Edit/Delete buttons on products

### Logged In as Admin:
```
Product Catalog
🛡️ Admin access - You can manage products
```
- ✅ **"Add Product" button** appears (green, top right)
- ✅ **Edit/Delete buttons** on all products

---

## 📸 Visual Guide:

### Where to Find Things:

```
┌─────────────────────────────────────────────────────┐
│  Sidebar                     Main Area              │
│  ┌──────────┐               ┌──────────────────┐   │
│  │          │               │ Product Catalog  │   │
│  │ Dashboard│               │ 🛡️ Admin access  │   │
│  │ Orders   │               │                  │   │
│  │ Catalog  │◄──Click this  │    [Add Product]│◄─ This!
│  │ Inventory│               │                  │   │
│  │          │               │  ┌────────────┐  │   │
│  │          │               │  │  Product   │  │   │
│  │          │               │  │  [Edit]    │◄─ Also!
│  │          │               │  │  [Delete]  │◄─ And this!
│  │          │               │  └────────────┘  │   │
│  ├──────────┤               └──────────────────┘   │
│  │[Login/   │◄──Click here                        │
│  │ Sign Up] │   first!                            │
│  └──────────┘                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🚫 Troubleshooting: "I still don't see the button!"

### Check 1: Are you logged in?
Look at the sidebar (bottom). Do you see:
- ❌ "Login / Sign Up" button → You're NOT logged in
- ✅ Your name and email → You ARE logged in

### Check 2: Are you an admin?
In the Product Catalog, do you see:
- ❌ "Login as admin to manage products" → Not logged in
- ❌ "Logged in as: ... (customer)" → You're a customer, not admin
- ✅ "Admin access - You can manage products" → You're an admin!

### Check 3: Is the account actually admin?
Verify in database:
```bash
docker exec -it kafka-postgres-1 psql -U ecommerce -d ecommerce -c "SELECT email, role FROM users WHERE email = 'admin@test.com';"
```

Expected output:
```
     email      | role  
----------------+-------
 admin@test.com | admin
```

If it says "customer", fix it:
```bash
docker exec -it kafka-postgres-1 psql -U ecommerce -d ecommerce -c "UPDATE users SET role = 'admin' WHERE email = 'admin@test.com';"
```

Then **logout and login again** in the UI!

### Check 4: Did you refresh after updating role?
- Click the **"Logout"** button in sidebar
- Login again with admin@test.com / admin123
- Go to Product Catalog
- Button should now appear!

---

## 🎬 Complete Flow:

```
1. Open http://localhost:3001
   ↓
2. Click "Login / Sign Up" (sidebar, bottom)
   ↓
3. Enter: admin@test.com / admin123
   ↓
4. Click "Login"
   ↓
5. See: "Admin User" with email in sidebar
   ↓
6. Click "Product Catalog" (sidebar)
   ↓
7. See: Green "Add Product" button (top right)
   ↓
8. Click "Add Product"
   ↓
9. Fill form and create product!
```

---

## 🔑 Test Accounts:

### Admin Account (Full Access):
```
Email: admin@test.com
Password: admin123
Role: admin
```

### Create a Customer Account:
1. Click "Login / Sign Up"
2. Click "Don't have an account? Sign up"
3. Fill in your details
4. You'll be logged in as a customer (no CRUD buttons)

---

## 💡 Quick Test:

Run this in your browser console (F12):
```javascript
// Check current user
localStorage.getItem('auth_token')

// If you see a long string, you're logged in
// If null, you need to login
```

---

## ✅ Summary:

**The "Add Product" button IS working!**

You just need to:
1. **Login** with admin@test.com / admin123
2. **Navigate** to Product Catalog
3. **See** the green "Add Product" button appear

The button is hidden from non-admin users by design for security! 🔒
