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

    // Get current user role
    this.userRole = this.userService.getUserRole();

    if (this.userRole === 'client') {
      // If client, show jobs they've posted
      const clientId = 'client-123';
      this.jobService.getJobsByClient(clientId).subscribe({
        // ...existing code
      });
    } else {
      // If talent, show available jobs
      this.jobService.getAvailableJobs().subscribe({
        next: (jobs) => {
          console.log('Available jobs loaded:', jobs);
          this.jobs = jobs;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to load available jobs:', err);
          this.error = 'Failed to load jobs';
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
}
