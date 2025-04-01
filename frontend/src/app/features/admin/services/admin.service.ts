// frontend/src/app/features/admin/services/admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/api/admin`;

  constructor(private http: HttpClient) {}

  // Dashboard statistics
  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/stats`);
  }

  // User management
  getUsers(page = 1, limit = 10, search = ''): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/users?page=${page}&limit=${limit}${
        search ? `&search=${search}` : ''
      }`
    );
  }

  getUserById(userId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/${userId}`);
  }

  updateUser(userId: string, userData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${userId}`, userData);
  }

  toggleUserStatus(userId: string, isActive: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/users/${userId}/status`, {
      isActive,
    });
  }

  // Job management
  getJobs(page = 1, limit = 10, filters = {}): Observable<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());

    Object.entries(filters).forEach(([key, value]) => {
      queryParams.append(key, value as string);
    });

    return this.http.get<any>(`${this.apiUrl}/jobs?${queryParams.toString()}`);
  }

  getJobById(jobId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/jobs/${jobId}`);
  }

  updateJob(jobId: string, jobData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/jobs/${jobId}`, jobData);
  }

  toggleJobStatus(jobId: string, status: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/jobs/${jobId}/status`, {
      status,
    });
  }

  // Payments
  getPayments(
    page = 1,
    limit = 10,
    dateRange?: { start: string; end: string }
  ): Observable<any> {
    let url = `${this.apiUrl}/payments?page=${page}&limit=${limit}`;
    if (dateRange) {
      url += `&startDate=${dateRange.start}&endDate=${dateRange.end}`;
    }
    return this.http.get<any>(url);
  }

  // Reports
  generateUsersReport(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reports/users`);
  }

  generateJobsReport(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reports/jobs`);
  }

  generateRevenueReport(
    period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  ): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/reports/revenue?period=${period}`
    );
  }

  // System settings
  getSystemSettings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/settings`);
  }

  updateSystemSettings(settings: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/settings`, settings);
  }
}
