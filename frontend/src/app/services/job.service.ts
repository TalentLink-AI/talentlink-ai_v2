// frontend/src/app/services/job.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class JobService {
  private apiUrl = `${environment.apiUrlJob}/api/jobs`;
  private applicationsUrl = `${environment.apiUrlJob}/api/applications`;

  constructor(private http: HttpClient) {}

  // Job CRUD operations
  getJobs(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}`);
  }

  getMyJobs(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/my-jobs`);
  }

  getAvailableJobs(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/available`);
  }

  getJobById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createJob(jobData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, jobData);
  }

  updateJob(id: string, jobData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, jobData);
  }

  updateJobStatus(id: string, status: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/status`, { status });
  }

  completeJob(id: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/complete`, {});
  }

  // Applications
  getApplicationsForJob(jobId: string): Observable<any> {
    return this.http.get<any>(`${this.applicationsUrl}/job/${jobId}`);
  }

  getMyApplications(): Observable<any> {
    return this.http.get<any>(`${this.applicationsUrl}/my-applications`);
  }

  applyToJob(jobId: string, coverLetter?: string): Observable<any> {
    return this.http.post<any>(`${this.applicationsUrl}`, {
      jobId,
      coverLetter,
    });
  }

  acceptApplication(applicationId: string): Observable<any> {
    return this.http.post<any>(
      `${this.applicationsUrl}/${applicationId}/accept`,
      {}
    );
  }

  // Milestones (basic operations only - payment operations moved to MilestonePaymentService)
  createMilestone(
    jobId: string,
    description: string,
    amount: number,
    depositAmount?: number
  ): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${jobId}/milestones`, {
      description,
      amount,
      depositAmount,
    });
  }

  updateMilestone(
    jobId: string,
    milestoneId: string,
    updateData: any
  ): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/${jobId}/milestones/${milestoneId}`,
      updateData
    );
  }

  getMilestoneDetails(jobId: string, milestoneId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/${jobId}/milestones/${milestoneId}`
    );
  }

  // Talent milestone actions
  startMilestoneWork(jobId: string, milestoneId: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/${jobId}/milestones/${milestoneId}/start`,
      {}
    );
  }

  completeMilestoneWork(
    jobId: string,
    milestoneId: string,
    submissionDetails: string
  ): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/${jobId}/milestones/${milestoneId}/complete`,
      { submissionDetails }
    );
  }
}
