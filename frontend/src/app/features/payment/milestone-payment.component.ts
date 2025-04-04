import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-milestone-payment',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="milestone-payment-container">
      <h2>Milestone Payment</h2>

      <div class="payment-details">
        <div class="payment-parties">
          <div class="payer">
            <strong>From:</strong>
          </div>
          <div class="payee">
            <strong>To:</strong>
          </div>
        </div>

        <div class="project-info">
          <strong>Project:</strong>
        </div>

        <div class="milestone-info">
          <strong>Milestone:</strong>
        </div>
      </div>

      <div class="form-group">
        <label>Payment Amount ($)</label>
        <input type="number" [(ngModel)]="paymentAmount" class="form-control" />
      </div>

      <div id="card-element" class="card-element-container"></div>

      <button
        (click)="createPaymentIntent()"
        *ngIf="!clientSecret"
        class="btn btn-primary"
        [disabled]="isProcessing"
      >
        <span *ngIf="isProcessing">Processing...</span>
        <span *ngIf="!isProcessing">Setup Payment</span>
      </button>

      <button
        (click)="confirmPayment()"
        *ngIf="clientSecret"
        class="btn btn-success"
        [disabled]="isProcessing"
      >
        <span *ngIf="isProcessing">Processing...</span>
        <span *ngIf="!isProcessing">Confirm Payment</span>
      </button>

      <hr />
      <div *ngIf="clientSecret">
        <h3>Release Milestone Payment</h3>
        <p>
          Once the work is complete, you can release the funds to the
          freelancer.
        </p>
        <button
          (click)="releaseFunds()"
          class="btn btn-primary"
          [disabled]="!intentIdToCapture || isProcessing"
        >
          Release Funds
        </button>
      </div>

      <div class="status-message" *ngIf="statusMessage">
        {{ statusMessage }}
      </div>
    </div>
  `,
})
export class MilestonePaymentComponent implements OnInit {
  private stripe!: Stripe;
  private cardElement: any;

  clientSecret: string = '';
  intentIdToCapture = '';
  statusMessage = '';
  paymentAmount: number = 200;
  isProcessing: boolean = false;

  constructor(private http: HttpClient) {}

  async ngOnInit() {
    // Only initialize Stripe and the card element, but don't create a payment intent yet
    try {
      const stripeInstance = await loadStripe(environment.stripePublishableKey);
      if (!stripeInstance) {
        this.statusMessage = 'Error: Stripe failed to load.';
        return;
      }
      this.stripe = stripeInstance;

      const elements = this.stripe.elements();
      this.cardElement = elements.create('card');
      this.cardElement.mount('#card-element');

      this.statusMessage = 'Enter payment details and click "Setup Payment"';
    } catch (err) {
      console.error('Error initializing Stripe:', err);
      this.statusMessage = 'Error initializing payment system.';
    }
  }

  async createPaymentIntent() {
    if (!this.paymentAmount || this.paymentAmount <= 0) {
      this.statusMessage = 'Please enter a valid amount';
      return;
    }

    this.isProcessing = true;
    this.statusMessage = 'Setting up payment...';

    try {
      // You would get these IDs from your auth service or route parameters
      const payerId = 'client-123'; // Current user (client) ID
      const payeeId = 'freelancer-456'; // Freelancer's ID
      const projectId = 'project-789'; // Current project

      const res: any = await this.http
        .post(`${environment.apiUrlpayment}/api/payment/milestone/intent`, {
          amount: this.paymentAmount * 100,
          currency: 'usd',
          customerId: 'cus_123456',
          payerId: payerId,
          payeeId: payeeId,
          userId: payerId,
          projectId: projectId,
          milestoneId: 'milestone-001',
          description: `Milestone payment from ${payerId} to ${payeeId} for Project: ${projectId}`,
        })
        .toPromise();

      this.clientSecret = res.data.client_secret;
      this.intentIdToCapture = res.data.id;
      this.statusMessage =
        'Payment ready to confirm. Click "Confirm Payment" to proceed.';
    } catch (err) {
      console.error('Error creating payment intent:', err);
      this.statusMessage = 'Error: Failed to create payment intent';
    } finally {
      this.isProcessing = false;
    }
  }

  async confirmPayment() {
    if (!this.clientSecret) {
      this.statusMessage = 'No payment set up yet';
      return;
    }

    this.isProcessing = true;
    this.statusMessage = 'Processing payment...';

    try {
      const result = await this.stripe.confirmCardPayment(this.clientSecret, {
        payment_method: {
          card: this.cardElement,
        },
      });

      if (result.error) {
        this.statusMessage = 'Error: ' + result.error.message;
      } else {
        const paymentIntent = result.paymentIntent;
        this.statusMessage = `Payment authorized and held in escrow. Status: ${paymentIntent?.status}`;
      }
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      this.statusMessage = 'Error processing payment.';
    } finally {
      this.isProcessing = false;
    }
  }

  async releaseFunds() {
    if (!this.intentIdToCapture) {
      this.statusMessage = 'No payment to release';
      return;
    }

    this.isProcessing = true;
    this.statusMessage = 'Releasing funds...';

    try {
      const res: any = await this.http
        .post(`${environment.apiUrlpayment}/api/payment/milestone/capture`, {
          paymentIntentId: this.intentIdToCapture,
        })
        .toPromise();

      this.statusMessage = `Funds released successfully. Status: ${res.data.status}`;
    } catch (err: any) {
      console.error('Error releasing funds:', err);
      this.statusMessage = `Error: ${
        err.response?.data?.message || 'Failed to release funds'
      }`;
    } finally {
      this.isProcessing = false;
    }
  }
}
