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
      // Initialize Stripe
      const stripeInstance = await loadStripe(environment.stripePublishableKey);
      if (!stripeInstance) {
        this.statusMessage = 'Error: Stripe failed to load.';
        return;
      }
      this.stripe = stripeInstance;

      // Initialize card element after a slight delay to ensure the DOM is ready
      setTimeout(() => {
        this.initializeCardElement();
      }, 100);

      this.statusMessage = 'Enter payment details and click "Setup Payment"';
    } catch (err) {
      console.error('Error initializing Stripe:', err);
      this.statusMessage = 'Error initializing payment system.';
    }
  }

  private initializeCardElement() {
    try {
      // First unmount if it exists to prevent duplicate elements
      if (this.cardElement) {
        this.cardElement.unmount();
      }

      // Create fresh elements
      const elements = this.stripe.elements();
      this.cardElement = elements.create('card');

      // Find the element and mount
      const cardElement = document.getElementById('card-element');
      if (cardElement) {
        this.cardElement.mount('#card-element');
        console.log('Card element mounted successfully');
      } else {
        console.error('Card element container not found in the DOM');
      }
    } catch (err) {
      console.error('Error initializing card element:', err);
      this.statusMessage = 'Error initializing payment form.';
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

      if (response && response.data) {
        // Extract client_secret and payment intent ID
        this.clientSecret =
          response.data.client_secret ||
          (response.data.paymentIntent &&
            response.data.paymentIntent.client_secret);

        // Store the ID but don't set intentIdToCapture yet - that happens after confirmation
        const paymentIntentId =
          response.data.id ||
          (response.data.paymentIntent && response.data.paymentIntent.id);

        console.log('Payment intent ID:', paymentIntentId);
        console.log('Client secret:', this.clientSecret ? 'Set' : 'Not set');

        // Reinitialize the card element to ensure it's fresh
        setTimeout(() => {
          this.initializeCardElement();
        }, 100);

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
    // Additional logging to help diagnose issues
    console.log('Confirming payment...');
    console.log('Client secret exists:', !!this.clientSecret);
    console.log('Card element exists:', !!this.cardElement);

    // Make sure the element is initialized
    if (!this.cardElement) {
      this.statusMessage =
        'Payment form is not initialized. Please refresh and try again.';
      return;
    }

    if (!this.clientSecret) {
      this.statusMessage = 'No payment set up yet';
      return;
    }

    this.isProcessing = true;
    this.statusMessage = 'Processing payment...';

    try {
      // First check if the card element is mounted properly
      if (!document.getElementById('card-element')?.childNodes.length) {
        console.log('Card element appears to be empty, trying to re-mount');
        this.initializeCardElement();
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait a bit for mounting
      }

      const result = await this.stripe.confirmCardPayment(this.clientSecret, {
        payment_method: {
          card: this.cardElement,
        },
      });

      if (result.error) {
        console.error('Payment confirmation error:', result.error);
        this.statusMessage = 'Error: ' + result.error.message;
      } else {
        // Payment was confirmed
        const paymentIntent = result.paymentIntent;

        // IMPORTANT: Set the intentIdToCapture here
        this.intentIdToCapture = paymentIntent.id;

        console.log(
          'Payment confirmed successfully. Intent ID:',
          this.intentIdToCapture
        );
        console.log('Payment status:', paymentIntent.status);

        // Check if the milestone needs to be updated in the database
        if (
          this.milestone &&
          !this.milestone.paymentIntentId &&
          this.jobId &&
          this.milestoneId
        ) {
          // Update the milestone with the payment intent ID
          this.updateMilestoneWithPaymentIntent(paymentIntent.id);
        }

        this.statusMessage = `Payment authorized and held in escrow. Status: ${paymentIntent.status}`;

        // Clear the client secret to prevent trying to confirm again
        this.clientSecret = '';
      }
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      this.statusMessage =
        'Error: ' +
        (err.message || 'Error processing payment. Please try again.');

      // If there's an issue with the card element, try to reinitialize it
      if (err.message && err.message.includes('Element')) {
        setTimeout(() => {
          this.initializeCardElement();
        }, 100);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Helper method to update the milestone with payment intent ID
  private updateMilestoneWithPaymentIntent(paymentIntentId: string) {
    if (!this.jobId || !this.milestoneId) return;

    // Get the milestone or find it in the job
    let milestone = this.milestone;
    if (!milestone && this.job?.milestones) {
      milestone = this.job.milestones.find(
        (m: any) => m._id === this.milestoneId
      );
    }

    // Include all potentially required fields
    const updateData = {
      paymentIntentId: paymentIntentId,
      status: 'escrowed',
      description: milestone?.description || 'Milestone payment',
      amount: milestone?.amount || this.paymentAmount / 100, // Convert from cents back to dollars
    };

    console.log('Updating milestone with data:', updateData);

    this.jobService
      .updateMilestone(this.jobId, this.milestoneId, updateData)
      .subscribe({
        next: (response) => {
          console.log('Milestone updated with payment intent ID:', response);
        },
        error: (err) => {
          console.error('Error updating milestone:', err);
          // Don't show this error to the user since the payment worked
        },
      });
  }

  async releaseFunds() {
    if (!this.jobId || !this.milestoneId) {
      this.statusMessage = 'Missing job or milestone information';
      return;
    }

    this.isProcessing = true;
    this.statusMessage = 'Releasing funds...';

    try {
      // Load the milestone data if we don't have it yet
      if (!this.milestone && this.job?.milestones) {
        this.milestone = this.job.milestones.find(
          (m: any) => m._id === this.milestoneId
        );
      }

      console.log('Releasing funds for milestone:', this.milestone);
      console.log('Job ID:', this.jobId, 'Milestone ID:', this.milestoneId);

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
      // Show a more user-friendly error message
      if (err.error?.message) {
        this.statusMessage = `Error: ${err.error.message}`;
      } else if (err.status === 400) {
        this.statusMessage =
          'Error: The server rejected the request. Please ensure the milestone is in the correct state.';
      } else {
        this.statusMessage = `Error: Failed to release funds. Please try again later.`;
      }
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
