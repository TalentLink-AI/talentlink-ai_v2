// src/app/features/jobs/job-list/job-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { JobService } from '../../../services/job.service';
import { Job } from '../../../services/job.service';
import { UserService } from '../../../services/user.service';
import { ThemeService } from '../../../services/theme.service';
import { ButtonComponent } from '../../../shared/button/button.component';
import { BannerComponent } from '../../../shared/banner/banner.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, BannerComponent],
  templateUrl: './job-list.component.html',
  styleUrls: ['./job-list.component.scss'],
})
export class JobListComponent implements OnInit, OnDestroy {
  userRole: string = '';
  jobs: any[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  isDarkMode: boolean = false;
  private themeSubscription: Subscription = new Subscription();

  // Pagination
  currentPage: number = 1;
  totalPages: number = 1;

  // Filtering
  filterOptions: {
    status: string;
    category: string;
    sortBy: string;
  } = {
    status: 'all',
    category: 'all',
    sortBy: 'newest',
  };

  selectedJob: Job | null = null;

  constructor(
    private jobService: JobService,
    private userService: UserService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Get user role
    this.userRole = this.userService.getUserRole() || 'talent';
    console.log('Current user role:', this.userRole);

    // Subscribe to theme changes
    this.themeSubscription = this.themeService.isDarkMode$.subscribe(
      (isDark) => {
        this.isDarkMode = isDark;
      }
    );

    this.loadJobs();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  loadJobs(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.jobs = [];

    let jobsObservable;

    // Load different jobs based on user role
    switch (this.userRole) {
      case 'client':
        console.log('[JobLoader] Role is client → Fetching client jobs');
        jobsObservable = this.jobService.getMyJobs();
        break;

      case 'talent':
      default:
        console.log(
          '[JobLoader] Role is talent or default → Fetching available jobs'
        );
        jobsObservable = this.jobService.getAvailableJobs();
        break;
    }

    jobsObservable.subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Job response:', response);

        if (response && response.success) {
          // Handle different response structures
          if (response.data && Array.isArray(response.data)) {
            // Direct array of jobs
            this.jobs = response.data;
          } else if (
            response.data &&
            response.data.jobs &&
            Array.isArray(response.data.jobs)
          ) {
            // Jobs nested under data.jobs (common for available jobs endpoint)
            this.jobs = response.data.jobs;

            // Handle pagination if available
            if (response.data.pagination) {
              this.totalPages = response.data.pagination.pages || 1;
              this.currentPage = response.data.pagination.page || 1;
            }
          } else if (response.data) {
            // Data object with other properties
            this.jobs = response.data;
          } else {
            // Fallback if structure is unexpected
            this.jobs = [];
            this.errorMessage = 'Unexpected data structure received';
            console.error('Unexpected job data structure:', response);
          }

          console.log(`Loaded ${this.jobs.length} jobs for ${this.userRole}`);
        } else {
          this.errorMessage = response?.message || 'Failed to load jobs';
          this.jobs = [];
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error loading jobs';
        console.error('Error loading jobs:', err);
        this.jobs = [];
      },
    });
  }

  openJobDetails(job: Job): void {
    this.selectedJob = job;
  }

  closeJobDetails(): void {
    this.selectedJob = null;
  }

  changePage(page: number): void {
    this.currentPage = page;
    this.loadJobs();
  }

  updateFilter(
    filterType: 'status' | 'category' | 'sortBy',
    event: Event
  ): void {
    const selectElement = event.target as HTMLSelectElement;
    this.filterOptions[filterType] = selectElement.value;
    this.currentPage = 1; // Reset to first page
    this.loadJobs();
  }
}
