# Payment Service

This microservice handles all payment-related functionality for the TalentLink platform, including payment processing, subscriptions, and connected accounts.

## Features

- Processing card payments
- Creating payment intents for client-side payment flows
- Managing Stripe customers and payment methods
- Handling subscription creation and management
- Supporting connected accounts for platform payments
- Processing transfers between platform and connected accounts
- Managing products and prices
- Supporting refunds

## Tech Stack

- Node.js
- Express.js
- Stripe API

## Prerequisites

- Node.js 18+
- Stripe account with API keys

## Environment Variables

Copy the `.env.example` file to `.env` and fill in the required variables:

```bash
cp .env.example .env
```

Required environment variables:

- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Secret for verifying Stripe webhook events

## Installation

```bash
# Install dependencies
npm install
```

## Running the Service

### Development Mode

```bash
# Run with nodemon for development
npm run dev
```

### Production Mode

```bash
# Run in production mode
npm start
```

## API Endpoints

### Customers

- `POST /api/payment/customers` - Create a new customer

### Card Payments

- `POST /api/payment/process/card` - Process a card payment

### Payment Intents

- `POST /api/payment/intent` - Create a payment intent

### Refunds

- `POST /api/payment/refund` - Process a refund

### Connected Accounts

- `POST /api/payment/connect/accounts` - Create a connected account
- `POST /api/payment/connect/account-links` - Create an account link for onboarding
- `GET /api/payment/connect/accounts/:accountId` - Get a connected account
- `POST /api/payment/connect/login-link/:accountId` - Create a login link

### Payment Methods

- `GET /api/payment/payment-methods` - List payment methods
- `POST /api/payment/payment-methods/attach` - Attach a payment method
- `POST /api/payment/payment-methods/default` - Update default payment method

### Transfers

- `POST /api/payment/transfers` - Transfer funds to a connected account

### Subscriptions

- `POST /api/payment/subscriptions` - Create a subscription
- `DELETE /api/payment/subscriptions/:subscriptionId` - Cancel a subscription

### Products and Prices

- `POST /api/payment/products` - Create a product
- `POST /api/payment/prices` - Create a price

### Setup Intents

- `POST /api/payment/setup-intent` - Create a setup intent

### Balance

- `GET /api/payment/balance` - Check platform balance
- `GET /api/payment/balance/:accountId` - Check connected account balance

## Docker

The service can be run in a Docker container:

```bash
# Build the Docker image
docker build -t payment-service .

# Run the container
docker run -p 3002:3002 --env-file .env payment-service
```

For development:

```bash
# Build using the development Dockerfile
docker build -f Dockerfile.dev -t payment-service-dev .

# Run the development container
docker run -p 3002:3002 -v $(pwd):/app --env-file .env payment-service-dev
```

## Integration with API Gateway

This service is designed to be accessed through the API Gateway, which handles authentication and routing. The API Gateway forwards requests to this service on the `/api/payment/*` routes.

## Testing Payments

For testing in development, you can use Stripe's test cards:

- `4242 4242 4242 4242` - Successful payment
- `4000 0000 0000 0002` - Declined payment

See the [Stripe testing documentation](https://stripe.com/docs/testing) for more test cards and scenarios.
