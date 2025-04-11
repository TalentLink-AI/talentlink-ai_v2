// src/app/features/jobs/escrow-payment/escrow-payment.component.ts
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { environment } from '../../../../environments/environment';
import { JobService } from '../../../services/job.service';

@Component({
  selector: 'app-escrow-payment',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './escrow-payment.component.html',
  styleUrls: ['./escrow-payment.component.scss'],
})
export class EscrowPaymentComponent implements OnInit {
  private stripe!: Stripe;
  private cardElement: any;

  // Flow control
  currentStep: 'review' | 'payment' | 'release' = 'review';
  isProcessing = false;
  errorMessage = '';
  statusMessage = '';

  // Data
  jobId: string | null = null;
  milestoneId: string | null = null;
  job: any = null;
  milestone: any = null;

  // Forms
  reviewForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobService
  ) {
    this.reviewForm = this.fb.group({
      feedback: [''],
      approval: [true, Validators.required],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.jobId = params['jobId'];
      this.milestoneId = params['milestoneId'];
      this.currentStep = params['step'] || 'review';

      if (this.jobId && this.milestoneId) {
        this.loadMilestoneDetails();
      }
    });
  }

  async loadMilestoneDetails(): Promise<void> {
    if (!this.jobId || !this.milestoneId) return;

    try {
      const response = await this.jobService
        .getMilestoneDetails(this.jobId, this.milestoneId)
        .toPromise();

      if (response && response.data) {
        this.job = response.data.job;
        this.milestone = response.data.milestone;

        // Determine which step to show based on milestone status
        if (
          this.milestone.status === 'pending' &&
          !this.milestone.clientApproved
        ) {
          this.currentStep = 'review';
        } else if (
          this.milestone.status === 'pending' &&
          this.milestone.clientApproved
        ) {
          this.currentStep = 'payment';
        } else if (this.milestone.status === 'escrowed') {
          this.currentStep = 'release';
        }
      }
    } catch (err) {
      // Type the error properly
      const error = err as Error;
      this.errorMessage = 'Failed to load milestone details';
      console.error(error);
    }
  }

  // Review Step
  submitReview(): void {
    if (!this.jobId || !this.milestoneId) return;
    this.isProcessing = true;
    this.errorMessage = ''; // Clear previous errors

    const { feedback, approval } = this.reviewForm.value;

    console.log('Submitting review with values:', { feedback, approval });

    this.jobService
      .approveMilestoneReview(this.jobId, this.milestoneId, feedback, approval)
      .subscribe({
        next: (response) => {
          console.log('Review response:', response);
          this.isProcessing = false;
          if (response.success) {
            this.statusMessage = 'Review submitted successfully!';
            // Move to payment step
            this.currentStep = 'payment';
            this.initializeStripe();
          }
        },
        error: (err) => {
          console.error('Review submission error:', err);
          this.isProcessing = false;
          this.errorMessage =
            err.error?.message ||
            err.message ||
            'Failed to submit review. Please try again.';
        },
      });
  }

  // Payment Step
  async initializeStripe(): Promise<void> {
    try {
      const stripeInstance = await loadStripe(environment.stripePublishableKey);
      if (!stripeInstance) {
        this.errorMessage = 'Failed to load payment system';
        return;
      }

      this.stripe = stripeInstance;

      setTimeout(() => {
        const cardElement = document.getElementById('card-element');
        if (cardElement) {
          const elements = this.stripe.elements();
          this.cardElement = elements.create('card');
          this.cardElement.mount('#card-element');
        }
      }, 100);
    } catch (error) {
      this.errorMessage = 'Failed to initialize payment system';
    }
  }

  async processPayment(): Promise<void> {
    if (!this.jobId || !this.milestoneId || !this.stripe || !this.cardElement) {
      this.errorMessage = 'Payment system not initialized properly';
      return;
    }

    this.isProcessing = true;

    try {
      // Get payment method
      const { error, paymentMethod } = await this.stripe.createPaymentMethod({
        type: 'card',
        card: this.cardElement,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Process payment
      const paymentDetails = { paymentMethodId: paymentMethod.id };

      const response = await this.jobService
        .payRemainingMilestone(this.jobId, this.milestoneId, paymentDetails)
        .toPromise();

      this.isProcessing = false;

      if (response.success) {
        this.statusMessage =
          'Payment processed successfully! Funds are now in escrow.';
        this.currentStep = 'release';

        // Reload milestone to get updated status
        this.loadMilestoneDetails();
      }
    } catch (err) {
      this.isProcessing = false;
      // Type the error properly
      const error = err as Error;
      this.errorMessage = error.message || 'Payment processing failed';
    }
  }

  // Release Step
  releaseFunds(): void {
    if (!this.jobId || !this.milestoneId) return;
    this.isProcessing = true;

    this.jobService
      .releaseMilestoneFunds(this.jobId, this.milestoneId)
      .subscribe({
        next: (response) => {
          this.isProcessing = false;
          if (response.success) {
            this.statusMessage = 'Funds released successfully to the talent!';

            // Navigate back to job details after a short delay
            setTimeout(() => {
              this.router.navigate(['/jobs', this.jobId]);
            }, 2000);
          }
        },
        error: (err) => {
          this.isProcessing = false;
          this.errorMessage = err.error?.message || 'Failed to release funds';
        },
      });
  }

  returnToJob(): void {
    if (this.jobId) {
      this.router.navigate(['/jobs', this.jobId]);
    } else {
      this.router.navigate(['/jobs']);
    }
  }
}
