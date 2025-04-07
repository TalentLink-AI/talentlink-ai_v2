// src/app/features/payment/milestone-payment/milestone-payment.component.ts
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment';
import { JobService } from '../../../services/job.service';

@Component({
  selector: 'app-milestone-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './milestone-payment.component.html',
  styleUrls: ['./milestone-payment.component.scss'],
})
export class MilestonePaymentComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  private stripe!: Stripe;
  private cardElement: any;
  private _tempIntentId: string = '';

  clientSecret: string = '';
  intentIdToCapture = '';
  statusMessage = '';
  isProcessing: boolean = false;

  // Job and milestone details
  jobId: string | null = null;
  milestoneId: string | null = null;
  jobTitle: string = '';
  paymentAmount: number = 0;
  job: any = null;
  milestone: any = null;

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
  }
  async ngAfterViewInit() {
    try {
      // Initialize Stripe & elements
      const stripeInstance = await loadStripe(environment.stripePublishableKey);
      if (!stripeInstance) {
        this.statusMessage = 'Error: Stripe failed to load.';
        return;
      }
      this.stripe = stripeInstance;

      // Mount the card element
      const elements = this.stripe.elements();
      this.cardElement = elements.create('card');
      this.cardElement.mount('#card-element');

      this.statusMessage = 'Enter payment details and click "Setup Payment"';
    } catch (err) {
      console.error('Error initializing Stripe:', err);
      this.statusMessage = 'Error initializing payment system.';
    }
  }
  ngOnDestroy(): void {
    // Clean up Stripe elements
    if (this.cardElement) {
      this.cardElement.unmount();
      this.cardElement = null;
    }
  }

  loadJobDetails(jobId: string): void {
    this.jobService.getJobById(jobId).subscribe({
      next: (response) => {
        console.log('Job details loaded:', response);

        if (response && response.data) {
          this.job = response.data;
          this.jobTitle = this.job.title;

          // Find the specified milestone
          if (this.milestoneId && this.job.milestones) {
            this.milestone = this.job.milestones.find(
              (m: any) => m._id === this.milestoneId
            );

            // If milestone already has payment intent, we can skip to releasing funds
            if (this.milestone && this.milestone.paymentIntentId) {
              this.intentIdToCapture = this.milestone.paymentIntentId;
              this.statusMessage = 'Payment is ready to be released.';
            }

            // If the milestone specifies an amount, use it
            if (this.milestone && this.milestone.amount) {
              this.paymentAmount = this.milestone.amount * 100; // Convert to cents for Stripe
            }
          }

          // If amount wasn't provided in query params or milestone, use job budget
          if (!this.paymentAmount && this.job.budget) {
            this.paymentAmount = this.job.budget * 100; // Convert to cents for Stripe
          }
        }
      },
      error: (err) => {
        console.error('Failed to load job details:', err);
        this.statusMessage = 'Error: Failed to load job details.';
      },
    });
  }

  async createPaymentIntent() {
    if (!this.paymentAmount || this.paymentAmount <= 0) {
      this.statusMessage = 'Please enter a valid amount';
      return;
    }

    if (!this.jobId || !this.milestoneId) {
      this.statusMessage = 'Missing job or milestone information';
      return;
    }

    this.isProcessing = true;
    this.statusMessage = 'Setting up payment...';

    try {
      // Create milestone payment intent
      const response: any = await this.jobService
        .createMilestonePayment(this.jobId, this.milestoneId)
        .toPromise();

      console.log('Payment intent created:', response);

      // Only set clientSecret here, DON'T set intentIdToCapture yet
      if (response && response.data) {
        this.clientSecret =
          response.data.client_secret ||
          (response.data.paymentIntent &&
            response.data.paymentIntent.client_secret);

        // Store temporary ID but don't set intentIdToCapture yet
        this._tempIntentId =
          response.data.id ||
          (response.data.paymentIntent && response.data.paymentIntent.id);

        this.statusMessage =
          'Payment ready to confirm. Click "Confirm Payment" to proceed.';
      } else {
        throw new Error('Invalid response from payment service');
      }
    } catch (err) {
      console.error('Error creating payment intent:', err);
      this.statusMessage = 'Error: Failed to create payment intent';
    } finally {
      this.isProcessing = false;
    }
  }

  async confirmPayment() {
    // Make sure the element is still mounted
    if (!this.cardElement) {
      this.statusMessage = 'Payment form is not initialized.';
      return;
    }
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
        // Payment was confirmed
        const paymentIntent = result.paymentIntent;
        this.statusMessage = `Payment authorized. Status: ${paymentIntent?.status}`;
        // Possibly reload job details or handle success
      }
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      this.statusMessage = err.message || 'Error processing payment.';
    } finally {
      this.isProcessing = false;
    }
  }

  async releaseFunds() {
    if (!this.jobId || !this.milestoneId) {
      this.statusMessage = 'Missing job or milestone information';
      return;
    }

    this.isProcessing = true;
    this.statusMessage = 'Releasing funds...';

    try {
      // Call the job service to release the milestone

      const response = await this.jobService
        .releaseMilestone(this.jobId, this.milestoneId)
        .toPromise();

      console.log('Funds released:', response);
      this.statusMessage = `Funds released successfully!`;

      // Navigate back to the job detail page after a delay
      setTimeout(() => {
        this.router.navigate(['/jobs', this.jobId]);
      }, 3000);
    } catch (err: any) {
      console.error('Error releasing funds:', err);
      this.statusMessage = `Error: ${
        err.error?.message || 'Failed to release funds'
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
