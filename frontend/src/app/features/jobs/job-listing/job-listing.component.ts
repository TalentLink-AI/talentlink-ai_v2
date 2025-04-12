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
  imports: [CommonModule, FormsModule, RouterModule, NgxPaginationModule],
  templateUrl: './job-listing.component.html',
  styleUrls: ['./job-listing.component.scss'],
})
export class JobListingComponent implements OnInit, OnDestroy {
  @ViewChild('scrollTarget') scrollTarget!: ElementRef;

  // Jobs data
  everyJobDetails: EnhancedJob[] = [];
  totalItems: number = 0;
  p: number = 1; // Current page for pagination
  searchText: string = '';

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

  // Fetch all available jobs
  getEveryJobsList(): void {
    this.jobService.getAvailableJobs().subscribe({
      next: (response) => {
        // Initialize with empty array as a safety measure
        this.everyJobDetails = [];

        if (response && response.data) {
          // Extract jobs from response
          const jobs = Array.isArray(response.data)
            ? response.data
            : response.data.jobs || [];

          // Enhance job objects with additional properties
          this.everyJobDetails = jobs.map((job: any) => {
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

          // Apply search filter if needed
          if (this.searchText && this.searchText.trim() !== '') {
            this.everyJobDetails = this.everyJobDetails.filter(
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
        }

        // Set total items for pagination
        this.totalItems = this.everyJobDetails.length;
      },
      error: (err) => {
        console.error('Error loading jobs:', err);
        this.everyJobDetails = []; // Reset array in case of error
        this.totalItems = 0;
      },
    });
  }

  // Handle page change for pagination
  pageChanged(event: number): void {
    this.p = event;
    // Scroll to top of job listings when page changes
    if (this.scrollTarget) {
      setTimeout(() => {
        this.scrollTarget.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
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
