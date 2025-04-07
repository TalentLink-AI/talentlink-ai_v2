// src/app/features/jobs/job-list/job-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobService } from '../../../services/job.service';
import { UserService } from '../../../services/user.service';
import { Router, RouterLink } from '@angular/router';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './job-list.component.html',
  styleUrls: ['./job-list.component.scss'],
})
export class JobListComponent implements OnInit {
  jobs: any[] = [];
  isLoading = true;
  errorMessage = '';
  userRole = '';
  isMyJobsView = false;

  constructor(
    private jobService: JobService,
    private userService: UserService,
    private router: Router
  ) {
    // Check if this is the "my jobs" view
    this.isMyJobsView = this.router.url.includes('/jobs/manage');
  }

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Get current user role directly
    this.userRole = this.userService.getUserRole() || 'talent';

    // Based on the view and role, call the appropriate endpoint
    const request =
      this.isMyJobsView || this.userRole === 'client'
        ? this.jobService.getMyJobs()
        : this.jobService.getAvailableJobs();

    request
      .pipe(
        catchError((error) => {
          if (error.status === 403) {
            this.errorMessage =
              'You need a client account to view your posted jobs.';
          } else {
            this.errorMessage = 'Failed to load jobs. Please try again.';
          }
          return of({
            success: false,
            data: [],
          });
        })
      )
      .subscribe((response) => {
        this.isLoading = false;
        if (response && response.success) {
          this.jobs = response.data?.jobs || response.data || [];
        } else {
          this.jobs = [];
        }
      });
  }

  postJob(): void {
    this.router.navigate(['/jobs/post']);
  }
}
