# 🧪 Testing Guide - Frontend Features

## Quick Start Testing

### 1. Access the Application
```bash
# Verify all services are running
docker-compose ps

# Check UI is running
curl http://localhost:3001

# Open in browser
http://localhost:3001
```

---

## 🛒 Shopping Cart Testing

### Test Promo Codes

Try these promo codes at checkout:

| Code | Effect | Expected Result |
|------|--------|-----------------|
| `SAVE10` | 10% discount | Subtotal reduced by 10%, green badge shown |
| `SAVE20` | 20% discount | Subtotal reduced by 20%, green badge shown |
| `FREESHIP` | Free shipping | Shipping cost = $0.00, shows "FREE" |
| `WELCOME25` | 25% discount | Subtotal reduced by 25%, green badge shown |
| `INVALID123` | Invalid code | Red error toast: "Invalid promo code" |

### Test Scenarios

#### Scenario 1: Basic Cart with Promo
1. Add 2-3 products to cart
2. Click cart icon (bottom right)
3. Enter `SAVE10` and click Apply
4. Verify:
   - ✅ Subtotal shows original amount
   - ✅ Discount line appears: "-$X.XX"
   - ✅ Total is reduced by 10%
   - ✅ Green success badge displays

#### Scenario 2: Free Shipping Promo
1. Add items to cart (subtotal: ~$50)
2. Select "Express Shipping" ($15.99)
3. Apply promo code: `FREESHIP`
4. Verify:
   - ✅ Shipping shows "FREE" instead of $15.99
   - ✅ Total reduces by $15.99
   - ✅ All shipping options show FREE

#### Scenario 3: Shipping Calculator
1. Add items to cart
2. Compare shipping options:
   - Standard: $5.99 (5-7 days)
   - Express: $15.99 (2-3 days)
   - Overnight: $29.99 (Next day)
3. Select each option
4. Verify:
   - ✅ Total updates immediately
   - ✅ Radio button changes
   - ✅ Correct amount shown

#### Scenario 4: Complete Order Calculation
**Example Cart:**
- Product A: $25.00 × 2 = $50.00
- Product B: $15.00 × 1 = $15.00

**With SAVE20 + Standard Shipping:**
```
Subtotal:     $65.00
Discount (20%): -$13.00
Shipping:     $5.99
Tax (8%):     $4.16  [(65 - 13) × 0.08]
─────────────────────
Total:        $62.15
```

Verify all line items match!

---

## 📦 Inventory Management Testing

### View Inventory
1. Click "Inventory" in sidebar
2. Verify:
   - ✅ 4 KPI cards show stats
   - ✅ Table displays all products
   - ✅ Stock levels are color-coded
   - ✅ Status badges show correct states

### Filter Stock Levels
1. Click "Low Stock" filter
2. Verify:
   - ✅ Only items with 1-10 units show
   - ✅ Amber badges displayed
3. Click "Out of Stock"
4. Verify:
   - ✅ Only items with 0 units show
   - ✅ Red badges displayed

### Check Audit Log
1. Click "Audit Log" tab
2. Verify:
   - ✅ List of inventory changes
   - ✅ Timestamps shown
   - ✅ Product IDs visible
   - ✅ User attribution

---

## 📊 Analytics Testing

### Sales Chart
1. Navigate to Dashboard
2. Scroll to "Sales Analytics" chart
3. Hover over bars
4. Verify:
   - ✅ Tooltip shows revenue & order count
   - ✅ Blue bars = revenue
   - ✅ Purple bars = orders
   - ✅ Summary stats calculate correctly

---

## 🔔 Notifications Testing

### Bell Dropdown
1. Look at header bell icon
2. Verify:
   - ✅ Red badge shows unread count
3. Click bell icon
4. Verify:
   - ✅ Dropdown opens with 5 latest
   - ✅ Unread have blue dot
   - ✅ "Mark all as read" button works
5. Click "View All Notifications"
6. Verify:
   - ✅ Navigates to full notification page

### Real-time Updates
1. Keep UI open
2. Wait 5 seconds
3. Verify:
   - ✅ New notifications appear (if backend generates them)
   - ✅ Count updates automatically

---

## 📝 Order Management Testing

### View Order Details
1. Click "Live Orders" in sidebar
2. Click any order card
3. Verify modal shows:
   - ✅ Order timeline with 4 stages
   - ✅ Progress bar fills correctly
   - ✅ Items list with images
   - ✅ Order summary (subtotal, shipping, tax, total)
   - ✅ Saga status visualizer

### Admin Controls
1. Open any order details
2. Scroll to "Admin Controls" section
3. Test each button:

**Mark Processing:**
1. Click button
2. Confirm dialog
3. Verify:
   - ✅ Toast notification appears
   - ✅ Status updates in real-time
   - ✅ Timeline progresses

**Mark Completed:**
1. Click button
2. Confirm dialog
3. Verify:
   - ✅ Order status = "Completed"
   - ✅ Timeline shows all green

**Cancel Order:**
1. Click button
2. Confirm dialog
3. Verify:
   - ✅ Modal closes
   - ✅ Order removed from list
   - ✅ Confirmation toast shown

---

## ⚡ Real-time Updates Testing

### Automatic Polling
1. Open browser DevTools (F12)
2. Go to Network tab
3. Keep UI open for 30 seconds
4. Verify requests every:
   - ✅ 5s: `/api/notifications/history`
   - ✅ 10s: `/api/orders`
   - ✅ 30s: `/api/prometheus/...`

### Live Order Updates
1. Open UI in two browser tabs
2. In Tab 1: Create new order
3. Wait 10 seconds
4. In Tab 2: Verify:
   - ✅ New order appears automatically
   - ✅ Order list refreshes

---

## 🎨 UI/UX Testing

### Responsive Design
Test on different screen sizes:
- Desktop (1920×1080) ✅
- Laptop (1366×768) ✅
- Tablet (768×1024) - Check if functional
- Mobile (375×667) - Check if usable

### Animations
1. Navigate between views
2. Verify:
   - ✅ Smooth fade-in transitions
   - ✅ No janky animations
   - ✅ Loading spinners appear

### Dark Theme
1. Check all views
2. Verify:
   - ✅ Text is readable (slate-100/200/300)
   - ✅ Backgrounds have glass effect
   - ✅ Borders are subtle (white/5-10)
   - ✅ Gradients enhance key elements

---

## 🔍 Search & Filter Testing

### Product Search
1. Go to "Product Catalog"
2. Type in search box:
   - "laptop" → Should show laptop products
   - "LAPTOP" → Case insensitive search
   - "xyz123" → No results message
3. Verify:
   - ✅ Instant filtering
   - ✅ No lag
   - ✅ Clear results

### Category Filter
1. Select "Electronics" dropdown
2. Verify:
   - ✅ Only electronic items show
3. Select "Fashion"
4. Verify:
   - ✅ Only fashion items show
5. Clear search and select "All Products"
6. Verify:
   - ✅ All items return

---

## 🚨 Error Handling Testing

### Invalid Promo Code
1. Enter "BADCODE123"
2. Click Apply
3. Verify:
   - ✅ Red toast: "Invalid promo code"
   - ✅ No discount applied
   - ✅ Input field remains

### Failed API Calls
Simulate by stopping backend:
```bash
docker-compose stop order-service
```
1. Try to view orders
2. Verify:
   - ✅ Graceful error (empty state or message)
   - ✅ Console shows error (for debugging)
   - ✅ UI doesn't crash

### Network Issues
1. Open DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Navigate around
4. Verify:
   - ✅ Loading spinners appear
   - ✅ UI remains responsive
   - ✅ No broken states

---

## 📊 Performance Testing

### Page Load Time
1. Hard refresh (Ctrl+Shift+R)
2. Check DevTools Performance tab
3. Target:
   - First Contentful Paint: <1s
   - Time to Interactive: <2s
   - Total page load: <3s

### Memory Leaks
1. Open DevTools → Memory tab
2. Take heap snapshot
3. Navigate between views 10 times
4. Take another snapshot
5. Verify:
   - ✅ Memory doesn't grow excessively
   - ✅ Old components are garbage collected

---

## ✅ Acceptance Criteria

### Feature Checklist

**Cart Enhancements:**
- [ ] Promo codes work correctly (4 valid codes)
- [ ] Invalid codes show error
- [ ] Shipping options update total
- [ ] Free shipping promo overrides cost
- [ ] Tax calculated at 8%
- [ ] All calculations are accurate

**Inventory Management:**
- [ ] Stock levels display correctly
- [ ] Status badges color-coded
- [ ] Filters work (All, In Stock, Low, Out)
- [ ] Audit log shows history
- [ ] Real-time updates (5s interval)

**Order Management:**
- [ ] Timeline shows 4 stages
- [ ] Progress bar indicates completion
- [ ] Admin controls work (Process, Complete, Cancel)
- [ ] Confirmations prevent accidents
- [ ] Real-time status updates

**Analytics:**
- [ ] Chart displays revenue & orders
- [ ] Hover tooltips show values
- [ ] Summary stats calculate correctly
- [ ] Data updates with system

**Notifications:**
- [ ] Bell badge shows unread count
- [ ] Dropdown displays 5 latest
- [ ] Mark as read works
- [ ] Links to full page work
- [ ] Real-time polling (5s)

**Search & Filter:**
- [ ] Product search is instant
- [ ] Case-insensitive
- [ ] Category filter works
- [ ] "No results" state displays

**Real-time Updates:**
- [ ] Orders refresh every 10s
- [ ] Notifications every 5s
- [ ] Inventory every 5s
- [ ] Metrics every 30s
- [ ] No memory leaks

---

## 🐛 Known Issues / Limitations

1. **Mock Data**: Some features use hardcoded data
   - Solution: Backend APIs need to be implemented

2. **No WebSocket**: Using polling instead of true real-time
   - Solution: Implement WebSocket server

3. **No Authentication**: Admin controls accessible to all
   - Solution: Add auth middleware

4. **Mobile Layout**: Not fully optimized for small screens
   - Solution: Add responsive CSS breakpoints

5. **Promo Code Validation**: Client-side only
   - Solution: Validate on backend

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Verify all Docker containers are running:
   ```bash
   docker-compose ps
   ```
3. Check service logs:
   ```bash
   docker-compose logs -f payment-service
   ```
4. Restart UI if needed:
   ```bash
   cd ui && npm run dev
   ```

---

## 🎯 Test Coverage Summary

| Feature | Unit Tests | Integration Tests | Manual Testing |
|---------|------------|-------------------|----------------|
| Cart with Promo | ❌ | ❌ | ✅ Required |
| Inventory View | ❌ | ❌ | ✅ Required |
| Order Management | ❌ | ❌ | ✅ Required |
| Real-time Updates | ❌ | ❌ | ✅ Required |
| Search/Filter | ❌ | ❌ | ✅ Required |
| Analytics Chart | ❌ | ❌ | ✅ Required |
| Notifications | ❌ | ❌ | ✅ Required |

**Note:** Automated tests not yet implemented. Manual testing required for all features.

---

## 🚀 Next Steps

After testing:
1. ✅ Verify all features work as documented
2. ✅ Report any bugs found
3. 🔄 Backend team implements missing APIs
4. 🔄 Add WebSocket for real-time updates
5. 🔄 Implement authentication
6. 🔄 Add automated tests
7. 🔄 Optimize for mobile
8. 🔄 Production deployment

Happy testing! 🎉
