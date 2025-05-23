// src/app/features/jobs/milestone-payment/milestone-payment.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  ViewChild,
  ElementRef,
} from '@angular/core';
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
export class MilestonePaymentComponent
  implements OnInit, AfterViewChecked, OnDestroy
{
  @ViewChild('cardElementContainer') cardElementContainerRef!: ElementRef;
  private cardInitialized = false;
  private stripe: Stripe | null = null;
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

  // Additional fields
  paymentType: string = 'full'; // 'deposit', 'remaining', or 'full'
  paymentIntentId: string | null = null;
  paymentStep: 'setup' | 'confirm' | 'done' = 'setup';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.jobId = params['jobId'];
      this.milestoneId = params['milestoneId'];
      this.paymentAmount = params['amount'] ? parseFloat(params['amount']) : 0;
      this.paymentType = params['paymentType'] || 'full';
      this.paymentIntentId = params['paymentIntentId'] || null;

      // Some messaging logic
      if (this.paymentType === 'deposit') {
        this.statusMessage =
          'Pay initial deposit to allow talent to start work.';
      } else if (this.paymentType === 'remaining') {
        this.statusMessage = 'Pay remaining amount after reviewing work.';
      } else {
        this.statusMessage = 'Process milestone payment.';
      }

      if (this.jobId) {
        this.loadJobDetails(this.jobId);
      }

      if (this.paymentIntentId) {
        this.intentIdToCapture = this.paymentIntentId;
      }
    });
  }

  ngAfterViewChecked(): void {
    if (
      !this.cardInitialized &&
      this.cardElementContainerRef &&
      this.paymentStep !== 'done'
    ) {
      this.initializeCardSafely();
    }
  }

  private async initializeCardSafely() {
    try {
      if (!this.stripe) {
        this.stripe = await loadStripe(environment.stripePublishableKey);
        if (!this.stripe) {
          this.statusMessage = 'Error loading Stripe.';
          return;
        }
      }

      if (!this.cardElementContainerRef?.nativeElement) {
        return;
      }

      // Unmount previous if any
      if (this.cardElement) {
        this.cardElement.unmount();
      }

      const elements = this.stripe.elements();
      this.cardElement = elements.create('card');
      this.cardElement.mount(this.cardElementContainerRef.nativeElement);
      this.cardInitialized = true;
      console.log('Stripe card initialized');
    } catch (err) {
      console.error('Error initializing card:', err);
      this.statusMessage = 'Error initializing payment form.';
    }
  }

  ngOnDestroy(): void {
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

            // Set appropriate values based on the payment type
            if (this.milestone) {
              if (this.paymentType === 'deposit') {
                // If deposit payment, check if depositAmount is specified
                if (this.milestone.depositAmount) {
                  this.paymentAmount = this.milestone.depositAmount * 100; // Convert to cents
                } else if (!this.paymentAmount) {
                  // Default to 10% of milestone amount
                  this.paymentAmount = this.milestone.amount * 0.1 * 100;
                }
              } else if (this.paymentType === 'remaining') {
                // If remaining payment, calculate remaining amount
                const totalAmount = this.milestone.amount;
                const depositAmount =
                  this.milestone.depositAmount || totalAmount * 0.1;
                const remainingAmount = totalAmount - depositAmount;

                // Override payment amount if not specified correctly
                if (!this.paymentAmount || this.paymentAmount <= 0) {
                  this.paymentAmount = remainingAmount * 100; // Convert to cents
                }
              } else if (!this.paymentAmount && this.milestone.amount) {
                // For full payments, use the milestone amount
                this.paymentAmount = this.milestone.amount * 100;
              }
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
      this.statusMessage = 'Please enter a valid amount.';
      return;
    }
    if (!this.jobId || !this.milestoneId) {
      this.statusMessage = 'Missing job or milestone information.';
      return;
    }

    this.isProcessing = true;
    this.statusMessage = 'Setting up payment...';

    try {
      let response: any;
      if (this.paymentType === 'deposit') {
        response = await this.jobService
          .payMilestoneDeposit(this.jobId, this.milestoneId)
          .toPromise();
      } else if (this.paymentType === 'remaining') {
        response = await this.jobService
          .reviewAndPayRemainingMilestone(this.jobId, this.milestoneId, true)
          .toPromise();
      } else {
        response = await this.jobService
          .createMilestonePayment(this.jobId, this.milestoneId)
          .toPromise();
      }

      if (response && response.data) {
        this.clientSecret =
          response.data.client_secret ||
          response.data.paymentIntent?.client_secret;
        const paymentIntentId =
          response.data.id || response.data.paymentIntent?.id;

        this.paymentStep = 'confirm';
        console.log('Payment intent created:', paymentIntentId);
        this.statusMessage =
          'Payment ready to confirm. Click "Confirm Payment" to proceed.';
      } else {
        throw new Error('Invalid response from payment service');
      }
    } catch (err) {
      console.error('Error creating payment intent:', err);
      this.statusMessage = 'Error: Failed to create payment intent.';
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
      if (!this.stripe) {
        this.statusMessage =
          'Payment system not ready. Please refresh and try again.';
        return;
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

        // Update appropriate milestone field based on payment type
        if (this.jobId && this.milestoneId) {
          if (this.paymentType === 'deposit') {
            await this.confirmDepositPayment(paymentIntent.id);
          } else if (this.paymentType === 'remaining') {
            // Update milestone with payment intent ID and mark as escrowed
            await this.updateMilestoneWithPaymentIntent(
              paymentIntent.id,
              'escrowed'
            );
            this.statusMessage =
              'Payment processed! Funds are now in escrow and can be released when work is completed.';
            this.paymentStep = 'done';
          } else {
            // Handle regular milestone payment
            await this.updateMilestoneWithPaymentIntent(
              paymentIntent.id,
              'escrowed'
            );
            this.statusMessage =
              'Payment processed! Funds are now in escrow and can be released when work is completed.';
            this.paymentStep = 'done';
          }
        }

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
          this.initializeCardSafely();
        }, 100);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Helper method for confirming deposit payment
  private async confirmDepositPayment(paymentIntentId: string) {
    if (!this.jobId || !this.milestoneId) return;

    try {
      const response = await this.jobService
        .confirmMilestoneDeposit(this.jobId, this.milestoneId, paymentIntentId)
        .toPromise();

      console.log('Deposit payment confirmed:', response);
      this.statusMessage =
        'Deposit payment successful! Talent can now start work.';
      this.paymentStep = 'done';

      setTimeout(() => {
        if (this.jobId) {
          this.router.navigate(['/jobs', this.jobId]);
        }
      }, 2000);
    } catch (err: any) {
      console.error('Error confirming deposit payment:', err);
      this.statusMessage =
        'Error: ' + (err.message || 'Failed to confirm deposit payment');
    }
  }

  // Helper method to update the milestone with payment intent ID
  private async updateMilestoneWithPaymentIntent(
    paymentIntentId: string,
    status: string
  ) {
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
      status: status,
      description: milestone?.description || 'Milestone payment',
      amount: milestone?.amount || this.paymentAmount / 100, // Convert from cents back to dollars
    };

    console.log('Updating milestone with data:', updateData);

    try {
      const response = await this.jobService
        .updateMilestone(this.jobId, this.milestoneId, updateData)
        .toPromise();

      console.log('Milestone updated with payment intent ID:', response);
      return response;
    } catch (error) {
      console.error('Error updating milestone:', error);
      // Don't show this error to the user since the payment worked
    }
  }

  getPaymentTypeLabel(): string {
    if (this.paymentType === 'deposit') {
      return 'Initial Deposit';
    } else if (this.paymentType === 'remaining') {
      return 'Remaining Payment';
    } else {
      return 'Milestone Payment';
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
