# Marketplace Database Integration - Deployment Checklist

## Pre-Deployment

### Code Changes ✓

- [x] Updated `Marketplace.jsx` with database API integration
- [x] Updated `MarketplaceCard.jsx` to handle database field names
- [x] Added marketplace API endpoints in `server.js`
- [x] Updated `AuthContext.jsx` with helper functions
- [x] Created database schema SQL file

### Files Created ✓

- [x] `database_setup.sql` - Database schema
- [x] `MARKETPLACE_DATABASE_SETUP.md` - Setup guide
- [x] `MARKETPLACE_CHANGES_SUMMARY.md` - Summary of changes
- [x] `MARKETPLACE_IMPLEMENTATION_GUIDE.md` - Implementation guide
- [x] `MARKETPLACE_ARCHITECTURE.md` - Architecture documentation
- [x] `DEPLOYMENT_CHECKLIST.md` - This file

---

## Deployment Steps

### Step 1: Database Setup

- [ ] Access Supabase dashboard
- [ ] Open SQL Editor
- [ ] Create new query
- [ ] Copy entire content from `database_setup.sql`
- [ ] Paste into SQL Editor
- [ ] Execute the script
- [ ] Verify no errors in execution
- [ ] Check that tables were created:
  - [ ] `marketplace_listings` table exists
  - [ ] `marketplace_transactions` table exists
  - [ ] All indexes created
  - [ ] RLS policies enabled

**Expected Output:**

```
CREATE TABLE (if not exists)
CREATE INDEX
CREATE POLICY
ALTER TABLE ... ENABLE ROW LEVEL SECURITY
```

### Step 2: Backend Verification

- [ ] Verify `server.js` has all 7 marketplace endpoints:
  - [ ] `GET /api/marketplace/listings`
  - [ ] `GET /api/marketplace/my-listings`
  - [ ] `POST /api/marketplace/listings`
  - [ ] `PUT /api/marketplace/listings/:listingId`
  - [ ] `DELETE /api/marketplace/listings/:listingId`
  - [ ] `POST /api/marketplace/purchase`
  - [ ] `GET /api/marketplace/transactions`
- [ ] Check authMiddleware is applied correctly
- [ ] Verify JWT token handling
- [ ] Ensure error handling is in place

### Step 3: Backend Startup

- [ ] Navigate to backend directory: `cd backend`
- [ ] Install dependencies if needed: `npm install`
- [ ] Start backend server: `npm start`
- [ ] Verify server runs without errors:
  - [ ] Should see: "Server running on port 3001"
  - [ ] Should see: "Health check: http://0.0.0.0:3001/api/health"
- [ ] Test health check: `curl http://localhost:3001/api/health`

### Step 4: Environment Variables

- [ ] Verify `.env` file has:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `JWT_SECRET`
  - [ ] Other required variables
- [ ] No secrets committed to git

### Step 5: Frontend Verification

- [ ] Check `Marketplace.jsx` imports `getToken` from AuthContext
- [ ] Verify API_URL is set to `http://localhost:3001`
- [ ] Check field mappings in `MarketplaceCard.jsx`:
  - [ ] `crop_name` instead of `cropName`
  - [ ] `price_per_unit` instead of `pricePerUnit`
  - [ ] `farmer_name` instead of `farmerName`
  - [ ] `created_at` instead of `createdAt`

### Step 6: Browser Cleanup

- [ ] Clear localStorage:
  - [ ] `ioe_user`
  - [ ] `ioe_token`
  - [ ] Any old marketplace data
- [ ] Clear browser cache
- [ ] Hard refresh page (Ctrl+Shift+R or Cmd+Shift+R)

### Step 7: Test Farmer Workflow

- [ ] Open application in browser
- [ ] Log in as farmer user
- [ ] Test: Create a new listing
  - [ ] Fill all required fields
  - [ ] Submit form
  - [ ] Should see success toast
  - [ ] Listing appears in "My Listings"
  - [ ] Can see in database via Supabase console
- [ ] Test: View listing details
  - [ ] Crop name displays correctly
  - [ ] Price shows correctly
  - [ ] Quantity displays
  - [ ] Status shows "available"
- [ ] Test: Edit listing
  - [ ] Click "Edit" button
  - [ ] Modify values
  - [ ] Click "Update Listing"
  - [ ] Changes reflect immediately
  - [ ] Check database for updates
- [ ] Test: Delete listing
  - [ ] Click "Delete" button
  - [ ] Confirm deletion
  - [ ] Listing disappears from "My Listings"
  - [ ] Check database - record should be gone

### Step 8: Test Buyer Workflow

- [ ] Open new incognito window
- [ ] Log in as buyer user
- [ ] Test: View available listings
  - [ ] See all listings except own
  - [ ] All crop details display correctly
  - [ ] Quantity selector visible
  - [ ] "Order" button functional
- [ ] Test: Purchase item
  - [ ] Adjust quantity with +/- buttons
  - [ ] Verify max quantity constraint works
  - [ ] Click "Order" button
  - [ ] Should see success message
  - [ ] Quantity decreased in listing
- [ ] Test: Sold out behavior
  - [ ] Purchase all remaining quantity
  - [ ] Listing should disappear from marketplace
  - [ ] Check database - status should be 'sold_out'

### Step 9: Test Quantity Management

- [ ] Farmer creates listing with quantity 50
- [ ] Buyer purchases 20
  - [ ] Listing should show 30 remaining
  - [ ] Both users see updated quantity
- [ ] Buyer purchases 30 more
  - [ ] Listing should show 0 remaining
  - [ ] Status should be 'sold_out'
  - [ ] Listing removed from marketplace
  - [ ] Farmer sees "sold out" in their listings
- [ ] Farmer edits listing to add 25 more
  - [ ] Quantity should be 25
  - [ ] Status should be 'available' again
  - [ ] Appears in marketplace

### Step 10: Test Error Cases

- [ ] Try to purchase 0 quantity → Error toast
- [ ] Try to purchase more than available → Error toast
- [ ] Try to purchase without login → "Please login" message
- [ ] Farmer tries to edit buyer's listing → Should not appear in their list
- [ ] Try API directly without token → 401 Unauthorized
- [ ] Try to delete someone else's listing via API → 403 Forbidden

### Step 11: Database Validation

- [ ] Open Supabase console
- [ ] Check `marketplace_listings`:
  - [ ] All created listings are there
  - [ ] Quantity updates reflect purchases
  - [ ] Status changes are recorded
- [ ] Check `marketplace_transactions`:
  - [ ] Each purchase creates a record
  - [ ] Correct buyer and farmer info
  - [ ] Quantity and price recorded
- [ ] Verify indexes were created:
  - [ ] Performance queries complete quickly
  - [ ] No query timeout errors

### Step 12: Logging & Monitoring

- [ ] Check backend console for errors
- [ ] Verify all API calls succeed
- [ ] No 500 errors in responses
- [ ] Transaction processing logs are clean

---

## Post-Deployment Validation

### Functionality Tests

- [ ] All marketplace features work as expected
- [ ] No console errors in browser dev tools
- [ ] No network errors in Network tab
- [ ] API responses have correct status codes
- [ ] Data persists after page refresh
- [ ] Data persists after logout/login

### Performance Tests

- [ ] Listings load quickly (< 1 second)
- [ ] Purchase completes immediately
- [ ] Edit/delete operations are responsive
- [ ] No lag when updating quantities

### Security Tests

- [ ] Farmers can't edit other farmers' listings
- [ ] Buyers can't create listings
- [ ] Can't access API without token
- [ ] JWT expiration works correctly

### Data Integrity Tests

- [ ] Quantity never goes negative
- [ ] Price is always positive
- [ ] No duplicate transactions
- [ ] Referential integrity maintained

---

## Rollback Plan

If issues occur, follow these steps:

### Rollback Step 1: Switch to Backup

- [ ] Revert `Marketplace.jsx` to use localStorage
- [ ] Revert API calls to local state operations
- [ ] Users can still access marketplace (with old data)

### Rollback Step 2: Database

- [ ] Drop marketplace tables:
  ```sql
  DROP TABLE marketplace_transactions;
  DROP TABLE marketplace_listings;
  ```
- [ ] Recreate if needed from backup

### Rollback Step 3: Backend

- [ ] Remove marketplace endpoints from `server.js`
- [ ] Restart backend

### Rollback Step 4: Frontend

- [ ] Restore old Marketplace.jsx
- [ ] Clear browser cache
- [ ] Hard refresh

---

## Success Criteria

✓ All checkboxes completed = Deployment successful

Key indicators of success:

1. Farmers can create, edit, delete listings
2. Listings persist in database
3. Buyers can view and purchase items
4. Quantities update correctly after purchase
5. All error cases handled gracefully
6. No console errors
7. Data integrity maintained
8. Performance is acceptable

---

## Monitoring After Deployment

### Daily Checks

- [ ] Check API error logs
- [ ] Verify database connectivity
- [ ] Monitor API response times
- [ ] Check for any user-reported issues

### Weekly Checks

- [ ] Review transaction volume
- [ ] Check database storage usage
- [ ] Analyze popular crops
- [ ] Monitor farmer activity

### Monthly Checks

- [ ] Performance optimization review
- [ ] Database backup verification
- [ ] Security audit
- [ ] User feedback analysis

---

## Support Resources

### Documentation Files

- `MARKETPLACE_DATABASE_SETUP.md` - Setup instructions
- `MARKETPLACE_IMPLEMENTATION_GUIDE.md` - Feature details
- `MARKETPLACE_ARCHITECTURE.md` - System design
- `MARKETPLACE_CHANGES_SUMMARY.md` - Code changes

### API Testing

```bash
# Test health
curl http://localhost:3001/api/health

# Get listings
curl http://localhost:3001/api/marketplace/listings

# Get farmer's listings (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/marketplace/my-listings
```

### Common Issues & Solutions

See `MARKETPLACE_IMPLEMENTATION_GUIDE.md` Troubleshooting section

---

## Sign-Off

- [ ] Deployment lead: ******\_\_\_****** Date: **\_\_\_**
- [ ] QA verification: ******\_\_\_****** Date: **\_\_\_**
- [ ] Product owner: ******\_\_\_****** Date: **\_\_\_**

---

## Notes Section

```
Use this space to record any issues encountered or special notes:

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

**Deployment Status:** [ ] NOT STARTED [ ] IN PROGRESS [ ] COMPLETED [ ] ROLLED BACK

**Completion Date:** ******\_\_\_******

**Deployed By:** ******\_\_\_******

**Verified By:** ******\_\_\_******
