# Bank Wallet System

A secure and robust wallet system with bank integration capabilities.

## Features

- User Authentication with JWT
- Wallet Management
- Bank Account Integration
- Transaction History
- Profile Management
- 2FA Support

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- npm

## Setup Instructions

1. Clone the repository
```bash
git clone <repository-url>
cd bank-wallet
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory with the following variables:
```env
DATABASE_URL=""
JWT_SECRET="your_secure_jwt_secret"
PORT=5000
```

4. Set up the database
```bash
npx prisma migrate dev
```

5. Start the server
```bash
npm run dev
```

## API Documentation

### Authentication Routes

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "John Doe",
    "phone": "1234567890"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "securePassword123"
}
```

### Wallet Routes

#### Get Wallet Balance
```http
GET /wallet/balance
Authorization: Bearer <jwt_token>
```

#### Make Transaction
```http
POST /wallet/transaction
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
    "amount": 1000,
    "type": "deposit",
    "description": "Initial deposit"
}
```

#### Get Transaction History
```http
GET /wallet/transactions
Authorization: Bearer <jwt_token>
Query Parameters:
- page (default: 1)
- limit (default: 10)
- type (optional: "deposit" | "withdraw")
- startDate (optional: YYYY-MM-DD)
- endDate (optional: YYYY-MM-DD)
```

### Profile Routes

#### Get Profile
```http
GET /profile/me
Authorization: Bearer <jwt_token>
```

#### Update Profile
```http
PUT /profile/updateMe
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
    "firstName": "John",
    "lastName": "Doe",
    "address": "123 Main St",
    "dateOfBirth": "1990-01-01"
}
```

## Wallet Limits

- Minimum transaction amount: ₹100
- Maximum transaction amount: ₹50,000
- Daily transaction limit: ₹1,00,000
- Monthly transaction limit: ₹10,00,000
- Maximum wallet balance: ₹5,00,000

## Error Codes

- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Security Features

- JWT Authentication
- Password Hashing
- Rate Limiting
- Input Validation


## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

