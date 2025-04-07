// src/app/features/jobs/job-list/job-list.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { JobService, Job } from '../../../services/job.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './job-list.component.html',
  styleUrls: ['./job-list.component.scss'],
})
export class JobListComponent implements OnInit {
  jobs: Job[] = [];
  isLoading = true;
  error = '';
  userRole = '';

  constructor(
    private router: Router,
    private jobService: JobService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    console.log('JobListComponent initialized');
    this.userRole = this.userService.getUserRole() || 'talent';
    console.log('User role:', this.userRole);
    this.loadJobs();
  }

  loadJobs(): void {
    this.isLoading = true;

    if (this.userRole === 'client') {
      // If client, show jobs they've posted
      this.jobService.getMyJobs().subscribe({
        next: (response) => {
          console.log('Client jobs loaded:', response);
          this.jobs = response.data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load client jobs:', err);
          this.error = err.error?.message || 'Failed to load jobs';
          this.isLoading = false;
        },
      });
    } else {
      // If talent, show available jobs
      this.jobService.getAvailableJobs().subscribe({
        next: (response) => {
          console.log('Available jobs loaded:', response);
          // Handle potential nested structure
          this.jobs = response.data.jobs || response.data;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load available jobs:', err);
          this.error = err.error?.message || 'Failed to load jobs';
          this.isLoading = false;
        },
      });
    }
  }

  navigateToJobDetails(jobId: string): void {
    this.router.navigate(['/jobs', jobId]);
  }

  createNewJob(): void {
    this.router.navigate(['/jobs/post']);
  }

  getStatusClass(status: string): string {
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
        return '';
    }
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
