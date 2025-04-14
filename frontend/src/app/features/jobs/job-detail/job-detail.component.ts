// src/app/features/jobs/job-detail/job-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { JobService } from '../../../services/job.service';
import { UserService } from '../../../services/user.service';
import { PaymentService } from '../../../services/payment.service';
import { filter, switchMap, tap } from 'rxjs/operators';

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
  userId: any;
  userAuth0Id: any;
  hasApplied = false;
  isOwner = false;
  isClient = false;
  isTalent = false;
  isAdmin = false;
  releaseRequestSent = false;
  isAssignedToTalent = false;

  // For application
  showApplyForm = false;
  applicationForm: FormGroup;
  isSubmittingApplication = false;
  applicationError = '';

  // For milestone
  creatingMilestone = false;
  milestoneCreated = false;
  showMilestoneForm = false;
  milestoneForm: FormGroup;
  submittingMilestone = false;
  creatingPayment = false;

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
    this.milestoneForm = this.fb.group({
      description: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(1)]],
      depositAmount: [''], // Optional, will default to 10% if empty
    });
  }

  ngOnInit(): void {
    this.userRole = this.userService.getUserRole() || 'talent';
    this.isClient = this.userRole === 'client';
    this.isTalent = this.userRole === 'talent';
    // Check if user is admin
    this.userService.isAdmin().subscribe((isAdmin) => {
      this.isAdmin = isAdmin;
    });

    this.userService.getCurrentUser().subscribe({
      next: (response) => {
        this.userId = response?.user?._id;
        this.userAuth0Id = response?.user?.auth0Id;

        // update roles again in case the user service provides different info
        this.isClient = this.userRole === 'client';
        this.isTalent = this.userRole === 'talent';

        const jobId = this.route.snapshot.paramMap.get('id');
        if (jobId) {
          this.loadJobDetails(jobId);
        } else {
          this.error = 'Job ID is missing';
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error fetching user data:', err);
      },
    });
  }

  messageClient(): void {
    if (!this.job || !this.job.clientId) {
      console.error('No client ID available');
      return;
    }

    // Navigate to chat with this client
    this.router.navigate(['/chat'], {
      queryParams: { contact: this.job.clientId },
    });
  }

  loadJobDetails(jobId: string): void {
    this.isLoading = true;

    this.jobService.getJobById(jobId).subscribe({
      next: (response) => {
        console.log('Job details loaded:', response);
        if (response && response.data) {
          this.job = response.data;

          // User IDs from authentication could be in different formats
          const possibleClientIds = [
            this.userId,
            this.userAuth0Id,
            // Add any additional ID formats your system might use
          ].filter((id) => id); // Remove undefined/null values

          const possibleTalentIds = [
            this.userId,
            this.userAuth0Id,
            // Add any additional ID formats your system might use
          ].filter((id) => id);

          // Check ownership - true if ANY of the user's IDs match the job's clientId
          this.isOwner = possibleClientIds.some(
            (id) => id === this.job.clientId
          );

          // Check if talent is assigned - true if ANY of the user's IDs match the job's assignedTo
          this.isAssignedToTalent =
            this.userRole === 'talent' &&
            possibleTalentIds.some((id) => id === this.job.assignedTo);

          // Load applications if client is the owner
          if (this.isOwner) {
            this.loadApplications(jobId);
          }

          // Check if talent has already applied
          if (this.userRole === 'talent' && this.job.status === 'published') {
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
        if (response && response.data) {
          this.applications = Array.isArray(response.data) ? response.data : [];
          console.log('Applications array:', this.applications);
        } else {
          this.applications = [];
        }
      },
      error: (err) => {
        console.error('Failed to load applications:', err);
      },
    });
  }

  checkIfApplied(jobId: string): void {
    // Check both user's MongoDB ID and Auth0 ID
    this.jobService.getMyApplications().subscribe({
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

  // Format date with options for display
  formatDate(date: string | Date): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  toggleMilestoneForm(): void {
    this.showMilestoneForm = !this.showMilestoneForm;
  }

  submitMilestone(): void {
    if (this.milestoneForm.invalid) return;

    this.submittingMilestone = true;

    const { description, amount, depositAmount } = this.milestoneForm.value;

    // Calculate depositAmount if not provided (default to 10%)
    const calculatedDepositAmount = depositAmount || amount * 0.1;

    this.jobService
      .createMilestone(
        this.job._id,
        description,
        amount,
        calculatedDepositAmount
      )
      .subscribe({
        next: (response) => {
          console.log('Milestone created:', response);
          // Update job object with new milestone
          if (response.data && response.data.job) {
            this.job = response.data.job;
          } else {
            // Reload job as fallback
            this.loadJobDetails(this.job._id);
          }
          this.submittingMilestone = false;
          this.showMilestoneForm = false;
          this.milestoneForm.reset();
        },
        error: (err) => {
          console.error('Failed to create milestone:', err);
          this.submittingMilestone = false;
        },
      });
  }

  createMilestonePayment(milestoneId: string): void {
    if (!this.job) return;

    this.creatingPayment = true;

    // Navigate to the milestone payment page
    this.router.navigate(['/milestone-payment'], {
      queryParams: {
        jobId: this.job._id,
        milestoneId: milestoneId,
        amount: this.getMilestoneAmount(milestoneId) * 100, // Convert to cents for Stripe
      },
    });
  }

  getMilestoneAmount(milestoneId: string): number {
    if (!this.job || !this.job.milestones) return 0;

    const milestone = this.job.milestones.find(
      (m: any) => m._id === milestoneId
    );
    return milestone ? milestone.amount : 0;
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

  /**
   * Client requests fund release for a milestone
   * In a real app, this would create a notification or support ticket
   */
  requestFundRelease(milestoneId: string): void {
    // Get the milestone details
    const milestone = this.job.milestones.find(
      (m: any) => m._id === milestoneId
    );
    if (!milestone) return;

    // In a real implementation, you would call an API to create a fund release request
    // For now, we'll just show a confirmation message
    this.releaseRequestSent = true;

    // Simple alert for demonstration
    alert(
      `Your request to release funds for milestone "${milestone.description}" has been sent to admins.`
    );

    // In a real implementation, you might make an API call:
    /*
  this.jobService.requestFundRelease(this.job._id, milestoneId).subscribe({
    next: (response) => {
      this.releaseRequestSent = true;
      // Show confirmation to user
    },
    error: (err) => {
      console.error('Error requesting fund release:', err);
      // Show error to user
    }
  });
  */
  }

  /**
   * View detailed milestone information (admin function)
   */
  viewMilestoneDetails(milestoneId: string): void {
    const milestone = this.job.milestones.find(
      (m: any) => m._id === milestoneId
    );
    if (!milestone) return;

    // For simplicity, we'll just log the details to console and show an alert
    // In a real app, you might open a modal or navigate to a detailed view
    console.log('Milestone details:', milestone);

    const details = `
Milestone: ${milestone.description}
Amount: $${milestone.amount}
Status: ${milestone.status}
Created: ${
      milestone.createdAt
        ? new Date(milestone.createdAt).toLocaleString()
        : 'N/A'
    }
Payment Intent ID: ${milestone.paymentIntentId || 'None'}
`;

    // Display the details in an alert (in a real app, use a proper UI component)
    alert(details);

    // To navigate to a detailed view instead:
    // this.router.navigate(['/admin/jobs/milestones', milestoneId]);
  }
}
