// src/app/features/jobs/milestone-detail/milestone-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { JobService } from '../../../services/job.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-milestone-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './milestone-detail.component.html',
  styleUrls: ['./milestone-detail.component.scss'],
})
export class MilestoneDetailComponent implements OnInit {
  jobId: string | null = null;
  milestoneId: string | null = null;
  job: any = null;
  milestone: any = null;
  isLoading = true;
  error = '';
  userRole = '';

  // Flags for different actions
  isClient = false;
  isTalent = false;
  isProcessingAction = false;
  showPayDepositForm = false;
  showSubmitWorkForm = false;
  showReviewForm = false;

  // Forms
  submitWorkForm: FormGroup;
  reviewForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private jobService: JobService,
    private userService: UserService
  ) {
    this.submitWorkForm = this.fb.group({
      submissionDetails: ['', Validators.required],
    });

    this.reviewForm = this.fb.group({
      clientFeedback: [''],
      approve: [true],
    });
  }

  ngOnInit(): void {
    this.userRole = this.userService.getUserRole() || 'talent';
    this.isClient = this.userRole === 'client';
    this.isTalent = this.userRole === 'talent';

    this.route.paramMap.subscribe((params) => {
      this.jobId = params.get('jobId');
      this.milestoneId = params.get('milestoneId');

      if (this.jobId && this.milestoneId) {
        this.loadMilestoneDetails();
      } else {
        this.error = 'Missing job or milestone ID';
        this.isLoading = false;
      }
    });
  }

  loadMilestoneDetails(): void {
    if (!this.jobId || !this.milestoneId) return;

    this.isLoading = true;
    this.error = '';

    this.jobService
      .getMilestoneDetails(this.jobId, this.milestoneId)
      .subscribe({
        next: (response) => {
          if (response && response.data) {
            this.job = response.data.job;
            this.milestone = response.data.milestone;
            this.userRole = response.data.userRole || this.userRole;
            this.isClient = this.userRole === 'client';
            this.isTalent = this.userRole === 'talent';
          } else {
            this.error = 'Failed to load milestone details';
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading milestone details:', err);
          this.error = err.error?.message || 'Failed to load milestone details';
          this.isLoading = false;
        },
      });
  }

  // Client actions

  payDeposit(): void {
    if (!this.jobId || !this.milestoneId) return;

    this.isProcessingAction = true;

    this.jobService
      .payMilestoneDeposit(this.jobId, this.milestoneId)
      .subscribe({
        next: (response) => {
          console.log('Deposit payment initiated:', response);

          if (response && response.data && response.data.paymentIntent) {
            // Navigate to payment page with the payment intent data
            this.router.navigate(['/milestone-payment'], {
              queryParams: {
                jobId: this.jobId,
                milestoneId: this.milestoneId,
                amount: response.data.milestone.depositAmount * 100, // Convert to cents
                paymentIntentId: response.data.paymentIntent.id,
                paymentType: 'deposit',
              },
            });
          } else {
            this.error = 'Invalid response from payment service';
            this.isProcessingAction = false;
          }
        },
        error: (err) => {
          console.error('Error initiating deposit payment:', err);
          this.error =
            err.error?.message || 'Failed to initiate deposit payment';
          this.isProcessingAction = false;
        },
      });
  }

  reviewWork(): void {
    this.showReviewForm = true;
  }

  submitReview(): void {
    if (!this.jobId || !this.milestoneId || this.reviewForm.invalid) return;

    this.isProcessingAction = true;

    const { approve, clientFeedback } = this.reviewForm.value;

    this.jobService
      .reviewAndPayRemainingMilestone(
        this.jobId,
        this.milestoneId,
        approve,
        clientFeedback
      )
      .subscribe({
        next: (response) => {
          console.log('Review submitted:', response);

          if (
            approve &&
            response &&
            response.data &&
            response.data.paymentIntent
          ) {
            // Navigate to payment page for remaining amount
            this.router.navigate(['/milestone-payment'], {
              queryParams: {
                jobId: this.jobId,
                milestoneId: this.milestoneId,
                amount:
                  (this.milestone.amount - this.milestone.depositAmount) * 100, // Remaining amount in cents
                paymentIntentId: response.data.paymentIntent.id,
                paymentType: 'remaining',
              },
            });
          } else {
            // If requesting changes, just reload the milestone details
            this.showReviewForm = false;
            this.isProcessingAction = false;
            this.loadMilestoneDetails();
          }
        },
        error: (err) => {
          console.error('Error submitting review:', err);
          this.error = err.error?.message || 'Failed to submit review';
          this.isProcessingAction = false;
        },
      });
  }

  releaseFunds(): void {
    if (!this.jobId || !this.milestoneId) return;

    this.isProcessingAction = true;

    this.jobService.releaseMilestone(this.jobId, this.milestoneId).subscribe({
      next: (response) => {
        console.log('Funds released:', response);
        this.isProcessingAction = false;
        this.loadMilestoneDetails();
      },
      error: (err) => {
        console.error('Error releasing funds:', err);
        this.error = err.error?.message || 'Failed to release funds';
        this.isProcessingAction = false;
      },
    });
  }

  // Talent actions

  startWork(): void {
    if (!this.jobId || !this.milestoneId) return;

    this.isProcessingAction = true;

    this.jobService.startMilestoneWork(this.jobId, this.milestoneId).subscribe({
      next: (response) => {
        console.log('Work started:', response);
        this.isProcessingAction = false;
        this.loadMilestoneDetails();
      },
      error: (err) => {
        console.error('Error starting work:', err);
        this.error = err.error?.message || 'Failed to start work';
        this.isProcessingAction = false;
      },
    });
  }

  markWorkComplete(): void {
    this.showSubmitWorkForm = true;
  }

  submitCompletedWork(): void {
    if (!this.jobId || !this.milestoneId || this.submitWorkForm.invalid) return;

    this.isProcessingAction = true;

    const { submissionDetails } = this.submitWorkForm.value;

    this.jobService
      .completeMilestoneWork(this.jobId, this.milestoneId, submissionDetails)
      .subscribe({
        next: (response) => {
          console.log('Work completed:', response);
          this.showSubmitWorkForm = false;
          this.isProcessingAction = false;
          this.loadMilestoneDetails();
        },
        error: (err) => {
          console.error('Error completing work:', err);
          this.error = err.error?.message || 'Failed to complete work';
          this.isProcessingAction = false;
        },
      });
  }

  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'deposit_paid':
        return 'status-deposit-paid';
      case 'in_progress':
        return 'status-in-progress';
      case 'completed':
        return 'status-completed';
      case 'released':
        return 'status-released';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  cancelAction(): void {
    this.showPayDepositForm = false;
    this.showSubmitWorkForm = false;
    this.showReviewForm = false;
    this.submitWorkForm.reset();
    this.reviewForm.reset({ approve: true });
  }

  backToJob(): void {
    if (this.jobId) {
      this.router.navigate(['/jobs', this.jobId]);
    } else {
      this.router.navigate(['/jobs']);
    }
  }
}
