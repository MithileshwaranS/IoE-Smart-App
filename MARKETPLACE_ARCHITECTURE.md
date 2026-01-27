# Marketplace Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Marketplace.jsx                                                 │
│  ├─ Browse Listings (all users)                                 │
│  ├─ My Listings (farmers only)                                  │
│  ├─ Create Listing (farmers)                                    │
│  └─ Purchase Items (buyers)                                     │
│                                                                   │
│  MarketplaceCard.jsx                                            │
│  ├─ Display listing details                                     │
│  ├─ Show quantity & status                                      │
│  └─ Handle purchase action                                      │
│                                                                   │
│  AuthContext.jsx                                                │
│  ├─ User state (id, name, email, role, token)                  │
│  ├─ getToken() for API requests                                │
│  └─ User role-based permissions                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    HTTP/REST API
                   (JWT Token Auth)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Marketplace Routes                                             │
│  ├─ GET    /api/marketplace/listings                            │
│  ├─ GET    /api/marketplace/my-listings                         │
│  ├─ POST   /api/marketplace/listings                            │
│  ├─ PUT    /api/marketplace/listings/:id                        │
│  ├─ DELETE /api/marketplace/listings/:id                        │
│  ├─ POST   /api/marketplace/purchase                            │
│  └─ GET    /api/marketplace/transactions                        │
│                                                                   │
│  Auth Middleware                                                │
│  └─ JWT verification & user extraction                          │
│                                                                   │
│  Validation & Business Logic                                    │
│  ├─ Ownership verification                                      │
│  ├─ Quantity validation                                         │
│  └─ Transaction processing                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Supabase SDK
                  (PostgreSQL Driver)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                  DATABASE (Supabase/PostgreSQL)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  marketplace_listings (Table)                                   │
│  ├─ id (UUID, PK)                                              │
│  ├─ farmer_id (UUID, FK → users)                               │
│  ├─ farmer_name (TEXT)                                          │
│  ├─ crop_name (TEXT)                                            │
│  ├─ price_per_unit (DECIMAL)                                    │
│  ├─ quantity (INTEGER)                                          │
│  ├─ unit (TEXT)                                                 │
│  ├─ description (TEXT)                                          │
│  ├─ status (TEXT: available|sold_out)                           │
│  ├─ created_at (TIMESTAMP)                                      │
│  └─ updated_at (TIMESTAMP)                                      │
│                                                                   │
│  marketplace_transactions (Table)                               │
│  ├─ id (UUID, PK)                                              │
│  ├─ listing_id (UUID, FK)                                      │
│  ├─ buyer_id (UUID, FK → users)                                │
│  ├─ buyer_name (TEXT)                                          │
│  ├─ buyer_email (TEXT)                                          │
│  ├─ crop_name (TEXT)                                            │
│  ├─ farmer_name (TEXT)                                          │
│  ├─ farmer_id (UUID)                                            │
│  ├─ quantity (INTEGER)                                          │
│  ├─ unit (TEXT)                                                 │
│  ├─ price_per_unit (DECIMAL)                                    │
│  ├─ total_price (DECIMAL)                                       │
│  ├─ status (TEXT: pending|completed|cancelled)                  │
│  ├─ created_at (TIMESTAMP)                                      │
│  └─ updated_at (TIMESTAMP)                                      │
│                                                                   │
│  Row Level Security (RLS)                                       │
│  ├─ Farmers: Read own listings, Create/Update/Delete own        │
│  ├─ Buyers: Create transactions, Read own transactions          │
│  └─ Public: Read available listings                             │
│                                                                   │
│  Indexes                                                         │
│  ├─ idx_listings_farmer_id                                      │
│  ├─ idx_listings_status                                         │
│  ├─ idx_listings_created_at                                     │
│  ├─ idx_transactions_buyer_id                                   │
│  └─ idx_transactions_created_at                                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Create Listing Flow

```
User (Farmer)
    │
    ├─ Fill form (crop_name, price, quantity, unit, description)
    │
    ├─ Submit form
    │
    ▼
Frontend (Marketplace.jsx)
    │
    ├─ Validate inputs (client-side)
    │
    ├─ POST /api/marketplace/listings + JWT
    │
    ▼
Backend (server.js)
    │
    ├─ authMiddleware: Verify JWT, extract farmer_id
    │
    ├─ Fetch farmer name from users table
    │
    ├─ Validate inputs (server-side)
    │
    ├─ INSERT into marketplace_listings
    │
    ├─ Response with created listing
    │
    ▼
Frontend (Marketplace.jsx)
    │
    ├─ Add to myListings state
    │
    ├─ Add to listings state
    │
    ├─ Reset form, close dialog
    │
    ├─ Show success toast
    │
    ▼
User sees new listing in "My Listings"
```

### 2. Purchase Flow

```
User (Buyer)
    │
    ├─ Select quantity (using +/- controls)
    │
    ├─ Click "Order [qty] [unit]"
    │
    ▼
Frontend (MarketplaceCard.jsx)
    │
    ├─ Validate quantity > 0
    │
    ├─ Validate quantity <= available
    │
    ├─ Call onPurchase callback (Marketplace.jsx)
    │
    ▼
Frontend (Marketplace.jsx)
    │
    ├─ POST /api/marketplace/purchase + JWT
    │    - listingId
    │    - quantity
    │
    ▼
Backend (server.js)
    │
    ├─ authMiddleware: Extract buyer_id from JWT
    │
    ├─ Fetch listing details
    │
    ├─ Validate quantity available
    │
    ├─ Fetch buyer name/email
    │
    ├─ START TRANSACTION
    │
    ├─ INSERT into marketplace_transactions
    │
    ├─ UPDATE marketplace_listings
    │    - quantity -= purchased_quantity
    │    - status = 'sold_out' if quantity == 0
    │
    ├─ COMMIT TRANSACTION
    │
    ├─ Return transaction + updated listing
    │
    ▼
Frontend (Marketplace.jsx)
    │
    ├─ Update listing in state
    │
    ├─ Remove if status === 'sold_out'
    │
    ├─ Show success toast
    │
    ├─ Reset quantity selector
    │
    ▼
User sees:
  ├─ Confirmation message
  ├─ Listing quantity decreased
  └─ Item removed if sold out
```

### 3. Edit Listing Flow

```
Farmer
    │
    ├─ Click "Edit" on listing
    │
    ├─ Form populates with current values
    │
    ├─ Modify values
    │
    ├─ Click "Update Listing"
    │
    ▼
Frontend
    │
    ├─ Validate inputs
    │
    ├─ PUT /api/marketplace/listings/{id} + JWT
    │
    ▼
Backend
    │
    ├─ authMiddleware: Verify farmer_id
    │
    ├─ Fetch listing by ID
    │
    ├─ Verify farmer_id == req.user.id (ownership check)
    │
    ├─ UPDATE marketplace_listings
    │
    ├─ Return updated listing
    │
    ▼
Frontend
    │
    ├─ Update in myListings state
    │
    ├─ Update in listings state
    │
    ├─ Show success toast
    │
    ▼
Farmer sees updated listing immediately
```

---

## Request/Response Examples

### Successful Purchase

```
REQUEST:
POST /api/marketplace/purchase
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "listingId": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 10
}

RESPONSE: 201 Created
{
  "message": "Purchase successful",
  "transaction": {
    "id": "8f8f8f8f-8f8f-8f8f-8f8f-8f8f8f8f8f8f",
    "listing_id": "550e8400-e29b-41d4-a716-446655440000",
    "buyer_id": "123e4567-e89b-12d3-a456-426614174000",
    "buyer_name": "Jane Buyer",
    "buyer_email": "jane@example.com",
    "crop_name": "Rice",
    "farmer_name": "John Farmer",
    "farmer_id": "abcd1234-abcd-abcd-abcd-abcd12345678",
    "quantity": 10,
    "unit": "kg",
    "price_per_unit": 50.00,
    "total_price": 500.00,
    "status": "completed",
    "created_at": "2024-01-20T11:30:45Z"
  },
  "listing": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 90,
    "status": "available",
    "updated_at": "2024-01-20T11:30:45Z"
  }
}
```

### Error: Insufficient Quantity

```
REQUEST:
POST /api/marketplace/purchase
Authorization: Bearer eyJhbGc...

{
  "listingId": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 100
}

RESPONSE: 400 Bad Request
{
  "error": "Not enough quantity available. Only 50 kg available."
}
```

### Error: Unauthorized

```
REQUEST:
PUT /api/marketplace/listings/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGc... (Different farmer)

RESPONSE: 403 Forbidden
{
  "error": "Unauthorized"
}
```

---

## State Management

### Frontend (Marketplace.jsx)

```javascript
State:
├─ listings: Array<Listing>           // All available listings
├─ myListings: Array<Listing>         // Farmer's own listings
├─ loading: boolean                   // Loading state
├─ showCreateForm: boolean            // Form visibility
├─ editingId: string | null           // Editing listing ID
└─ formData: {
   ├─ cropName: string
   ├─ pricePerUnit: string
   ├─ quantity: string
   ├─ unit: string
   └─ description: string
}

Key Operations:
├─ fetchListings() → GET all listings
├─ fetchMyListings() → GET farmer's listings
├─ handleCreateListing() → POST new listing
├─ handleEditListing() → PUT update listing
├─ handleDeleteListing() → DELETE listing
└─ Purchase handler → POST purchase
```

### Auth Context

```javascript
Context State:
├─ user: {
│  ├─ id: string (UUID)
│  ├─ name: string
│  ├─ email: string
│  ├─ role: 'farmer' | 'buyer'
│  └─ token: string (JWT)
├─ isLoading: boolean
└─ Helper functions:
   ├─ login(userData)
   ├─ logout()
   ├─ getToken()
   ├─ getUserId()
   └─ isAuthenticated()
```

---

## Authentication & Authorization

### JWT Token

- Issued on login
- Contains `id` and `role`
- Expires after 1 day
- Used in `Authorization: Bearer` header

### Role-Based Access

```
Farmer:
  ├─ Can create listings
  ├─ Can edit own listings
  ├─ Can delete own listings
  ├─ Can view own listings
  ├─ Can view all available listings
  └─ Cannot purchase (optional business rule)

Buyer:
  ├─ Can view all available listings
  ├─ Can purchase
  ├─ Can view own transactions
  └─ Cannot create/edit listings
```

### Database RLS (Row Level Security)

- Enforced at Supabase level
- Additional security layer
- Prevents unauthorized access even if backend is compromised

---

## Transaction Safety

### ACID Properties

- **Atomicity**: Purchase and listing update happen together
- **Consistency**: Quantity never becomes negative
- **Isolation**: Concurrent purchases don't oversell
- **Durability**: Once committed, data is persistent

### Implementation

- Database transactions group INSERT + UPDATE
- Quantity constraints at database level
- Stock validation before transaction

---

## Performance Characteristics

### Query Performance

- `GET /listings`: O(n) - returns all available
- `GET /my-listings`: O(m) - filters by farmer_id
- `POST /purchase`: O(1) - single lookup + update
- Indexes optimize common queries

### Data Transfer

- Single API call to load marketplace
- Only affected listing updated on purchase
- Minimal payload sizes

### Caching

- Frontend caches in component state
- Refetch on create/update/delete
- No unnecessary database queries

---

## Scalability Considerations

### Current Limitations

- In-memory state (no Redux/Vuex)
- Single API endpoint for all users
- No pagination on listings

### Future Improvements

- Add pagination for large datasets
- Implement search/filtering
- Add caching layer (Redis)
- WebSocket for real-time updates
- Implement rating/review system

---

## Security Measures

1. **Authentication**: JWT tokens required for write operations
2. **Authorization**: RLS + backend ownership verification
3. **Validation**: Client-side + server-side validation
4. **Constraints**: Database-level constraints prevent invalid states
5. **Encryption**: Supabase handles data encryption at rest
6. **HTTPS**: All API calls should use HTTPS in production

---

## File Structure

```
Frontend/
  ├─ src/
  │  ├─ pages/
  │  │  └─ Marketplace.jsx (Main component)
  │  ├─ components/
  │  │  └─ MarketplaceCard.jsx (Card component)
  │  └─ context/
  │     └─ AuthContext.jsx (Auth state)

Backend/
  └─ server.js (API endpoints)

Database/
  ├─ database_setup.sql (Schema)
  └─ Supabase/PostgreSQL
```

This architecture ensures a scalable, secure, and maintainable marketplace system.
