import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { loadStripe } from '@stripe/stripe-js';

@Component({
  selector: 'app-payment-status',
  templateUrl: './payment-status.component.html',
})
export class PaymentStatusComponent implements OnInit {
  message = 'Checking payment status...';

  constructor(private route: ActivatedRoute) {}

  async ngOnInit() {
    const stripe = await loadStripe(
      'pk_test_51R6uW2RLnbJDP5CUbe60Ho7FxWeo5PiCi58v9zQXyseJQEEFrZwTtg2GmbGeIETNHWpHomnLJHKyianenkr8R8VE00w9oUCj6Y'
    ); // Replace with your real Stripe publishable key

    this.route.queryParams.subscribe(async (params) => {
      const clientSecret = params['payment_intent_client_secret'];
      if (!clientSecret || !stripe) {
        this.message = 'Missing payment information.';
        return;
      }

      const { paymentIntent, error } = await stripe.retrievePaymentIntent(
        clientSecret
      );

      if (error) {
        this.message = `Error: ${error.message}`;
      } else if (paymentIntent) {
        switch (paymentIntent.status) {
          case 'succeeded':
            this.message = '✅ Payment succeeded!';
            break;
          case 'processing':
            this.message = '⏳ Payment is processing.';
            break;
          case 'requires_payment_method':
            this.message = '❌ Payment failed. Please try again.';
            break;
          default:
            this.message = `Payment status: ${paymentIntent.status}`;
            break;
        }
      }
    });
  }
}
