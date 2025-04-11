// frontend/src/app/features/admin/services/admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { UserData } from '../../../services/user.service';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/api/admin`;
  private apiUrlJob = `${environment.apiUrlJob}/api/admin`;

  private userDataSubject = new BehaviorSubject<UserData | null>(null);
  // Observable that components can subscribe to
  public userData$ = this.userDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Dashboard statistics
  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard/stats`);
  }

  getCurrentUser(): Observable<UserData> {
    return this.http.get<UserData>(`${this.apiUrl}/me`).pipe(
      tap((userData) => {
        this.userDataSubject.next(userData);
        console.log('userData', userData);
      })
    );
  }

  // Get all users with pagination
  getUsers(page = 1, limit = 10, search = ''): Observable<any> {
    let url = `${this.apiUrl}/users?page=${page}&limit=${limit}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return this.http.get(url);
  }

  // Get user by ID
  getUserById(userId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${userId}`);
  }

  // Update user
  updateUser(userId: string, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}`, userData);
  }

  // Update user role
  updateUserRole(userId: string, role: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  // Toggle user status (activate/deactivate)
  toggleUserStatus(userId: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${userId}/status`, {
      isActive,
    });
  }

  // Get all roles
  getRoles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/roles`);
  }

  // Assign role to user
  assignRole(userId: string, roleId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/roles/assign`, {
      userId,
      roleId,
      replaceExisting: true,
    });
  }

  // Sync all users' roles from Auth0 to MongoDB
  syncAllRoles(): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync-roles`, {});
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

  /**
   * Get all jobs with pending milestone payments
   */
  getMilestoneJobs(page = 1, limit = 10, filters = {}): Observable<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    queryParams.append('hasMilestones', 'true'); // Add a flag to filter jobs with milestones

    Object.entries(filters).forEach(([key, value]) => {
      queryParams.append(key, value as string);
    });

    return this.http.get<any>(
      `${this.apiUrlJob}/jobs?${queryParams.toString()}`
    );
  }

  /**
   * Get all milestones across all jobs (for admin management)
   */
  getAllMilestones(page = 1, limit = 10, filters = {}): Observable<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());

    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value as string);
    });

    return this.http.get<any>(
      `${this.apiUrlJob}/milestones?${queryParams.toString()}`
    );
  }

  /**
   * Release funds for a milestone (admin only)
   */
  releaseMilestoneFunds(jobId: string, milestoneId: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrlJob}/jobs/${jobId}/milestones/${milestoneId}/release-funds`,
      {}
    );
  }

  /**
   * Get milestone details by ID
   */
  getMilestoneById(jobId: string, milestoneId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrlJob}/jobs/${jobId}/milestones/${milestoneId}`
    );
  }

  /**
   * Get release requests
   * In a real app, you would have a separate endpoint for milestone release requests
   */
  getReleaseRequests(
    page = 1,
    limit = 10,
    status = 'pending'
  ): Observable<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    queryParams.append('status', status);

    return this.http.get<any>(
      `${this.apiUrlJob}/milestone-release-requests?${queryParams.toString()}`
    );
  }

  /**
   * Approve a milestone release request
   */
  approveReleaseRequest(requestId: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrlJob}/milestone-release-requests/${requestId}/approve`,
      {}
    );
  }

  /**
   * Deny a milestone release request
   */
  denyReleaseRequest(requestId: string, reason: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrlJob}/milestone-release-requests/${requestId}/deny`,
      { reason }
    );
  }
}
