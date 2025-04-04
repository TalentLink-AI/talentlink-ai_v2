# Payment Service

This microservice handles all payment processing and financial operations for the TalentLink platform. It provides a reliable and secure way to manage payments, subscriptions, refunds, and connected accounts.

## Overview

The Payment Service is a critical component of our microservices architecture, handling:

- Customer creation and management
- Payment processing (one-time and recurring)
- Subscription management
- Refund processing
- Connected accounts for platform payments
- Webhook handling for payment events

## Setup Guide

### Prerequisites

- Node.js 18+
- MongoDB
- Stripe account with API keys

### Environment Variables

The service requires the following environment variables to be set:

```
# Server configuration
PORT=3002
NODE_ENV=development
LOG_LEVEL=info
MONGODB_URI=mongodb://mongodb:27017/talentlink

# Stripe API configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_CURRENCY=USD
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Application configuration
API_PREFIX=/api
CORS_ORIGINS=http://localhost:3000
PLATFORM_FEE_PERCENT=15
```

You can create a `.env` file in the root directory with these values.

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
```

### Docker Setup

```bash
# Build the Docker image
docker build -t payment-service .

# Run with Docker
docker run -p 3002:3002 --env-file .env payment-service

# Run with Docker Compose
docker-compose up -d
```

## API Endpoints

### Customer Management

- `POST /api/payment/customers` - Create a new customer
  ```json
  {
    "email": "customer@example.com",
    "name": "Customer Name",
    "address": {
      "line1": "123 Main St",
      "city": "San Francisco",
      "country": "US"
    }
  }
  ```

### Payment Processing

- `POST /api/payment/process/card` - Process a card payment

  ```json
  {
    "card_number": "4242424242424242",
    "exp_month": "12",
    "exp_year": "2025",
    "cvv": "123",
    "email": "customer@example.com",
    "name": "Customer Name",
    "payment_amount": 100.0,
    "description": "Payment for services"
  }
  ```

- `POST /api/payment/intent` - Create a payment intent
  ```json
  {
    "customerId": "cus_123456789",
    "amount": 100.0,
    "setup_future_usage": "off_session"
  }
  ```

### Refunds

- `POST /api/payment/refund` - Process a refund
  ```json
  {
    "chargeId": "ch_123456789",
    "amount": 100.0,
    "reason": "requested_by_customer"
  }
  ```

### Connected Accounts

- `POST /api/payment/connect/accounts` - Create a connected account

  ```json
  {
    "email": "seller@example.com",
    "country": "US"
  }
  ```

- `POST /api/payment/connect/account-links` - Create an account link for onboarding

  ```json
  {
    "account_id": "acct_123456789",
    "refresh_url": "https://yourapp.com/refresh",
    "return_url": "https://yourapp.com/success"
  }
  ```

- `GET /api/payment/connect/accounts/:accountId` - Get a connected account

- `POST /api/payment/connect/login-link/:accountId` - Create a login link

### Payment Methods

- `GET /api/payment/payment-methods?customerId=cus_123456789` - List payment methods

- `POST /api/payment/payment-methods/attach` - Attach a payment method

  ```json
  {
    "paymentMethodId": "pm_123456789",
    "customerId": "cus_123456789"
  }
  ```

- `POST /api/payment/payment-methods/default` - Update default payment method
  ```json
  {
    "customerId": "cus_123456789",
    "paymentMethodId": "pm_123456789"
  }
  ```

### Transfers

- `POST /api/payment/transfers` - Transfer funds to a connected account
  ```json
  {
    "amount": 100.0,
    "connectedId": "acct_123456789"
  }
  ```

### Subscriptions

- `POST /api/payment/subscriptions` - Create a subscription

  ```json
  {
    "customerId": "cus_123456789",
    "priceId": "price_123456789",
    "payment_method_id": "pm_123456789",
    "transferId": "acct_123456789",
    "amount_percent": 85
  }
  ```

- `DELETE /api/payment/subscriptions/:subscriptionId` - Cancel a subscription

### Products and Prices

- `POST /api/payment/products` - Create a product

  ```json
  {
    "name": "Premium Plan"
  }
  ```

- `POST /api/payment/prices` - Create a price
  ```json
  {
    "unit_amount": 100.0,
    "job_name": "Software Development",
    "interval": "month"
  }
  ```

## Troubleshooting

### Common Issues and Solutions

1. **Connection Errors**

   If you're seeing connection errors to Stripe or MongoDB:

   ```
   Error connecting to MongoDB: MongoNetworkError: failed to connect to server
   ```

   Solutions:

   - Check that MongoDB is running and accessible
   - Verify the MONGODB_URI environment variable is correct
   - If using Docker, ensure network connectivity between containers

2. **Stripe API Errors**

   If you see errors like:

   ```
   Stripe API Error: Invalid API Key provided
   ```

   Solutions:

   - Verify your STRIPE_SECRET_KEY is correct
   - Check that the key has the appropriate permissions
   - Ensure you're using the correct key type (test vs live)

3. **Webhook Signature Verification Errors**

   If webhook events are failing with:

   ```
   StripeSignatureVerificationError: No signatures found matching the expected signature
   ```

   Solutions:

   - Verify the STRIPE_WEBHOOK_SECRET is correct
   - Ensure the raw request body is being passed to the webhook handler
   - Check the webhook endpoint configuration in the Stripe dashboard

4. **API Request Issues**

   If API calls are failing but direct Stripe access works:

   - Check the request format against the documentation
   - Examine server logs for middleware or validation errors
   - Verify routes are properly defined and controllers are functioning

### Diagnostic Tools

We've included two diagnostic scripts to help troubleshoot issues:

1. **payment-service-troubleshooter.js** - Checks environment variables, connections, and configuration

   ```bash
   node payment-service-troubleshooter.js
   ```

2. **payment-api-test.js** - Tests API endpoints directly
   ```bash
   node payment-api-test.js
   ```

## Architecture

The Payment Service follows a clean architecture pattern:

- **Controllers** (`src/controllers`) - Handle HTTP requests and responses
- **Services** (`src/services`) - Contain business logic and external API interactions
- **Repositories** (`src/repositories`) - Manage data access and persistence
- **Models** (`src/models`) - Define data structures and schemas
- **Routes** (`src/routes`) - Define API endpoints and route handlers
- **Middleware** (`src/middlewares`) - Handle cross-cutting concerns like validation
- **Utils** (`src/utils`) - Provide utility functions and helpers
- **Config** (`src/config`) - Store application configuration

## Security Considerations

This service handles sensitive payment information and must maintain high security standards:

- No payment card data is stored in our database
- All communication with Stripe is done over HTTPS
- API rate limiting prevents abuse
- JWT authentication protects all endpoints
- Request validation ensures data integrity
- Webhook signatures prevent request forgery

## Development Guidelines

When making changes to this service:

1. Always test payment flows end-to-end
2. Add comprehensive error handling
3. Maintain detailed logs without exposing sensitive data
4. Follow Stripe best practices for payment processing
5. Add appropriate validation for all input data
6. Update tests for any new or modified functionality

## Monitoring and Logging

The service uses Winston for logging:

- Production logs are stored in `/logs`
- Error logging is separate from general application logs
- Each log includes timestamp, service name, and request context
- Sensitive data is never logged

## Contact

For issues or questions about this service, contact:

- **Technical Lead**: tech-lead@example.com
- **DevOps**: devops@example.com
