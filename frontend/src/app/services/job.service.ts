// src/app/services/job.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Job {
  _id: string;
  title: string;
  description: string;
  budget: number;
  status: 'draft' | 'published' | 'assigned' | 'completed' | 'cancelled';
  clientId: string;
  assignedTo?: string;
  applications?: string[];
  milestones?: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface JobApplication {
  _id: string;
  jobId: string;
  talentId: string;
  coverLetter?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class JobService {
  private apiUrl = `${environment.apiUrlJob}/api`;

  constructor(private http: HttpClient) {}

  // Get all jobs
  getJobs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/jobs`);
  }

  // Get a specific job by ID
  getJobById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/jobs/${id}`);
  }

  // Get jobs created by the current client
  getMyJobs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/jobs/my-jobs`);
  }

  // Get jobs created by a specific client
  getJobsByClient(clientId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/jobs/client/${clientId}`);
  }

  // Get jobs that a talent can apply to (not assigned yet)
  getAvailableJobs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/jobs/available`);
  }

  // Create a new job
  createJob(job: Partial<Job>): Observable<any> {
    return this.http.post(`${this.apiUrl}/jobs`, job);
  }

  // Update a job
  updateJob(id: string, updates: Partial<Job>): Observable<any> {
    return this.http.put(`${this.apiUrl}/jobs/${id}`, updates);
  }

  // Update job status
  updateJobStatus(
    id: string,
    status: string,
    assignedTo?: string
  ): Observable<any> {
    return this.http.patch(`${this.apiUrl}/jobs/${id}/status`, {
      status,
      assignedTo,
    });
  }

  // Apply to a job
  applyToJob(jobId: string, coverLetter?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/applications`, {
      jobId,
      coverLetter,
    });
  }

  // Get applications for a job
  getApplicationsForJob(jobId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/applications/job/${jobId}`);
  }

  // Get applications by talent
  getApplicationsByTalent(talentId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/applications/talent/${talentId}`);
  }

  // Get my applications (for logged in talent)
  getMyApplications(): Observable<any> {
    return this.http.get(`${this.apiUrl}/applications/my-applications`);
  }

  // Accept an application
  acceptApplication(applicationId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/applications/${applicationId}/accept`,
      {}
    );
  }

  // Reject an application
  rejectApplication(applicationId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/applications/${applicationId}/reject`,
      {}
    );
  }

  // Create a milestone
  createMilestone(
    jobId: string,
    description: string,
    amount: number
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/jobs/${jobId}/milestones`, {
      description,
      amount,
    });
  }

  // Update a milestone
  updateMilestone(
    jobId: string,
    milestoneId: string,
    updates: any
  ): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}`,
      updates
    );
  }

  // Release milestone payment
  releaseMilestone(jobId: string, milestoneId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}/release`,
      {}
    );
  }

  // Create milestone payment intent
  createMilestonePayment(jobId: string, milestoneId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/jobs/${jobId}/milestones/${milestoneId}/payment`,
      {}
    );
  }

  // Complete a job
  completeJob(jobId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/jobs/${jobId}/complete`, {});
  }
}
