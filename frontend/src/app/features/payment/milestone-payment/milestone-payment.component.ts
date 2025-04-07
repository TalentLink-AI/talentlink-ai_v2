// src/app/features/payment/milestone-payment/milestone-payment.component.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment';
import { JobService } from '../../../services/job.service';

@Component({
  selector: 'app-milestone-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './milestone-payment.component.html',
  styleUrls: ['./milestone-payment.component.scss'],
})
export class MilestonePaymentComponent implements OnInit {
  private stripe!: Stripe;
  private cardElement: any;

  clientSecret: string = '';
  intentIdToCapture = '';
  statusMessage = '';
  isProcessing: boolean = false;

  // Job and milestone details
  jobId: string | null = null;
  milestoneId: string | null = null;
  jobTitle: string = '';
  paymentAmount: number = 0;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobService
  ) {}

  async ngOnInit() {
    // Get job and milestone details from query params
    this.route.queryParams.subscribe((params) => {
      this.jobId = params['jobId'];
      this.milestoneId = params['milestoneId'];
      this.paymentAmount = params['amount'] ? parseFloat(params['amount']) : 0;

      // Load job details if jobId is provided
      if (this.jobId) {
        this.loadJobDetails(this.jobId);
      }
    });

    // Initialize Stripe and the card element
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

  loadJobDetails(jobId: string): void {
    this.jobService.getJobById(jobId).subscribe({
      next: (job) => {
        if (job) {
          this.jobTitle = job.title;

          // If amount wasn't provided in query params, use job budget
          if (!this.paymentAmount) {
            this.paymentAmount = job.budget * 100; // Convert to cents for Stripe
          }
        }
      },
      error: (err) => {
        console.error('Failed to load job details:', err);
      },
    });
  }

  async createPaymentIntent() {
    if (!this.paymentAmount || this.paymentAmount <= 0) {
      this.statusMessage = 'Please enter a valid amount';
      return;
    }

    this.isProcessing = true;
    this.statusMessage = 'Setting up payment...';

    try {
      const res: any = await this.http
        .post(`${environment.apiUrlpayment}/api/payment/milestone/intent`, {
          amount: this.paymentAmount,
          currency: 'usd',
          customerId: 'cus_123456', // This would come from your actual customer database
          payerId: 'client-123', // Replace with actual client ID from authentication
          payeeId: 'talent-456', // Replace with actual talent ID
          projectId: this.jobId || 'project-unknown',
          milestoneId: this.milestoneId || `milestone-${Date.now()}`,
          description: `Milestone payment for job: ${
            this.jobTitle || 'Unknown Job'
          }`,
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

      // Navigate back to the job detail page if jobId is available
      if (this.jobId) {
        setTimeout(() => {
          this.router.navigate(['/jobs', this.jobId]);
        }, 3000); // Redirect after 3 seconds
      }
    } catch (err: any) {
      console.error('Error releasing funds:', err);
      this.statusMessage = `Error: ${
        err.response?.data?.message || 'Failed to release funds'
      }`;
    } finally {
      this.isProcessing = false;
    }
  }

  returnToJob() {
    if (this.jobId) {
      this.router.navigate(['/jobs', this.jobId]);
    } else {
      this.router.navigate(['/jobs']);
    }
  }
}
