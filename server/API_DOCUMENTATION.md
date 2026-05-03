# ReMarket API Documentation

Welcome to the ReMarket Backend API documentation. This document outlines the available endpoints, their required parameters, and authentication methods.

---

## 🔐 Authentication
Most endpoints (except registration and login) require a **JWT Access Token**.
- **Header**: `Authorization: Bearer <your_access_token>`
- **Refresh Strategy**: The API uses HttpOnly cookies for refresh tokens to maintain secure sessions.

---

## 👤 Auth Endpoints (`/auth`)

### Register User
`POST /auth/register`  
Registers a new student account in the marketplace.

**Body (JSON):**
```json
{
  "name": "John Doe",
  "email": "john@university.edu",
  "password": "SecurePassword123",
  "phone": "+91 9876543210"
}
```

### Login
`POST /auth/login`  
Authenticates the user and returns an access token. Sets an HttpOnly refresh cookie.

**Body (JSON):**
```json
{
  "email": "john@university.edu",
  "password": "SecurePassword123"
}
```

### Refresh Token
`POST /auth/refresh`  
Rotates the access token using the refresh cookie.

---

## 💬 Chat Endpoints (`/chat`)
*All endpoints below require authentication.*

### Send Message
`POST /chat`  
Sends a message to a seller or buyer regarding a specific product.

**Body (JSON):**
```json
{
  "productId": "uuid-of-product",
  "receiverId": "uuid-of-receiver",
  "messageText": "Is this item still available?"
}
```

### Get Inbox (Conversations)
`GET /chat/conversations`  
Returns a list of all unique conversations, including the latest message and unread count for each.

### Get Message Thread
`GET /chat/thread/:productId/:otherUserId`  
Retrieves the full message history between you and another user for a specific product.

### Mark as Read
`PATCH /chat/read/:productId/:otherUserId`  
Marks all unread messages received from the other user in that specific product thread as read.

---

## 📊 Analytics & Utility

### Connection Test
`GET /test`  
A health-check endpoint that returns the count of products in each category.

---

## 🛠 Database Logic
The backend uses **PL/pgSQL** for complex operations:
- **Sunday Restriction**: Offers can only be placed on Sundays.
- **Auto-Sold**: Products are marked 'Sold' automatically upon transaction.
- **Trust Score**: Recalculated dynamically after reviews.
