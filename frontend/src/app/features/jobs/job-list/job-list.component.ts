import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { JobService } from '../../../services/job.service';
import { Job } from '../../../services/job.service';
import { UserService } from '../../../services/user.service';
import { ThemeService } from '../../../services/theme.service';
import { ButtonComponent } from '../../../shared/button/button.component';
import { BannerComponent } from '../../../shared/banner/banner.component';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent, BannerComponent],
  templateUrl: './job-list.component.html',
  styleUrls: ['./job-list.component.scss'],
})
export class JobListComponent implements OnInit {
  userRole: string = '';
  jobs: any[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';
  isDarkMode: boolean = false;

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

  constructor(
    private jobService: JobService,
    private userService: UserService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Get user role
    this.userRole = this.userService.getUserRole() || 'guest';

    // Subscribe to theme changes
    this.themeService.isDarkMode$.subscribe((isDark) => {
      this.isDarkMode = isDark;
    });

    this.loadJobs();
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
        console.log('[JobLoader] Role is talent → Fetching available jobs');
        jobsObservable = this.jobService.getAvailableJobs();
        break;

      default:
        console.error(`[JobLoader] Unknown role: ${this.userRole}`);
        this.errorMessage = 'Invalid user role';
        this.isLoading = false;
        return;
    }

    jobsObservable.subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response && response.success) {
          this.jobs = response.data || [];
          // Handle pagination
          if (response.pagination) {
            this.totalPages = response.pagination.pages || 1;
          }
        } else {
          this.errorMessage = 'Failed to load jobs';
          this.jobs = [];
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error loading jobs';
        this.jobs = [];
      },
    });
  }

  createNewJob(): void {
    // Navigate to job creation page
  }

  applyToJob(jobId: string): void {
    // Navigate to job application page
  }

  selectedJob: Job | null = null;

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
