// src/app/features/admin/pages/admin-milestones/admin-milestones.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { JobService } from '../../../../services/job.service';

@Component({
  selector: 'app-admin-milestones',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-milestones.component.html',
  styleUrls: ['./admin-milestones.component.scss'],
})
export class AdminMilestonesComponent implements OnInit {
  milestones: any[] = [];
  loading = true;
  error: string | null = null;

  // Pagination
  page = 1;
  limit = 10;
  total = 0;

  // Filters
  statusFilter: string = '';
  Math: any;

  constructor(
    private adminService: AdminService,
    private jobService: JobService
  ) {}

  ngOnInit(): void {
    this.loadMilestones();
  }

  loadMilestones(): void {
    this.loading = true;

    // Use getAllMilestones instead of getJobs
    this.adminService
      .getAllMilestones(this.page, this.limit, {
        status: this.statusFilter,
      })
      .subscribe({
        next: (response) => {
          this.loading = false;

          if (response.success) {
            this.milestones = response.data.milestones;
            this.total = response.data.pagination.total;
          } else {
            this.error = 'Failed to load milestones';
          }
        },
        error: (err) => {
          this.loading = false;
          console.error('Error loading milestones:', err);
          this.error = err.error?.message || 'Failed to load milestones';
        },
      });
  }

  // Function to handle filtering
  applyFilter(status: string): void {
    this.statusFilter = status;
    this.loadMilestones();
  }

  // Function to handle pagination
  changePage(page: number): void {
    this.page = page;
    this.loadMilestones();
  }

  // Function to release funds (admin only)
  releaseFunds(jobId: string, milestoneId: string): void {
    if (
      !confirm('Are you sure you want to release these funds to the talent?')
    ) {
      return;
    }

    this.jobService.releaseMilestoneFunds(jobId, milestoneId).subscribe({
      next: (response) => {
        // Update the milestone status in the UI
        const index = this.milestones.findIndex((m) => m._id === milestoneId);
        if (index !== -1) {
          this.milestones[index].status = 'released';
          this.milestones[index].releasedAt = new Date();
        }

        alert('Funds released successfully!');
      },
      error: (err) => {
        console.error('Error releasing funds:', err);
        alert(
          `Error releasing funds: ${
            err.error?.message || 'An unknown error occurred'
          }`
        );
      },
    });
  }

  // Function to format date
  formatDate(date: string | Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Get appropriate status class for styling
  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'deposit_paid':
        return 'status-deposit-paid';
      case 'in_progress':
        return 'status-in-progress';
      case 'completed':
        return 'status-completed';
      case 'escrowed':
        return 'status-escrowed';
      case 'released':
        return 'status-released';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }
}
