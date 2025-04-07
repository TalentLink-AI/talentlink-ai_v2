// src/app/features/jobs/job-detail/job-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { JobService } from '../../../services/job.service';
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
  job: any = null;
  applications: any[] = [];
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
    this.userRole = this.userService.getUserRole() || 'talent';
    // In a real app, get userId from auth service
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
      next: (response) => {
        console.log('Job details loaded:', response);
        if (response && response.data) {
          this.job = response.data;
          this.isOwner = this.job.clientId === this.userId;

          // Load applications if client is the owner
          if (this.isOwner) {
            this.loadApplications(jobId);
          }

          // Check if talent has already applied
          if (this.userRole === 'talent') {
            this.checkIfApplied(jobId);
          }
        } else {
          this.error = 'Job details not found in response';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load job details:', err);
        this.error = err.error?.message || 'Failed to load job details';
        this.isLoading = false;
      },
    });
  }

  loadApplications(jobId: string): void {
    this.jobService.getApplicationsForJob(jobId).subscribe({
      next: (response) => {
        console.log('Applications loaded:', response);
        this.applications = response.data;
      },
      error: (err) => {
        console.error('Failed to load applications:', err);
      },
    });
  }

  checkIfApplied(jobId: string): void {
    // In a real implementation, would check against current user
    // For this example, checking if any application exists for the talent ID
    this.jobService.getApplicationsByTalent(this.userId).subscribe({
      next: (response) => {
        const applications = response.data;
        this.hasApplied = applications.some((app: any) => app.jobId === jobId);
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
      .applyToJob(this.job._id, this.applicationForm.value.coverLetter)
      .subscribe({
        next: (response) => {
          console.log('Application submitted:', response);
          this.isSubmittingApplication = false;
          this.hasApplied = true;
          this.showApplyForm = false;
        },
        error: (err) => {
          console.error('Failed to submit application:', err);
          this.isSubmittingApplication = false;
          this.applicationError =
            err.error?.message || 'Failed to submit application';
        },
      });
  }

  acceptApplication(applicationId: string): void {
    if (!this.job) return;

    this.jobService.acceptApplication(applicationId).subscribe({
      next: (response) => {
        console.log('Application accepted:', response);
        // Refresh job data since status will change
        if (response.data && response.data.job) {
          this.job = response.data.job;
        } else {
          // Reload job details as fallback
          this.loadJobDetails(this.job._id);
        }
        // Refresh applications
        this.loadApplications(this.job._id);
      },
      error: (err) => {
        console.error('Failed to accept application:', err);
      },
    });
  }

  createMilestone(): void {
    if (!this.job || !this.job.assignedTo) return;

    this.creatingMilestone = true;

    // First create a milestone in the job service
    this.jobService
      .createMilestone(
        this.job._id,
        'Project milestone payment',
        this.job.budget
      )
      .subscribe({
        next: (response) => {
          console.log('Milestone created:', response);
          const milestone = response.data.milestone;

          // Navigate to the milestone payment page
          this.router.navigate(['/milestone-payment'], {
            queryParams: {
              jobId: this.job._id,
              milestoneId: milestone._id,
              amount: milestone.amount * 100, // Convert to cents for Stripe
            },
          });
        },
        error: (err) => {
          console.error('Failed to create milestone:', err);
          this.creatingMilestone = false;
        },
      });
  }

  markJobCompleted(): void {
    if (!this.job) return;

    this.jobService.completeJob(this.job._id).subscribe({
      next: (response) => {
        console.log('Job marked as completed:', response);
        if (response.data) {
          this.job = response.data;
        } else {
          // Reload job details as fallback
          this.loadJobDetails(this.job._id);
        }
      },
      error: (err) => {
        console.error('Failed to mark job as completed:', err);
      },
    });
  }

  // Format date with options for display
  formatDate(date: string | Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
