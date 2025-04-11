import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { RoleManagementComponent } from '../../components/role-management/role-management.component';

interface StatCard {
  title: string;
  value: number;
  icon: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, RoleManagementComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit {
  stats: StatCard[] = [
    {
      title: 'Active Users',
      value: 0,
      icon: 'users',
      change: 0,
      trend: 'neutral',
    },
    {
      title: 'Active Jobs',
      value: 0,
      icon: 'briefcase',
      change: 0,
      trend: 'neutral',
    },
    {
      title: 'Revenue',
      value: 0,
      icon: 'dollar',
      change: 0,
      trend: 'neutral',
    },
    {
      title: 'Support Tickets',
      value: 0,
      icon: 'ticket',
      change: 0,
      trend: 'neutral',
    },
  ];

  recentUsers: any[] = [];
  roles: any[] = [];
  recentJobs: any[] = [];
  loading = true;
  error: string | null = null;
  today = new Date();

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = null;

    // Load dashboard statistics
    this.adminService
      .getDashboardStats()
      .pipe(
        catchError((err) => {
          console.error('Error loading dashboard stats:', err);
          this.error =
            'Failed to load dashboard statistics. Please try again later.';

          // Return fallback data to avoid breaking the UI
          return of({
            usersCount: 0,
            activeJobsCount: 0,
            revenue: 0,
            ticketsCount: 0,
            usersTrend: 0,
            jobsTrend: 0,
            revenueTrend: 0,
            ticketsTrend: 0,
            recentUsers: [],
            recentJobs: [],
          });
        })
      )
      .subscribe((data) => {
        this.loading = false;

        // Update stats
        this.stats[0].value = data.usersCount || 0;
        this.stats[0].change = data.usersTrend || 0;
        this.stats[0].trend = this.getTrendDirection(data.usersTrend);

        this.stats[1].value = data.activeJobsCount || 0;
        this.stats[1].change = data.jobsTrend || 0;
        this.stats[1].trend = this.getTrendDirection(data.jobsTrend);

        this.stats[2].value = data.revenue || 0;
        this.stats[2].change = data.revenueTrend || 0;
        this.stats[2].trend = this.getTrendDirection(data.revenueTrend);

        this.stats[3].value = data.ticketsCount || 0;
        this.stats[3].change = data.ticketsTrend || 0;
        this.stats[3].trend = this.getTrendDirection(data.ticketsTrend);

        // Update recent users and jobs
        this.recentUsers = data.recentUsers || '';
        this.recentJobs = data.recentJobs || '';
      });
  }

  // Determines trend direction based on percentage change
  private getTrendDirection(value: number): 'up' | 'down' | 'neutral' {
    if (value > 0) return 'up';
    if (value < 0) return 'down';
    return 'neutral';
  }
}
