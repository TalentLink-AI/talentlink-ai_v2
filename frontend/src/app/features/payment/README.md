# TalentLink Payment Integration

This document provides an overview of the payment integration implementation for the TalentLink platform.

## Overview

The payment system allows clients and talents to securely manage financial transactions within the platform. The implementation focuses on two payment models:

1. **Milestone-based payments** - Clients fund escrow accounts, and payments are released to talents upon milestone completion
2. **Time-based payments** - Clients pay for hours worked by talents (hourly or weekly rates)

## Core Components

### Frontend Components

- **Payment Methods Component**: Allows users to add, view, and delete payment methods.
- **Milestone Payments Component**: Displays milestones and their payment status, allowing clients to release payments and talents to mark milestones as complete.
- **Escrow Funding Component**: Enables clients to fund escrow accounts for milestone-based contracts.

### Backend Components

- **Payment Service**: Handles all payment logic, communicating with Stripe API.
- **Payment Controller**: Exposes API endpoints for payment operations.
- **Payment Routes**: Defines routes for payment-related API endpoints.

### Data Models

- **Payment**: Records payment transactions.
- **Escrow Account**: Tracks funds held in escrow for milestone-based contracts.
- **Transaction**: Records all financial transactions on the platform.
- **Milestone**: Tracks milestones, their status, and associated payments.
- **Contract**: Contains payment terms, including payment model (milestone, hourly, weekly).

## Payment Flow

### Milestone-Based Payment Flow

1. Client and talent agree on milestone breakdown for a contract
2. Client creates/funds an escrow account for the contract
3. For each milestone:
   - Talent marks milestone as "in progress" while working
   - Talent marks milestone as "completed" when work is done
   - Client reviews and approves the work
   - Client releases payment from escrow
   - Talent receives payment (minus platform fee)

### Time-Based Payment Flow

1. Client and talent agree on hourly/weekly rate
2. Talent logs hours worked
3. Client reviews and approves hours
4. Client makes payment for approved hours
5. Talent receives payment (minus platform fee)

## Stripe Integration

The implementation uses Stripe for payment processing:

- **Payment Methods**: Stored securely in Stripe.
- **Payment Intents**: Used for processing payments.
- **Connect Accounts**: Required for paying talents.
- **Escrow**: Implemented using your Stripe platform balance (not a Stripe feature).

## Security Considerations

- All payment information is handled by Stripe, not stored in our database.
- Sensitive API keys are stored as environment variables.
- Webhook signatures are verified to prevent tampering.
- All payment endpoints require authentication.

## Testing in Sandbox Mode

The implementation is configured to use Stripe's sandbox mode for testing:

1. **Test Cards**: Use Stripe's [test cards](https://stripe.com/docs/testing#cards) for payment testing.
2. **Webhook Testing**: Use Stripe CLI for local webhook testing.
3. **Connect Testing**: Use test Connect accounts for talent onboarding.

## Deployment Considerations

Before deploying to production:

1. **Update API Keys**: Replace test keys with production keys.
2. **Webhook URLs**: Update webhook endpoints in Stripe dashboard.
3. **Error Handling**: Ensure robust error handling for all payment flows.
4. **Monitoring**: Set up alerts for payment failures.

## Getting Started

To test the payment system in development:

1. Update the `.env` file with your Stripe test keys:

   ```
   STRIPE_SECRET_KEY=sk_test_your_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

2. Run the Stripe CLI for webhook testing:

   ```
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```

3. Use the following test cards for different scenarios:
   - Success: 4242 4242 4242 4242
   - Authentication required: 4000 0025 0000 3155
   - Insufficient funds: 4000 0000 0000 9995

## Implementation Status

- ✅ Payment Methods Management
- ✅ Escrow Account Funding
- ✅ Milestone Payment Processing
- ✅ Stripe Connect Integration
- ✅ Webhook Handling

## Next Steps

1. Add robust error handling and recovery mechanisms
2. Implement dispute resolution workflow
3. Add detailed payment reporting
4. Integrate with the notification system
5. Set up automated testing for payment flows

## Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
