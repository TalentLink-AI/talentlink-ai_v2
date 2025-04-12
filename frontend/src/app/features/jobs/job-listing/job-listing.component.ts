// src/app/features/jobs/job-listing/job-listing.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { JobService, Job } from '../../../services/job.service';
import { UserService } from '../../../services/user.service';
import { ThemeService } from '../../../services/theme.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { Router } from '@angular/router';
import { BannerComponent } from '../../../shared';
import { catchError, map } from 'rxjs/operators';

// Define an interface for our enhanced job object
interface EnhancedJob extends Job {
  is_job_Favourite?: boolean;
  user_info?: {
    firstName?: string;
    lastName?: string;
    _id?: string;
    profile_image?: string;
  };
  category?: string;
  reviews?: {
    rating: number;
    count: number;
  };
  hasApplied?: boolean; // Flag to show if talent has applied
}

@Component({
  selector: 'app-job-listing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgxPaginationModule,
    BannerComponent,
  ],
  templateUrl: './job-listing.component.html',
  styleUrls: ['./job-listing.component.scss'],
})
export class JobListingComponent implements OnInit, OnDestroy {
  @ViewChild('scrollTarget') scrollTarget!: ElementRef;

  // Jobs data
  everyJobDetails: EnhancedJob[] = [];
  allJobs: EnhancedJob[] = []; // Stores all jobs from API
  myApplications: any[] = []; // Stores applications for talent
  visibleJobs: number = 9; // Number of jobs to show initially
  jobIncrement: number = 9; // Number of jobs to add when loading more
  allJobsLoaded: boolean = false;
  totalItems: number = 0;
  searchText: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  // Filter options
  statusFilter: string = 'all';
  appliedFilter: boolean = false;

  // User state
  userRole: string = '';
  isDarkMode: boolean = false;
  isAdmin: boolean = false;

  // Page title based on role
  pageTitle: string = '';

  // Stats for client
  statsPublished: number = 0;
  statsAssigned: number = 0;
  statsCompleted: number = 0;

  // Environment variables
  baseUrl: string = '/'; // Replace with your API base URL

  // Math reference for template
  Math = Math;

  // Subscriptions for cleanup
  private themeSubscription: Subscription = new Subscription();
  private adminSubscription: Subscription = new Subscription();

  constructor(
    private jobService: JobService,
    private userService: UserService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get user role
    this.userRole = this.userService.getUserRole() || 'talent';

    // Set page title based on role
    this.pageTitle =
      this.userRole === 'client' ? 'My Posted Jobs' : 'Available AI Projects';

    // Check if user is admin
    this.adminSubscription = this.userService.isAdmin().subscribe((isAdmin) => {
      this.isAdmin = isAdmin;
    });

    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      (isDark) => {
        this.isDarkMode = isDark;
      }
    );

    // Load appropriate jobs based on role
    this.loadJobsBasedOnRole();
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
    if (this.adminSubscription) {
      this.adminSubscription.unsubscribe();
    }
  }

  // Load appropriate jobs based on user role
  loadJobsBasedOnRole(): void {
    if (this.userRole === 'client') {
      this.getClientJobs();
    } else {
      // For talents, get both available jobs and their applications
      this.getTalentJobsAndApplications();
    }
  }

  // Get jobs for client view
  getClientJobs(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.jobService.getMyJobs().subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response && response.data) {
          // Extract jobs from response
          let jobs = Array.isArray(response.data) ? response.data : [];

          // Calculate stats
          this.statsPublished = jobs.filter(
            (job: any) => job.status === 'published'
          ).length;
          this.statsAssigned = jobs.filter(
            (job: any) => job.status === 'assigned'
          ).length;
          this.statsCompleted = jobs.filter(
            (job: any) => job.status === 'completed'
          ).length;

          // Apply status filter if set
          if (this.statusFilter !== 'all') {
            jobs = jobs.filter((job: any) => job.status === this.statusFilter);
          }

          // Process and enhance the jobs
          this.allJobs = this.enhanceJobs(jobs);

          // Apply search filter if needed
          this.applySearchFilter();

          // Set visible jobs
          this.updateVisibleJobs();
        }
      },
      error: (err) => {
        this.handleError(err);
      },
    });
  }

  // Get jobs and applications for talent view
  getTalentJobsAndApplications(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Use forkJoin to make parallel requests
    forkJoin({
      availableJobs: this.jobService.getAvailableJobs().pipe(
        catchError((err) => {
          console.error('Error fetching available jobs:', err);
          return of({ data: { jobs: [] } });
        })
      ),
      myApplications: this.jobService.getMyApplications().pipe(
        catchError((err) => {
          console.error('Error fetching applications:', err);
          return of({ data: [] });
        })
      ),
    }).subscribe({
      next: (results) => {
        this.isLoading = false;

        // Process applications
        this.myApplications = Array.isArray(results.myApplications.data)
          ? results.myApplications.data
          : [];

        // Extract job IDs that the talent has applied to
        const appliedJobIds = this.myApplications.map((app) => app.jobId);

        // Extract jobs
        let jobs = [];
        if (results.availableJobs && results.availableJobs.data) {
          jobs = Array.isArray(results.availableJobs.data)
            ? results.availableJobs.data
            : results.availableJobs.data.jobs || [];
        }

        // Enhance jobs with application status
        this.allJobs = this.enhanceJobs(jobs).map((job) => {
          job.hasApplied = appliedJobIds.includes(job._id);
          return job;
        });

        // Apply filters
        if (this.appliedFilter) {
          this.allJobs = this.allJobs.filter((job) => job.hasApplied);
        }

        // Apply search filter
        this.applySearchFilter();

        // Update visible jobs
        this.updateVisibleJobs();
      },
      error: (err) => {
        this.handleError(err);
      },
    });
  }

  // Apply search filter to all jobs
  applySearchFilter(): void {
    if (this.searchText && this.searchText.trim() !== '') {
      this.allJobs = this.allJobs.filter(
        (job) =>
          (job.title &&
            job.title.toLowerCase().includes(this.searchText.toLowerCase())) ||
          (job.description &&
            job.description
              .toLowerCase()
              .includes(this.searchText.toLowerCase()))
      );
    }
  }

  // Update visible jobs
  updateVisibleJobs(): void {
    // Reset pagination
    this.visibleJobs = Math.min(this.jobIncrement, this.allJobs.length);
    this.allJobsLoaded = this.allJobs.length <= this.visibleJobs;

    // Set visible jobs
    this.everyJobDetails = this.allJobs.slice(0, this.visibleJobs);

    // Set total items for pagination
    this.totalItems = this.allJobs.length;
  }

  // Handle API errors
  handleError(err: any): void {
    this.isLoading = false;
    console.error('Error loading jobs:', err);
    this.errorMessage =
      err.error?.message || 'Failed to load jobs. Please try again.';
    this.everyJobDetails = []; // Reset array in case of error
    this.totalItems = 0;
  }

  // Retry fetching jobs
  retryFetchJobs(): void {
    this.errorMessage = '';
    this.loadJobsBasedOnRole();
  }

  // Filter jobs by status
  filterByStatus(status: string): void {
    this.statusFilter = status;
    this.loadJobsBasedOnRole();
  }

  // Filter for applied jobs (talent only)
  toggleAppliedFilter(value: boolean): void {
    this.appliedFilter = value;
    this.loadJobsBasedOnRole();
  }

  // Helper method to enhance job objects with additional properties
  private enhanceJobs(jobs: any[]): EnhancedJob[] {
    return jobs.map((job: any) => {
      // Create base enhanced job
      const enhancedJob: EnhancedJob = {
        ...job,
        is_job_Favourite: false, // Default to not favorited
        category: job.category || 'AI Development',
        user_info: {
          firstName: 'Client', // Default name
          lastName: '',
          _id: job.clientId || '',
          profile_image: '',
        },
        reviews: {
          rating: 4.5, // Default rating
          count: Math.floor(Math.random() * 50), // Random review count for demonstration
        },
        hasApplied: false, // Default to not applied
      };

      return enhancedJob;
    });
  }

  loadMoreJobs(): void {
    this.visibleJobs += this.jobIncrement;

    // Update everyJobDetails with more jobs
    this.everyJobDetails = this.allJobs.slice(0, this.visibleJobs);

    // Check if all jobs are loaded
    if (this.visibleJobs >= this.allJobs.length) {
      this.allJobsLoaded = true;
    }

    // Scroll down to show new jobs
    setTimeout(() => {
      window.scrollBy({
        top: 300,
        behavior: 'smooth',
      });
    }, 100);
  }

  // Toggle job favorite status
  toggleFavourite(job: EnhancedJob): void {
    if (!job) return;

    // Toggle the favorite status locally
    job.is_job_Favourite = !job.is_job_Favourite;

    // In a real app, you would call an API to save the favorite status
    console.log(
      `Job ${job._id} favorite status toggled to: ${job.is_job_Favourite}`
    );
  }

  // Navigate to job posting page
  postJob(): void {
    // Check if user is authenticated and can post jobs
    if (this.userRole === 'client') {
      this.router.navigate(['/jobs/comprehensive-post']);
    } else {
      // If not a client, might want to redirect to a different page or show a dialog
      console.log('Only clients can post jobs');
      // In a real app, you might show a modal/dialog here or redirect to registration
      if (
        confirm(
          'You need to register as a client to post jobs. Would you like to sign up?'
        )
      ) {
        this.router.navigate(['/register']);
      }
    }
  }

  // Get status class for CSS styling
  getStatusClass(status: string | undefined): string {
    switch (status) {
      case 'published':
        return 'status-published';
      case 'assigned':
        return 'status-assigned';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-unknown'; // You can style this or leave it blank
    }
  }
}
