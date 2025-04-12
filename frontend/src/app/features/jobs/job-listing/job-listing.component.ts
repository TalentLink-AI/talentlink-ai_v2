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
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { BannerComponent } from '../../../shared';

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
  visibleJobs: number = 9; // Number of jobs to show initially
  jobIncrement: number = 9; // Number of jobs to add when loading more
  allJobsLoaded: boolean = false;
  totalItems: number = 0;
  searchText: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  // User state
  userRole: string = '';
  isDarkMode: boolean = false;

  // Environment variables
  baseUrl: string = '/'; // Replace with your API base URL

  // Math reference for template
  Math = Math;

  // Subscriptions for cleanup
  private themeSubscription: Subscription = new Subscription();

  constructor(
    private jobService: JobService,
    private userService: UserService,
    private themeService: ThemeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get user role
    this.userRole = this.userService.getUserRole() || 'talent';

    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      (isDark) => {
        this.isDarkMode = isDark;
      }
    );

    // Load jobs
    this.getEveryJobsList();
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  // Retry fetching jobs
  retryFetchJobs(): void {
    this.errorMessage = '';
    this.getEveryJobsList();
  }

  // Fetch all available jobs
  getEveryJobsList(): void {
    this.isLoading = true;
    this.errorMessage = '';
    console.log('Fetching jobs with role:', this.userRole);
    this.jobService.getAvailableJobs().subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Job API response:', response);
        // Initialize with empty array as a safety measure
        this.everyJobDetails = [];

        if (response && response.data) {
          // Extract jobs from response - handle different response formats
          const jobs = Array.isArray(response.data)
            ? response.data
            : response.data.jobs || [];

          console.log('Extracted jobs:', jobs.length);

          // If there are no jobs yet, try another way to extract them
          if (jobs.length === 0 && typeof response.data === 'object') {
            // Try to extract jobs directly from response (some APIs return them differently)
            if (response.data.jobs) {
              // If jobs are in a 'jobs' property
              this.allJobs = this.enhanceJobs(response.data.jobs);
            } else if (response.jobs) {
              // If jobs are in the response directly
              this.allJobs = this.enhanceJobs(response.jobs);
            } else {
              // As a last resort, treat the entire data object as the jobs array
              this.allJobs = this.enhanceJobs([response.data]);
            }
          } else {
            // Process the jobs normally
            this.allJobs = this.enhanceJobs(jobs);
          }

          // Apply search filter if needed
          if (this.searchText && this.searchText.trim() !== '') {
            this.allJobs = this.allJobs.filter(
              (job) =>
                (job.title &&
                  job.title
                    .toLowerCase()
                    .includes(this.searchText.toLowerCase())) ||
                (job.description &&
                  job.description
                    .toLowerCase()
                    .includes(this.searchText.toLowerCase()))
            );
          }

          // Reset pagination
          this.visibleJobs = Math.min(this.jobIncrement, this.allJobs.length);
          this.allJobsLoaded = this.allJobs.length <= this.visibleJobs;

          // Set visible jobs
          this.everyJobDetails = this.allJobs.slice(0, this.visibleJobs);
        }

        // Set total items for pagination
        this.totalItems = this.everyJobDetails.length;
        console.log('Total jobs found:', this.totalItems);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading jobs:', err);
        this.errorMessage =
          err.error?.message ||
          'Failed to load available projects. Please try again.';
        this.everyJobDetails = []; // Reset array in case of error
        this.totalItems = 0;
      },
    });
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
      };

      return enhancedJob;
    });
  }

  // Handle page change for pagination
  // pageChanged(event: number): void {
  //   this.p = event;
  //   // Scroll to top of job listings when page changes
  //   if (this.scrollTarget) {
  //     setTimeout(() => {
  //       this.scrollTarget.nativeElement.scrollIntoView({
  //         behavior: 'smooth',
  //         block: 'start',
  //       });
  //     }, 100);
  //   }
  // }

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

    /* Example of what a real implementation might look like:
    if (job._id) {
      this.jobService.toggleFavoriteJob(job._id).subscribe({
        next: (response) => {
          if (response && response.success) {
            // Update was successful
            console.log(`Job ${job._id} favorite status saved`);
          } else {
            // If update failed, revert the local change
            job.is_job_Favourite = !job.is_job_Favourite;
            console.error('Failed to update favorite status');
          }
        },
        error: (err) => {
          // If error, revert the local change
          job.is_job_Favourite = !job.is_job_Favourite;
          console.error('Error toggling favorite status:', err);
        }
      });
    }
    */
  }

  // Navigate to job posting page
  postJob(): void {
    // Check if user is authenticated and can post jobs
    if (this.userRole === 'client') {
      this.router.navigate(['/jobs/post']);
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
}
