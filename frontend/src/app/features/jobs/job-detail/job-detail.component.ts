// src/app/features/jobs/job-detail/job-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { JobService, Job, JobApplication } from '../../../services/job.service';
import { UserService } from '../../../services/user.service';
import { PaymentService } from '../../../services/payment.service';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './job-detail.component.html',
  styleUrls: ['./job-detail.component.scss'],
})
export class JobDetailComponent implements OnInit {
  job: Job | undefined;
  applications: JobApplication[] = [];
  isLoading = true;
  error = '';
  userRole = '';
  userId = '';
  hasApplied = false;
  isOwner = false;

  // For application
  showApplyForm = false;
  applicationForm: FormGroup;
  isSubmittingApplication = false;
  applicationError = '';

  // For milestone
  creatingMilestone = false;
  milestoneCreated = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private jobService: JobService,
    private userService: UserService,
    private paymentService: PaymentService
  ) {
    this.applicationForm = this.fb.group({
      coverLetter: [''],
    });
  }

  ngOnInit(): void {
    this.userService.userRole$.subscribe((role) => {
      this.userRole = role;
      // You might want to refresh the view when role changes
    });
    // For this MVP, we'll use hardcoded IDs
    this.userId = this.userRole === 'client' ? 'client-123' : 'talent-456';

    const jobId = this.route.snapshot.paramMap.get('id');
    if (jobId) {
      this.loadJobDetails(jobId);
    } else {
      this.error = 'Job ID is missing';
      this.isLoading = false;
    }
  }

  loadJobDetails(jobId: string): void {
    this.isLoading = true;

    this.jobService.getJobById(jobId).subscribe({
      next: (job) => {
        if (job) {
          this.job = job;
          this.isOwner = job.clientId === this.userId;

          // Load applications if client is the owner
          if (this.isOwner) {
            this.loadApplications(jobId);
          }

          // Check if talent has already applied
          if (this.userRole === 'talent') {
            this.checkIfApplied(jobId);
          }
        } else {
          this.error = 'Job not found';
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.error = 'Failed to load job details';
        this.isLoading = false;
      },
    });
  }

  loadApplications(jobId: string): void {
    this.jobService.getApplicationsForJob(jobId).subscribe({
      next: (applications) => {
        this.applications = applications;
      },
      error: (err) => {
        console.error('Failed to load applications:', err);
      },
    });
  }

  checkIfApplied(jobId: string): void {
    this.jobService.getApplicationsByTalent(this.userId).subscribe({
      next: (applications) => {
        this.hasApplied = applications.some((app) => app.jobId === jobId);
      },
      error: (err) => {
        console.error('Failed to check application status:', err);
      },
    });
  }

  toggleApplyForm(): void {
    this.showApplyForm = !this.showApplyForm;
  }

  applyToJob(): void {
    if (!this.job) return;

    this.isSubmittingApplication = true;
    this.applicationError = '';

    this.jobService
      .applyToJob(
        this.job.id,
        this.userId,
        this.applicationForm.value.coverLetter
      )
      .subscribe({
        next: (application) => {
          this.isSubmittingApplication = false;
          this.hasApplied = true;
          this.showApplyForm = false;
        },
        error: (err) => {
          this.isSubmittingApplication = false;
          this.applicationError = err.message || 'Failed to submit application';
        },
      });
  }

  acceptApplication(talentId: string): void {
    if (!this.job) return;

    this.jobService.acceptApplication(this.job.id, talentId).subscribe({
      next: (updatedJob) => {
        if (updatedJob) {
          this.job = updatedJob;
          this.loadApplications(updatedJob.id);
        }
      },
      error: (err) => {
        console.error('Failed to accept application:', err);
      },
    });
  }

  createMilestone(): void {
    if (!this.job || !this.job.assignedTo) return;

    this.creatingMilestone = true;

    // For simplicity, we're using the job's budget as the milestone amount
    // In a real app, you'd probably want to break this down into multiple milestones
    const milestoneAmount = this.job.budget * 100; // Convert to cents for Stripe

    // Create a milestone payment intent
    this.paymentService
      .createMilestonePaymentIntent({
        amount: milestoneAmount,
        customerId: 'cus_123456', // This would come from your actual customer database
        payerId: this.job.clientId,
        payeeId: this.job.assignedTo,
        projectId: this.job.id,
        milestoneId: `milestone-${this.job.id}`,
        description: `Milestone payment for job: ${this.job.title}`,
      })
      .subscribe({
        next: (response) => {
          this.creatingMilestone = false;
          this.milestoneCreated = true;

          // Redirect to the milestone payment page
          this.router.navigate(['/milestone-payment'], {
            queryParams: {
              jobId: this.job?.id,
              milestoneId: `milestone-${this.job?.id}`,
              amount: milestoneAmount,
            },
          });
        },
        error: (err) => {
          this.creatingMilestone = false;
          console.error('Failed to create milestone:', err);
        },
      });
  }

  markJobCompleted(): void {
    if (!this.job) return;

    this.jobService.completeJob(this.job.id).subscribe({
      next: (updatedJob) => {
        if (updatedJob) {
          this.job = updatedJob;
        }
      },
      error: (err) => {
        console.error('Failed to mark job as completed:', err);
      },
    });
  }
}
