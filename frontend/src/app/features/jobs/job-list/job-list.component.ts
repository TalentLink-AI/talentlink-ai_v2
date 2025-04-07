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

    // Get current user role first
    this.userService
      .getUserRole()
      .pipe(
        switchMap((role) => {
          this.userRole = role || 'guest';

          // Based on the view and role, call the appropriate endpoint
          if (this.isMyJobsView) {
            return this.jobService.getMyJobs().pipe(
              catchError((error) => {
                // Handle role errors
                if (error.status === 403) {
                  this.errorMessage =
                    'You need a client account to view your posted jobs.';
                  // Suggest switching to client role if they're in talent role
                  if (this.userRole === 'talent') {
                    this.errorMessage +=
                      ' Would you like to switch to client view?';
                  }
                } else {
                  this.errorMessage =
                    'Failed to load your jobs. Please try again.';
                }
                return of({
                  success: false,
                  data: [],
                  userRole: this.userRole,
                });
              })
            );
          } else {
            // Regular jobs view - get available jobs for talents
            return this.jobService.getAvailableJobs().pipe(
              catchError((error) => {
                this.errorMessage = 'Failed to load jobs. Please try again.';
                return of({
                  success: false,
                  data: [],
                  userRole: this.userRole,
                });
              })
            );
          }
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
