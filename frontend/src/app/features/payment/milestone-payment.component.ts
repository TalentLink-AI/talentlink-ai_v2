import { Component, Input, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-milestone-payment',
  imports: [CommonModule, FormsModule],
  template: `
    <div id="card-element"></div>
    <button (click)="confirmPayment()" [disabled]="!clientSecret">
      Confirm Payment
    </button>

    <hr />
    <label>PaymentIntent ID:</label>
    <input [(ngModel)]="intentIdToCapture" />
    <button (click)="releaseFunds()">Release Funds</button>

    <p>{{ statusMessage }}</p>
  `,
})
export class MilestonePaymentComponent implements OnInit {
  private stripe!: Stripe; // or `Stripe | null`
  clientSecret: string = ''; // initialize or mark with !
  intentIdToCapture = '';
  statusMessage = '';

  constructor(private http: HttpClient) {}

  async ngOnInit() {
    // loadStripe can be null if load fails
    const stripeInstance = await loadStripe(environment.stripePublishableKey);
    if (!stripeInstance) {
      this.statusMessage = 'Error: Stripe failed to load.';
      return;
    }
    this.stripe = stripeInstance;

    const elements = this.stripe.elements();
    const cardElement = elements.create('card');
    cardElement.mount('#card-element');

    // Possibly fetch / create PaymentIntent from your backend
    const res: any = await this.http
      .post(`${environment.apiUrlpayment}/api/payment/milestone/intent`, {
        amount: 200, // $200
        currency: 'usd',
        customerId: 'someCustomerId',
      })
      .toPromise();
    this.clientSecret = res.data.client_secret;
    this.intentIdToCapture = res.data.id;

    this.statusMessage = 'PaymentIntent created. Ready to confirm.';
  }

  async confirmPayment() {
    try {
      const result = await this.stripe.confirmCardPayment(this.clientSecret, {
        payment_method: {
          card: this.stripe.elements().getElement('card')!,
        },
      });

      if (result.error) {
        this.statusMessage = 'Error: ' + result.error.message;
      } else {
        const paymentIntent = result.paymentIntent;
        this.statusMessage = `PaymentIntent status: ${paymentIntent?.status}`;
      }
    } catch (err) {
      console.error(err);
      this.statusMessage = 'Error confirming payment.';
    }
  }

  async releaseFunds() {
    try {
      const res: any = await this.http
        .post(`${environment.apiUrlpayment}/api/payment/milestone/intent`, {
          paymentIntentId: this.intentIdToCapture,
        })
        .toPromise();

      this.statusMessage = `Capture status: ${res.data.status}`;
    } catch (err) {
      console.error(err);
      this.statusMessage = 'Error capturing PaymentIntent.';
    }
  }
}
